import type { ModuleTarget, Section } from "@contracts";

/**
 * Two-stage adaptive routing. Deterministic, versioned, and reproducible — a
 * threshold, never a model call. See docs/07-test-sim-fidelity.md §4.
 *
 * ROUTING_VERSION is stamped on the attempt so a historical score can always
 * be re-derived under the rules that produced it. Changing a threshold
 * requires a new version, never an edit in place.
 *
 * NOTE: these thresholds are Apex's own and are a placeholder pending the
 * decision recorded in docs/OPEN-QUESTIONS.md §C1.
 */
export const ROUTING_VERSION = "routing-2026.1";

const THRESHOLD: Record<Section, { correctOf: number; upperAtLeast: number }> = {
  // Module 1 is 27 questions in RW, 22 in Math (docs/02 §1).
  reading_writing: { correctOf: 27, upperAtLeast: 16 },
  math: { correctOf: 22, upperAtLeast: 13 },
};

export function routeModuleTwo(section: Section, moduleOneCorrect: number): ModuleTarget {
  const { correctOf, upperAtLeast } = THRESHOLD[section];
  if (moduleOneCorrect < 0 || moduleOneCorrect > correctOf) {
    throw new RangeError(
      `module 1 score ${moduleOneCorrect} is outside 0..${correctOf} for ${section}`
    );
  }
  return moduleOneCorrect >= upperAtLeast ? "module_2_upper" : "module_2_lower";
}

/** RW routing must not influence Math routing, or vice versa. */
export function routeAttempt(moduleOne: Record<Section, number>): Record<Section, ModuleTarget> {
  return {
    reading_writing: routeModuleTwo("reading_writing", moduleOne.reading_writing),
    math: routeModuleTwo("math", moduleOne.math),
  };
}
