import {
  quadrantOf,
  QUADRANT_REVIEW_PRIORITY,
  type CalibrationQuadrant,
  type RecentError,
} from "@contracts";

export { quadrantOf, QUADRANT_REVIEW_PRIORITY };

/**
 * Calibration analysis. Backend-owned: the engine tags a quadrant, but every
 * number below is computed here, from the response log, and is reproducible.
 */

export const QUADRANT_COPY: Record<
  CalibrationQuadrant,
  { title: string; note: string; tone: "alert" | "warn" | "info" | "good" }
> = {
  false_mastery: {
    title: "False Mastery",
    note: "You were certain and wrong. That is a misconception, not a slip — and a score report would never have shown it to you.",
    tone: "alert",
  },
  fragile_lucky: {
    title: "Fragile",
    note: "Right, but you weren't sure. Worth one clone to find out whether it was the method or the odds.",
    tone: "warn",
  },
  known_gap: {
    title: "Known Gap",
    note: "Wrong, and you knew you weren't sure. That's honest — it just needs teaching.",
    tone: "info",
  },
  true_mastery: {
    title: "True Mastery",
    note: "Certain and correct. Nothing to spend time on here.",
    tone: "good",
  },
};

export interface CalibrationSummary {
  counts: Record<CalibrationQuadrant, number>;
  rated: number;
  /**
   * Mean squared distance between stated confidence and outcome, over rated
   * responses — a Brier-style score in [0, 1] where lower is better calibrated.
   * Certainty is mapped 1..5 to 0.1..0.9.
   */
  brier: number | null;
  flag:
    | "well_calibrated"
    | "high_overconfidence"
    | "high_underconfidence"
    | "ratings_degenerate"
    | "insufficient_data";
}

const CONFIDENCE_OF: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0.1,
  2: 0.3,
  3: 0.5,
  4: 0.7,
  5: 0.9,
};

export function summarise(
  responses: Array<Pick<RecentError, "certainty"> & { is_correct: boolean }>
): CalibrationSummary {
  const counts: Record<CalibrationQuadrant, number> = {
    false_mastery: 0,
    fragile_lucky: 0,
    known_gap: 0,
    true_mastery: 0,
  };
  const rated = responses.filter(
    (r): r is typeof r & { certainty: 1 | 2 | 3 | 4 | 5 } => r.certainty != null
  );

  let squaredError = 0;
  let signedError = 0;
  for (const r of rated) {
    counts[quadrantOf(r.certainty, r.is_correct)]++;
    const confidence = CONFIDENCE_OF[r.certainty];
    const outcome = r.is_correct ? 1 : 0;
    squaredError += (confidence - outcome) ** 2;
    signedError += confidence - outcome;
  }

  if (rated.length < MIN_RATED_FOR_FLAG) {
    return { counts, rated: rated.length, brier: null, flag: "insufficient_data" };
  }

  const distinct = new Set(rated.map((r) => r.certainty)).size;
  if (distinct === 1) {
    // Every answer rated identically: the student has learned to game the
    // slider. Degenerate data, so we stop reasoning from it rather than
    // reporting a confident number. See docs/05 §5.
    return { counts, rated: rated.length, brier: null, flag: "ratings_degenerate" };
  }

  const brier = squaredError / rated.length;
  const bias = signedError / rated.length;
  const flag =
    bias > OVERCONFIDENCE_THRESHOLD
      ? "high_overconfidence"
      : bias < -OVERCONFIDENCE_THRESHOLD
        ? "high_underconfidence"
        : "well_calibrated";

  return { counts, rated: rated.length, brier, flag };
}

/** Documented, versioned constants — not tuned per user, not model output. */
export const MIN_RATED_FOR_FLAG = 8;
export const OVERCONFIDENCE_THRESHOLD = 0.15;

/** Review ordering: sort by how wrong the student's self-knowledge is. */
export function reviewOrder<T extends { quadrant: CalibrationQuadrant | null }>(
  items: T[]
): T[] {
  const rank = (q: CalibrationQuadrant | null) =>
    q === null ? QUADRANT_REVIEW_PRIORITY.length : QUADRANT_REVIEW_PRIORITY.indexOf(q);
  return [...items].sort((a, b) => rank(a.quadrant) - rank(b.quadrant));
}
