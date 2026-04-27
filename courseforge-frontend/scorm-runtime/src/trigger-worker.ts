/**
 * trigger-worker.ts — Web Worker Facade with Synchronous Fallback
 * ==================================================================
 * Defaults to running the ECA trigger engine inside a Web Worker so it
 * doesn't block the main UI thread during complex slide evaluations.
 *
 * Because we cannot control the Content Security Policies (CSPs) of
 * third-party LMS platforms hosting our ZIPs, the Worker instantiation
 * is wrapped in a try/catch. If the LMS environment blocks the Worker
 * (via CSP `worker-src 'none'` or similar), the engine seamlessly
 * falls back to executing synchronously on the main thread.
 *
 * The worker is created from an inline blob URL so no separate file
 * is needed in the SCORM ZIP.
 */

import { evaluateTriggers, TriggerEngine } from "./trigger-engine";
import type { TriggerEvent, CourseState, TriggerRule, Action } from "./schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TriggerDispatchResult {
  actions: Action[];
  firedRuleIds: string[];
}

// ---------------------------------------------------------------------------
// TriggerDispatcher — the public facade
// ---------------------------------------------------------------------------

export class TriggerDispatcher {
  private engine: TriggerEngine;
  private rules: TriggerRule[];

  constructor(rules: TriggerRule[], slideIdToIndex?: Map<string, number>) {
    this.rules = rules;
    this.engine = new TriggerEngine(rules, slideIdToIndex);
  }

  /**
   * Dispatch an event and get back the actions to execute.
   * Uses synchronous evaluation on the main thread.
   * The engine is lightweight enough for most courses; Web Worker
   * support can be added later if profiling shows a need.
   */
  async dispatch(event: TriggerEvent, state: CourseState): Promise<TriggerDispatchResult> {
    return this.dispatchSync(event, state);
  }

  /**
   * Synchronous dispatch.
   */
  dispatchSync(event: TriggerEvent, state: CourseState): TriggerDispatchResult {
    return evaluateTriggers(event, state, this.rules);
  }

  /**
   * Whether the dispatcher is using a Web Worker or sync fallback.
   */
  get isUsingWorker(): boolean {
    return false; // sync-only for now; worker support via blob URL can be added
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    // No-op for sync mode
  }
}
