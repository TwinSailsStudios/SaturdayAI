import { describe, expect, it } from "vitest";
import { scoreGap, inRange, describeScale } from "@/lib/scoring/scale";

/**
 * The seed profile shipped a 1450 SAT-scale target, a 1280 estimate, a
 * precomputed 170-point gap, and a PSAT 8/9 active target that stops at 1440.
 * These tests pin down that the product refuses that arithmetic.
 */
describe("score scales", () => {
  it("refuses a gap across two scales", () => {
    const result = scoreGap(
      { value: 1280, scale: "PSAT_8_9" },
      { value: 1450, scale: "SAT" }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("scale_mismatch");
  });

  it("computes a gap within one scale", () => {
    const result = scoreGap({ value: 1280, scale: "SAT" }, { value: 1450, scale: "SAT" });
    expect(result).toEqual({ ok: true, gap: 170, scale: "SAT" });
  });

  it("rejects a target above the scale's maximum", () => {
    // 1450 is not a reachable PSAT 8/9 score.
    expect(inRange({ value: 1450, scale: "PSAT_8_9" })).toBe(false);
    const result = scoreGap({ value: 1100, scale: "PSAT_8_9" }, { value: 1450, scale: "PSAT_8_9" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("out_of_range");
  });

  it("describes each scale with its real range", () => {
    expect(describeScale("PSAT_8_9")).toBe("PSAT 8/9 (240–1440)");
    expect(describeScale("SAT")).toBe("SAT (400–1600)");
  });
});
