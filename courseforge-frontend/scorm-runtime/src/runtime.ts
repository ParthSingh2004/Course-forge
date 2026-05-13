



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

const FILL_BLANK_TOKEN = /____/g;

function countFillBlankPlaceholders(question: string): number {
  const matches = String(question || "").match(FILL_BLANK_TOKEN);
  return matches ? matches.length : 0;
}

function normalizeFillBlankAnswers(component: any): string[] {
  const explicitAnswerCount = Array.isArray(component.answers) ? component.answers.length : 0;
  const desiredCount = Math.max(explicitAnswerCount, countFillBlankPlaceholders(component.question || ""), 1);
  const source = Array.isArray(component.answers) && component.answers.length > 0
    ? component.answers
    : [component.answer || ""];
  return Array.from({ length: desiredCount }, (_, index) => String(source[index] ?? ""));
}

function escapeAttribute(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function darkenColor(hex: string, amount: number = 30): string {
  if (!hex) return "#f0f0f0";
  let usePound = false;
  if (hex[0] === "#") {
    hex = hex.slice(1);
    usePound = true;
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) - amount;
  if (r < 0) r = 0;
  let g = ((num >> 8) & 0x00ff) - amount;
  if (g < 0) g = 0;
  let b = (num & 0x0000ff) - amount;
  if (b < 0) b = 0;
  return (
    (usePound ? "#" : "") +
    (b | (g << 8) | (r << 16)).toString(16).padStart(6, "0")
  );
}

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

  /**
   * FIX 1 — Cached LMS mastery score.
   * Read once from cmi.student_data.mastery_score immediately after
   * LMSInitialize() so that  always has the correct,
   * LMS-authoritative passing threshold available, even if the network or
   * LMS becomes unreachable later in the session.
   * null  → LMS did not supply a value; fall back to course policy.
   */
  private lmsMasteryScore: number | null = null;

  /**
   * FIX 2a — Guard against double-finish.
   * Set to true when the session has been cleanly closed via either the
   * explicit "Finish Course" button or the unload handler, so that the second
   * path does not call LMSFinish() a second time (some LMSes treat that as
   * an error that discards the session data).
   */
  private sessionFinished = false;

  /** Whether the sidebar panel is fully collapsed. Persisted in sessionStorage. */
  private sidebarCollapsed = false;

  // Background Audio
  private bgAudioElement: HTMLAudioElement | null = null;
  private bgAudioPausedByMedia = false;

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
      // ── FIX 1: Cache the LMS mastery score immediately after connect ────────
      // Querying this at boot guarantees we have the authoritative value for
      // the entire session. LMS administrators can override the passing score
      // inside the LMS portal; without this read the SCO would silently use
      // the stale value baked into the exported CourseDefinition.
      const rawMastery = this.scorm.getValue("cmi.student_data.mastery_score");
      const parsedMastery = parseFloat(rawMastery);
      this.lmsMasteryScore = (!isNaN(parsedMastery) && parsedMastery > 0)
        ? parsedMastery
        : null;

      if (this.lmsMasteryScore !== null) {
        console.info(`[Runtime] LMS mastery score override: ${this.lmsMasteryScore}% (course default: ${this.course.policy?.passingScore ?? 0}%)`);
      } else {
        console.info(
          `[Runtime] No LMS mastery score returned from cmi.student_data.mastery_score ` +
          `(raw: ${JSON.stringify(rawMastery)}, LMS error: ${this.scorm.lastError.code || "0"}) — ` +
          `using course policy: ${this.course.policy?.passingScore ?? 0}%`
        );
      }

      // ── FIX 2b/2c: Restore full session state ───────────────────────────────
      // Primary store: cmi.suspend_data (full compressed snapshot).
      // Fallback store: cmi.core.lesson_location (slide index bookmark).
      // Using suspend_data as the primary means quiz scores, visited slides,
      // mandatory-completed flags, variables, and elapsed time all survive a
      // browser refresh or mid-session close. lesson_location acts as a safety
      // net when suspend_data is absent or corrupt.
      const suspendData = this.scorm.getValue("cmi.suspend_data");
      const restored = decompressState(suspendData, slideCount, this.course.variables);

      if (restored) {
        this.state = restored;
        console.info("[Runtime] Resumed from suspend_data at slide", this.state.currentSlide);
      } else {
        // suspend_data was empty or could not be decoded. Build a clean slate
        // and then attempt to restore at least the slide position from
        // lesson_location so the learner is not unconditionally sent to slide 0.
        this.state = createInitialState(slideCount, this.course.variables);

        const locationRaw = this.scorm.getValue("cmi.core.lesson_location");
        const locationIdx = parseInt(locationRaw, 10);
        if (!isNaN(locationIdx) && locationIdx > 0 && locationIdx < slideCount) {
          this.state.currentSlide = locationIdx;
          console.info("[Runtime] suspend_data absent/corrupt — restored slide from lesson_location:", locationIdx);
        } else {
          console.info("[Runtime] Fresh start — no saved state found");
        }
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

    // ── Lesson Mode ──────────────────────────────────────────────────────────
    // The LMS sets cmi.core.lesson_mode to "review" when the learner re-opens
    // a completed course. We log it; no special action needed here since the
    // LMS controls attempt limits at the enrollment level (not inside the SCO).
    if (this.scorm.isConnected) {
      const lessonMode = this.scorm.getValue("cmi.core.lesson_mode");
      if (lessonMode) {
        console.info(`[Runtime] Lesson mode: ${lessonMode}`);
      }
    }

    // ── Build mandatory component index ──────────────────────────────────────
    for (const slide of this.course.slides) {
      for (const layer of slide.layers) {
        for (const comp of layer.components) {
          if (
            (comp.type === "quiz" || comp.type === "video" || comp.type === "audio" || comp.type === "interactive-video") &&
            (comp as any).mandatory
          ) {
            this.mandatoryIds.add(comp.id);
          }
          if (comp.type === "true_false" && comp.mandatory) this.mandatoryIds.add(comp.id);
          if (comp.type === "fill_blanks" && comp.mandatory) this.mandatoryIds.add(comp.id);
          if (comp.type === "multi_select" && comp.mandatory) this.mandatoryIds.add(comp.id);
          if (comp.type === "matching" && comp.mandatory) this.mandatoryIds.add(comp.id);
        }
      }
    }

    // Initialize trigger dispatcher (Web Worker with sync fallback)
    this.dispatcher = new TriggerDispatcher(this.course.triggers, this.slideIdToIndex);

    // Restore sidebar collapsed preference from the current LMS session
    try {
      const saved = sessionStorage.getItem("cf-sidebar-collapsed");
      if (saved === "1") this.sidebarCollapsed = true;
    } catch (_) { /* sessionStorage unavailable — default to expanded */ }

    // Start elapsed time tracking
    this.startTime = Date.now() - this.state.elapsedTime * 1000;

    // Auto-commit every 60 seconds
    this.autoCommitInterval = setInterval(() => {
      this.persistState();
    }, 60_000);

    // ── FIX 2a: On-unload flush ───────────────────────────────────────────────
    // Many LMS environments close the SCO iframe or popup without the learner
    // ever clicking "Finish Course". Without this handler the last ≤60 s of
    // progress is silently discarded and LMSFinish() is never called, which
    // some LMSes interpret as an incomplete/failed attempt.
    //
    // `pagehide` is preferred because it fires on mobile, on desktop browsers
    // that use the back-forward cache (bfcache), and when the tab is simply
    // closed. `beforeunload` is the traditional desktop fallback.
    //
    // The `sessionFinished` guard ensures that clicking "Finish Course" and
    // then closing the window does not call LMSFinish() twice.
    const handleUnload = (): void => {
      if (this.sessionFinished) return;
      this.sessionFinished = true;
      this.persistState();
      if (this.scorm.isConnected) {
        this.scorm.finish();
      }
    };

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

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

    // Register media event listeners for background audio ducking
    this.registerMediaListeners();

    // Persist initial state — also writes lesson_location for the starting slide
    // (covers resumed sessions where currentSlide > 0).
    this.persistState();

    console.info(
      `[Runtime] CourseForge runtime booted — ${slideCount} slides, ` +
      `${this.course.triggers.length} triggers, ` +
      `Worker: ${this.dispatcher.isUsingWorker}`
    );

    this.renderSidebar();
    this.bindNavigationButtons();

    // Wire the sidebar toggle button (static HTML — wired once in boot)
    const sidebarToggle = document.getElementById("cf-sidebar-toggle");
    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", () => this.toggleSidebar());
    }

    // Apply any restored collapsed state from sessionStorage
    this.applySidebarState();
  }

  private bindNavigationButtons(): void {
    const prevBtn = document.getElementById("cf-prev-btn") as HTMLButtonElement | null;
    const nextBtn = document.getElementById("cf-next-btn") as HTMLButtonElement | null;
    const restartBtn = document.getElementById("cf-restart-btn") as HTMLButtonElement | null;

    if (prevBtn && !prevBtn.dataset.bound) {
      prevBtn.dataset.bound = "true";
      prevBtn.addEventListener("click", () => {
        this.prevSlide();
      });
    }

    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.dataset.bound = "true";
      nextBtn.addEventListener("click", () => {
        this.nextSlide();
      });
    }

    if (restartBtn && !restartBtn.dataset.bound) {
      restartBtn.dataset.bound = "true";
      restartBtn.addEventListener("click", () => {
        this.restartCourse();
      });
    }
  }

  public restartCourse(): void {
    const slideCount = this.course.slides.length;
    this.state = createInitialState(slideCount, this.course.variables);
    this.startTime = Date.now();
    this.sessionFinished = false;

    this.state.visitedSlides[0] = true;
    this.renderSlide(0);
    this.renderSidebar();
    this.persistState();

    if (this.scorm.isConnected) {
      this.scorm.setValue("cmi.core.lesson_status", "incomplete");
      this.scorm.setValue("cmi.core.score.raw", "0");
      this.scorm.setValue("cmi.core.score.max", "100");
      this.scorm.setValue("cmi.core.score.min", "0");
      this.scorm.setValue("cmi.core.lesson_location", "0");
      this.scorm.commit();
    }

    this.renderFeedback("Course restarted from the beginning.", "info");
  }

  private registerMediaListeners(): void {
    const checkResumeBgAudio = () => {
      const playingMedia = Array.from(document.querySelectorAll("video, audio")).some(el => {
        const media = el as HTMLMediaElement;
        return media !== this.bgAudioElement && !media.paused && !media.ended;
      });

      if (!playingMedia && this.bgAudioElement && this.bgAudioPausedByMedia) {
        this.bgAudioElement.play().catch(e => console.warn("Auto-resume failed", e));
        this.bgAudioPausedByMedia = false;
      }
    };

    document.addEventListener("play", (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "VIDEO" || target.tagName === "AUDIO") {
        if (target !== this.bgAudioElement && this.bgAudioElement && !this.bgAudioElement.paused) {
          this.bgAudioElement.pause();
          this.bgAudioPausedByMedia = true;
        }
      }
    }, true); // use capture phase

    document.addEventListener("pause", (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "VIDEO" || target.tagName === "AUDIO") {
        if (target !== this.bgAudioElement) {
          setTimeout(checkResumeBgAudio, 50);
        }
      }
    }, true);

    document.addEventListener("ended", (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "VIDEO" || target.tagName === "AUDIO") {
        if (target !== this.bgAudioElement) {
          setTimeout(checkResumeBgAudio, 50);
        }
      }
    }, true);
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

    // Strict navigation guard (block skipping of mandatory slides)
    if (targetIdx > this.state.currentSlide) {
      for (let i = this.state.currentSlide; i < targetIdx; i++) {
        const slideToCheck = this.course.slides[i];
        if (slideToCheck && !this.areMandatoryItemsComplete(slideToCheck)) {
          this.renderFeedback(
            "Please complete all mandatory items on intermediate slides",
            "info"
          );
          return;
        }
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
    this.renderSidebar();

    // Persist state — this now also writes lesson_location (FIX 2b), so a
    // single call keeps both cmi.suspend_data and cmi.core.lesson_location
    // in sync with every navigation event.
    this.persistState();

    // Fire slideEnter on new slide
    const newSlide = this.course.slides[targetIdx];
    if (newSlide) {
      await this.fireTrigger({ type: "slideEnter", slideId: newSlide.id });
    }
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

    await this.fireTrigger({ type: "quizSubmit", quizId });

    const feedback = quizComponent.feedback;
    this.renderFeedback(
      isCorrect ? feedback.correct : feedback.incorrect,
      isCorrect ? "correct" : "incorrect"
    );

    if (this.mandatoryIds.has(quizId) && !this.state.mandatoryCompleted.includes(quizId)) {
      this.state.mandatoryCompleted.push(quizId);
    }

    this.persistState();
    this.reportScore();
  }

  async submitGenericQuiz(quizId: string, score: number): Promise<void> {
    const existing = this.state.quizScores[quizId] || { score: 0, maxScore: 1, attempts: 0 };
    this.state.quizScores[quizId] = {
      score,
      maxScore: 1,
      attempts: existing.attempts + 1,
    };

    await this.fireTrigger({ type: "quizSubmit", quizId });

    if (this.mandatoryIds.has(quizId) && !this.state.mandatoryCompleted.includes(quizId)) {
      this.state.mandatoryCompleted.push(quizId);

      const badge = document.getElementById(`mandatory-badge-${quizId}`);
      if (badge) {
        badge.textContent = "✓ COMPLETED";
        badge.style.background = "#052e16";
        badge.style.color = "#4ade80";
        badge.style.borderColor = "#166534";
      }
    }

    this.persistState();
    this.reportScore();
  }

  // -----------------------------------------------------------------------
  // Sidebar
  // -----------------------------------------------------------------------
  private toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.applySidebarState();
    try {
      sessionStorage.setItem("cf-sidebar-collapsed", this.sidebarCollapsed ? "1" : "0");
    } catch (_) { /* sessionStorage not available in all LMS sandboxes — silently ignore */ }
  }

  private applySidebarState(): void {
    const sidebar   = document.getElementById("cf-sidebar");
    const toggleBtn = document.getElementById("cf-sidebar-toggle");

    if (sidebar) {
      sidebar.classList.toggle("sidebar-collapsed", this.sidebarCollapsed);
    }
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-expanded", this.sidebarCollapsed ? "false" : "true");
    }
  }

  private renderSidebar(): void {
    const sidebar = document.getElementById("cf-sidebar");
    if (!sidebar) return;

    const progressText  = document.getElementById("cf-sidebar-progress-text");
    const progressBar   = document.getElementById("cf-sidebar-progress-bar");
    const menuContainer = document.getElementById("cf-sidebar-menu");

    if (!progressText || !progressBar || !menuContainer) return;

    const visitedCount = this.state.visitedSlides.filter(Boolean).length;
    const pct = Math.round((visitedCount / this.course.slides.length) * 100);
    progressText.textContent = `${pct}% COMPLETE`;
    progressBar.style.width = `${pct}%`;

    menuContainer.innerHTML = "";
    this.course.slides.forEach((slide, idx) => {
      const item = document.createElement("div");
      item.className = "cf-rt-menu-item";

      const isCurrent  = idx === this.state.currentSlide;
      const isVisited  = !!this.state.visitedSlides[idx];
      const isMandatoryComplete = this.areMandatoryItemsComplete(slide);

      if (isCurrent) item.classList.add("active");

      if (isVisited && isMandatoryComplete) {
        item.classList.add("completed");
      } else if (!isVisited) {
        item.classList.add("locked");
      }

      item.onclick = () => this.goToSlide(idx);

      const icon  = document.createElement("div");
      icon.className = "cf-rt-menu-item-icon";

      const title = document.createElement("div");
      title.className = "cf-rt-menu-item-title";
      title.textContent = slide.title || `Slide ${idx + 1}`;

      item.appendChild(icon);
      item.appendChild(title);
      menuContainer.appendChild(item);
    });
  }

  // -----------------------------------------------------------------------
  // Mandatory & Completion Logic
  // -----------------------------------------------------------------------
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

  markMandatoryComplete(compId: string): void {
    if (this.mandatoryIds.has(compId) && !this.state.mandatoryCompleted.includes(compId)) {
      this.state.mandatoryCompleted.push(compId);
      this.persistState();

      const badge = document.getElementById(`mandatory-badge-${compId}`);
      if (badge) {
        badge.textContent = "✓ COMPLETED";
        badge.style.background = "#052e16";
        badge.style.color = "#4ade80";
        badge.style.borderColor = "#166534";
      }
    }
  }

  private calculateScore(): { raw: number; max: number; pct: number } {
    const SCORABLE_TYPES = new Set(["quiz", "true_false", "fill_blanks", "multi_select", "matching"]);
    let maxPossibleScore = 0;
    let totalEarnedScore = 0;

    for (const slide of this.course.slides) {
      for (const layer of slide.layers) {
        for (const comp of layer.components) {
          if (SCORABLE_TYPES.has(comp.type)) {
            const m = (comp as any).marks;
            const weight = (typeof m === "number" && m > 0) ? m : 1;
            maxPossibleScore += weight;

            const result = this.state.quizScores[comp.id];
            if (result) {
              const maxScore = typeof result.maxScore === "number" && result.maxScore > 0 ? result.maxScore : 1;
              const normalizedScore = Math.max(0, Math.min(1, result.score / maxScore));
              totalEarnedScore += weight * normalizedScore;
            }
          }
        }
      }
    }

    if (maxPossibleScore === 0) {
      return { raw: 100, max: 100, pct: 100 };
    }

    const pct = Math.round((totalEarnedScore / maxPossibleScore) * 100);
    return { raw: totalEarnedScore, max: maxPossibleScore, pct };
  }

  private reportScore(): void {
    if (!this.scorm.isConnected) return;
    const { pct } = this.calculateScore();
    this.scorm.setValue("cmi.core.score.raw", String(pct));
    this.scorm.setValue("cmi.core.score.max", "100");
    this.scorm.setValue("cmi.core.score.min", "0");
    this.scorm.commit();
  }

  /**
   * Check if the course should be marked complete/passed.
   *
   * FIX 1 — Uses the cached `lmsMasteryScore` (read at boot from
   * cmi.student_data.mastery_score) as the authoritative passing threshold.
   * Falls back to the course-level passingScore only when the LMS did not
   * supply a mastery score. This ensures LMS-administrator overrides always
   * take precedence over the value baked into the exported package.
   */
  private checkCompletion(explicitFinish: boolean = false): void {
    if (!explicitFinish) {
      return;
    }

    const allMandatoryDone = [...this.mandatoryIds].every(
      id => this.state.mandatoryCompleted.includes(id)
    );
    const allSlidesVisited = this.state.visitedSlides.every(v => v === true);

    if (allMandatoryDone && allSlidesVisited) {
      const { raw, max, pct } = this.calculateScore();

      // FIX 1: Prefer the LMS-supplied mastery score cached at boot.
      // this.lmsMasteryScore is null when the LMS returned nothing meaningful
      // (empty string, "0", or NaN), in which case the course policy applies.
      const passingThreshold = this.lmsMasteryScore ?? this.course.policy?.passingScore ?? 0;

      const passed = pct >= passingThreshold;
      let status: string;
      
      if (passed) {
        status = "passed";
      } else if (explicitFinish) {
        status = "failed";
      } else {
        // The user hasn't met the passing threshold yet, and hasn't explicitly clicked Finish.
        // We do not mark as failed immediately to allow them to answer remaining questions.
        return;
      }

      if (this.scorm.isConnected) {
        this.scorm.setValue("cmi.core.lesson_status", status);
        this.scorm.setValue("cmi.core.score.raw", String(pct));
        this.scorm.setValue("cmi.core.score.max", "100");
        this.scorm.setValue("cmi.core.score.min", "0");
        this.scorm.commit();
      }

      console.info(
        `[Runtime] Course marked as ${status} — ${raw}/${max} marks ` +
        `(${pct}%, pass mark: ${passingThreshold}%, ` +
        `source: ${this.lmsMasteryScore !== null ? "LMS" : "course policy"}).`
      );
    }
  }

  // -----------------------------------------------------------------------
  // State Persistence
  // -----------------------------------------------------------------------

  /**
   * Persist the current runtime state to the LMS.
   *
   * FIX 2b — Now writes cmi.core.lesson_location on every call, not just
   * inside goToSlide(). This means the 60-second auto-commit, quiz submits,
   * mandatory completions, and the on-unload flush all keep lesson_location
   * in sync with suspend_data. Previously an auto-commit could save an
   * up-to-date suspend_data blob while leaving lesson_location pointing at a
   * stale slide, causing inconsistency between the two SCORM fields.
   */
  private persistState(): void {
    // Update elapsed time
    this.state.elapsedTime = Math.round((Date.now() - this.startTime) / 1000);

    if (!this.scorm.isConnected) return;

    // Primary persistence: full compressed state snapshot
    const compressed = compressState(this.state, this.course.variables);
    this.scorm.setValue("cmi.suspend_data", compressed);

    // FIX 2b: Keep lesson_location in sync on every persist, not just on
    // explicit navigation. This ensures the lightweight bookmark is always
    // correct even when the session ends between goToSlide() calls.
    this.scorm.setValue("cmi.core.lesson_location", String(this.state.currentSlide));

    // Session time (SCORM 1.2 format: HHHH:MM:SS.SS)
    const totalSeconds = this.state.elapsedTime;
    const hours = Math.floor(totalSeconds / 3600);
    const mins  = Math.floor((totalSeconds % 3600) / 60);
    const secs  = totalSeconds % 60;
    const sessionTime = `${String(hours).padStart(4, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.00`;
    this.scorm.setValue("cmi.core.session_time", sessionTime);

    this.scorm.commit();
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------
  private showAudioUnlockOverlay(): void {
    if (document.getElementById("cf-audio-unlock")) return;

    const overlay = document.createElement("div");
    overlay.id = "cf-audio-unlock";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; color: white; font-family: sans-serif;
    `;

    const btn = document.createElement("button");
    btn.innerHTML = "▶ Start Course / Enable Audio";
    btn.style.cssText = `
      background: #c0392b; color: white; border: none;
      padding: 16px 32px; font-size: 18px; font-weight: bold;
      border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      transition: transform 0.2s, background 0.2s;
    `;
    btn.onmouseover = () => btn.style.background = "#8b1a1a";
    btn.onmouseout  = () => btn.style.background = "#c0392b";

    btn.addEventListener("click", () => {
      if (this.bgAudioElement) {
        this.bgAudioElement.play().catch(e => console.warn("Still blocked after interaction:", e));
      }
      overlay.remove();
    });
    overlay.appendChild(btn);

    const hint = document.createElement("p");
    hint.textContent = "Your browser requires you to click before audio can play.";
    hint.style.cssText = "margin-top: 16px; font-size: 14px; color: #a1a1aa;";
    overlay.appendChild(hint);

    document.body.appendChild(overlay);
  }

  private renderSlide(index: number): void {
    const slide = this.course.slides[index];
    if (!slide) return;

    const container = document.getElementById("cf-slide-container");
    if (!container) return;

    // Apply slide background
    const bg = (slide as any).background;
    if (bg) {
      if (bg.type === "color" && bg.value) {
        container.style.backgroundColor = bg.value;
        container.style.backgroundImage = "none";
      } else if (bg.type === "image" && bg.value) {
        container.style.backgroundColor = "#ffffff";
        container.style.backgroundImage = `url("${bg.value}")`;
        container.style.backgroundSize = "cover";
        container.style.backgroundPosition = "center";
      }
    } else {
      container.style.backgroundColor = "#ffffff";
      container.style.backgroundImage = "none";
    }

    // Handle slide background audio
    const bgAudio  = (slide as any).bgAudio;
    const resolvedSrc = bgAudio ? (bgAudio.src || bgAudio.url) : null;

    const attemptPlay = () => {
      if (!this.bgAudioElement) return;
      this.bgAudioElement.play().catch(e => {
        console.warn("Background audio play blocked:", e);
        if (e.name === "NotAllowedError") {
          this.showAudioUnlockOverlay();
        }
      });
    };

    if (resolvedSrc) {
      if (!this.bgAudioElement) {
        this.bgAudioElement = document.createElement("audio");
        this.bgAudioElement.loop = true;
      }
      const newSrc = new URL(resolvedSrc, window.location.href).href;
      if (this.bgAudioElement.src !== newSrc) {
        this.bgAudioElement.pause();
        this.bgAudioElement.src = newSrc;
        this.bgAudioElement.currentTime = 0;
      }
    } else if (this.bgAudioElement) {
      this.bgAudioElement.pause();
      this.bgAudioElement.removeAttribute("src");
      this.bgAudioElement.load();
    }

    this.bgAudioPausedByMedia = false;

    if (this.bgAudioElement && this.bgAudioElement.src) {
      attemptPlay();
    }

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

      const isVisible = this.state.layerVisibility[layer.id] ?? layer.visible;
      layerEl.style.display = isVisible ? "block" : "none";

      for (const comp of layer.components) {
        const compEl = this.renderComponent(comp);
        if (compEl) layerEl.appendChild(compEl);
      }

      container.appendChild(layerEl);
    }

    this.updateNavUI(index);
  }

  private getEmbeddableVideoSrc(src: string, embedType: string): string {
    if (!src || (embedType !== "youtube" && embedType !== "vimeo")) return src;

    try {
      const url = new URL(src, window.location.href);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const path = url.pathname.replace(/^\/+/, "");

      if (embedType === "youtube") {
        let videoId = "";
        if (host === "youtu.be") {
          videoId = path.split("/")[0];
        } else if (path === "watch") {
          videoId = url.searchParams.get("v") || "";
        } else if (path.startsWith("embed/") || path.startsWith("shorts/") || path.startsWith("live/")) {
          videoId = path.split("/")[1] || "";
        }

        if (/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
          return `https://www.youtube.com/embed/${videoId}?rel=0`;
        }
      }

      if (embedType === "vimeo") {
        const match = path.match(/\d+/);
        if (match) {
          return `https://player.vimeo.com/video/${match[0]}`;
        }
      }
    } catch {
      return src;
    }

    return src;
  }

  private getAnimationFrames(animation: string): Keyframe[] | null {
    switch (animation) {
      case "fade-in":
        return [{ opacity: 0 }, { opacity: 1 }];
      case "fade-in-up":
        return [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "translateY(0)" }];
      case "slide-in-left":
        return [{ opacity: 0, transform: "translateX(-30px)" }, { opacity: 1, transform: "translateX(0)" }];
      case "slide-in-right":
        return [{ opacity: 0, transform: "translateX(30px)" }, { opacity: 1, transform: "translateX(0)" }];
      case "slide-in-up":
        return [{ opacity: 0, transform: "translateY(30px)" }, { opacity: 1, transform: "translateY(0)" }];
      case "slide-in-down":
        return [{ opacity: 0, transform: "translateY(-30px)" }, { opacity: 1, transform: "translateY(0)" }];
      case "zoom-in":
        return [{ opacity: 0, transform: "scale(0.95)" }, { opacity: 1, transform: "scale(1)" }];
      case "zoom-out":
        return [{ opacity: 0, transform: "scale(1.05)" }, { opacity: 1, transform: "scale(1)" }];
      case "flip-in":
        return [{ opacity: 0, transform: "perspective(400px) rotateX(90deg)" }, { opacity: 1, transform: "perspective(400px) rotateX(0deg)" }];
      case "bounce-in":
        return [
          { opacity: 0, transform: "scale(0.3)" },
          { opacity: 1, transform: "scale(1.05)", offset: 0.5 },
          { opacity: 1, transform: "scale(0.9)", offset: 0.7 },
          { opacity: 1, transform: "scale(1)" },
        ];
      default:
        return null;
    }
  }

  private applyComponentAnimation(el: HTMLElement, animation: string, delaySeconds: number): void {
    if (!animation || animation === "none") {
      el.style.opacity = "1";
      return;
    }

    const frames = this.getAnimationFrames(animation);
    if (!frames) {
      el.style.opacity = "1";
      return;
    }

    const delayMs = Math.max(0, delaySeconds || 0) * 1000;
    el.style.opacity = "0";

    requestAnimationFrame(() => {
      if (typeof el.animate === "function") {
        const player = el.animate(frames, {
          duration: 600,
          delay: delayMs,
          easing: "ease-out",
          fill: "forwards",
        });
        player.onfinish = () => {
          el.style.opacity = "1";
        };
        player.oncancel = () => {
          el.style.opacity = "1";
        };
      } else {
        el.style.animationDelay = `${delaySeconds || 0}s`;
        el.classList.add(`animate-${animation}`);
        setTimeout(() => {
          el.style.opacity = "1";
        }, delayMs + 650);
      }
    });
  }

  private renderComponent(comp: Component): HTMLElement | null {
    const wrapper = document.createElement("div");
    const animation = (comp as any).animation || "none";
    wrapper.className = "cf-rt-component";
    wrapper.id = `comp-${comp.id}`;

    const delay = (comp as any).animationDelay || 0;

    // Apply blockFormat styles (set by the author in the Format panel)
    const fmt = (comp as any).blockFormat as Record<string, any> | undefined;
    if (fmt) {
      // Background color
      if (fmt.bgColor && fmt.bgColor !== 'none') {
        const alpha = fmt.bgOpacity !== undefined ? fmt.bgOpacity : 1;
        const hex = fmt.bgColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        wrapper.style.background = `rgba(${r},${g},${b},${alpha})`;
      }
      // Background image
      if (fmt.bgImage) {
        wrapper.style.backgroundImage = `url('${fmt.bgImage}')`;
        wrapper.style.backgroundSize = fmt.bgImageSize || 'cover';
        wrapper.style.backgroundPosition = 'center';
        wrapper.style.backgroundRepeat = 'no-repeat';
      }
      // Padding
      if (fmt.paddingV !== undefined || fmt.paddingH !== undefined) {
        wrapper.style.padding = `${fmt.paddingV ?? 10}px ${fmt.paddingH ?? 12}px`;
      }
      // Border radius
      if (fmt.borderRadius !== undefined) {
        wrapper.style.borderRadius = `${fmt.borderRadius}px`;
      }
      // Border
      if (fmt.borderWidth && fmt.borderWidth > 0) {
        wrapper.style.border = `${fmt.borderWidth}px solid ${fmt.borderColor || '#e8c8c8'}`;
      }
      // Width / centering
      if (fmt.width && fmt.width !== '100%') {
        wrapper.style.width = fmt.width;
        wrapper.style.marginLeft = 'auto';
        wrapper.style.marginRight = 'auto';
      }
      // Min height (block length)
      if (fmt.minHeight && fmt.minHeight > 0) {
        wrapper.style.minHeight = `${fmt.minHeight}px`;
      }
    }

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
        h.innerHTML = comp.content;
        wrapper.appendChild(h);
        break;
      }

      case "image": {
        wrapper.style.textAlign = "center";
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

      case "image-hotspot": {
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        wrapper.style.width = "100%";

        const img = document.createElement("img");
        img.src = comp.src;
        img.style.width = "100%";
        img.style.borderRadius = "8px";
        img.style.display = "block";
        wrapper.appendChild(img);

        let activeHotspotId: string | null = null;
        let activePopup: HTMLDivElement | null = null;

        const closePopup = () => {
          if (activePopup) {
            activePopup.remove();
            activePopup = null;
          }
          activeHotspotId = null;
        };

        const hotspots = comp.hotspots || [];
        hotspots.forEach(hotspot => {
          const dot = document.createElement("div");
          dot.style.position = "absolute";
          dot.style.left = `${hotspot.x}%`;
          dot.style.top = `${hotspot.y}%`;
          dot.style.width = "24px";
          dot.style.height = "24px";
          dot.style.backgroundColor = "#b91c1c";
          dot.style.borderRadius = "50%";
          dot.style.border = "2px solid white";
          dot.style.transform = "translate(-50%, -50%)";
          dot.style.cursor = "pointer";
          dot.style.zIndex = "10";

          dot.onclick = (e) => {
            e.stopPropagation();
            if (activeHotspotId === hotspot.id) {
              closePopup();
            } else {
              closePopup();
              activeHotspotId = hotspot.id;

              activePopup = document.createElement("div");
              activePopup.style.position = "absolute";
              activePopup.style.top = `${hotspot.y}%`;
              activePopup.style.left = `${hotspot.x}%`;
              activePopup.style.transform = `translate(${hotspot.x > 50 ? '-105%' : '5%'}, ${hotspot.y > 50 ? '-105%' : '5%'})`;
              activePopup.style.background = hotspot.popupColor || "#000";
              activePopup.style.border = "1px solid #404040";
              activePopup.style.color = "#fff";
              activePopup.style.padding = "1rem";
              activePopup.style.borderRadius = "6px";
              activePopup.style.zIndex = "50";
              activePopup.style.minWidth = "250px";
              activePopup.style.maxWidth = "300px";

              const header = document.createElement("div");
              header.style.display = "flex";
              header.style.justifyContent = "space-between";
              header.style.alignItems = "center";
              header.style.marginBottom = "0.5rem";

              const title = document.createElement("h4");
              title.style.margin = "0";
              title.style.fontSize = "1.1rem";
              title.textContent = hotspot.title;

              const closeBtn = document.createElement("button");
              closeBtn.textContent = "X";
              closeBtn.style.background = "transparent";
              closeBtn.style.border = "none";
              closeBtn.style.color = "#a3a3a3";
              closeBtn.style.cursor = "pointer";
              closeBtn.onclick = closePopup;

              header.appendChild(title);
              header.appendChild(closeBtn);

              const content = document.createElement("p");
              content.style.margin = "0";
              content.style.fontSize = "0.9rem";
              content.style.lineHeight = "1.5";
              content.textContent = hotspot.content;

              activePopup.appendChild(header);
              activePopup.appendChild(content);

              wrapper.appendChild(activePopup);
            }
          };

          wrapper.appendChild(dot);
        });

        break;
      }

      case "tabs": {
        const tabs: any[] = (comp as any).tabs || [];
        if (tabs.length === 0) break;

        let currentTab = 0;

        const renderTabContent = () => {
          wrapper.innerHTML = "";
          
          // Tab bar
          const tabBar = document.createElement("div");
          tabBar.style.cssText = "display:flex;gap:0.5rem;border-bottom:1px solid #EAD0D0;margin-bottom:1rem;overflow-x:auto;padding-bottom:0.5rem;";
          
          tabs.forEach((tab, i) => {
            const btn = document.createElement("button");
            btn.textContent = tab.title || `Tab ${i + 1}`;
            btn.style.cssText = `padding:0.5rem 1rem;cursor:pointer;font-weight:${i === currentTab ? 600 : 400};color:${i === currentTab ? '#8B1A1A' : '#666'};border:none;background:transparent;border-bottom:${i === currentTab ? '2px solid #8B1A1A' : '2px solid transparent'};white-space:nowrap;font-family:inherit;font-size:1rem;`;
            btn.onclick = () => {
              currentTab = i;
              renderTabContent();
            };
            tabBar.appendChild(btn);
          });
          wrapper.appendChild(tabBar);

          // Content area
          const contentArea = document.createElement("div");
          contentArea.style.cssText = "background:#FDF8F8;border-radius:8px;padding:1.5rem;border:1px solid #F0E0E0;";

          const activeTab = tabs[currentTab];
          
          const titleEl = document.createElement("h3");
          titleEl.style.cssText = "margin:0 0 1rem 0;color:#1A0A0A;font-size:1.25rem;";
          titleEl.textContent = activeTab.title;
          contentArea.appendChild(titleEl);

          const innerFlex = document.createElement("div");
          innerFlex.style.cssText = "display:flex;gap:1.5rem;flex-direction:column;";

          if (activeTab.image) {
            const imgWrap = document.createElement("div");
            imgWrap.style.cssText = "width:100%;max-width:300px;margin:0 auto;";
            const img = document.createElement("img");
            img.src = activeTab.image;
            img.style.cssText = "width:100%;border-radius:8px;object-fit:contain;max-height:200px;";
            imgWrap.appendChild(img);
            innerFlex.appendChild(imgWrap);
          }

          if (activeTab.content) {
            const textEl = document.createElement("div");
            textEl.style.cssText = "line-height:1.6;color:#333;";
            textEl.innerHTML = activeTab.content;
            innerFlex.appendChild(textEl);
          }

          contentArea.appendChild(innerFlex);
          wrapper.appendChild(contentArea);

          // Prev/Next Nav
          const navArea = document.createElement("div");
          navArea.style.cssText = "display:flex;justify-content:space-between;margin-top:1rem;align-items:center;";

          const prevBtn = document.createElement("button");
          prevBtn.textContent = "← Prev";
          prevBtn.disabled = currentTab === 0;
          prevBtn.style.cssText = `padding:0.5rem 1rem;border-radius:4px;border:1px solid #EAD0D0;background:${currentTab === 0 ? '#F5F0EE' : 'white'};color:${currentTab === 0 ? '#C4A0A0' : '#8B1A1A'};cursor:${currentTab === 0 ? 'not-allowed' : 'pointer'};font-family:inherit;font-size:0.875rem;`;
          prevBtn.onclick = () => {
            if (currentTab > 0) {
              currentTab--;
              renderTabContent();
            }
          };

          const slideCount = document.createElement("div");
          slideCount.style.cssText = "font-size:0.875rem;color:#666;";
          slideCount.textContent = `Slide ${currentTab + 1} of ${tabs.length}`;

          const nextBtn = document.createElement("button");
          nextBtn.textContent = "Next →";
          nextBtn.disabled = currentTab === tabs.length - 1;
          nextBtn.style.cssText = `padding:0.5rem 1rem;border-radius:4px;border:1px solid #EAD0D0;background:${currentTab === tabs.length - 1 ? '#F5F0EE' : 'white'};color:${currentTab === tabs.length - 1 ? '#C4A0A0' : '#8B1A1A'};cursor:${currentTab === tabs.length - 1 ? 'not-allowed' : 'pointer'};font-family:inherit;font-size:0.875rem;`;
          nextBtn.onclick = () => {
            if (currentTab < tabs.length - 1) {
              currentTab++;
              renderTabContent();
            }
          };

          navArea.appendChild(prevBtn);
          navArea.appendChild(slideCount);
          navArea.appendChild(nextBtn);

          wrapper.appendChild(navArea);
        };

        renderTabContent();
        break;
      }
      case "image-stack": {
        const stackSlides: any[] = (comp as any).slides || [];
        let stackIdx = 0;
        const quizDone: Record<string, boolean> = {};

        const renderStack = () => {
          wrapper.innerHTML = "";
          const slide = stackSlides[stackIdx];
          if (!slide) return;

          // Progress bar
          const pct = Math.round(((stackIdx + 1) / stackSlides.length) * 100);
          const progRow = document.createElement("div");
          progRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;";
          const label = document.createElement("span");
          label.style.cssText = "font-size:0.78rem;color:#a3a3a3;white-space:nowrap;";
          label.textContent = slide.type === "quiz" ? "🧩 Quiz" : `Slide ${stackIdx + 1} / ${stackSlides.length}`;
          const progTrack = document.createElement("div");
          progTrack.style.cssText = "flex:1;height:4px;border-radius:2px;background:#2a2a2a;overflow:hidden;";
          const progFill = document.createElement("div");
          progFill.style.cssText = `width:${pct}%;height:100%;background:#8B1A1A;transition:width 0.3s;`;
          progTrack.appendChild(progFill);
          const pctLabel = document.createElement("span");
          pctLabel.style.cssText = "font-size:0.78rem;color:#a3a3a3;";
          pctLabel.textContent = `${pct}%`;
          progRow.appendChild(label); progRow.appendChild(progTrack); progRow.appendChild(pctLabel);
          wrapper.appendChild(progRow);

          // Slide card
          const card = document.createElement("div");
          card.style.cssText = "border-radius:10px;overflow:hidden;border:1px solid #2a2a2a;min-height:160px;background:#111;";

          if (slide.type === "image") {
            if (slide.imageUrl) {
              const img = document.createElement("img");
              img.src = slide.imageUrl;
              img.style.cssText = "width:100%;max-height:400px;object-fit:cover;display:block;";
              card.appendChild(img);
            }
            if (slide.caption) {
              const cap = document.createElement("div");
              cap.style.cssText = "padding:10px 14px;background:rgba(0,0,0,0.6);color:#d4d4d4;font-size:0.9rem;line-height:1.5;";
              cap.textContent = slide.caption;
              card.appendChild(cap);
            }
          } else if (slide.type === "quiz") {
            const qWrap = document.createElement("div");
            qWrap.style.cssText = "padding:18px;";

            const qTitle = document.createElement("p");
            qTitle.style.cssText = "color:#fff;font-weight:600;font-size:1rem;margin:0 0 14px 0;";
            qTitle.textContent = slide.question || "Quiz question";
            qWrap.appendChild(qTitle);

            const feedbackEl = document.createElement("div");

            (slide.options || []).forEach((opt: string, oi: number) => {
              const btn = document.createElement("button");
              btn.style.cssText = "width:100%;text-align:left;background:#1c1c1c;border:1px solid #404040;color:#d4d4d4;padding:9px 14px;border-radius:6px;cursor:pointer;font-size:0.9rem;margin-bottom:8px;transition:all 0.2s;";
              btn.textContent = opt || `Option ${oi + 1}`;
              btn.onclick = () => {
                const correct = oi === slide.correctIndex;
                if (correct) {
                  quizDone[slide.id] = true;
                  btn.style.background = "#052e16"; btn.style.borderColor = "#166534"; btn.style.color = "#4ade80";
                  feedbackEl.innerHTML = `<div style="margin-top:10px;padding:9px 14px;background:#052e16;border:1px solid #166534;border-radius:6px;color:#4ade80;font-weight:600;font-size:0.88rem;">✅ Correct! You can continue.</div>`;
                  nextBtn.disabled = false;
                  nextBtn.style.opacity = "1";
                  nextBtn.style.cursor = "pointer";
                  nextBtn.textContent = "Next →";
                } else {
                  feedbackEl.innerHTML = `<div style="margin-top:10px;padding:9px 14px;background:#2a0a0a;border:1px solid #7f1d1d;border-radius:6px;color:#f87171;font-weight:600;font-size:0.88rem;display:flex;align-items:center;justify-content:space-between;">
                    <span>❌ Incorrect — try again!</span>
                    <button onclick="this.closest('[data-cf-feedback]').previousSibling && void 0" style="background:#7f1d1d;border:none;color:#fca5a5;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.8rem;" id="stack-retry-${slide.id}-${stackIdx}">Try Again</button>
                  </div>`;
                  // Re-enable buttons on Try Again
                  const retryBtn = document.getElementById(`stack-retry-${slide.id}-${stackIdx}`);
                  if (retryBtn) retryBtn.onclick = () => {
                    feedbackEl.innerHTML = "";
                    optBtns.forEach(b => { b.disabled = false; b.style.background = "#1c1c1c"; b.style.borderColor = "#404040"; b.style.color = "#d4d4d4"; });
                  };
                }
                optBtns.forEach(b => { b.disabled = true; });
              };
              qWrap.appendChild(btn);
            });

            const optBtns = Array.from(qWrap.querySelectorAll("button")) as HTMLButtonElement[];
            feedbackEl.setAttribute("data-cf-feedback", "1");
            qWrap.appendChild(feedbackEl);
            card.appendChild(qWrap);
          }

          wrapper.appendChild(card);

          // Nav row
          const nav = document.createElement("div");
          nav.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-top:10px;";

          const prevBtn = document.createElement("button");
          prevBtn.textContent = "← Prev";
          prevBtn.disabled = stackIdx === 0;
          prevBtn.style.cssText = `padding:6px 14px;border-radius:6px;border:1px solid #2a2a2a;background:${stackIdx === 0 ? "#111" : "#1c1c1c"};color:${stackIdx === 0 ? "#555" : "#d4d4d4"};cursor:${stackIdx === 0 ? "not-allowed" : "pointer"};font-size:0.85rem;`;
          prevBtn.onclick = () => { if (stackIdx > 0) { stackIdx--; renderStack(); } };

          // Dots
          const dots = document.createElement("div");
          dots.style.cssText = "display:flex;gap:6px;align-items:center;";
          stackSlides.forEach((s: any, di: number) => {
            const d = document.createElement("div");
            d.style.cssText = `width:${di === stackIdx ? "20px" : "8px"};height:8px;border-radius:4px;background:${di === stackIdx ? "#8B1A1A" : s.type === "quiz" ? "#4b5563" : "#3a3a3a"};transition:all 0.2s;`;
            dots.appendChild(d);
          });

          const isQuizBlocked = slide.type === "quiz" && !quizDone[slide.id];
          const nextBtn = document.createElement("button");
          nextBtn.textContent = isQuizBlocked ? "🔒 Answer to continue" : "Next →";
          nextBtn.disabled = stackIdx >= stackSlides.length - 1 || isQuizBlocked;
          nextBtn.style.cssText = `padding:6px 14px;border-radius:6px;border:1px solid #2a2a2a;background:${isQuizBlocked ? "#2a0a0a" : "#1c1c1c"};color:${(stackIdx >= stackSlides.length - 1 || isQuizBlocked) ? "#555" : "#d4d4d4"};cursor:${(stackIdx >= stackSlides.length - 1 || isQuizBlocked) ? "not-allowed" : "pointer"};font-size:0.85rem;`;
          nextBtn.onclick = () => { if (stackIdx < stackSlides.length - 1 && !isQuizBlocked) { stackIdx++; renderStack(); } };

          nav.appendChild(prevBtn); nav.appendChild(dots); nav.appendChild(nextBtn);
          wrapper.appendChild(nav);
        };

        renderStack();
        break;
      }

      case "interactive-video": {
        wrapper.style.position = "relative";

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
          const message = document.createElement("div");
          message.style.cssText = [
            "padding:24px",
            "border:1px solid #7f1d1d",
            "border-radius:8px",
            "background:#1a0a0a",
            "color:#fca5a5",
            "line-height:1.5",
          ].join(";");
          message.innerHTML = [
            "<strong>Interactive video requires an uploaded video file.</strong>",
            "<br />",
            "YouTube and Vimeo embeds cannot expose playback timing to this SCORM player.",
          ].join("");
          wrapper.appendChild(message);
          break;
        }
        
        const video = document.createElement("video");
        video.className = "cf-rt-video";
        video.controls = true;
        video.src = comp.src;
        video.style.width = "100%";
        video.style.borderRadius = "8px";
        video.style.background = "#000";
        wrapper.appendChild(video);

        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(0,0,0,0.9)";
        overlay.style.display = "none";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.borderRadius = "8px";
        overlay.style.zIndex = "10";
        overlay.style.padding = "2rem";
        wrapper.appendChild(overlay);

        const interactions = comp.interactions || [];

        if ((comp as any).mandatory) {
          let maxWatched = 0;
          video.addEventListener("timeupdate", () => {
            if (!video.seeking) {
              maxWatched = Math.max(maxWatched, video.currentTime);
            }
          });
          video.addEventListener("seeking", () => {
            if (video.currentTime > maxWatched + 1) {
              video.currentTime = maxWatched;
            }
          });
          video.addEventListener("ended", () => {
            const allInteractionsCompleted = interactions.every(int => int.completed);
            if (allInteractionsCompleted) {
              this.markMandatoryComplete(comp.id);
            }
          });
        }
        
        video.addEventListener("timeupdate", () => {
          const currentTime = video.currentTime;
          const hit = interactions.find(int => {
            const timestamp = Number(int.timestamp || 0);
            return !int.completed && currentTime >= timestamp && currentTime <= timestamp + 0.75;
          });

          if (hit && overlay.style.display === "none") {
            video.pause();
            overlay.innerHTML = "";
            overlay.style.display = "flex";
            video.controls = false;

            const container = document.createElement("div");
            container.style.textAlign = "center";
            container.style.width = "100%";
            container.style.maxWidth = "500px";

            const q = document.createElement("h3");
            q.style.color = "#fff";
            q.style.marginBottom = "1.5rem";
            q.style.fontSize = "1.25rem";
            q.style.fontWeight = "600";
            q.textContent = hit.question;
            container.appendChild(q);

            const optionsDiv = document.createElement("div");
            optionsDiv.style.display = "flex";
            optionsDiv.style.flexDirection = "column";
            optionsDiv.style.gap = "0.75rem";

            hit.options.forEach((opt, i) => {
              const btn = document.createElement("button");
              btn.textContent = opt;
              btn.style.background = "#171717";
              btn.style.color = "#fff";
              btn.style.border = "1px solid #450a0a";
              btn.style.padding = "0.75rem";
              btn.style.borderRadius = "6px";
              btn.style.cursor = "pointer";
              btn.style.transition = "background 0.2s";
              btn.style.fontSize = "1rem";

              btn.onclick = () => {
                const requireCorrectToContinue = hit.requireCorrectToContinue !== false;
                const answeredCorrectly = i === hit.correctAnswerIndex;
                const feedbackId = "quiz-feedback-" + hit.id;
                let feedback = container.querySelector<HTMLParagraphElement>("#" + feedbackId);
                if (!feedback) {
                  feedback = document.createElement("p");
                  feedback.id = feedbackId;
                  feedback.style.marginTop = "1rem";
                  feedback.style.fontWeight = "600";
                  container.appendChild(feedback);
                }

                if (answeredCorrectly) {
                  btn.style.background = "#16a34a";
                  feedback.textContent = "Correct! You can now continue.";
                  feedback.style.color = "#4ade80";
                  
                  // Disable other buttons
                  optionsDiv.querySelectorAll("button").forEach(b => {
                    (b as HTMLButtonElement).disabled = true;
                    if (b !== btn) (b as HTMLButtonElement).style.opacity = "0.5";
                  });

                  const continueBtn = document.createElement("button");
                  continueBtn.textContent = "Continue Video";
                  continueBtn.style.background = "#8b1a1a";
                  continueBtn.style.color = "#fff";
                  continueBtn.style.padding = "0.75rem 2rem";
                  continueBtn.style.border = "none";
                  continueBtn.style.borderRadius = "6px";
                  continueBtn.style.cursor = "pointer";
                  continueBtn.style.fontWeight = "700";
                  continueBtn.style.marginTop = "1rem";
                  continueBtn.onclick = () => {
                    hit.completed = true;
                    overlay.style.display = "none";
                    video.controls = true;
                    video.play();
                  };
                  container.appendChild(continueBtn);
                } else if (!requireCorrectToContinue) {
                  feedback.textContent = "Incorrect, but you can continue.";
                  feedback.style.color = "#fbbf24";

                  optionsDiv.querySelectorAll("button").forEach(b => {
                    (b as HTMLButtonElement).disabled = true;
                    if (b !== btn) (b as HTMLButtonElement).style.opacity = "0.5";
                  });

                  const continueBtn = document.createElement("button");
                  continueBtn.textContent = "Continue Video";
                  continueBtn.style.background = "#8b1a1a";
                  continueBtn.style.color = "#fff";
                  continueBtn.style.padding = "0.75rem 2rem";
                  continueBtn.style.border = "none";
                  continueBtn.style.borderRadius = "6px";
                  continueBtn.style.cursor = "pointer";
                  continueBtn.style.fontWeight = "700";
                  continueBtn.style.marginTop = "1rem";
                  continueBtn.onclick = () => {
                    hit.completed = true;
                    overlay.style.display = "none";
                    video.controls = true;
                    video.play();
                  };
                  container.appendChild(continueBtn);
                } else {
                  btn.style.background = "#7f1d1d";
                  feedback.textContent = "Incorrect answer. Please try again.";
                  feedback.style.color = "#f87171";
                  setTimeout(() => {
                    btn.style.background = "#171717";
                  }, 1200);
                }
              };
              optionsDiv.appendChild(btn);
            });

            container.appendChild(optionsDiv);
            overlay.appendChild(container);
          }
        });

        break;
      }

      case "video": {
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
          iframe.src = this.getEmbeddableVideoSrc(comp.src, comp.embedType);
          iframe.allowFullscreen = true;
          iframe.className = "cf-rt-video-embed";
          iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
          iframeWrap.appendChild(iframe);
          wrapper.appendChild(iframeWrap);

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

          if ((comp as any).mandatory) {
            const compId = comp.id;
            const isAlreadyComplete = this.state.mandatoryCompleted.includes(compId);

            if (!isAlreadyComplete) {
              let maxWatched = 0;
              video.addEventListener("timeupdate", () => {
                if (!video.seeking) {
                  maxWatched = Math.max(maxWatched, video.currentTime);
                }
              });
              video.addEventListener("seeking", () => {
                if (video.currentTime > maxWatched + 1) {
                  video.currentTime = maxWatched;
                }
              });
            }

            video.addEventListener("ended", () => {
              this.markMandatoryComplete(compId);
            });
          }

          wrapper.appendChild(video);
        }
        break;
      }

      case "button": {
        const alignment = String((comp as any).alignment || "center").toLowerCase();
        wrapper.style.display = "flex";
        wrapper.style.width = "100%";
        wrapper.style.justifyContent =
          alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center";
        const btn = document.createElement("button");
        btn.className = "cf-rt-button";
        btn.textContent = comp.label;
        btn.addEventListener("click", () => {
          if (comp.targetSlideId) {
            this.goToSlide(comp.targetSlideId);
            return;
          }
          if (comp.action) {
            this.fireTrigger({ type: "click", targetId: comp.id });
          }
        });
        wrapper.appendChild(btn);
        break;
      }

      case "quiz": {
        wrapper.className += " cf-rt-quiz-block";

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
        requestAnimationFrame(() => this.attachQuizListeners(comp.id));
        break;
      }

      case "true_false": {
        wrapper.className += " cf-rt-quiz-block";
        const tfId = comp.id;
        const isComplete = this.state.mandatoryCompleted.includes(tfId);

        if (comp.mandatory) {
          const badge = document.createElement("div");
          badge.id = `mandatory-badge-${tfId}`;
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

        const tfDiv = document.createElement("div");
        const tfCorrectStr = comp.correctAnswer ? "true" : "false";
        const existingScore = this.state.quizScores[tfId];
        const isCorrectAlready = existingScore && existingScore.score > 0;

        tfDiv.innerHTML = `
          <div class="cf-rt-quiz-badge">TRUE / FALSE</div>
          <div class="cf-rt-quiz-question">${comp.question}</div>
          <div class="cf-rt-quiz-options">
            <label class="cf-rt-quiz-option" data-quiz-id="${tfId}" data-option-idx="true" ${isCorrectAlready ? 'style="opacity:0.6;cursor:not-allowed;"' : ""}>
              <input type="radio" name="tf-${tfId}" value="true" ${isCorrectAlready ? "disabled" : ""} ${isCorrectAlready && comp.correctAnswer === true ? "checked" : ""} />
              <span class="cf-rt-quiz-option-text">True</span>
            </label>
            <label class="cf-rt-quiz-option" data-quiz-id="${tfId}" data-option-idx="false" ${isCorrectAlready ? 'style="opacity:0.6;cursor:not-allowed;"' : ""}>
              <input type="radio" name="tf-${tfId}" value="false" ${isCorrectAlready ? "disabled" : ""} ${isCorrectAlready && comp.correctAnswer === false ? "checked" : ""} />
              <span class="cf-rt-quiz-option-text">False</span>
            </label>
          </div>
          <button class="cf-rt-quiz-submit" data-quiz-id="${tfId}" disabled ${isCorrectAlready ? 'style="opacity:0.6;cursor:not-allowed;"' : ""}>${isCorrectAlready ? "Submitted" : "Submit Answer"}</button>
          <div id="fb-${tfId}" class="cf-rt-quiz-feedback">
            ${isCorrectAlready ? '<span style="color:#4ade80">\u2713 Correct!</span>' : ""}
          </div>
        `;
        wrapper.appendChild(tfDiv);

        requestAnimationFrame(() => {
          const submitBtn = wrapper.querySelector(`.cf-rt-quiz-submit[data-quiz-id="${tfId}"]`) as HTMLButtonElement | null;
          const radios = wrapper.querySelectorAll(`input[name="tf-${tfId}"]`) as NodeListOf<HTMLInputElement>;

          if (!submitBtn) return;

          radios.forEach(radio => {
            radio.addEventListener("change", () => {
              submitBtn.disabled = false;
            });
          });

          submitBtn.addEventListener("click", () => {
            const selected = Array.from(radios).find(r => r.checked);
            if (!selected) return;

            const isCorrect = selected.value === tfCorrectStr;
            const fb = wrapper.querySelector(`#fb-${tfId}`);
            if (fb) {
              fb.innerHTML = isCorrect
                ? '<span style="color:#4ade80">\u2713 Correct!</span>'
                : '<span style="color:#f87171">\u2717 Incorrect. Try again.</span>';
            }

            if (isCorrect) {
              radios.forEach(r => {
                r.disabled = true;
                (r.parentElement as HTMLElement).style.opacity = "0.6";
              });
              submitBtn.disabled = true;
              submitBtn.textContent = "Submitted";
            }

            this.submitGenericQuiz(tfId, isCorrect ? 1 : 0);
          });
        });
        break;
      }

      case "fill_blanks": {
        wrapper.className += " cf-rt-quiz-block";
        const fbId = comp.id;
        const isComplete = this.state.mandatoryCompleted.includes(fbId);

        if (comp.mandatory) {
          const badge = document.createElement("div");
          badge.id = `mandatory-badge-${fbId}`;
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

        const existingScore = this.state.quizScores[fbId];
        const isCorrectAlready = existingScore && existingScore.score >= 1;
        const answers = normalizeFillBlankAnswers(comp);
        let qHtml = comp.question;
        qHtml += `<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">${answers.map((answer, index) => {
          const valueAttr = isCorrectAlready
            ? ` value="${escapeAttribute(answer || "")}"`
            : "";
          const disabledAttr = isCorrectAlready ? " disabled" : "";
          return `<input id="fitb-${fbId}-${index}" type="text" placeholder="Answer ${index + 1}" style="padding:10px 14px;border-radius:8px;border:1.5px solid #e8d0d0;background:#ffffff;color:#1a0a0a;font-size:14px;outline:none;font-family:inherit;${isCorrectAlready ? "opacity:0.6;" : ""}"${valueAttr}${disabledAttr}/>`;
        }).join("")}</div>`;

        const fbDiv = document.createElement("div");
        fbDiv.innerHTML = `
          <div class="cf-rt-quiz-badge">FILL IN THE BLANK</div>
          <div class="cf-rt-quiz-question">${qHtml}</div>
          <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
            <button id="fitb-btn-${fbId}" class="cf-rt-quiz-submit" ${isCorrectAlready ? "disabled" : ""}>${isCorrectAlready ? "Submitted" : "Submit"}</button>
          </div>
          <div id="fb-${fbId}" style="margin-top:10px;font-size:13px;font-weight:600;">
            ${isCorrectAlready ? '<span style="color:#4ade80">\u2713 Correct!</span>' : ""}
          </div>
        `;
        wrapper.appendChild(fbDiv);

        requestAnimationFrame(() => {
          const inputEls = answers
            .map((_, index) => wrapper.querySelector(`#fitb-${fbId}-${index}`) as HTMLInputElement | null)
            .filter(Boolean) as HTMLInputElement[];
          const btnEl   = wrapper.querySelector(`#fitb-btn-${fbId}`) as HTMLButtonElement;

          if (inputEls.length && btnEl) {
            btnEl.addEventListener("click", () => {
              let correctCount = 0;
              inputEls.forEach((inputEl, index) => {
                const learnerVal = inputEl.value.trim();
                const expected = String(answers[index] || "").trim();
                const checkVal = comp.caseSensitive ? learnerVal : learnerVal.toLowerCase();
                const ansVal = comp.caseSensitive ? expected : expected.toLowerCase();
                if (checkVal === ansVal) {
                  correctCount += 1;
                }
              });
              const totalBlanks = answers.length || 1;
              const partialScore = correctCount / totalBlanks;
              const isCorrect = partialScore === 1;

              const fb = wrapper.querySelector(`#fb-${fbId}`);
              if (fb) {
                if (isCorrect) {
                  fb.innerHTML = '<span style="color:#4ade80">\u2713 Correct!</span>';
                } else if (correctCount > 0) {
                  fb.innerHTML = `<span style="color:#fbbf24">\u25B3 ${correctCount} of ${totalBlanks} correct. You can retry for full marks.</span>`;
                } else {
                  fb.innerHTML = '<span style="color:#f87171">\u2717 Incorrect. Try again.</span>';
                }
              }

              if (isCorrect) {
                inputEls.forEach((inputEl, index) => {
                  inputEl.disabled = true;
                  inputEl.style.opacity = "0.6";
                  inputEl.value = answers[index] || "";
                });
                btnEl.disabled = true;
                btnEl.textContent = "Submitted";
              } else {
                inputEls.forEach((inputEl) => {
                  inputEl.disabled = false;
                  inputEl.style.opacity = "1";
                });
                btnEl.disabled = false;
              }

              this.submitGenericQuiz(fbId, partialScore);
            });
          }
        });
        break;
      }

      case "multi_select": {
        wrapper.className += " cf-rt-quiz-block";
        const msId = comp.id;
        const isComplete = this.state.mandatoryCompleted.includes(msId);

        if (comp.mandatory) {
          const badge = document.createElement("div");
          badge.id = `mandatory-badge-${msId}`;
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

        const existingScore = this.state.quizScores[msId];
        const isCorrectAlready = existingScore && existingScore.score > 0;
        
        let optionsHtml = comp.options.map((opt: string, idx: number) => `
          <label class="cf-rt-quiz-option" data-quiz-id="${msId}" data-option-idx="${idx}" ${isCorrectAlready ? 'style="opacity:0.6;cursor:not-allowed;"' : ""}>
            <input type="checkbox" name="ms-${msId}" value="${idx}" ${isCorrectAlready ? "disabled" : ""} ${isCorrectAlready && comp.correctAnswer.includes(idx.toString()) ? "checked" : ""} />
            <span class="cf-rt-quiz-option-text">${opt}</span>
          </label>
        `).join("");

        const msDiv = document.createElement("div");
        msDiv.innerHTML = `
          <div class="cf-rt-quiz-badge">MULTI-SELECT</div>
          <div class="cf-rt-quiz-question">${comp.question}</div>
          <div class="cf-rt-quiz-options">${optionsHtml}</div>
          <button class="cf-rt-quiz-submit" data-quiz-id="${msId}" disabled ${isCorrectAlready ? 'style="opacity:0.6;cursor:not-allowed;"' : ""}>${isCorrectAlready ? "Submitted" : "Submit Answer"}</button>
          <div id="fb-${msId}" class="cf-rt-quiz-feedback">
            ${isCorrectAlready ? '<span style="color:#4ade80">\u2713 Correct!</span>' : ""}
          </div>
        `;
        wrapper.appendChild(msDiv);

        requestAnimationFrame(() => {
          const submitBtn = wrapper.querySelector(`.cf-rt-quiz-submit[data-quiz-id="${msId}"]`) as HTMLButtonElement | null;
          const checkboxes = wrapper.querySelectorAll(`input[name="ms-${msId}"]`) as NodeListOf<HTMLInputElement>;

          if (!submitBtn) return;

          checkboxes.forEach(cb => {
            cb.addEventListener("change", () => {
              const anyChecked = Array.from(checkboxes).some(c => c.checked);
              submitBtn.disabled = !anyChecked;
            });
          });

          submitBtn.addEventListener("click", () => {
            const selectedIndices = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
            const correctIndices = comp.correctAnswer.map((a: string) => a.toString());
            
            let isCorrect = selectedIndices.length === correctIndices.length && 
              selectedIndices.every(val => correctIndices.includes(val));

            const fb = wrapper.querySelector(`#fb-${msId}`);
            if (fb) {
              fb.innerHTML = isCorrect
                ? '<span style="color:#4ade80">\u2713 Correct!</span>'
                : '<span style="color:#f87171">\u2717 Incorrect. Try again.</span>';
            }

            if (isCorrect) {
              checkboxes.forEach(c => {
                c.disabled = true;
                (c.parentElement as HTMLElement).style.opacity = "0.6";
              });
              submitBtn.disabled = true;
              submitBtn.textContent = "Submitted";
            }

            this.submitGenericQuiz(msId, isCorrect ? 1 : 0);
          });
        });
        break;
      }

      case "matching": {
        wrapper.className += " cf-rt-quiz-block";
        const mtId = comp.id;
        const isComplete = this.state.mandatoryCompleted.includes(mtId);

        if (comp.mandatory) {
          const badge = document.createElement("div");
          badge.id = `mandatory-badge-${mtId}`;
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

        const existingScore = this.state.quizScores[mtId];
        const isCorrectAlready = existingScore && existingScore.score > 0;

        const rightItems = comp.pairs.map((p: any) => p.rightItem);
        if (!isCorrectAlready) {
          for (let i = rightItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]];
          }
        }

        const matchDiv = document.createElement("div");

        let pairsHtml = comp.pairs.map((p: any, idx: number) => {
          let optionsHtml = `<option value="">Select match...</option>`;
          rightItems.forEach((r: string) => {
            optionsHtml += `<option value="${r.replace(/"/g, '&quot;')}" ${isCorrectAlready && p.rightItem === r ? "selected" : ""}>${r}</option>`;
          });
          return `
            <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
              <div style="flex:1; padding:10px; background:#18181b; border-radius:6px; color:#fafafa; border:1px solid #27272a;">${p.leftItem}</div>
              <select class="cf-rt-match-select" data-pair-idx="${idx}" style="flex:1; padding:10px; background:#ffffff; border-radius:6px; color:#1a0a0a; border:1px solid #e8d0d0; outline:none;" ${isCorrectAlready ? "disabled" : ""}>
                ${optionsHtml}
              </select>
            </div>
          `;
        }).join("");

        matchDiv.innerHTML = `
          <div class="cf-rt-quiz-badge">MATCHING</div>
          <div class="cf-rt-quiz-question">${comp.question}</div>
          <div class="cf-rt-match-container" style="margin-top:1rem;">${pairsHtml}</div>
          <button class="cf-rt-quiz-submit" data-quiz-id="${mtId}" disabled ${isCorrectAlready ? 'style="opacity:0.6;cursor:not-allowed;"' : ""}>${isCorrectAlready ? "Submitted" : "Submit Answer"}</button>
          <div id="fb-${mtId}" class="cf-rt-quiz-feedback">
            ${isCorrectAlready ? '<span style="color:#4ade80">\u2713 Correct!</span>' : ""}
          </div>
        `;
        wrapper.appendChild(matchDiv);

        requestAnimationFrame(() => {
          const submitBtn = wrapper.querySelector(`.cf-rt-quiz-submit[data-quiz-id="${mtId}"]`) as HTMLButtonElement | null;
          const selects = wrapper.querySelectorAll(`.cf-rt-match-select`) as NodeListOf<HTMLSelectElement>;

          if (!submitBtn) return;

          selects.forEach(sel => {
            sel.addEventListener("change", () => {
              const allSelected = Array.from(selects).every(s => s.value !== "");
              submitBtn.disabled = !allSelected;
            });
          });

          submitBtn.addEventListener("click", () => {
            let isCorrect = true;
            selects.forEach(sel => {
              const idx = parseInt(sel.getAttribute("data-pair-idx") || "0");
              const expected = comp.pairs[idx].rightItem;
              if (sel.value !== expected) {
                isCorrect = false;
              }
            });

            const fb = wrapper.querySelector(`#fb-${mtId}`);
            if (fb) {
              fb.innerHTML = isCorrect
                ? '<span style="color:#4ade80">\u2713 Correct!</span>'
                : '<span style="color:#f87171">\u2717 Incorrect. Try again.</span>';
            }

            if (isCorrect) {
              selects.forEach(s => {
                s.disabled = true;
                s.style.opacity = "0.6";
              });
              submitBtn.disabled = true;
              submitBtn.textContent = "Submitted";
            }

            this.submitGenericQuiz(mtId, isCorrect ? 1 : 0);
          });
        });
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
        ul.style.color = "#111111";

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

      case "columns": {
        const colsData = (comp as any).columns || [];
        const colsWrap = document.createElement("div");
        colsWrap.className = "cf-rt-columns-grid";
        colsWrap.style.setProperty("--cf-columns-count", String(Math.max(colsData.length || 0, 1)));

        for (const colBlocks of colsData) {
          const colEl = document.createElement("div");
          colEl.className = "cf-rt-column";
          
          for (const sub of colBlocks) {
            const subEl = this.renderComponent(sub);
            if (sub.type === "text") {
              const textEl = subEl?.querySelector(".cf-rt-text") as HTMLElement | null;
              if (textEl) textEl.style.color = "#111111";
            }
            if (subEl) colEl.appendChild(subEl);
          }
          colsWrap.appendChild(colEl);
        }
        wrapper.appendChild(colsWrap);
        break;
      }

      case "table": {
        const tableDiv = document.createElement("div");
        tableDiv.style.overflowX = "auto";
        tableDiv.style.marginBottom = "1rem";

        const tableColor = (comp as any).tableColor || "#ffffff";
        const headerColor = (comp as any).headerColor || darkenColor(tableColor, 20);

        let html = `<table style="width:100%; border-collapse:collapse; border:1px solid #3f3f46; font-size:14px;">`;
        html += `<thead><tr>`;
        for (const h of comp.headers || []) {
          // headers may be rich HTML from the editor
          html += `<th style="border:1px solid #3f3f46; padding:10px; background:${headerColor}; font-weight:600; text-align:left;">${h}</th>`;
        }
        html += `</tr></thead><tbody>`;
        for (const row of comp.rows || []) {
          html += `<tr>`;
          for (const cell of row) {
            // cells may be rich HTML from the editor
            html += `<td style="border:1px solid #3f3f46; padding:10px; background:${tableColor};">${cell}</td>`;
          }
          html += `</tr>`;
        }
        html += `</tbody></table>`;
        tableDiv.innerHTML = html;
        wrapper.appendChild(tableDiv);
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

      case "audio": {
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
            badge.textContent = "⚠ MANDATORY — Listen to continue";
            badge.style.background = "#2a0a0a";
            badge.style.color = "#f87171";
            badge.style.border = "1px solid #7f1d1d";
          }
          wrapper.appendChild(badge);
        }

        const adiv = document.createElement("div");
        adiv.innerHTML = `
          <div style="margin-bottom:6px;font-size:10px;font-weight:700;letter-spacing:0.15em;color:#c0392b;">AUDIO</div>
          <div style="font-size:14px;font-weight:600;color:#fafafa;margin-bottom:10px;">${comp.label || "Audio Track"}</div>
          <audio id="audio-el-${comp.id}" controls style="width:100%;border-radius:8px;background:#000;">
            <source src="${comp.src}">
            Your browser does not support audio.
          </audio>
        `;
        wrapper.appendChild(adiv);

        if ((comp as any).mandatory) {
          const compId = comp.id;
          const isAlreadyComplete = this.state.mandatoryCompleted.includes(compId);

          requestAnimationFrame(() => {
            const audioEl = document.getElementById(`audio-el-${compId}`) as HTMLAudioElement | null;
            if (audioEl) {
              if (!isAlreadyComplete) {
                let maxWatched = 0;
                audioEl.addEventListener("timeupdate", () => {
                  if (!audioEl.seeking) {
                    maxWatched = Math.max(maxWatched, audioEl.currentTime);
                  }
                });
                audioEl.addEventListener("seeking", () => {
                  if (audioEl.currentTime > maxWatched + 1) {
                    audioEl.currentTime = maxWatched;
                  }
                });
              }

              audioEl.addEventListener("ended", () => {
                this.markMandatoryComplete(compId);
              });
            }
          });
        }
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

    this.applyComponentAnimation(wrapper, animation, delay);
    return wrapper;
  }

  private renderQuizHTML(quiz: Extract<Component, { type: "quiz" }>): string {
    const existingScore = this.state.quizScores[quiz.id];
    const isCorrectAlready = existingScore && existingScore.score > 0;

    const optionsHtml = quiz.options.map((opt, idx) => `
      <label class="cf-rt-quiz-option" data-quiz-id="${quiz.id}" data-option-idx="${idx}" ${isCorrectAlready ? 'style="opacity:0.6;cursor:not-allowed;"' : ""}>
        <input type="radio" name="quiz-${quiz.id}" value="${idx}" ${isCorrectAlready ? "disabled" : ""} ${isCorrectAlready && idx === quiz.correctAnswer ? "checked" : ""} />
        <span class="cf-rt-quiz-option-text">${opt}</span>
      </label>
    `).join("");

    return `
      <div class="cf-rt-quiz-badge">QUIZ</div>
      <div class="cf-rt-quiz-question">${quiz.question}</div>
      <div class="cf-rt-quiz-options">${optionsHtml}</div>
      <button class="cf-rt-quiz-submit" data-quiz-id="${quiz.id}" disabled ${isCorrectAlready ? 'style="opacity:0.6;cursor:not-allowed;"' : ""}>${isCorrectAlready ? "Submitted" : "Submit Answer"}</button>
      <div class="cf-rt-quiz-feedback" id="feedback-${quiz.id}">
        ${isCorrectAlready ? '<span style="color:#4ade80">\u2713 Correct!</span>' : ""}
      </div>
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

    const existingScore = this.state.quizScores[quizId];
    const isCorrectAlready = existingScore && existingScore.score > 0;

    if (!isCorrectAlready) {
      radios.forEach(radio => {
        radio.addEventListener("change", () => {
          submitBtn.disabled = false;
        });
      });
    }

    submitBtn.addEventListener("click", async () => {
      const selected = document.querySelector(
        `input[name="quiz-${quizId}"]:checked`
      ) as HTMLInputElement | null;

      if (selected) {
        await this.submitQuiz(quizId, Number(selected.value));
        const score = this.state.quizScores[quizId];
        const isCorrect = score && score.score > 0;

        if (isCorrect) {
          submitBtn.disabled = true;
          radios.forEach(r => { r.disabled = true; });
        } else {
          submitBtn.disabled = false;
        }

        const feedbackEl = document.getElementById(`feedback-${quizId}`);
        if (feedbackEl) {
          feedbackEl.innerHTML = isCorrect
            ? '<span style="color:#4ade80">✓ Correct!</span>'
            : '<span style="color:#f87171">✗ Incorrect. Try again.</span>';
        }
      }
    });
  }

  private renderFlashcardHTML(fc: Extract<Component, { type: "flashcard" }>): string {
    const imageUrl = (fc as any).imageUrl as string | undefined;

    // Use individual CSS longhand properties to avoid shorthand parsing issues
    const frontBgStyles = imageUrl
      ? `background: linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)), url('${imageUrl}') center / cover no-repeat;`
      : `background:${fc.frontBackground || "linear-gradient(145deg, #1a0a0a 0%, #3d1010 60%, #6b1a1a 100%)"};`;

    return `
      <div class="cf-rt-flashcard-scene">
        <div class="cf-rt-flashcard-inner">
          <div class="cf-rt-flashcard-face cf-rt-flashcard-front" style="${frontBgStyles}border:1px solid ${fc.frontBorder || "#4d2020"};box-shadow:0 8px 32px ${fc.frontShadow || "rgba(139,26,26,0.25)"};">
            <div class="cf-rt-flashcard-label" style="color:${fc.frontBadgeColor || "rgba(255,255,255,0.68)"};">QUESTION</div>
            <div class="cf-rt-flashcard-text">${fc.front}</div>
            <div class="cf-rt-flashcard-hint" style="color:rgba(255,255,255,0.78);">↻ Click to flip</div>
          </div>
          <div class="cf-rt-flashcard-face cf-rt-flashcard-back" style="background:${fc.backBackground || "linear-gradient(145deg, #fffaf9 0%, #fff0ee 100%)"};border:2px solid ${fc.backBorder || "#e8c8c8"};box-shadow:0 8px 32px ${fc.backShadow || "rgba(139,26,26,0.12)"};">
            <div class="cf-rt-flashcard-label" style="color:${fc.backBadgeColor || "#c4a0a0"};">ANSWER</div>
            <div class="cf-rt-flashcard-text" style="color:${fc.backTextColor || "#1a0a0a"};">${fc.back}</div>
            <div class="cf-rt-flashcard-hint" style="color:${fc.backTextColor || "#8b1a1a"};">↻ Click to flip back</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderProcessHTML(comp: Extract<Component, { type: "process" }>): string {
    if (!comp.steps || comp.steps.length === 0) return `<p>No steps.</p>`;

    let html = `<div class="cf-rt-process-block" id="proc-${comp.id}" data-step="0" style="background:#1a1a1e;border-radius:12px;padding:24px;border:1px solid #27272a;">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">`;
    html += `<div style="font-weight:600;color:#c0392b;" id="proc-label-${comp.id}">Step 1 of ${comp.steps.length}</div>`;
    html += `<div>`;
    html += `<button class="cf-rt-nav-btn" style="padding:6px 12px;font-size:12px;margin-right:8px;" id="proc-prev-${comp.id}">Prev</button>`;
    html += `<button class="cf-rt-nav-btn cf-rt-nav-btn-primary" style="padding:6px 12px;font-size:12px;" id="proc-next-${comp.id}">Next</button>`;
    html += `</div></div>`;

    html += `<div style="background:#09090b;padding:16px;border-radius:8px;min-height:120px;">`;
    comp.steps.forEach((step, i) => {
      html += `<div id="proc-step-${comp.id}-${i}" style="display:${i === 0 ? "block" : "none"};">`;
      html += `<h3 style="margin-bottom:8px;color:#fafafa;font-size:18px;">${step.title || ""}</h3>`;
      html += `<div style="color:#a1a1aa;line-height:1.6;">${step.content || ""}</div>`;
      html += `</div>`;
    });
    html += `</div>`;

    html += `<div style="display:flex;justify-content:center;gap:6px;margin-top:16px;">`;
    for (let i = 0; i < comp.steps.length; i++) {
      html += `<div id="proc-dot-${comp.id}-${i}" style="width:8px;height:8px;border-radius:4px;background:${i === 0 ? "#8b1a1a" : "#27272a"};transition:background 0.2s;"></div>`;
    }
    html += `</div>`;
    html += `</div>`;

    return html;
  }

  private attachProcessListeners(id: string, len: number): void {
    const pBlock  = document.getElementById(`proc-${id}`);
    const prevBtn = document.getElementById(`proc-prev-${id}`) as HTMLButtonElement;
    const nextBtn = document.getElementById(`proc-next-${id}`) as HTMLButtonElement;
    const label   = document.getElementById(`proc-label-${id}`);

    if (!pBlock || !prevBtn || !nextBtn || !label) return;

    const update = () => {
      const s = parseInt(pBlock.getAttribute("data-step") || "0", 10);
      label.innerText = `Step ${s + 1} of ${len}`;
      prevBtn.disabled = s <= 0;
      nextBtn.disabled = s >= len - 1;

      for (let i = 0; i < len; i++) {
        const stepDiv = document.getElementById(`proc-step-${id}-${i}`);
        const dot     = document.getElementById(`proc-dot-${id}-${i}`);
        if (stepDiv) stepDiv.style.display = i === s ? "block" : "none";
        if (dot)     dot.style.background  = i === s ? "#8b1a1a" : "#27272a";
      }
    };

    update();

    prevBtn.addEventListener("click", () => {
      let s = parseInt(pBlock.getAttribute("data-step") || "0", 10);
      if (s > 0) { s--; pBlock.setAttribute("data-step", String(s)); update(); }
    });

    nextBtn.addEventListener("click", () => {
      let s = parseInt(pBlock.getAttribute("data-step") || "0", 10);
      if (s < len - 1) { s++; pBlock.setAttribute("data-step", String(s)); update(); }
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
    let container = document.querySelector(".cf-rt-quiz-feedback:empty") as HTMLElement | null;

    if (!container) {
      container = document.createElement("div");
      container.className = `cf-rt-toast cf-rt-toast-${type}`;
      container.textContent = message;
      document.body.appendChild(container);

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

    const progress = document.getElementById("cf-progress-bar") as HTMLElement | null;
    if (progress) {
      const pct = ((currentIndex + 1) / total) * 100;
      progress.style.width = `${pct}%`;
    }

    const counter = document.getElementById("cf-slide-counter");
    if (counter) {
      counter.textContent = `${currentIndex + 1} / ${total}`;
    }

    const prevBtn = document.getElementById("cf-prev-btn") as HTMLButtonElement | null;
    const nextBtn = document.getElementById("cf-next-btn") as HTMLButtonElement | null;
    if (prevBtn) prevBtn.disabled = currentIndex <= 0;

    let finishBtn = document.getElementById("cf-finish-btn") as HTMLButtonElement | null;
    if (!finishBtn && nextBtn && nextBtn.parentElement) {
      finishBtn = document.createElement("button");
      finishBtn.id = "cf-finish-btn";
      finishBtn.className = "cf-rt-nav-btn cf-rt-nav-btn-primary";
      finishBtn.textContent = "Finish Course";

      finishBtn.addEventListener("click", () => {
        if (finishBtn!.disabled) return;

        const allMandatoryDone = [...this.mandatoryIds].every(
          id => this.state.mandatoryCompleted.includes(id)
        );
        const allSlidesVisited = this.state.visitedSlides.every(v => v === true);

        if (!allMandatoryDone || !allSlidesVisited) {
          this.renderFeedback("You must view all slides and complete all mandatory items before finishing.", "incorrect");
          return;
        }

        this.reportScore();
        this.checkCompletion(true);
        const score = this.calculateScore();
        const xapiReporter = (window as any).__CF_XAPI_REPORT_COMPLETION;
        if (typeof xapiReporter === "function") {
          xapiReporter(score.pct);
        }

        // FIX 2a: Set the guard before calling finish() so the pagehide /
        // beforeunload handler does not attempt a second LMSFinish() call.
        if (this.scorm.isConnected) {
          this.sessionFinished = true;
          this.scorm.finish();
        }

        finishBtn!.disabled = true;
        this.renderFeedback("Course finished successfully.", "correct");
      }, { once: true });

      nextBtn.parentElement.appendChild(finishBtn);
    }

    if (currentIndex === total - 1) {
      if (nextBtn)   nextBtn.style.display   = "none";
      if (finishBtn) finishBtn.style.display = "inline-flex";
    } else {
      if (nextBtn)   { nextBtn.style.display = "inline-flex"; nextBtn.disabled = false; }
      if (finishBtn)   finishBtn.style.display = "none";
    }
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
    (window as any).__cfRestart = () => runtime.restartCourse();
  },
};

// Auto-boot if course data is available on window
document.addEventListener("DOMContentLoaded", () => {
  const courseData = (window as any).__CF_COURSE_DATA;
  if (courseData) {
    (window as any).CourseForgeRuntime.boot(courseData);
  }
});