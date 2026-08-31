import { describe, expect, it } from "vitest";
import { quadrantOf, summarise, reviewOrder } from "@/lib/scoring/calibration";

describe("calibration", () => {
  it("maps certainty and outcome to the four quadrants", () => {
    expect(quadrantOf(5, false)).toBe("false_mastery");
    expect(quadrantOf(4, false)).toBe("false_mastery");
    expect(quadrantOf(3, false)).toBe("known_gap");
    expect(quadrantOf(2, true)).toBe("fragile_lucky");
    expect(quadrantOf(5, true)).toBe("true_mastery");
  });

  it("flags overconfidence from confident misses", () => {
    const responses = Array.from({ length: 10 }, (_, i) => ({
      certainty: (i < 7 ? 5 : 2) as 5 | 2,
      is_correct: i >= 7,
    }));
    const summary = summarise(responses);
    expect(summary.flag).toBe("high_overconfidence");
    expect(summary.counts.false_mastery).toBe(7);
  });

  it("refuses to reason from degenerate ratings", () => {
    const responses = Array.from({ length: 12 }, (_, i) => ({
      certainty: 3 as const,
      is_correct: i % 2 === 0,
    }));
    const summary = summarise(responses);
    expect(summary.flag).toBe("ratings_degenerate");
    expect(summary.brier).toBeNull();
  });

  it("withholds a flag until there is enough rated evidence", () => {
    expect(summarise([{ certainty: 5, is_correct: false }]).flag).toBe("insufficient_data");
  });

  it("orders review by how wrong the student's self-knowledge is", () => {
    const ordered = reviewOrder([
      { quadrant: "true_mastery" as const },
      { quadrant: "known_gap" as const },
      { quadrant: "false_mastery" as const },
      { quadrant: "fragile_lucky" as const },
    ]);
    expect(ordered.map((o) => o.quadrant)).toEqual([
      "false_mastery",
      "fragile_lucky",
      "known_gap",
      "true_mastery",
    ]);
  });
});
