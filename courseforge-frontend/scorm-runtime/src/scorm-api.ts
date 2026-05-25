/**
 * scorm-api.ts — SCORM 1.2 + 2004 API Wrapper
 * ===========================================
 * Discovers either SCORM 1.2 ("API") or SCORM 2004 ("API_1484_11"),
 * normalizes the runtime calls, and maps key legacy 1.2 data model
 * fields onto their SCORM 2004 equivalents so the rest of the runtime
 * can stay largely format-agnostic.
 */

export interface ScormError {
  code: string;
  message: string;
  diagnostic: string;
}

type ScormMode = "1.2" | "2004" | null;

interface Scorm12ApiHandle {
  LMSInitialize(param: string): string;
  LMSFinish(param: string): string;
  LMSGetValue(element: string): string;
  LMSSetValue(element: string, value: string): string;
  LMSCommit(param: string): string;
  LMSGetLastError(): string;
  LMSGetErrorString(errorCode: string): string;
  LMSGetDiagnostic(errorCode: string): string;
}

interface Scorm2004ApiHandle {
  Initialize(param: string): string;
  Terminate(param: string): string;
  GetValue(element: string): string;
  SetValue(element: string, value: string): string;
  Commit(param: string): string;
  GetLastError(): string;
  GetErrorString(errorCode: string): string;
  GetDiagnostic(errorCode: string): string;
}

type LmsApiHandle = Scorm12ApiHandle | Scorm2004ApiHandle;

const MAX_SCAN_DEPTH = 500;

function isScorm12Api(candidate: any): candidate is Scorm12ApiHandle {
  return candidate && typeof candidate.LMSInitialize === "function";
}

function isScorm2004Api(candidate: any): candidate is Scorm2004ApiHandle {
  return candidate && typeof candidate.Initialize === "function";
}

function scanWindowChain(startWindow: Window | null): { api: LmsApiHandle; mode: ScormMode } | null {
  let win = startWindow;
  let depth = 0;

  while (win && depth < MAX_SCAN_DEPTH) {
    try {
      if (isScorm2004Api((win as any).API_1484_11)) {
        return { api: (win as any).API_1484_11, mode: "2004" };
      }
      if (isScorm12Api((win as any).API)) {
        return { api: (win as any).API, mode: "1.2" };
      }
    } catch {
      return null;
    }

    try {
      if (win.parent && win.parent !== win) {
        win = win.parent;
      } else {
        break;
      }
    } catch {
      break;
    }

    depth++;
  }

  return null;
}

function discoverLmsApi(): { api: LmsApiHandle; mode: ScormMode } | null {
  try {
    if (isScorm2004Api((window as any).API_1484_11)) {
      return { api: (window as any).API_1484_11, mode: "2004" };
    }
    if (isScorm12Api((window as any).API)) {
      return { api: (window as any).API, mode: "1.2" };
    }
  } catch {
    // Ignore
  }

  try {
    const fromParent = scanWindowChain(window.parent);
    if (fromParent) return fromParent;
  } catch {
    // Ignore
  }

  try {
    if (window.opener) {
      if (isScorm2004Api((window.opener as any).API_1484_11)) {
        return { api: (window.opener as any).API_1484_11, mode: "2004" };
      }
      if (isScorm12Api((window.opener as any).API)) {
        return { api: (window.opener as any).API, mode: "1.2" };
      }
      const fromOpener = scanWindowChain(window.opener);
      if (fromOpener) return fromOpener;
    }
  } catch {
    // Ignore
  }

  return null;
}

export class ScormAPI {
  private api: LmsApiHandle | null = null;
  private mode: ScormMode = null;
  private initialized = false;
  private finished = false;
  private _lastError: ScormError = { code: "0", message: "", diagnostic: "" };

  initialize(): boolean {
    if (this.initialized) {
      console.warn("[ScormAPI] Already initialized");
      return true;
    }

    const discovered = discoverLmsApi();
    this.api = discovered?.api ?? null;
    this.mode = discovered?.mode ?? null;

    if (!this.api || !this.mode) {
      console.warn(
        "[ScormAPI] No LMS API found. Running in offline/preview mode. " +
        "SCORM calls will be no-ops."
      );
      return false;
    }

    const result = this.mode === "2004"
      ? this.callApi("Initialize", "")
      : this.callApi("LMSInitialize", "");

    if (result === "true") {
      this.initialized = true;
      this.registerUnloadHandlers();
      console.info(`[ScormAPI] ${this.mode} LMS connection initialized successfully`);
      return true;
    }

    console.error("[ScormAPI] LMS initialize failed:", this._lastError);
    return false;
  }

  getValue(element: string): string {
    if (!this.ensureReady("getValue")) return "";

    if (this.mode === "2004") {
      if (element === "cmi.core.lesson_status") {
        const success = this.callApi("GetValue", "cmi.success_status");
        const completion = this.callApi("GetValue", "cmi.completion_status");
        if (success === "passed" || success === "failed") return success;
        if (completion === "completed" || completion === "incomplete" || completion === "not attempted") return completion;
        return "";
      }
      if (element === "cmi.core.lesson_location") return this.callApi("GetValue", "cmi.location");
      if (element === "cmi.core.lesson_mode") return this.callApi("GetValue", "cmi.mode");
      if (element === "cmi.student_data.mastery_score") {
        const scaled = parseFloat(this.callApi("GetValue", "cmi.scaled_passing_score"));
        return !isNaN(scaled) && scaled > 0 ? String(Math.round(scaled * 100)) : "";
      }
      if (element === "cmi.core.score.raw") return this.callApi("GetValue", "cmi.score.raw");
      if (element === "cmi.core.score.max") return this.callApi("GetValue", "cmi.score.max");
      if (element === "cmi.core.score.min") return this.callApi("GetValue", "cmi.score.min");
      if (element === "cmi.core.session_time") return this.callApi("GetValue", "cmi.session_time");
    }

    return this.mode === "2004"
      ? this.callApi("GetValue", element)
      : this.callApi("LMSGetValue", element);
  }

  setValue(element: string, value: string): boolean {
    if (!this.ensureReady("setValue")) return false;

    if (this.mode === "2004") {
      if (element === "cmi.core.lesson_status") {
        const normalized = String(value || "").toLowerCase();
        const results: boolean[] = [];
        if (normalized === "passed" || normalized === "failed") {
          results.push(this.callApi("SetValue", "cmi.success_status", normalized) === "true");
          results.push(this.callApi("SetValue", "cmi.completion_status", "completed") === "true");
          return results.every(Boolean);
        }
        if (normalized === "completed") {
          return this.callApi("SetValue", "cmi.completion_status", "completed") === "true";
        }
        if (normalized === "incomplete" || normalized === "not attempted") {
          return this.callApi("SetValue", "cmi.completion_status", normalized) === "true";
        }
        return this.callApi("SetValue", "cmi.completion_status", normalized || "unknown") === "true";
      }
      if (element === "cmi.core.lesson_location") return this.callApi("SetValue", "cmi.location", value) === "true";
      if (element === "cmi.core.score.raw") {
        const rawResult = this.callApi("SetValue", "cmi.score.raw", value) === "true";
        const numeric = Number(value);
        const scaledResult = !isNaN(numeric)
          ? this.callApi("SetValue", "cmi.score.scaled", String(Math.max(0, Math.min(1, numeric / 100)))) === "true"
          : true;
        return rawResult && scaledResult;
      }
      if (element === "cmi.core.score.max") return this.callApi("SetValue", "cmi.score.max", value) === "true";
      if (element === "cmi.core.score.min") return this.callApi("SetValue", "cmi.score.min", value) === "true";
      if (element === "cmi.core.session_time") return this.callApi("SetValue", "cmi.session_time", value) === "true";
    }

    const result = this.mode === "2004"
      ? this.callApi("SetValue", element, value)
      : this.callApi("LMSSetValue", element, value);
    return result === "true";
  }

  commit(): boolean {
    if (!this.ensureReady("commit")) return false;
    const result = this.mode === "2004"
      ? this.callApi("Commit", "")
      : this.callApi("LMSCommit", "");
    return result === "true";
  }

  finish(): boolean {
    if (this.finished) return true;
    if (!this.initialized || !this.api || !this.mode) return false;

    this.commit();

    const result = this.mode === "2004"
      ? this.callApi("Terminate", "")
      : this.callApi("LMSFinish", "");

    if (result === "true") {
      this.finished = true;
      this.initialized = false;
      console.info("[ScormAPI] LMS connection terminated");
      return true;
    }

    console.error("[ScormAPI] LMS finish failed:", this._lastError);
    return false;
  }

  get isConnected(): boolean {
    return this.initialized && this.api !== null;
  }

  get lastError(): ScormError {
    return { ...this._lastError };
  }

  get version(): ScormMode {
    return this.mode;
  }

  private callApi(method: "LMSInitialize" | "LMSFinish" | "LMSCommit" | "Initialize" | "Terminate" | "Commit", param: string): string;
  private callApi(method: "LMSGetValue" | "GetValue", element: string): string;
  private callApi(method: "LMSSetValue" | "SetValue", element: string, value: string): string;
  private callApi(method: string, ...args: string[]): string {
    if (!this.api) return "false";

    try {
      const fn = (this.api as any)[method];
      if (typeof fn !== "function") {
        console.error(`[ScormAPI] LMS API missing method: ${method}`);
        return "false";
      }

      const result: string = fn.apply(this.api, args);
      this.inspectError();
      return result ?? "false";
    } catch (e) {
      console.error(`[ScormAPI] Exception in ${method}:`, e);
      return "false";
    }
  }

  private inspectError(): void {
    if (!this.api || !this.mode) return;

    try {
      const code = this.mode === "2004"
        ? (this.api as Scorm2004ApiHandle).GetLastError()
        : (this.api as Scorm12ApiHandle).LMSGetLastError();
      this._lastError = {
        code,
        message: code !== "0"
          ? (
            this.mode === "2004"
              ? (this.api as Scorm2004ApiHandle).GetErrorString(code)
              : (this.api as Scorm12ApiHandle).LMSGetErrorString(code)
          )
          : "",
        diagnostic: code !== "0"
          ? (
            this.mode === "2004"
              ? (this.api as Scorm2004ApiHandle).GetDiagnostic(code)
              : (this.api as Scorm12ApiHandle).LMSGetDiagnostic(code)
          )
          : "",
      };

      if (code !== "0") {
        console.warn(
          `[ScormAPI] LMS Error ${code}: ${this._lastError.message}`,
          this._lastError.diagnostic
        );
      }
    } catch {
      // Ignore buggy LMS error methods
    }
  }

  private ensureReady(caller: string): boolean {
    if (!this.api) return false;
    if (!this.initialized) {
      console.warn(`[ScormAPI] ${caller} called before initialize()`);
      return false;
    }
    if (this.finished) {
      console.warn(`[ScormAPI] ${caller} called after finish()`);
      return false;
    }
    return true;
  }

  private registerUnloadHandlers(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && this.initialized && !this.finished) {
        this.commit();
      }
    });
  }
}
