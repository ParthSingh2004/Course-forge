/**
 * scorm-api.ts — Bulletproof SCORM 1.2 API Wrapper
 * ====================================================
 * Discovers any third-party LMS API by scanning window.parent and
 * window.opener chains, then proxies all 8 SCORM 1.2 RTE calls
 * with error handling, auto-commit, and graceful offline fallback.
 *
 * SCORM 1.2 Reference: ADL SCORM 1.2 Run-Time Environment (RTE)
 * The API object is named "API" (not "API_1484_11" — that's SCORM 2004).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the SCORM 1.2 API object exposed by the LMS */
export interface LmsApiHandle {
  LMSInitialize(param: string): string;
  LMSFinish(param: string): string;
  LMSGetValue(element: string): string;
  LMSSetValue(element: string, value: string): string;
  LMSCommit(param: string): string;
  LMSGetLastError(): string;
  LMSGetErrorString(errorCode: string): string;
  LMSGetDiagnostic(errorCode: string): string;
}

export interface ScormError {
  code: string;
  message: string;
  diagnostic: string;
}

// ---------------------------------------------------------------------------
// API Discovery
// ---------------------------------------------------------------------------

/**
 * Maximum depth for scanning window.parent chains.
 * The ADL SCORM 1.2 specification recommends scanning up to 500 levels.
 */
const MAX_SCAN_DEPTH = 500;

/**
 * Scan a window chain (parent or opener) to find the SCORM 1.2 "API" object.
 * Returns null if not found within MAX_SCAN_DEPTH hops.
 */
function scanWindowChain(startWindow: Window | null): LmsApiHandle | null {
  let win = startWindow;
  let depth = 0;

  while (win && depth < MAX_SCAN_DEPTH) {
    try {
      // Check if this window has the API object
      if ((win as any).API && typeof (win as any).API.LMSInitialize === "function") {
        return (win as any).API as LmsApiHandle;
      }
    } catch {
      // Cross-origin frame — cannot access, stop scanning this chain
      return null;
    }

    // Move up the chain
    try {
      if (win.parent && win.parent !== win) {
        win = win.parent;
      } else {
        break;
      }
    } catch {
      // Cross-origin parent — stop
      break;
    }

    depth++;
  }

  return null;
}

/**
 * Discover the LMS API using the SCORM 1.2 discovery algorithm:
 *   1. Scan window.parent chain (iframe delivery — the 95% case)
 *   2. If not found and window.opener exists, scan opener's parent chain
 *   3. Return null if not found (offline preview / non-LMS context)
 */
function discoverLmsApi(): LmsApiHandle | null {
  // 1. Scan current window first (rare but possible)
  try {
    if ((window as any).API && typeof (window as any).API.LMSInitialize === "function") {
      return (window as any).API as LmsApiHandle;
    }
  } catch {
    // Ignore
  }

  // 2. Scan window.parent chain
  try {
    const fromParent = scanWindowChain(window.parent);
    if (fromParent) return fromParent;
  } catch {
    // Cross-origin parent
  }

  // 3. Scan window.opener chain
  try {
    if (window.opener) {
      // Check opener itself
      if ((window.opener as any).API && typeof (window.opener as any).API.LMSInitialize === "function") {
        return (window.opener as any).API as LmsApiHandle;
      }
      // Scan opener's parent chain
      const fromOpener = scanWindowChain(window.opener);
      if (fromOpener) return fromOpener;
    }
  } catch {
    // Cross-origin opener
  }

  return null;
}

// ---------------------------------------------------------------------------
// SCORM API Facade
// ---------------------------------------------------------------------------

export class ScormAPI {
  private api: LmsApiHandle | null = null;
  private initialized = false;
  private finished = false;
  private _lastError: ScormError = { code: "0", message: "", diagnostic: "" };

  /**
   * Attempt to discover and initialize the LMS connection.
   * Returns true if both API discovery and LMSInitialize succeed.
   * Returns false (without throwing) if no LMS found — allows offline preview.
   */
  initialize(): boolean {
    if (this.initialized) {
      console.warn("[ScormAPI] Already initialized");
      return true;
    }

    // Discover API
    this.api = discoverLmsApi();

    if (!this.api) {
      console.warn(
        "[ScormAPI] No LMS API found. Running in offline/preview mode. " +
        "SCORM calls will be no-ops."
      );
      return false;
    }

    // Call LMSInitialize
    const result = this.callApi("LMSInitialize", "");
    if (result === "true") {
      this.initialized = true;
      this.registerUnloadHandlers();
      console.info("[ScormAPI] LMS connection initialized successfully");
      return true;
    }

    console.error("[ScormAPI] LMSInitialize failed:", this._lastError);
    return false;
  }

  /**
   * Get a SCORM data model element value.
   * Common elements:
   *   cmi.core.lesson_status
   *   cmi.core.lesson_location
   *   cmi.suspend_data
   *   cmi.core.score.raw
   *   cmi.core.student_name
   */
  getValue(element: string): string {
    if (!this.ensureReady("getValue")) return "";
    const val = this.callApi("LMSGetValue", element);
    return val;
  }

  /**
   * Set a SCORM data model element value.
   * Returns true on success.
   */
  setValue(element: string, value: string): boolean {
    if (!this.ensureReady("setValue")) return false;
    const result = this.callApi("LMSSetValue", element, value);
    return result === "true";
  }

  /**
   * Persist all pending data to the LMS server.
   * Should be called after batches of setValue calls.
   */
  commit(): boolean {
    if (!this.ensureReady("commit")) return false;
    const result = this.callApi("LMSCommit", "");
    return result === "true";
  }

  /**
   * Terminate the LMS connection. Must be called before page unload.
   * Automatically calls commit first.
   */
  finish(): boolean {
    if (this.finished) return true;
    if (!this.initialized || !this.api) return false;

    // Commit any pending data first
    this.commit();

    const result = this.callApi("LMSFinish", "");
    if (result === "true") {
      this.finished = true;
      this.initialized = false;
      console.info("[ScormAPI] LMS connection terminated");
      return true;
    }

    console.error("[ScormAPI] LMSFinish failed:", this._lastError);
    return false;
  }

  /** Whether the API was found and initialized */
  get isConnected(): boolean {
    return this.initialized && this.api !== null;
  }

  /** The last error reported by the LMS */
  get lastError(): ScormError {
    return { ...this._lastError };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Call a method on the LMS API with error inspection.
   * Wraps every call in try/catch for maximum resilience.
   */
  private callApi(method: "LMSInitialize" | "LMSFinish" | "LMSCommit", param: string): string;
  private callApi(method: "LMSGetValue", element: string): string;
  private callApi(method: "LMSSetValue", element: string, value: string): string;
  private callApi(method: string, ...args: string[]): string {
    if (!this.api) return "false";

    try {
      const fn = (this.api as any)[method];
      if (typeof fn !== "function") {
        console.error(`[ScormAPI] LMS API missing method: ${method}`);
        return "false";
      }

      const result: string = fn.apply(this.api, args);

      // Inspect error after every call
      this.inspectError();

      return result ?? "false";
    } catch (e) {
      console.error(`[ScormAPI] Exception in ${method}:`, e);
      return "false";
    }
  }

  /**
   * Read the last error from the LMS and cache it.
   */
  private inspectError(): void {
    if (!this.api) return;

    try {
      const code = this.api.LMSGetLastError();
      this._lastError = {
        code,
        message: code !== "0" ? this.api.LMSGetErrorString(code) : "",
        diagnostic: code !== "0" ? this.api.LMSGetDiagnostic(code) : "",
      };

      if (code !== "0") {
        console.warn(
          `[ScormAPI] LMS Error ${code}: ${this._lastError.message}`,
          this._lastError.diagnostic
        );
      }
    } catch {
      // Some LMS implementations have buggy error methods — don't crash
    }
  }

  /**
   * Guard: ensure we're initialized and not finished.
   */
  private ensureReady(caller: string): boolean {
    if (!this.api) {
      // Offline mode — silently no-op
      return false;
    }
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

  /**
   * Register beforeunload and pagehide handlers for auto-commit + finish.
   * Uses both events for maximum browser coverage.
   */
  private registerUnloadHandlers(): void {
    const onUnload = () => {
      if (this.initialized && !this.finished) {
        this.finish();
      }
    };

    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);

    // Also handle visibility change to hidden (mobile browsers may skip unload)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && this.initialized && !this.finished) {
        this.commit();
      }
    });
  }
}
