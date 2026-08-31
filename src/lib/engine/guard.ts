import type { BoundaryRefusal, EngineSignal } from "@contracts";

/**
 * Boundary enforcement at the seam between the engine and the backend.
 *
 * docs/01-engine-boundaries.md lists what the engine may not emit. A prompt
 * instructing a model not to do something is a request, not a guarantee, so
 * the request is enforced here: engine output passes through `scrubEngineOutput`
 * before anything reaches a student or the database.
 *
 * This is intentionally strict. A generated explanation that says "this puts
 * you on track for a 1450" is not a cosmetic problem — it is the product
 * making a promise from a model's guess, in a system whose entire credibility
 * rests on the plan being deterministic.
 */

/** Keys the engine must never populate, at any depth. */
const PROHIBITED_KEYS = [
  "score",
  "scaled_score",
  "composite_score",
  "projected_score",
  "projection",
  "percentile",
  "probability",
  "likelihood",
  "mastery",
  "mastery_state",
  "roadmap",
  "roadmap_change",
  "phase_change",
  "pacing_verdict",
  "calibration_index",
  "readiness",
] as const;

/** Prose the engine must never produce in student-facing text. */
const PROHIBITED_PROSE: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(?:on track|on pace)\s+(?:for|to)\b/i, label: "score trajectory claim" },
  { pattern: /\b\d{3,4}\s*(?:composite|total)?\s*(?:score|by test day)\b/i, label: "score claim" },
  { pattern: /\b\d{1,3}(?:st|nd|rd|th)\s+percentile\b/i, label: "percentile claim" },
  { pattern: /\b\d{1,3}\s*%\s*(?:chance|likely|probability)\b/i, label: "probability claim" },
  { pattern: /\byou(?:'ve| have)\s+mastered\b/i, label: "mastery declaration" },
  { pattern: /\byou(?:'re| are)\s+averaging\b/i, label: "pacing verdict" },
  { pattern: /\b(?:i|we)(?:'ll| will)?\s*(?:'ve)?\s*(?:updated|changed|extended)\s+your\s+(?:plan|roadmap)\b/i, label: "roadmap change" },
];

export interface Violation {
  kind: "prohibited_key" | "prohibited_prose";
  detail: string;
  path: string;
}

export function findViolations(value: unknown, path = ""): Violation[] {
  const out: Violation[] = [];

  if (typeof value === "string") {
    for (const { pattern, label } of PROHIBITED_PROSE) {
      const m = value.match(pattern);
      if (m) {
        out.push({ kind: "prohibited_prose", detail: `${label}: "${m[0]}"`, path: path || "/" });
      }
    }
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((v, i) => out.push(...findViolations(v, `${path}[${i}]`)));
    return out;
  }

  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const here = `${path}/${k}`;
      if ((PROHIBITED_KEYS as readonly string[]).includes(k)) {
        out.push({ kind: "prohibited_key", detail: `engine emitted "${k}"`, path: here });
      }
      out.push(...findViolations(v, here));
    }
  }

  return out;
}

export class BoundaryViolationError extends Error {
  constructor(readonly violations: Violation[]) {
    super(
      `Engine output crossed the backend boundary: ${violations
        .map((v) => `${v.path} — ${v.detail}`)
        .join("; ")}`
    );
    this.name = "BoundaryViolationError";
  }
}

/** Throws rather than sanitising: a violation is a bug in the prompt, and
 *  silently deleting the offending field would hide it. */
export function scrubEngineOutput<T>(output: T): T {
  const violations = findViolations(output);
  if (violations.length) throw new BoundaryViolationError(violations);
  return output;
}

export function isBoundaryRefusal(v: unknown): v is BoundaryRefusal {
  return !!v && typeof v === "object" && (v as { status?: string }).status === "boundary_refusal";
}

export function refuse(requested: string, reason: string, instead: string[]): BoundaryRefusal {
  return { status: "boundary_refusal", requested, reason, engine_can_instead: instead };
}

/** Signals are advisory. Nothing has happened until the backend acts. */
export function signal(type: EngineSignal["type"], rest: Omit<EngineSignal, "type"> = {}): EngineSignal {
  return { type, ...rest };
}
