/**
 * trigger-worker-script.ts — Web Worker entry point for trigger evaluation
 * ===========================================================================
 * This runs inside a Web Worker to avoid blocking the main UI thread
 * during complex condition tree evaluation.
 *
 * Protocol:
 *   Main → Worker:  { id, event, state, rules }
 *   Worker → Main:  { id, actions, firedRuleIds }
 */

import { evaluateTriggers } from "./trigger-engine";
import type { TriggerEvent, CourseState, TriggerRule, Action } from "./schemas";

export interface WorkerRequest {
  id: number;
  event: TriggerEvent;
  state: CourseState;
  rules: TriggerRule[];
}

export interface WorkerResponse {
  id: number;
  actions: Action[];
  firedRuleIds: string[];
  error?: string;
}

// This self-registers when loaded as a Worker
const ctx = self as unknown as Worker;

ctx.addEventListener("message", (e: MessageEvent<WorkerRequest>) => {
  const { id, event, state, rules } = e.data;

  try {
    const result = evaluateTriggers(event, state, rules);
    const response: WorkerResponse = {
      id,
      actions: result.actions,
      firedRuleIds: result.firedRuleIds,
    };
    ctx.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      id,
      actions: [],
      firedRuleIds: [],
      error: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(response);
  }
});
