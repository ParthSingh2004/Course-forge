/**
 * runtime.ts — SCORM Runtime Orchestrator
 * ==========================================
 * The main entry point bundled into every exported SCORM package.
 * Ties together:
 *   - ScormAPI: LMS discovery and communication
 *   - StateCompressor: suspend_data persistence
 *   - TriggerDispatcher: ECA evaluation (Web Worker + sync fallback)
 *   - Slide navigation and UI rendering
 *
 * This is built as an IIFE by Vite and embedded directly in the
 * exported SCORM ZIP's index.html.
 */

import { ScormAPI } from "./scorm-api";
import { compressState, decompressState, createInitialState } from "./state-compressor";
import { TriggerDispatcher } from "./trigger-worker";
import type {
  CourseDefinition,
  CourseState,
  Action,
  Slide,
  Layer,
  Component,
} from "./schemas";

// ---------------------------------------------------------------------------
// Runtime Class
// ---------------------------------------------------------------------------

class CourseForgeRuntime {
  private scorm: ScormAPI;
  private dispatcher!: TriggerDispatcher;
  private course!: CourseDefinition;
  private state!: CourseState;
  private slideIdToIndex: Map<string, number> = new Map();
  private autoCommitInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private mandatoryIds: Set<string> = new Set();

  constructor() {
    this.scorm = new ScormAPI();
  }

  /**
   * Boot the runtime. Called once on page load.
   *
   * @param courseData  The full CourseDefinition JSON (embedded in HTML by the export worker)
   */
  async boot(courseData: CourseDefinition): Promise<void> {
    this.course = courseData;

    // Build slide ID → index map
    this.course.slides.forEach((slide, idx) => {
      this.slideIdToIndex.set(slide.id, idx);
    });

    // Initialize SCORM connection
    this.scorm.initialize();

    // Restore or create state
    const slideCount = this.course.slides.length;

    if (this.scorm.isConnected) {
      const suspendData = this.scorm.getValue("cmi.suspend_data");
      const restored = decompressState(suspendData, slideCount, this.course.variables);

      if (restored) {
        this.state = restored;
        console.info("[Runtime] Resumed from saved state at slide", this.state.currentSlide);
      } else {
        this.state = createInitialState(slideCount, this.course.variables);
        console.info("[Runtime] Fresh start — no saved state found");
      }

      // Set initial lesson_status if not already set
      const currentStatus = this.scorm.getValue("cmi.core.lesson_status");
      if (!currentStatus || currentStatus === "not attempted" || currentStatus === "") {
        this.scorm.setValue("cmi.core.lesson_status", "incomplete");
        this.scorm.commit();
      }
    } else {
      this.state = createInitialState(slideCount, this.course.variables);
      console.info("[Runtime] Offline mode — no LMS connected");
    }

    // Build mandatory component index
    for (const slide of this.course.slides) {
      for (const layer of slide.layers) {
        for (const comp of layer.components) {
          if ((comp.type === "quiz" || comp.type === "video") && (comp as any).mandatory) {
            this.mandatoryIds.add(comp.id);
          }
        }
      }
    }

    // Initialize trigger dispatcher (Web Worker with sync fallback)
    this.dispatcher = new TriggerDispatcher(this.course.triggers, this.slideIdToIndex);

    // Start elapsed time tracking
    this.startTime = Date.now() - this.state.elapsedTime * 1000;

    // Auto-commit every 60 seconds
    this.autoCommitInterval = setInterval(() => {
      this.persistState();
    }, 60_000);

    // Render the current slide
    this.state.visitedSlides[this.state.currentSlide] = true;
    this.renderSlide(this.state.currentSlide);

    // Fire courseStart triggers
    await this.fireTrigger({ type: "courseStart" });

    // Fire slideEnter for the current slide
    const currentSlide = this.course.slides[this.state.currentSlide];
    if (currentSlide) {
      await this.fireTrigger({ type: "slideEnter", slideId: currentSlide.id });
    }

    // Register global keyboard navigation
    this.registerKeyboardNav();

    // Persist initial state
    this.persistState();

    // Check if course is already complete (single-slide or resumed state)
    this.checkCompletion();

    console.info(
      `[Runtime] CourseForge runtime booted — ${slideCount} slides, ` +
      `${this.course.triggers.length} triggers, ` +
      `Worker: ${this.dispatcher.isUsingWorker}`
    );
  }

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  async goToSlide(indexOrId: number | string): Promise<void> {
    const targetIdx = typeof indexOrId === "string"
      ? this.slideIdToIndex.get(indexOrId) ?? -1
      : indexOrId;

    if (targetIdx < 0 || targetIdx >= this.course.slides.length) {
      console.warn(`[Runtime] Invalid slide: ${indexOrId}`);
      return;
    }

    // Block forward navigation if current slide has incomplete mandatory items
    if (targetIdx > this.state.currentSlide) {
      const currentSlide = this.course.slides[this.state.currentSlide];
      if (currentSlide && !this.areMandatoryItemsComplete(currentSlide)) {
        this.renderFeedback(
          "Please complete all mandatory items on this slide before proceeding.",
          "info"
        );
        return;
      }
    }

    // Fire slideExit on current slide
    const currentSlide = this.course.slides[this.state.currentSlide];
    if (currentSlide) {
      await this.fireTrigger({ type: "slideExit", slideId: currentSlide.id });
    }

    // Update state
    this.state.currentSlide = targetIdx;
    this.state.visitedSlides[targetIdx] = true;

    // Render
    this.renderSlide(targetIdx);

    // Persist
    this.persistState();

    // Update SCORM bookmark
    if (this.scorm.isConnected) {
      this.scorm.setValue("cmi.core.lesson_location", String(targetIdx));
    }

    // Fire slideEnter on new slide
    const newSlide = this.course.slides[targetIdx];
    if (newSlide) {
      await this.fireTrigger({ type: "slideEnter", slideId: newSlide.id });
    }

    // Check for course completion
    this.checkCompletion();
  }

  async nextSlide(): Promise<void> {
    const next = this.state.currentSlide + 1;
    if (next < this.course.slides.length) {
      await this.goToSlide(next);
    }
  }

  async prevSlide(): Promise<void> {
    const prev = this.state.currentSlide - 1;
    if (prev >= 0) {
      await this.goToSlide(prev);
    }
  }

  // -----------------------------------------------------------------------
  // Trigger Dispatch & Action Execution
  // -----------------------------------------------------------------------

  private async fireTrigger(event: import("./schemas").TriggerEvent): Promise<void> {
    const result = await this.dispatcher.dispatch(event, this.state);

    // Mark oneShot triggers as fired
    for (const ruleId of result.firedRuleIds) {
      const rule = this.course.triggers.find(r => r.id === ruleId);
      if (rule?.oneShot && !this.state.triggersFired.includes(ruleId)) {
        this.state.triggersFired.push(ruleId);
      }
    }

    // Execute actions sequentially
    for (const action of result.actions) {
      await this.executeAction(action);
    }
  }

  private async executeAction(action: Action): Promise<void> {
    switch (action.type) {
      case "goToSlide":
        await this.goToSlide(action.slideId);
        break;

      case "nextSlide":
        await this.nextSlide();
        break;

      case "prevSlide":
        await this.prevSlide();
        break;

      case "setVariable": {
        const oldVal = this.state.variables[action.varName];
        this.state.variables[action.varName] = action.value;
        // Fire variableChange trigger
        if (oldVal !== action.value) {
          await this.fireTrigger({ type: "variableChange", varName: action.varName });
        }
        break;
      }

      case "incrementVariable": {
        const current = Number(this.state.variables[action.varName] ?? 0);
        const newVal = current + action.amount;
        this.state.variables[action.varName] = newVal;
        await this.fireTrigger({ type: "variableChange", varName: action.varName });
        break;
      }

      case "showLayer":
        this.state.layerVisibility[action.layerId] = true;
        this.renderLayerVisibility();
        await this.fireTrigger({ type: "layerShown", layerId: action.layerId });
        break;

      case "hideLayer":
        this.state.layerVisibility[action.layerId] = false;
        this.renderLayerVisibility();
        await this.fireTrigger({ type: "layerHidden", layerId: action.layerId });
        break;

      case "toggleLayer": {
        const isVisible = this.state.layerVisibility[action.layerId] ?? false;
        this.state.layerVisibility[action.layerId] = !isVisible;
        this.renderLayerVisibility();
        if (!isVisible) {
          await this.fireTrigger({ type: "layerShown", layerId: action.layerId });
        } else {
          await this.fireTrigger({ type: "layerHidden", layerId: action.layerId });
        }
        break;
      }

      case "setStatus":
        if (this.scorm.isConnected) {
          this.scorm.setValue("cmi.core.lesson_status", action.status);
          this.scorm.commit();
        }
        break;

      case "setScore":
        if (this.scorm.isConnected) {
          this.scorm.setValue("cmi.core.score.raw", String(action.score));
          this.scorm.setValue("cmi.core.score.max", String(action.maxScore));
          this.scorm.setValue("cmi.core.score.min", "0");
          this.scorm.commit();
        }
        break;

      case "showFeedback":
        this.renderFeedback(action.message, action.feedbackType);
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Quiz Handling
  // -----------------------------------------------------------------------

  async submitQuiz(quizId: string, selectedIndex: number): Promise<void> {
    // Find the quiz component across all slides/layers
    let quizComponent: Component | null = null;
    for (const slide of this.course.slides) {
      for (const layer of slide.layers) {
        for (const comp of layer.components) {
          if (comp.type === "quiz" && comp.id === quizId) {
            quizComponent = comp;
          }
        }
      }
    }

    if (!quizComponent || quizComponent.type !== "quiz") {
      console.warn(`[Runtime] Quiz not found: ${quizId}`);
      return;
    }

    const isCorrect = selectedIndex === quizComponent.correctAnswer;
    const existing = this.state.quizScores[quizId] || { score: 0, maxScore: 1, attempts: 0 };

    this.state.quizScores[quizId] = {
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      attempts: existing.attempts + 1,
    };

    // Fire quizSubmit trigger
    await this.fireTrigger({ type: "quizSubmit", quizId });

    // Show inline feedback
    const feedback = quizComponent.feedback;
    this.renderFeedback(
      isCorrect ? feedback.correct : feedback.incorrect,
      isCorrect ? "correct" : "incorrect"
    );

    // Mark mandatory quiz as completed
    if (this.mandatoryIds.has(quizId) && !this.state.mandatoryCompleted.includes(quizId)) {
      this.state.mandatoryCompleted.push(quizId);
    }

    // Update SCORM score based on quiz performance
    this.reportScore();

    // Persist
    this.persistState();

    // Check for course completion
    this.checkCompletion();
  }

  // -----------------------------------------------------------------------
  // Mandatory & Completion Logic
  // -----------------------------------------------------------------------

  /** Check if all mandatory items on a given slide are completed */
  private areMandatoryItemsComplete(slide: Slide): boolean {
    for (const layer of slide.layers) {
      for (const comp of layer.components) {
        if (this.mandatoryIds.has(comp.id) && !this.state.mandatoryCompleted.includes(comp.id)) {
          return false;
        }
      }
    }
    return true;
  }

  /** Mark a mandatory component as completed */
  markMandatoryComplete(compId: string): void {
    if (this.mandatoryIds.has(compId) && !this.state.mandatoryCompleted.includes(compId)) {
      this.state.mandatoryCompleted.push(compId);
      this.persistState();
      this.checkCompletion();
      // Update the mandatory badge on the component
      const badge = document.getElementById(`mandatory-badge-${compId}`);
      if (badge) {
        badge.textContent = "✓ COMPLETED";
        badge.style.background = "#052e16";
        badge.style.color = "#4ade80";
        badge.style.borderColor = "#166534";
      }
    }
  }

  /** Calculate quiz score as a percentage */
  private calculateScore(): { raw: number; max: number; pct: number } {
    // Count total quizzes across all slides
    let totalQuizzes = 0;
    let correctQuizzes = 0;

    for (const slide of this.course.slides) {
      for (const layer of slide.layers) {
        for (const comp of layer.components) {
          if (comp.type === "quiz") {
            totalQuizzes++;
            const result = this.state.quizScores[comp.id];
            if (result && result.score > 0) {
              correctQuizzes++;
            }
          }
        }
      }
    }

    if (totalQuizzes === 0) {
      return { raw: 100, max: 100, pct: 100 };
    }

    const pct = Math.round((correctQuizzes / totalQuizzes) * 100);
    return { raw: pct, max: 100, pct };
  }

  /** Report current score to SCORM */
  private reportScore(): void {
    if (!this.scorm.isConnected) return;
    const { raw, max } = this.calculateScore();
    this.scorm.setValue("cmi.core.score.raw", String(raw));
    this.scorm.setValue("cmi.core.score.max", String(max));
    this.scorm.setValue("cmi.core.score.min", "0");
    this.scorm.commit();
  }

  /** Check if course should be marked complete */
  private checkCompletion(): void {
    // Don't re-trigger if already completed
    if (this.scorm.isConnected) {
      const status = this.scorm.getValue("cmi.core.lesson_status");
      if (status === "completed" || status === "passed" || status === "failed") return;
    }

    // All slides must be visited
    const allVisited = this.state.visitedSlides.every(v => v);
    // All mandatory items must be completed
    const allMandatoryDone = [...this.mandatoryIds].every(
      id => this.state.mandatoryCompleted.includes(id)
    );

    if (allVisited && allMandatoryDone) {
      const { raw, max } = this.calculateScore();
      const passed = raw >= 50;
      const status = passed ? "passed" : "failed";

      if (this.scorm.isConnected) {
        this.scorm.setValue("cmi.core.lesson_status", status);
        this.scorm.setValue("cmi.core.score.raw", String(raw));
        this.scorm.setValue("cmi.core.score.max", String(max));
        this.scorm.setValue("cmi.core.score.min", "0");
        this.scorm.commit();
      }
      
      if (passed) {
        this.renderFeedback(`🎉 Course completed! Your score: ${raw}/${max}`, "correct");
      } else {
        this.renderFeedback(`Please redo the course. Your score: ${raw}/${max}`, "incorrect");
      }
      console.info(`[Runtime] Course marked as ${status} with score ${raw}/${max}.`);
    }
  }

  // -----------------------------------------------------------------------
  // State Persistence
  // -----------------------------------------------------------------------

  private persistState(): void {
    // Update elapsed time
    this.state.elapsedTime = Math.round((Date.now() - this.startTime) / 1000);

    if (!this.scorm.isConnected) return;

    const compressed = compressState(this.state, this.course.variables);
    this.scorm.setValue("cmi.suspend_data", compressed);

    // Update session time (SCORM 1.2 format: HHHH:MM:SS.SS)
    const totalSeconds = this.state.elapsedTime;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const sessionTime = `${String(hours).padStart(4, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.00`;
    this.scorm.setValue("cmi.core.session_time", sessionTime);

    this.scorm.commit();
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  private renderSlide(index: number): void {
    const slide = this.course.slides[index];
    if (!slide) return;

    const container = document.getElementById("cf-slide-container");
    if (!container) return;

    // Clear existing content
    container.innerHTML = "";

    // Render slide title
    const titleEl = document.createElement("h2");
    titleEl.className = "cf-rt-slide-title";
    titleEl.textContent = slide.title;
    container.appendChild(titleEl);

    // Render each layer
    for (const layer of slide.layers) {
      const layerEl = document.createElement("div");
      layerEl.className = "cf-rt-layer";
      layerEl.id = `layer-${layer.id}`;
      layerEl.dataset.layerId = layer.id;

      // Determine visibility
      const isVisible = this.state.layerVisibility[layer.id] ?? layer.visible;
      layerEl.style.display = isVisible ? "block" : "none";

      // Render components
      for (const comp of layer.components) {
        const compEl = this.renderComponent(comp);
        if (compEl) layerEl.appendChild(compEl);
      }

      container.appendChild(layerEl);
    }

    // Update navigation UI
    this.updateNavUI(index);
  }

  private renderComponent(comp: Component): HTMLElement | null {
    const wrapper = document.createElement("div");
    wrapper.className = "cf-rt-component";
    wrapper.id = `comp-${comp.id}`;

    switch (comp.type) {
      case "text": {
        const p = document.createElement("div");
        p.className = "cf-rt-text";
        p.innerHTML = comp.content;
        wrapper.appendChild(p);
        break;
      }

      case "heading": {
        const hTag = `h${comp.level || 2}` as keyof HTMLElementTagNameMap;
        const h = document.createElement(hTag);
        h.className = "cf-rt-heading";
        h.textContent = comp.content;
        wrapper.appendChild(h);
        break;
      }

      case "image": {
        wrapper.style.textAlign = 'center';
        const img = document.createElement("img");
        img.className = "cf-rt-image";
        img.src = comp.src;
        img.alt = comp.alt || "";
        img.loading = "lazy";
        img.style.width = comp.width || "100%";
        wrapper.appendChild(img);
        
        if (comp.caption) {
          const caption = document.createElement("div");
          caption.style.marginTop = "8px";
          caption.style.fontSize = "14px";
          caption.style.color = "#a1a1aa";
          caption.textContent = comp.caption;
          wrapper.appendChild(caption);
        }
        break;
      }

      case "video": {
        // Show mandatory badge if applicable
        if ((comp as any).mandatory) {
          const isComplete = this.state.mandatoryCompleted.includes(comp.id);
          const badge = document.createElement("div");
          badge.id = `mandatory-badge-${comp.id}`;
          badge.style.cssText = `font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;`;
          if (isComplete) {
            badge.textContent = "✓ COMPLETED";
            badge.style.background = "#052e16";
            badge.style.color = "#4ade80";
            badge.style.border = "1px solid #166534";
          } else {
            badge.textContent = "⚠ MANDATORY — Watch to continue";
            badge.style.background = "#2a0a0a";
            badge.style.color = "#f87171";
            badge.style.border = "1px solid #7f1d1d";
          }
          wrapper.appendChild(badge);
        }

        if (comp.embedType === "youtube" || comp.embedType === "vimeo") {
          const iframeWrap = document.createElement("div");
          iframeWrap.className = "cf-rt-video-wrap";
          const iframe = document.createElement("iframe");
          iframe.src = comp.src;
          iframe.allowFullscreen = true;
          iframe.className = "cf-rt-video-embed";
          iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
          iframeWrap.appendChild(iframe);
          wrapper.appendChild(iframeWrap);
          // For embedded videos, mark complete after 10 seconds of viewing the slide
          if ((comp as any).mandatory && !this.state.mandatoryCompleted.includes(comp.id)) {
            const compId = comp.id;
            setTimeout(() => {
              this.markMandatoryComplete(compId);
            }, 10000);
          }
        } else {
          const video = document.createElement("video");
          video.className = "cf-rt-video";
          video.controls = true;
          video.src = comp.src;
          // Track video completion for mandatory videos
          if ((comp as any).mandatory) {
            const compId = comp.id;
            video.addEventListener("ended", () => {
              this.markMandatoryComplete(compId);
            });
          }
          wrapper.appendChild(video);
        }
        break;
      }

      case "button": {
        const btn = document.createElement("button");
        btn.className = "cf-rt-button";
        btn.textContent = comp.label;
        btn.addEventListener("click", () => {
          if (comp.action) {
            this.fireTrigger({ type: "click", targetId: comp.id });
          }
        });
        wrapper.appendChild(btn);
        break;
      }

      case "quiz": {
        wrapper.className += " cf-rt-quiz-block";
        // Show mandatory badge if applicable
        if ((comp as any).mandatory) {
          const isComplete = this.state.mandatoryCompleted.includes(comp.id);
          const badge = document.createElement("div");
          badge.id = `mandatory-badge-${comp.id}`;
          badge.style.cssText = `font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;`;
          if (isComplete) {
            badge.textContent = "✓ COMPLETED";
            badge.style.background = "#052e16";
            badge.style.color = "#4ade80";
            badge.style.border = "1px solid #166534";
          } else {
            badge.textContent = "⚠ MANDATORY — Answer to continue";
            badge.style.background = "#2a0a0a";
            badge.style.color = "#f87171";
            badge.style.border = "1px solid #7f1d1d";
          }
          wrapper.appendChild(badge);
        }
        const quizDiv = document.createElement("div");
        quizDiv.innerHTML = this.renderQuizHTML(comp);
        wrapper.appendChild(quizDiv);
        // Attach event listeners after insertion (deferred)
        requestAnimationFrame(() => this.attachQuizListeners(comp.id));
        break;
      }

      case "flashcard": {
        wrapper.innerHTML = this.renderFlashcardHTML(comp);
        requestAnimationFrame(() => {
          const scene = wrapper.querySelector(".cf-rt-flashcard-scene") as HTMLElement;
          if (scene) {
            scene.addEventListener("click", () => {
              scene.classList.toggle("flipped");
            });
          }
        });
        break;
      }

      case "list": {
        const ul = document.createElement("ul");
        ul.className = "cf-rt-list";
        ul.style.paddingLeft = "20px";
        ul.style.margin = "0";
        ul.style.color = "#a1a1aa";
        for (const item of comp.items) {
          const li = document.createElement("li");
          li.style.marginBottom = "8px";
          li.style.lineHeight = "1.75";
          li.textContent = item;
          ul.appendChild(li);
        }
        wrapper.appendChild(ul);
        break;
      }

      case "quote": {
        const qdiv = document.createElement("div");
        qdiv.className = "cf-rt-quote";
        qdiv.style.borderLeft = "4px solid #8b1a1a";
        qdiv.style.padding = "16px";
        qdiv.style.background = "#1a1a1e";
        qdiv.style.borderRadius = "0 8px 8px 0";
        
        const text = document.createElement("div");
        text.style.fontSize = "18px";
        text.style.fontStyle = "italic";
        text.style.color = "#fafafa";
        text.innerHTML = `"${comp.content}"`;
        qdiv.appendChild(text);

        if (comp.author) {
          const auth = document.createElement("div");
          auth.style.marginTop = "8px";
          auth.style.fontSize = "14px";
          auth.style.color = "#a1a1aa";
          auth.style.fontWeight = "600";
          auth.textContent = `— ${comp.author}`;
          qdiv.appendChild(auth);
        }
        
        wrapper.appendChild(qdiv);
        break;
      }

      case "process": {
        wrapper.innerHTML = this.renderProcessHTML(comp);
        requestAnimationFrame(() => this.attachProcessListeners(comp.id, comp.steps.length));
        break;
      }

      default:
        return null;
    }

    return wrapper;
  }

  private renderQuizHTML(quiz: Extract<Component, { type: "quiz" }>): string {
    const optionsHtml = quiz.options.map((opt, idx) => `
      <label class="cf-rt-quiz-option" data-quiz-id="${quiz.id}" data-option-idx="${idx}">
        <input type="radio" name="quiz-${quiz.id}" value="${idx}" />
        <span class="cf-rt-quiz-option-text">${opt}</span>
      </label>
    `).join("");

    return `
      <div class="cf-rt-quiz-badge">QUIZ</div>
      <div class="cf-rt-quiz-question">${quiz.question}</div>
      <div class="cf-rt-quiz-options">${optionsHtml}</div>
      <button class="cf-rt-quiz-submit" data-quiz-id="${quiz.id}" disabled>Submit Answer</button>
      <div class="cf-rt-quiz-feedback" id="feedback-${quiz.id}"></div>
    `;
  }

  private attachQuizListeners(quizId: string): void {
    const submitBtn = document.querySelector(
      `.cf-rt-quiz-submit[data-quiz-id="${quizId}"]`
    ) as HTMLButtonElement | null;

    const radios = document.querySelectorAll(
      `input[name="quiz-${quizId}"]`
    ) as NodeListOf<HTMLInputElement>;

    if (!submitBtn) return;

    // Enable submit when an option is selected
    radios.forEach(radio => {
      radio.addEventListener("change", () => {
        submitBtn.disabled = false;
      });
    });

    // Submit handler
    submitBtn.addEventListener("click", () => {
      const selected = document.querySelector(
        `input[name="quiz-${quizId}"]:checked`
      ) as HTMLInputElement | null;

      if (selected) {
        submitBtn.disabled = true;
        // Disable all radios after submission
        radios.forEach(r => { r.disabled = true; });
        this.submitQuiz(quizId, Number(selected.value));
      }
    });
  }

  private renderFlashcardHTML(fc: Extract<Component, { type: "flashcard" }>): string {
    return `
      <div class="cf-rt-flashcard-scene">
        <div class="cf-rt-flashcard-inner">
          <div class="cf-rt-flashcard-face cf-rt-flashcard-front">
            <div class="cf-rt-flashcard-label">QUESTION</div>
            <div class="cf-rt-flashcard-text">${fc.front}</div>
            <div class="cf-rt-flashcard-hint">↻ Click to flip</div>
          </div>
          <div class="cf-rt-flashcard-face cf-rt-flashcard-back">
            <div class="cf-rt-flashcard-label">ANSWER</div>
            <div class="cf-rt-flashcard-text">${fc.back}</div>
            <div class="cf-rt-flashcard-hint">↻ Click to flip back</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderProcessHTML(comp: Extract<Component, { type: "process" }>): string {
    if (!comp.steps || comp.steps.length === 0) return `<p>No steps.</p>`;
    
    let html = `<div class="cf-rt-process-block" id="proc-${comp.id}" data-step="0" style="background:#1a1a1e;border-radius:12px;padding:24px;border:1px solid #27272a;">`;
    
    // Header
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">`;
    html += `<div style="font-weight:600;color:#c0392b;" id="proc-label-${comp.id}">Step 1 of ${comp.steps.length}</div>`;
    html += `<div>`;
    html += `<button class="cf-rt-nav-btn" style="padding:6px 12px;font-size:12px;margin-right:8px;" id="proc-prev-${comp.id}">Prev</button>`;
    html += `<button class="cf-rt-nav-btn cf-rt-nav-btn-primary" style="padding:6px 12px;font-size:12px;" id="proc-next-${comp.id}">Next</button>`;
    html += `</div></div>`;
    
    // Body
    html += `<div style="background:#09090b;padding:16px;border-radius:8px;min-height:120px;">`;
    comp.steps.forEach((step, i) => {
      html += `<div id="proc-step-${comp.id}-${i}" style="display:${i === 0 ? 'block' : 'none'};">`;
      html += `<h3 style="margin-bottom:8px;color:#fafafa;font-size:18px;">${step.title || ''}</h3>`;
      html += `<div style="color:#a1a1aa;line-height:1.6;">${step.content || ''}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
    
    // Dots
    html += `<div style="display:flex;justify-content:center;gap:6px;margin-top:16px;">`;
    for (let i = 0; i < comp.steps.length; i++) {
      html += `<div id="proc-dot-${comp.id}-${i}" style="width:8px;height:8px;border-radius:4px;background:${i === 0 ? '#8b1a1a' : '#27272a'};transition:background 0.2s;"></div>`;
    }
    html += `</div>`;
    
    html += `</div>`;
    return html;
  }

  private attachProcessListeners(id: string, len: number): void {
    const pBlock = document.getElementById(`proc-${id}`);
    const prevBtn = document.getElementById(`proc-prev-${id}`) as HTMLButtonElement;
    const nextBtn = document.getElementById(`proc-next-${id}`) as HTMLButtonElement;
    const label = document.getElementById(`proc-label-${id}`);
    
    if (!pBlock || !prevBtn || !nextBtn || !label) return;

    const update = () => {
      const s = parseInt(pBlock.getAttribute("data-step") || "0", 10);
      label.innerText = `Step ${s + 1} of ${len}`;
      prevBtn.disabled = s <= 0;
      nextBtn.disabled = s >= len - 1;
      
      for (let i = 0; i < len; i++) {
        const stepDiv = document.getElementById(`proc-step-${id}-${i}`);
        const dot = document.getElementById(`proc-dot-${id}-${i}`);
        if (stepDiv) stepDiv.style.display = i === s ? 'block' : 'none';
        if (dot) dot.style.background = i === s ? '#8b1a1a' : '#27272a';
      }
    };

    update();

    prevBtn.addEventListener("click", () => {
      let s = parseInt(pBlock.getAttribute("data-step") || "0", 10);
      if (s > 0) {
        s--;
        pBlock.setAttribute("data-step", String(s));
        update();
      }
    });

    nextBtn.addEventListener("click", () => {
      let s = parseInt(pBlock.getAttribute("data-step") || "0", 10);
      if (s < len - 1) {
        s++;
        pBlock.setAttribute("data-step", String(s));
        update();
      }
    });
  }

  private renderLayerVisibility(): void {
    const layerEls = document.querySelectorAll(".cf-rt-layer") as NodeListOf<HTMLElement>;
    layerEls.forEach(el => {
      const layerId = el.dataset.layerId;
      if (layerId) {
        const isVisible = this.state.layerVisibility[layerId] ?? true;
        el.style.display = isVisible ? "block" : "none";
      }
    });
  }

  private renderFeedback(message: string, type: "correct" | "incorrect" | "info" = "info"): void {
    // Try to insert feedback near the relevant quiz
    let container = document.querySelector(".cf-rt-quiz-feedback:empty") as HTMLElement | null;

    if (!container) {
      // Fallback: show a toast notification
      container = document.createElement("div");
      container.className = `cf-rt-toast cf-rt-toast-${type}`;
      container.textContent = message;
      document.body.appendChild(container);

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        container!.classList.add("cf-rt-toast-exit");
        setTimeout(() => container!.remove(), 300);
      }, 2000);
      return;
    }

    container.textContent = message;
    container.className = `cf-rt-quiz-feedback cf-rt-feedback-${type}`;
  }

  private updateNavUI(currentIndex: number): void {
    const total = this.course.slides.length;

    // Progress bar
    const progress = document.getElementById("cf-progress-bar") as HTMLElement | null;
    if (progress) {
      const pct = ((currentIndex + 1) / total) * 100;
      progress.style.width = `${pct}%`;
    }

    // Slide counter
    const counter = document.getElementById("cf-slide-counter");
    if (counter) {
      counter.textContent = `${currentIndex + 1} / ${total}`;
    }

    // Prev/Next buttons
    const prevBtn = document.getElementById("cf-prev-btn") as HTMLButtonElement | null;
    const nextBtn = document.getElementById("cf-next-btn") as HTMLButtonElement | null;
    if (prevBtn) prevBtn.disabled = currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= total - 1;
  }

  private registerKeyboardNav(): void {
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        this.nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        this.prevSlide();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Global Bootstrap
// ---------------------------------------------------------------------------

/**
 * This is the entry point called from the exported HTML.
 * The course data is embedded as a JSON object in a <script> tag.
 */
(window as any).CourseForgeRuntime = {
  boot: async (courseData: CourseDefinition) => {
    const runtime = new CourseForgeRuntime();
    await runtime.boot(courseData);

    // Expose navigation methods globally for the HTML buttons
    (window as any).__cfRuntime = runtime;
  },
};

// Auto-boot if course data is available on window
document.addEventListener("DOMContentLoaded", () => {
  const courseData = (window as any).__CF_COURSE_DATA;
  if (courseData) {
    (window as any).CourseForgeRuntime.boot(courseData);
  }
});
