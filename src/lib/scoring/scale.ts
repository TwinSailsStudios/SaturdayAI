import { SCALES, type Assessment, type ScaledScore } from "@contracts";

/**
 * Score-scale arithmetic. Backend-owned; see docs/01-engine-boundaries.md §4.
 *
 * The digital suite has three composite scales that do not share a zero point
 * or a range. Subtracting a score on one from a score on another produces a
 * number with no meaning, which is exactly what the seed profile did (a 1450
 * target against a 1280 estimate while training for a test that stops at 1440).
 * Every function here refuses that rather than returning a plausible integer.
 */

export type GapResult =
  | { ok: true; gap: number; scale: Assessment }
  | { ok: false; reason: "scale_mismatch"; detail: string }
  | { ok: false; reason: "out_of_range"; detail: string };

export function inRange(score: ScaledScore): boolean {
  const [min, max] = SCALES[score.scale].composite;
  return score.value >= min && score.value <= max;
}

/** The only sanctioned way to compute a score gap anywhere in the product. */
export function scoreGap(from: ScaledScore, to: ScaledScore): GapResult {
  if (from.scale !== to.scale) {
    return {
      ok: false,
      reason: "scale_mismatch",
      detail:
        `Cannot compare a ${to.scale} score to a ${from.scale} score: ` +
        `${describeScale(to.scale)} and ${describeScale(from.scale)} do not share a scale.`,
    };
  }
  for (const s of [from, to]) {
    if (!inRange(s)) {
      const [min, max] = SCALES[s.scale].composite;
      return {
        ok: false,
        reason: "out_of_range",
        detail: `${s.value} is outside the ${s.scale} composite range ${min}–${max}.`,
      };
    }
  }
  return { ok: true, gap: to.value - from.value, scale: to.scale };
}

export function describeScale(a: Assessment): string {
  const [min, max] = SCALES[a].composite;
  return `${labelFor(a)} (${min}–${max})`;
}

export function labelFor(a: Assessment): string {
  switch (a) {
    case "SAT":
      return "SAT";
    case "PSAT_NMSQT":
      return "PSAT/NMSQT";
    case "PSAT_10":
      return "PSAT 10";
    case "PSAT_8_9":
      return "PSAT 8/9";
  }
}
