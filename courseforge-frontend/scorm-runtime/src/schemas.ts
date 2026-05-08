/**
 * schemas.ts — Zod Schemas for the SCORM Runtime
 * =================================================
 * Defines:
 *   1. Canvas Data Model: Slide → Layer → Component
 *   2. Trigger AST: Event → Condition → Action (ECA)
 *   3. CourseState: the runtime state shape that gets compressed
 *   4. CourseDefinition: the full course manifest embedded in the HTML
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════
//  1. CANVAS DATA MODEL — Slides → Layers → Components
// ═══════════════════════════════════════════════════════════════════

/**
 * A Component is the atomic content unit inside a Layer.
 * Maps 1:1 to the authoring tool's block types.
 */
const BaseComponentProps = {
  animation: z.enum(["none", "fade-in", "slide-in-left", "slide-in-right", "zoom-in", "slide-in-up", "slide-in-down", "zoom-out", "flip-in", "bounce-in", "fade-in-up"]).default("none"),
  animationDelay: z.number().min(0).default(0),
};

export const ComponentSchema = z.discriminatedUnion("type", [
  z.object({
    ...BaseComponentProps,
    type: z.literal("text"),
    id: z.string(),
    content: z.string(),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("heading"),
    id: z.string(),
    content: z.string(),
    level: z.number().min(1).max(6).default(2),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("image"),
    id: z.string(),
    src: z.string(),
    alt: z.string().default(""),
    width: z.string().optional(),
    caption: z.string().optional(),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("video"),
    id: z.string(),
    src: z.string(),
    embedType: z.enum(["youtube", "vimeo", "direct"]).default("direct"),
    mandatory: z.boolean().optional(),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("interactive-video"),
    id: z.string(),
    src: z.string(),
    embedType: z.enum(["youtube", "vimeo", "direct"]).default("direct"),
    interactions: z.array(z.object({
      id: z.string(),
      timestamp: z.number(),
      question: z.string(),
      options: z.array(z.string()),
      correctAnswerIndex: z.number(),
      completed: z.boolean().optional(),
    })).default([]),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("image-hotspot"),
    id: z.string(),
    src: z.string(),
    hotspots: z.array(z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      title: z.string(),
      content: z.string(),
    })).default([]),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("button"),
    id: z.string(),
    label: z.string(),
    action: z.string().optional(),
    targetSlideId: z.string().optional(),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("quiz"),
    id: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.number(),
    feedback: z.object({
      correct: z.string().default("Correct!"),
      incorrect: z.string().default("Incorrect. Try again."),
    }).default({}),
    mandatory: z.boolean().optional(),
    marks: z.coerce.number().min(0).optional().catch(0),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("multi_select"),
    id: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.array(z.string()),
    feedback: z.object({
      correct: z.string().default("Correct!"),
      incorrect: z.string().default("Incorrect. Try again."),
    }).default({}),
    mandatory: z.boolean().optional(),
    marks: z.coerce.number().min(0).optional().catch(0),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("matching"),
    id: z.string(),
    question: z.string(),
    pairs: z.array(z.object({
      leftItem: z.string(),
      rightItem: z.string()
    })),
    feedback: z.object({
      correct: z.string().default("Correct!"),
      incorrect: z.string().default("Incorrect. Try again."),
    }).default({}),
    mandatory: z.boolean().optional(),
    marks: z.coerce.number().min(0).optional().catch(0),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("true_false"),
    id: z.string(),
    question: z.string(),
    correctAnswer: z.boolean().default(true),
    mandatory: z.boolean().optional(),
    marks: z.coerce.number().min(0).optional().catch(0),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("fill_blanks"),
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    caseSensitive: z.boolean().default(false),
    mandatory: z.boolean().optional(),
    marks: z.coerce.number().min(0).optional().catch(0),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("flashcard"),
    id: z.string(),
    front: z.string(),
    back: z.string(),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("process"),
    id: z.string(),
    steps: z.array(z.object({
      title: z.string().optional(),
      content: z.string().optional()
    })),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("list"),
    id: z.string(),
    items: z.array(z.string()),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("columns"),
    id: z.string(),
    columns: z.array(z.array(z.any())),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("table"),
    id: z.string(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("audio"),
    id: z.string(),
    src: z.string(),
    label: z.string().optional(),
    mediaId: z.string().optional(),
    mandatory: z.boolean().optional(),
  }),
  z.object({
    ...BaseComponentProps,
    type: z.literal("quote"),
    id: z.string(),
    content: z.string(),
    author: z.string().optional(),
  }),
]);

export type Component = z.infer<typeof ComponentSchema>;

/**
 * A Layer is a visual plane within a Slide. The base layer is always
 * visible; additional layers can be shown/hidden by triggers.
 */
export const LayerSchema = z.object({
  id: z.string(),
  name: z.string().default("Base Layer"),
  components: z.array(ComponentSchema),
  visible: z.boolean().default(true), // base layer = true, others = false
});

export type Layer = z.infer<typeof LayerSchema>;

/**
 * A Slide is a top-level navigable unit containing one or more Layers.
 * Authors build rich layouts by placing multiple Components inside
 * a Slide's layers — NOT one component per slide.
 */
export const SlideSchema = z.object({
  id: z.string(),
  title: z.string(),
  layers: z.array(LayerSchema).min(1), // at least the base layer
  /** Trigger rule IDs that are scoped to this slide */
  triggers: z.array(z.string()).default([]),
});

export type Slide = z.infer<typeof SlideSchema>;

// ═══════════════════════════════════════════════════════════════════
//  2. TRIGGER AST — Event-Condition-Action
// ═══════════════════════════════════════════════════════════════════

/**
 * Value references used in conditions — can be a literal or a variable lookup.
 */
export const ValueRefSchema: z.ZodType<ValueRef> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("literal"), value: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({ kind: z.literal("variable"), varName: z.string() }),
  z.object({ kind: z.literal("quizScore"), quizId: z.string() }),
  z.object({ kind: z.literal("quizMaxScore"), quizId: z.string() }),
  z.object({ kind: z.literal("quizAttempts"), quizId: z.string() }),
]);

export type ValueRef =
  | { kind: "literal"; value: string | number | boolean }
  | { kind: "variable"; varName: string }
  | { kind: "quizScore"; quizId: string }
  | { kind: "quizMaxScore"; quizId: string }
  | { kind: "quizAttempts"; quizId: string };

/**
 * Events that can fire triggers.
 */
export const TriggerEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("slideEnter"), slideId: z.string() }),
  z.object({ type: z.literal("slideExit"), slideId: z.string() }),
  z.object({ type: z.literal("quizSubmit"), quizId: z.string() }),
  z.object({ type: z.literal("click"), targetId: z.string() }),
  z.object({ type: z.literal("variableChange"), varName: z.string() }),
  z.object({ type: z.literal("timerElapsed"), seconds: z.number() }),
  z.object({ type: z.literal("courseStart") }),
  z.object({ type: z.literal("layerShown"), layerId: z.string() }),
  z.object({ type: z.literal("layerHidden"), layerId: z.string() }),
]);

export type TriggerEvent = z.infer<typeof TriggerEventSchema>;

/**
 * Condition AST — composable boolean expressions.
 * Supports AND/OR/NOT trees for complex branching logic.
 */
export type Condition =
  | { op: "eq"; left: ValueRef; right: ValueRef }
  | { op: "neq"; left: ValueRef; right: ValueRef }
  | { op: "gt"; left: ValueRef; right: ValueRef }
  | { op: "gte"; left: ValueRef; right: ValueRef }
  | { op: "lt"; left: ValueRef; right: ValueRef }
  | { op: "lte"; left: ValueRef; right: ValueRef }
  | { op: "and"; conditions: Condition[] }
  | { op: "or"; conditions: Condition[] }
  | { op: "not"; condition: Condition }
  | { op: "visited"; slideId: string }
  | { op: "scoreAbove"; quizId: string; threshold: number }
  | { op: "scoreBelow"; quizId: string; threshold: number }
  | { op: "allSlidesVisited" }
  | { op: "layerVisible"; layerId: string };

// Zod schema uses z.lazy for recursive types
export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ op: z.literal("eq"), left: ValueRefSchema, right: ValueRefSchema }),
    z.object({ op: z.literal("neq"), left: ValueRefSchema, right: ValueRefSchema }),
    z.object({ op: z.literal("gt"), left: ValueRefSchema, right: ValueRefSchema }),
    z.object({ op: z.literal("gte"), left: ValueRefSchema, right: ValueRefSchema }),
    z.object({ op: z.literal("lt"), left: ValueRefSchema, right: ValueRefSchema }),
    z.object({ op: z.literal("lte"), left: ValueRefSchema, right: ValueRefSchema }),
    z.object({ op: z.literal("and"), conditions: z.array(ConditionSchema) }),
    z.object({ op: z.literal("or"), conditions: z.array(ConditionSchema) }),
    z.object({ op: z.literal("not"), condition: ConditionSchema }),
    z.object({ op: z.literal("visited"), slideId: z.string() }),
    z.object({ op: z.literal("scoreAbove"), quizId: z.string(), threshold: z.number() }),
    z.object({ op: z.literal("scoreBelow"), quizId: z.string(), threshold: z.number() }),
    z.object({ op: z.literal("allSlidesVisited") }),
    z.object({ op: z.literal("layerVisible"), layerId: z.string() }),
  ])
);

/**
 * Actions that triggers can execute.
 */
export const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("goToSlide"), slideId: z.string() }),
  z.object({ type: z.literal("nextSlide") }),
  z.object({ type: z.literal("prevSlide") }),
  z.object({ type: z.literal("setVariable"), varName: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({ type: z.literal("incrementVariable"), varName: z.string(), amount: z.number().default(1) }),
  z.object({ type: z.literal("showLayer"), layerId: z.string() }),
  z.object({ type: z.literal("hideLayer"), layerId: z.string() }),
  z.object({ type: z.literal("toggleLayer"), layerId: z.string() }),
  z.object({ type: z.literal("setStatus"), status: z.enum(["completed", "incomplete", "passed", "failed"]) }),
  z.object({ type: z.literal("setScore"), score: z.number(), maxScore: z.number() }),
  z.object({ type: z.literal("showFeedback"), message: z.string(), feedbackType: z.enum(["correct", "incorrect", "info"]).default("info") }),
]);

export type Action = z.infer<typeof ActionSchema>;

/**
 * A complete trigger rule: when EVENT fires, if CONDITION is met, execute ACTIONS.
 */
export const TriggerRuleSchema = z.object({
  id: z.string(),
  event: TriggerEventSchema,
  condition: ConditionSchema.optional(),
  actions: z.array(ActionSchema).min(1),
  /** If true, this trigger fires only once per session (tracked in state) */
  oneShot: z.boolean().default(false),
});

export type TriggerRule = z.infer<typeof TriggerRuleSchema>;

// ═══════════════════════════════════════════════════════════════════
//  3. COURSE STATE — what gets compressed into suspend_data
// ═══════════════════════════════════════════════════════════════════

export const QuizScoreSchema = z.object({
  score: z.number(),
  maxScore: z.number(),
  attempts: z.number(),
});

export type QuizScore = z.infer<typeof QuizScoreSchema>;

export const CourseStateSchema = z.object({
  /** Bitset-ready: index maps to slide index, true = visited */
  visitedSlides: z.array(z.boolean()),
  /** Current slide index */
  currentSlide: z.number(),
  /** Quiz results keyed by quiz component ID */
  quizScores: z.record(z.string(), QuizScoreSchema),
  /** Custom author-defined variables */
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  /** Set of trigger IDs that have fired (for oneShot tracking) */
  triggersFired: z.array(z.string()),
  /** Layer visibility state keyed by layer ID */
  layerVisibility: z.record(z.string(), z.boolean()),
  /** Total elapsed time in seconds */
  elapsedTime: z.number(),
  /** Set of mandatory component IDs the learner has completed */
  mandatoryCompleted: z.array(z.string()).default([]),
});

export type CourseState = z.infer<typeof CourseStateSchema>;

// ═══════════════════════════════════════════════════════════════════
//  4. COURSE POLICY — passing score fallback for offline/preview mode
// ═══════════════════════════════════════════════════════════════════

/**
 * CoursePolicySchema — embedded into every exported SCORM package.
 *
 * At runtime, cmi.student_data.mastery_score (written by the LMS admin
 * via the portal settings) is always preferred over this value.
 * This field is used ONLY as a fallback for offline/preview mode when
 * no LMS is connected.
 */
export const CoursePolicySchema = z.object({
  /** Overall % score needed to receive "passed" status. Used as offline fallback. */
  passingScore: z.number().min(0).max(100).default(80),
});

export type CoursePolicy = z.infer<typeof CoursePolicySchema>;

// ═══════════════════════════════════════════════════════════════════
//  5. COURSE DEFINITION — the full manifest embedded in the HTML
// ═══════════════════════════════════════════════════════════════════

export const VariableDefinitionSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean"]),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]),
});

export type VariableDefinition = z.infer<typeof VariableDefinitionSchema>;

export const CourseDefinitionSchema = z.object({
  id: z.string(),
  title: z.string(),
  version: z.string().default("1.0.0"),
  slides: z.array(SlideSchema),
  triggers: z.array(TriggerRuleSchema),
  variables: z.array(VariableDefinitionSchema),
  /**
   * Offline/preview passing score fallback.
   * In LMS context, cmi.student_data.mastery_score always takes precedence.
   */
  policy: CoursePolicySchema.optional(),
});

export type CourseDefinition = z.infer<typeof CourseDefinitionSchema>;
