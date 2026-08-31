/**
 * Apex SAT — shared types for the Next.js backend and the Content Engine.
 *
 * Hand-maintained mirror of `schemas/*.json`. The JSON Schemas are the
 * runtime contract (the backend validates engine output against them on
 * ingest); this file is the compile-time convenience plus the handful of
 * constants both sides need. When the two disagree, the schema wins.
 */

export type Assessment = "SAT" | "PSAT_NMSQT" | "PSAT_10" | "PSAT_8_9";
export type Section = "reading_writing" | "math";
export type Difficulty = "easy" | "medium" | "hard";
export type ModuleTarget =
  | "module_1"
  | "module_2_lower"
  | "module_2_upper"
  | "practice_only";
export type QuestionFormat = "multiple_choice" | "student_produced_response";
export type RoadmapPhase = "diagnose" | "repair" | "build" | "sharpen" | "simulate";
export type CloneRung = "scaffolded" | "neutral" | "adversarial";

/** Composite and per-section score ranges. Never compare across assessments. */
export const SCALES: Record<Assessment, { composite: [number, number]; section: [number, number] }> = {
  SAT: { composite: [400, 1600], section: [200, 800] },
  PSAT_NMSQT: { composite: [320, 1520], section: [160, 760] },
  PSAT_10: { composite: [320, 1520], section: [160, 760] },
  PSAT_8_9: { composite: [240, 1440], section: [120, 720] },
};

/** Structure is identical across the digital suite. */
export const BLUEPRINT = {
  reading_writing: { modules: 2, questionsPerModule: 27, minutesPerModule: 32 },
  math: { modules: 2, questionsPerModule: 22, minutesPerModule: 35 },
  breakMinutes: 10,
} as const;

/** Trap IDs are append-only. See schemas/cognitive-traps.json. */
export type TrapId = `MATH_${string}` | `RW_${string}`;

export type Domain =
  | "rw.information_and_ideas"
  | "rw.craft_and_structure"
  | "rw.expression_of_ideas"
  | "rw.standard_english_conventions"
  | "math.algebra"
  | "math.advanced"
  | "math.psda"
  | "math.geometry_trig";

/** Dotted skill ids — the join key between engine, bank, and Student Model. */
export type SkillId = `${Domain}.${string}`;

/* ------------------------------------------------------------------ */
/* Student Model                                                       */
/* ------------------------------------------------------------------ */

export interface ScaledScore {
  value: number;
  scale: Assessment;
  source?: "backend_projection" | "official_report" | "user_stated";
}

export type CalibrationFlag =
  | "well_calibrated"
  | "high_overconfidence"
  | "high_underconfidence"
  | "ratings_degenerate"
  | "insufficient_data";

export type SkillMastery =
  | "untested"
  | "gap"
  | "developing"
  | "fragile"
  | "solid"
  | "mastered";

export interface RecentError {
  response_id: string;
  question_id: string;
  skill: SkillId;
  selected_option?: string | null;
  correct_option?: string | null;
  submitted_response?: string | null;
  /** 1–5, captured before feedback and never revised. */
  certainty?: 1 | 2 | 3 | 4 | 5 | null;
  trap_id?: TrapId;
  time_seconds?: number;
}

export interface StudentProfile {
  user: { id: string; display_name?: string };
  academic_context?: { school?: string; grade?: number };
  active_target: {
    assessment: Assessment;
    scale?: { composite?: [number, number]; section?: [number, number] };
    test_date?: string;
  };
  /** Motivational framing only — carries no precomputed cross-scale gap. */
  aspirational_goal?: {
    type?: "dream_school" | "score_target" | "scholarship" | "team_eligibility";
    institution?: string;
    target_score?: ScaledScore;
    current_estimate?: ScaledScore;
  };
  training_availability?: { minutes_per_day?: number; days_per_week?: number };
  current_roadmap_phase: {
    phase: RoadmapPhase;
    phase_label?: string;
    week?: number;
    total_weeks?: number;
  };
  calibration_state?: {
    flag?: CalibrationFlag;
    detail?: string;
    computed_by?: "backend";
  };
  top_cognitive_traps?: TrapId[];
  recent_errors?: RecentError[];
  skill_state?: Record<string, { state: SkillMastery; evidence_count?: number }>;
  engine_directives?: {
    clone_budget?: number;
    allow_reveal?: boolean;
    suppress_confidence_framing?: boolean;
    max_questions?: number;
  };
}

export interface StudentModel {
  schema_version: string;
  student_profile: StudentProfile;
}

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

export interface QuestionOption {
  id: "A" | "B" | "C" | "D";
  text: string;
  is_correct: boolean;
  /** Required on every distractor. No filler options. */
  trap_id?: TrapId;
  /** The exact reasoning path that produces this option. */
  rationale?: string;
}

export interface StimulusData {
  kind: "table" | "scatter" | "line" | "bar";
  title?: string;
  columns?: string[];
  rows?: Array<Array<string | number>>;
  axis_labels?: { x?: string; y?: string };
  notes?: string;
}

/** Ordered deliberately: recognition before correction. */
export interface Explanation {
  trap_first: string;
  divergence_step: string;
  correct_path: string;
  key_move?: string;
  remediation_cue: string;
}

export type DesmosPlay = `T${1 | 2 | 3 | 4 | 5}.${string}`;

export interface DesmosBlock {
  recommended: boolean;
  tier?: 1 | 2 | 3 | 4 | 5;
  play?: DesmosPlay;
  expressions?: string[];
  read_off?: string;
  time_saved_estimate_seconds?: number;
  /** Required when `recommended` is false — this is how Tier 5 gets taught. */
  restraint_note?: string | null;
}

export type BankStatus = "candidate" | "practice_pool" | "sim_pool" | "retired";

export interface Question {
  id: string;
  schema_version: string;
  assessment: Assessment;
  section: Section;
  domain: Domain;
  skill: SkillId;
  difficulty: Difficulty;
  module_target: ModuleTarget;
  format: QuestionFormat;
  stimulus?: string | null;
  stimulus_word_count?: number | null;
  stimulus_data?: StimulusData | null;
  prompt: string;
  /** Exactly 4, exactly one correct, every distractor trap-mapped. */
  options?: QuestionOption[];
  /** SPR only. Every accepted equivalent form, each within the entry limits. */
  acceptable_answers?: string[];
  spr_entry_check?: {
    fits_character_limit?: boolean;
    has_negative_value?: boolean;
    is_repeating_decimal?: boolean;
    multiple_correct_values_stated_in_prompt?: boolean;
  } | null;
  explanation: Explanation;
  desmos?: DesmosBlock | null;
  targets_trap?: TrapId | null;
  clone_of?: string | null;
  clone_rung?: CloneRung | null;
  metadata?: {
    estimated_time_seconds?: number;
    calculator_recommended?: boolean;
    reading_level_grade?: number;
  };
  provenance: {
    source: "apex_generated" | "apex_authored" | "imported";
    generated_at: string;
    engine_version?: string;
    gate_passed: GateCheckId[];
    /** New items enter as `candidate`. Generated items never debut in a sim. */
    bank_status?: BankStatus;
  };
}

export type GateCheckId =
  | "G01_SINGLE_DEFENSIBLE_ANSWER"
  | "G02_ALL_DISTRACTORS_TRAP_MAPPED"
  | "G03_NO_OUTSIDE_KNOWLEDGE"
  | "G04_OPTIONS_PARALLEL"
  | "G05_NO_OVERLAP_AMBIGUITY"
  | "G06_RW_STIMULUS_BOUNDS"
  | "G07_SPR_ENTRY_VALID"
  | "G08_DIFFICULTY_MATCHES_ASSESSMENT"
  | "G09_DESMOS_BLOCK_PRESENT"
  | "G10_NO_PII"
  | "G11_CLONE_TRAP_FIRES"
  | "G12_ANSWER_POSITION_BALANCED"
  | "G13_CONTENT_SAFETY"
  | "G14_EXPLANATION_ORDER"
  | "G15_SLIP_CAP";

/* ------------------------------------------------------------------ */
/* Engine I/O                                                          */
/* ------------------------------------------------------------------ */

export type EngineSignalType =
  | "trap_recurrence"
  | "trap_cleared"
  | "prerequisite_gap"
  | "state_disagreement"
  | "scale_mismatch"
  | "incomplete_student_model";

/** Advisory evidence. The backend decides what it means; the engine never assumes it was acted on. */
export interface EngineSignal {
  type: EngineSignalType;
  trap_id?: TrapId;
  skill?: SkillId;
  blocking_skill?: SkillId;
  observed_in?: string[];
  note?: string;
}

export interface BoundaryRefusal {
  status: "boundary_refusal";
  requested: string;
  reason: string;
  engine_can_instead: string[];
}

export type GenerationSurface =
  | "generate.questions"
  | "generate.clone"
  | "explain.question"
  | "desmos.coach";

export interface GenerationRequest {
  schema_version: string;
  surface: GenerationSurface;
  student_model: StudentModel;
  spec?: {
    count?: number;
    section?: Section | "mixed";
    skills?: SkillId[];
    difficulty?: Difficulty[];
    module_target?: ModuleTarget;
    format_mix?: { student_produced_response_share?: number };
    exclude_question_ids?: string[];
  };
  clone_spec?: {
    source_question: Question;
    trap_id: TrapId;
    student_selected_option?: string | null;
    student_certainty?: 1 | 2 | 3 | 4 | 5 | null;
    rungs?: CloneRung[];
  };
  explain_spec?: {
    question: Question;
    student_selected_option?: string | null;
    student_submitted_response?: string | null;
    student_certainty?: 1 | 2 | 3 | 4 | 5 | null;
  };
}

export interface QuestionBundle {
  questions: Question[];
  engine_signals?: EngineSignal[];
}

export type EngineResponse = QuestionBundle | BoundaryRefusal;

/* ------------------------------------------------------------------ */
/* Tutor                                                               */
/* ------------------------------------------------------------------ */

export type TutorMove =
  | "probe"
  | "narrow"
  | "hint"
  | "worked_step"
  | "micro_lesson"
  | "confirm"
  | "handoff";

export interface TutorTurn {
  move: TutorMove;
  /** 1 probe → 2 narrow → 3 hint → 4 one worked step. Rungs are not skipped. */
  escalation_level: 1 | 2 | 3 | 4;
  /** The only student-facing field. At most one question per turn. */
  utterance: string;
  references?: string[];
  trap_named?: TrapId | null;
  next_expected_student_action?:
    | "answer_probe"
    | "retry_item"
    | "run_desmos_play"
    | "read_micro_lesson"
    | "none";
  desmos_play?: DesmosPlay | null;
  reveals_answer: boolean;
  engine_signals?: EngineSignal[];
}

/* ------------------------------------------------------------------ */
/* Calibration                                                         */
/* ------------------------------------------------------------------ */

export type CalibrationQuadrant =
  /** high certainty, wrong — a confident misconception; highest review priority */
  | "false_mastery"
  /** low certainty, right — verify with a clone before crediting */
  | "fragile_lucky"
  /** low certainty, wrong — honest ignorance; teach it */
  | "known_gap"
  /** high certainty, right — spiral and space out */
  | "true_mastery";

/**
 * Tagging only. The calibration *index* (how overconfident, by how much) is
 * computed by the backend across the response log — never here.
 *
 * Certainty 4-5 is "high": the student had a path and checked it, or would bet
 * the section on it. 1-3 is "low".
 */
export function quadrantOf(
  certainty: 1 | 2 | 3 | 4 | 5,
  correct: boolean
): CalibrationQuadrant {
  const high = certainty >= 4;
  if (correct) return high ? "true_mastery" : "fragile_lucky";
  return high ? "false_mastery" : "known_gap";
}

/**
 * Review ordering for a practice set built from an error log. Most tools sort
 * by "questions you got wrong"; Apex sorts by how wrong the student's
 * self-knowledge is, which is what actually costs points under time pressure.
 */
export const QUADRANT_REVIEW_PRIORITY: readonly CalibrationQuadrant[] = [
  "false_mastery",
  "fragile_lucky",
  "known_gap",
  "true_mastery",
];
