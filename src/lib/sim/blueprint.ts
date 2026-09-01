import { BLUEPRINT, type Section } from "@contracts";

/**
 * Sim form definitions.
 *
 * FULL is the real digital-suite structure. SHORT is what the authored bank can
 * currently fill, and it exists so the sim machinery — server-authoritative
 * timing, routing, the navigator, the eliminator — can be exercised end to end
 * rather than described.
 *
 * The shortened form preserves the real *pace* exactly: per-question seconds are
 * taken from the full form, so a student practising on it is practising the
 * timing pressure they will actually meet. What it cannot reproduce is
 * endurance or the blueprint's domain mix. Say so in the UI; never present a
 * short-form result as a test score.
 */
export interface ModuleSpec {
  section: Section;
  questions: number;
  durationSecs: number;
}

export const FULL_FORM: Record<Section, ModuleSpec> = {
  reading_writing: {
    section: "reading_writing",
    questions: BLUEPRINT.reading_writing.questionsPerModule,
    durationSecs: BLUEPRINT.reading_writing.minutesPerModule * 60,
  },
  math: {
    section: "math",
    questions: BLUEPRINT.math.questionsPerModule,
    durationSecs: BLUEPRINT.math.minutesPerModule * 60,
  },
};

/** Seconds per question on the real form — the number the pace is built on. */
export function secondsPerQuestion(section: Section): number {
  const spec = FULL_FORM[section];
  return spec.durationSecs / spec.questions;
}

/** A shortened module that keeps the real per-question pace. */
export function shortModule(section: Section, questions: number): ModuleSpec {
  return {
    section,
    questions,
    durationSecs: Math.round(questions * secondsPerQuestion(section)),
  };
}

export const SHORT_FORM: Record<Section, ModuleSpec> = {
  reading_writing: shortModule("reading_writing", 4),
  math: shortModule("math", 3),
};

export const BREAK_SECONDS = BLUEPRINT.breakMinutes * 60;

/** Grace for network latency before a submission counts as late. */
export const SUBMIT_GRACE_SECONDS = 5;
