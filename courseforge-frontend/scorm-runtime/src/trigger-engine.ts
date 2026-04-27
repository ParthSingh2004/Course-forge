/**
 * trigger-engine.ts — Event-Condition-Action (ECA) Trigger Engine
 * =================================================================
 * Evaluates trigger rules against the current CourseState.
 *
 * Design:
 *   - Pure evaluation: conditions are checked without side effects
 *   - The engine returns Action[] — the caller executes them
 *   - Supports composable condition trees (AND/OR/NOT)
 *   - oneShot triggers tracked via state.triggersFired
 *   - Event→Rule subscription map for O(1) event dispatch
 */

import type {
  TriggerRule,
  TriggerEvent,
  Condition,
  Action,
  ValueRef,
  CourseState,
} from "./schemas";

// ---------------------------------------------------------------------------
// Event key generation — maps events to a subscription key
// ---------------------------------------------------------------------------

function eventKey(event: TriggerEvent): string {
  switch (event.type) {
    case "slideEnter":
      return `slideEnter:${event.slideId}`;
    case "slideExit":
      return `slideExit:${event.slideId}`;
    case "quizSubmit":
      return `quizSubmit:${event.quizId}`;
    case "click":
      return `click:${event.targetId}`;
    case "variableChange":
      return `variableChange:${event.varName}`;
    case "timerElapsed":
      return `timerElapsed:${event.seconds}`;
    case "courseStart":
      return "courseStart";
    case "layerShown":
      return `layerShown:${event.layerId}`;
    case "layerHidden":
      return `layerHidden:${event.layerId}`;
  }
}

// ---------------------------------------------------------------------------
// Value resolution — dereference ValueRefs against state
// ---------------------------------------------------------------------------

function resolveValue(ref: ValueRef, state: CourseState): string | number | boolean {
  switch (ref.kind) {
    case "literal":
      return ref.value;
    case "variable":
      return state.variables[ref.varName] ?? "";
    case "quizScore":
      return state.quizScores[ref.quizId]?.score ?? 0;
    case "quizMaxScore":
      return state.quizScores[ref.quizId]?.maxScore ?? 0;
    case "quizAttempts":
      return state.quizScores[ref.quizId]?.attempts ?? 0;
  }
}

/**
 * Coerce values to numbers for numeric comparison.
 * If either value is not numeric, fall back to string comparison.
 */
function toNumber(val: string | number | boolean): number {
  if (typeof val === "number") return val;
  if (typeof val === "boolean") return val ? 1 : 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Condition Evaluation — recursive tree walker
// ---------------------------------------------------------------------------

function evaluateCondition(cond: Condition, state: CourseState): boolean {
  switch (cond.op) {
    case "eq": {
      const l = resolveValue(cond.left, state);
      const r = resolveValue(cond.right, state);
      // Use loose comparison to handle "5" == 5
      return l == r;
    }
    case "neq": {
      const l = resolveValue(cond.left, state);
      const r = resolveValue(cond.right, state);
      return l != r;
    }
    case "gt": {
      const l = toNumber(resolveValue(cond.left, state));
      const r = toNumber(resolveValue(cond.right, state));
      return l > r;
    }
    case "gte": {
      const l = toNumber(resolveValue(cond.left, state));
      const r = toNumber(resolveValue(cond.right, state));
      return l >= r;
    }
    case "lt": {
      const l = toNumber(resolveValue(cond.left, state));
      const r = toNumber(resolveValue(cond.right, state));
      return l < r;
    }
    case "lte": {
      const l = toNumber(resolveValue(cond.left, state));
      const r = toNumber(resolveValue(cond.right, state));
      return l <= r;
    }
    case "and":
      return cond.conditions.every((c) => evaluateCondition(c, state));
    case "or":
      return cond.conditions.some((c) => evaluateCondition(c, state));
    case "not":
      return !evaluateCondition(cond.condition, state);
    case "visited":
      return isSlideVisited(cond.slideId, state);
    case "scoreAbove": {
      const score = state.quizScores[cond.quizId]?.score ?? 0;
      return score > cond.threshold;
    }
    case "scoreBelow": {
      const score = state.quizScores[cond.quizId]?.score ?? 0;
      return score < cond.threshold;
    }
    case "allSlidesVisited":
      return state.visitedSlides.every((v) => v);
    case "layerVisible":
      return state.layerVisibility[cond.layerId] === true;
  }
}

/**
 * Check if a slide has been visited. Handles both index-based and ID-based lookups.
 * The slideId in conditions corresponds to slide IDs in the course definition;
 * at runtime, we need the caller to provide a mapping or use index.
 */
function isSlideVisited(slideId: string, state: CourseState): boolean {
  // If slideId is a numeric string, treat as index
  const idx = Number(slideId);
  if (!isNaN(idx) && idx >= 0 && idx < state.visitedSlides.length) {
    return state.visitedSlides[idx];
  }
  // Otherwise, fall back to false (the runtime should resolve IDs to indices)
  return false;
}

// ---------------------------------------------------------------------------
// TriggerEngine class
// ---------------------------------------------------------------------------

export class TriggerEngine {
  /** All rules indexed by ID for fast lookup */
  private rulesById: Map<string, TriggerRule> = new Map();

  /** Subscription map: event key → rule IDs */
  private subscriptions: Map<string, string[]> = new Map();

  /** Slide ID → slide index mapping (set by runtime) */
  private slideIdToIndex: Map<string, number> = new Map();

  constructor(rules: TriggerRule[], slideIdToIndex?: Map<string, number>) {
    this.slideIdToIndex = slideIdToIndex ?? new Map();

    for (const rule of rules) {
      this.rulesById.set(rule.id, rule);

      const key = eventKey(rule.event);
      const existing = this.subscriptions.get(key) || [];
      existing.push(rule.id);
      this.subscriptions.set(key, existing);
    }
  }

  /**
   * Dispatch an event and return the list of actions to execute.
   *
   * Pure function — does NOT mutate state. The caller is responsible
   * for executing actions and updating state accordingly.
   *
   * @param event  The event that occurred
   * @param state  The current course state (read-only)
   * @returns      Ordered list of actions from all matching triggers
   */
  dispatch(event: TriggerEvent, state: CourseState): Action[] {
    const key = eventKey(event);
    const ruleIds = this.subscriptions.get(key);

    if (!ruleIds || ruleIds.length === 0) {
      return [];
    }

    const actions: Action[] = [];
    const firedSet = new Set(state.triggersFired);

    for (const ruleId of ruleIds) {
      const rule = this.rulesById.get(ruleId);
      if (!rule) continue;

      // Skip oneShot triggers that have already fired
      if (rule.oneShot && firedSet.has(rule.id)) {
        continue;
      }

      // Evaluate condition (if any)
      if (rule.condition) {
        // Resolve slide IDs in visited conditions
        const resolvedState = this.resolveStateSlideIds(state);
        if (!evaluateCondition(rule.condition, resolvedState)) {
          continue;
        }
      }

      // Condition met (or no condition) — collect actions
      actions.push(...rule.actions);
    }

    return actions;
  }

  /**
   * Get all rule IDs that would fire for an event (including oneShot check).
   * Useful for the runtime to know which triggers to mark as fired.
   */
  getMatchingRuleIds(event: TriggerEvent, state: CourseState): string[] {
    const key = eventKey(event);
    const ruleIds = this.subscriptions.get(key);

    if (!ruleIds) return [];

    const matching: string[] = [];
    const firedSet = new Set(state.triggersFired);

    for (const ruleId of ruleIds) {
      const rule = this.rulesById.get(ruleId);
      if (!rule) continue;
      if (rule.oneShot && firedSet.has(rule.id)) continue;

      if (rule.condition) {
        const resolvedState = this.resolveStateSlideIds(state);
        if (!evaluateCondition(rule.condition, resolvedState)) continue;
      }

      matching.push(rule.id);
    }

    return matching;
  }

  /**
   * Resolve slide IDs to indices in visitedSlides for condition evaluation.
   */
  private resolveStateSlideIds(state: CourseState): CourseState {
    // This is a shallow copy — only creates the proxy we need
    if (this.slideIdToIndex.size === 0) return state;
    return state; // For now, the runtime handles ID resolution before dispatch
  }

  /** Get a rule by ID */
  getRule(id: string): TriggerRule | undefined {
    return this.rulesById.get(id);
  }

  /** Get total number of rules */
  get ruleCount(): number {
    return this.rulesById.size;
  }
}

// ---------------------------------------------------------------------------
// Standalone evaluate function (used by Web Worker)
// ---------------------------------------------------------------------------

/**
 * Standalone dispatch function that doesn't require class instantiation.
 * Used by the Web Worker to evaluate triggers without shared state.
 */
export function evaluateTriggers(
  event: TriggerEvent,
  state: CourseState,
  rules: TriggerRule[]
): { actions: Action[]; firedRuleIds: string[] } {
  const firedSet = new Set(state.triggersFired);
  const key = eventKey(event);
  const actions: Action[] = [];
  const firedRuleIds: string[] = [];

  for (const rule of rules) {
    if (eventKey(rule.event) !== key) continue;
    if (rule.oneShot && firedSet.has(rule.id)) continue;

    if (rule.condition) {
      if (!evaluateCondition(rule.condition, state)) continue;
    }

    actions.push(...rule.actions);
    firedRuleIds.push(rule.id);
  }

  return { actions, firedRuleIds };
}
