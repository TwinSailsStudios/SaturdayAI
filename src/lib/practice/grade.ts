import type { Question, TrapId } from "@contracts";

export interface Grade {
  is_correct: boolean;
  correct_option: string | null;
  /** The trap that actually fired, from the option the student chose. */
  trap_id: TrapId | null;
}

/**
 * Grading is deterministic backend work — no model is consulted about whether
 * an answer is right.
 */
export function grade(
  question: Question,
  answer: { selected_option?: string | null; submitted_response?: string | null }
): Grade {
  if (question.format === "multiple_choice") {
    const options = question.options ?? [];
    const correct = options.find((o) => o.is_correct) ?? null;
    const chosen = options.find((o) => o.id === answer.selected_option) ?? null;
    return {
      is_correct: !!chosen?.is_correct,
      correct_option: correct?.id ?? null,
      trap_id: chosen && !chosen.is_correct ? (chosen.trap_id ?? null) : null,
    };
  }

  const submitted = (answer.submitted_response ?? "").trim();
  const accepted = question.acceptable_answers ?? [];
  const isCorrect = accepted.some((a) => equivalent(a, submitted));

  return {
    is_correct: isCorrect,
    correct_option: null,
    // On a grid-in there is no chosen distractor, so the trap the item was
    // built around is the best available attribution. It is a weaker signal
    // than a selected option and the review copy says so.
    trap_id: isCorrect ? null : (question.targets_trap ?? null),
  };
}

/** Accepts every enterable form of the same value: "7/2", "3.5", ".5", "-1/4". */
export function equivalent(accepted: string, submitted: string): boolean {
  if (!submitted) return false;
  if (accepted.trim() === submitted) return true;
  const a = toNumber(accepted);
  const b = toNumber(submitted);
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 1e-9;
}

function toNumber(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const fraction = v.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Digital SPR entry limits: 5 characters for a positive value, 6 including the
 * sign for a negative one. Enforced on input so the student meets the real
 * constraint here rather than discovering it on test day.
 */
export function entryLimitFor(value: string): number {
  return value.startsWith("-") ? 6 : 5;
}
