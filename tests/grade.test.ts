import { describe, expect, it } from "vitest";
import { grade, equivalent, entryLimitFor } from "@/lib/practice/grade";
import { SEED_QUESTIONS_BY_ID } from "@/lib/seed/questions";

describe("grading", () => {
  const mc = SEED_QUESTIONS_BY_ID.get("q_001")!;
  const spr = SEED_QUESTIONS_BY_ID.get("q_007")!;

  it("attributes the trap from the option the student chose", () => {
    expect(grade(mc, { selected_option: "A" })).toEqual({
      is_correct: false,
      correct_option: "B",
      trap_id: "MATH_PREMATURE_STOP",
    });
  });

  it("attributes no trap to a correct answer", () => {
    expect(grade(mc, { selected_option: "B" }).trap_id).toBeNull();
  });

  it("falls back to item-level attribution on a grid-in", () => {
    // No chosen distractor exists, so the item's target trap is the best
    // available signal — weaker, and the review copy says so.
    expect(grade(spr, { submitted_response: "7" })).toEqual({
      is_correct: false,
      correct_option: null,
      trap_id: "MATH_PREMATURE_STOP",
    });
  });

  it("accepts every enterable form of the same value", () => {
    expect(equivalent("7/2", "3.5")).toBe(true);
    expect(equivalent("3.5", "7/2")).toBe(true);
    expect(equivalent("0.5", ".5")).toBe(true);
    expect(equivalent("-1/4", "-0.25")).toBe(true);
    expect(equivalent("3", " 3 ")).toBe(true);
  });

  it("rejects non-answers and malformed entries", () => {
    expect(equivalent("3", "")).toBe(false);
    expect(equivalent("3", "three")).toBe(false);
    expect(equivalent("3", "3%")).toBe(false);
    expect(equivalent("3", "1/0")).toBe(false);
  });

  it("allows the extra character only for a negative value", () => {
    expect(entryLimitFor("3.5")).toBe(5);
    expect(entryLimitFor("-3.5")).toBe(6);
  });
});
