/**
 * state-compressor.ts — SCORM suspend_data Compression Pipeline
 * ================================================================
 * Compresses complex CourseState into ≤4,096 characters for SCORM 1.2's
 * cmi.suspend_data using a multi-stage pipeline:
 *
 *   1. Bitset encoding for visitedSlides (boolean[] → Base64 bitfield)
 *   2. Delta/sparse encoding for quiz scores (omit zero-value entries)
 *   3. Variable pruning (omit variables at default values)
 *   4. JSON.stringify the reduced structure
 *   5. lz-string compressToEncodedURIComponent (URL-safe ASCII)
 *   6. Budget enforcement with progressive degradation
 *
 * Size budget: 4,096 characters max (SCORM 1.2 spec)
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { CourseState, QuizScore, VariableDefinition } from "./schemas";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SCORM 1.2 suspend_data character limit */
const MAX_SUSPEND_DATA = 4096;

/** Version tag for forward-compatible deserialization */
const STATE_VERSION = 1;

// ---------------------------------------------------------------------------
// Bitset Encoding — boolean[] ↔ Base64 string
// ---------------------------------------------------------------------------

/**
 * Encode a boolean array as a Base64 string.
 * Each boolean becomes 1 bit; bits are packed into bytes then Base64-encoded.
 * 100 booleans → 13 bytes → 17 Base64 chars (vs 500+ chars as JSON).
 */
function boolArrayToBase64(arr: boolean[]): string {
  const byteCount = Math.ceil(arr.length / 8);
  const bytes = new Uint8Array(byteCount);

  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      bytes[i >> 3] |= 1 << (7 - (i & 7));
    }
  }

  // Convert to Base64 using btoa
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode a Base64 string back to a boolean array of the given length.
 */
function base64ToBoolArray(b64: string, length: number): boolean[] {
  let binary: string;
  try {
    binary = atob(b64);
  } catch {
    return new Array(length).fill(false);
  }

  const result: boolean[] = [];
  for (let i = 0; i < length; i++) {
    const byteIdx = i >> 3;
    const bitIdx = 7 - (i & 7);
    if (byteIdx < binary.length) {
      result.push((binary.charCodeAt(byteIdx) & (1 << bitIdx)) !== 0);
    } else {
      result.push(false);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Compact State Shape — the intermediate format before lz-string
// ---------------------------------------------------------------------------

/**
 * Compact serialization format. Short keys save bytes.
 *   v  = version
 *   vs = visitedSlides (Base64 bitset)
 *   n  = total slide count (needed to decode bitset)
 *   cs = currentSlide
 *   qs = quizScores (sparse: only non-empty entries)
 *   vr = variables (sparse: only non-default values)
 *   tf = triggersFired
 *   lv = layerVisibility (sparse: only non-default)
 *   et = elapsedTime
 */
interface CompactState {
  v: number;
  vs: string;   // Base64 bitset
  n: number;    // slide count
  cs: number;
  qs: Record<string, [number, number, number]>; // [score, maxScore, attempts]
  vr: Record<string, string | number | boolean>;
  tf: string[];
  lv: Record<string, boolean>;
  et: number;
  mc: string[];  // mandatoryCompleted IDs
}

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

/**
 * Compress a CourseState into a string that fits within SCORM 1.2's
 * 4,096 character suspend_data budget.
 *
 * @param state        Current course state
 * @param defaults     Variable default values (used for pruning)
 * @returns            Compressed string ≤4,096 chars, or throws if impossible
 */
export function compressState(
  state: CourseState,
  defaults: VariableDefinition[] = []
): string {
  const defaultMap = new Map<string, string | number | boolean>();
  for (const d of defaults) {
    defaultMap.set(d.name, d.defaultValue);
  }

  // Stage 1: Build compact representation
  const compact: CompactState = {
    v: STATE_VERSION,
    vs: boolArrayToBase64(state.visitedSlides),
    n: state.visitedSlides.length,
    cs: state.currentSlide,
    qs: buildSparseQuizScores(state.quizScores),
    vr: buildSparseVariables(state.variables, defaultMap),
    tf: state.triggersFired,
    lv: buildSparseLayerVisibility(state.layerVisibility),
    et: Math.round(state.elapsedTime),
    mc: state.mandatoryCompleted || [],
  };

  // Stage 2: JSON encode
  let json = JSON.stringify(compact);

  // Stage 3: lz-string compress
  let compressed = compressToEncodedURIComponent(json);

  // Stage 4: Budget check with progressive degradation
  if (compressed.length <= MAX_SUSPEND_DATA) {
    return compressed;
  }

  // Degradation level 1: Drop triggersFired (can be re-evaluated)
  console.warn(
    `[StateCompressor] Budget exceeded (${compressed.length}/${MAX_SUSPEND_DATA}). ` +
    `Dropping triggersFired.`
  );
  compact.tf = [];
  json = JSON.stringify(compact);
  compressed = compressToEncodedURIComponent(json);

  if (compressed.length <= MAX_SUSPEND_DATA) {
    return compressed;
  }

  // Degradation level 2: Drop quiz attempt counts (keep scores)
  console.warn(
    `[StateCompressor] Still over budget (${compressed.length}). ` +
    `Dropping quiz attempt counts.`
  );
  for (const key of Object.keys(compact.qs)) {
    compact.qs[key][2] = 0; // zero out attempts
  }
  json = JSON.stringify(compact);
  compressed = compressToEncodedURIComponent(json);

  if (compressed.length <= MAX_SUSPEND_DATA) {
    return compressed;
  }

  // Degradation level 3: Drop layer visibility (use defaults)
  console.warn(
    `[StateCompressor] Still over budget (${compressed.length}). ` +
    `Dropping layer visibility.`
  );
  compact.lv = {};
  json = JSON.stringify(compact);
  compressed = compressToEncodedURIComponent(json);

  if (compressed.length <= MAX_SUSPEND_DATA) {
    return compressed;
  }

  // Degradation level 4: Drop all variables (critical data loss)
  console.warn(
    `[StateCompressor] Still over budget (${compressed.length}). ` +
    `Dropping all custom variables. This may cause data loss.`
  );
  compact.vr = {};
  json = JSON.stringify(compact);
  compressed = compressToEncodedURIComponent(json);

  if (compressed.length <= MAX_SUSPEND_DATA) {
    return compressed;
  }

  // If we STILL can't fit, truncate and warn
  console.error(
    `[StateCompressor] Cannot fit state within ${MAX_SUSPEND_DATA} chars ` +
    `even after full degradation (${compressed.length}). Truncating.`
  );
  return compressed.slice(0, MAX_SUSPEND_DATA);
}

// ---------------------------------------------------------------------------
// Decompression
// ---------------------------------------------------------------------------

/**
 * Decompress a suspend_data string back into a CourseState.
 * Returns null if the string is empty or corrupted.
 *
 * @param compressed   The raw suspend_data string from the LMS
 * @param slideCount   Total number of slides (needed to reconstruct bitset)
 * @param defaults     Variable defaults (to fill in pruned values)
 */
export function decompressState(
  compressed: string,
  slideCount: number,
  defaults: VariableDefinition[] = []
): CourseState | null {
  if (!compressed || compressed.trim() === "") {
    return null;
  }

  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;

    const compact: CompactState = JSON.parse(json);

    // Validate version
    if (compact.v !== STATE_VERSION) {
      console.warn(
        `[StateCompressor] State version mismatch: expected ${STATE_VERSION}, got ${compact.v}. ` +
        `Attempting best-effort parse.`
      );
    }

    // Reconstruct default variables
    const variables: Record<string, string | number | boolean> = {};
    for (const d of defaults) {
      variables[d.name] = d.defaultValue;
    }
    // Override with stored values
    for (const [key, val] of Object.entries(compact.vr || {})) {
      variables[key] = val;
    }

    // Reconstruct quiz scores
    const quizScores: Record<string, QuizScore> = {};
    for (const [key, tuple] of Object.entries(compact.qs || {})) {
      quizScores[key] = {
        score: tuple[0],
        maxScore: tuple[1],
        attempts: tuple[2],
      };
    }

    return {
      visitedSlides: base64ToBoolArray(compact.vs, compact.n || slideCount),
      currentSlide: compact.cs || 0,
      quizScores,
      variables,
      triggersFired: compact.tf || [],
      layerVisibility: compact.lv || {},
      elapsedTime: compact.et || 0,
      mandatoryCompleted: compact.mc || [],
    };
  } catch (e) {
    console.error("[StateCompressor] Failed to decompress state:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Utility: Create a fresh empty state
// ---------------------------------------------------------------------------

export function createInitialState(
  slideCount: number,
  defaults: VariableDefinition[] = []
): CourseState {
  const variables: Record<string, string | number | boolean> = {};
  for (const d of defaults) {
    variables[d.name] = d.defaultValue;
  }

  return {
    visitedSlides: new Array(slideCount).fill(false),
    currentSlide: 0,
    quizScores: {},
    variables,
    triggersFired: [],
    layerVisibility: {},
    elapsedTime: 0,
    mandatoryCompleted: [],
  };
}

// ---------------------------------------------------------------------------
// Sparse encoding helpers
// ---------------------------------------------------------------------------

function buildSparseQuizScores(
  scores: Record<string, QuizScore>
): Record<string, [number, number, number]> {
  const sparse: Record<string, [number, number, number]> = {};
  for (const [key, val] of Object.entries(scores)) {
    // Only include quizzes that have been attempted
    if (val.attempts > 0 || val.score > 0) {
      sparse[key] = [val.score, val.maxScore, val.attempts];
    }
  }
  return sparse;
}

function buildSparseVariables(
  vars: Record<string, string | number | boolean>,
  defaults: Map<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const sparse: Record<string, string | number | boolean> = {};
  for (const [key, val] of Object.entries(vars)) {
    // Only include non-default values
    const def = defaults.get(key);
    if (def === undefined || val !== def) {
      sparse[key] = val;
    }
  }
  return sparse;
}

function buildSparseLayerVisibility(
  layers: Record<string, boolean>
): Record<string, boolean> {
  // Only include layers that differ from their schema-default (true for base, false for others)
  // Since we don't know which is the base layer here, include all non-default-false
  const sparse: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(layers)) {
    if (val) {
      sparse[key] = val; // Only store visible layers (false is default)
    }
  }
  return sparse;
}
