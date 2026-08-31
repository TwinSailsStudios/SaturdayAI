import { describe, expect, it } from "vitest";
import { routeAttempt, routeModuleTwo } from "@/lib/scoring/routing";

describe("adaptive routing", () => {
  it("routes on a deterministic threshold, per section", () => {
    expect(routeModuleTwo("math", 13)).toBe("module_2_upper");
    expect(routeModuleTwo("math", 12)).toBe("module_2_lower");
    expect(routeModuleTwo("reading_writing", 16)).toBe("module_2_upper");
    expect(routeModuleTwo("reading_writing", 15)).toBe("module_2_lower");
  });

  it("keeps RW and Math independent", () => {
    expect(routeAttempt({ reading_writing: 27, math: 0 })).toEqual({
      reading_writing: "module_2_upper",
      math: "module_2_lower",
    });
  });

  it("rejects a score outside the module's question count", () => {
    expect(() => routeModuleTwo("math", 23)).toThrow(RangeError);
    expect(() => routeModuleTwo("reading_writing", -1)).toThrow(RangeError);
  });
});
