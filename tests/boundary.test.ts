import { describe, expect, it } from "vitest";
import {
  BoundaryViolationError,
  findViolations,
  scrubEngineOutput,
} from "@/lib/engine/guard";

/**
 * The boundary is the architecture's central claim. A prompt telling a model
 * not to emit a score is a request; these tests are what makes it a guarantee.
 */
describe("engine boundary guard", () => {
  it("rejects a prohibited key at any depth", () => {
    expect(() =>
      scrubEngineOutput({ questions: [{ id: "q_1", metadata: { projected_score: 1310 } }] })
    ).toThrow(BoundaryViolationError);
  });

  it.each([
    ["you're on track for a 1450 by test day", "score trajectory claim"],
    ["that puts you around the 88th percentile", "percentile claim"],
    ["there's a 70% chance you hit your goal", "probability claim"],
    ["you've mastered linear systems", "mastery declaration"],
    ["you're averaging 92 seconds a question", "pacing verdict"],
    ["I've updated your roadmap to add a week", "roadmap change"],
  ])("catches prose: %s", (utterance) => {
    const violations = findViolations({ utterance });
    // One string can legitimately trip several patterns ("a 1450 by test day"
    // is both a trajectory claim and a score claim). Any hit is a rejection.
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations.every((v) => v.kind === "prohibited_prose")).toBe(true);
  });

  it("passes legitimate engine output untouched", () => {
    const output = {
      questions: [{ id: "q_1", prompt: "What is the value of x + 5?" }],
      engine_signals: [
        { type: "trap_recurrence", trap_id: "MATH_PREMATURE_STOP", observed_in: ["r1", "r2", "r3"] },
      ],
    };
    expect(scrubEngineOutput(output)).toBe(output);
  });

  it("does not flag ordinary content that merely contains numbers", () => {
    expect(
      findViolations({
        explanation: "Subtract the equations: 15p = 285, so p = 19. Then f = 560 − 380 = 180.",
      })
    ).toEqual([]);
  });
});
