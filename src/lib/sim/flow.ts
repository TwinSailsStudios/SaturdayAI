import type { Section } from "@contracts";
import { routeModuleTwoScaled } from "@/lib/scoring/routing";
import { assembleModule } from "./assemble";
import { SHORT_FORM } from "./blueprint";
import { addModule, type SimAttemptState, type SimModuleState } from "./store";

/**
 * Section order and the break between them. RW routing must not influence Math
 * routing, so each section's module 2 is decided from that section alone.
 */
const SECTION_ORDER: Section[] = ["reading_writing", "math"];

export type SimStep =
  | { kind: "module"; module: SimModuleState }
  | { kind: "break" }
  | { kind: "report" };

function moduleOf(
  attempt: SimAttemptState,
  section: Section,
  ordinal: 1 | 2
): SimModuleState | undefined {
  return attempt.modules.find((m) => m.section === section && m.ordinal === ordinal);
}

function usedQuestionIds(attempt: SimAttemptState): Set<string> {
  return new Set(attempt.modules.flatMap((m) => m.questionIds));
}

function build(
  attempt: SimAttemptState,
  section: Section,
  ordinal: 1 | 2
): SimModuleState {
  const spec = SHORT_FORM[section];

  let target: SimModuleState["target"] = "module_1";
  if (ordinal === 2) {
    const first = moduleOf(attempt, section, 1);
    if (!first) throw new Error(`cannot build ${section} module 2 before module 1`);
    const correct = first.responses.filter((r) => r.isCorrect).length;
    target = routeModuleTwoScaled(section, correct, first.questionIds.length);
  }

  const questions = assembleModule({
    section,
    target,
    count: spec.questions,
    assessment: attempt.assessment,
    exclude: usedQuestionIds(attempt),
  });

  return addModule(attempt, {
    section,
    ordinal,
    target,
    questionIds: questions.map((q) => q.id),
    durationSecs: spec.durationSecs,
  });
}

/**
 * The next thing that should happen. Pure with respect to the client: nothing
 * the browser sends can skip a module or shorten a clock, because the sequence
 * is derived here from what has actually been submitted.
 */
export function nextStep(attempt: SimAttemptState): SimStep {
  for (const [index, section] of SECTION_ORDER.entries()) {
    // A break sits between sections, after the previous section is finished.
    if (index > 0) {
      const previous = SECTION_ORDER[index - 1]!;
      const previousDone = moduleOf(attempt, previous, 2)?.submittedAt != null;
      if (previousDone && attempt.breakTakenAt === null) return { kind: "break" };
    }

    for (const ordinal of [1, 2] as const) {
      const existing = moduleOf(attempt, section, ordinal);
      if (!existing) return { kind: "module", module: build(attempt, section, ordinal) };
      if (existing.submittedAt === null) return { kind: "module", module: existing };
    }
  }
  return { kind: "report" };
}

export interface SimReport {
  attempt_id: string;
  assessment: string;
  shortened: true;
  sections: Array<{
    section: Section;
    module_1_correct: number;
    module_1_of: number;
    module_2_target: string;
    module_2_correct: number;
    module_2_of: number;
    total_correct: number;
    total_of: number;
  }>;
  traps_fired: Array<{ trap_id: string; count: number }>;
  late_submissions: number;
}

export function buildReport(attempt: SimAttemptState): SimReport {
  const traps = new Map<string, number>();
  for (const m of attempt.modules) {
    for (const r of m.responses) {
      if (r.trapId) traps.set(r.trapId, (traps.get(r.trapId) ?? 0) + 1);
    }
  }

  const sections = SECTION_ORDER.map((section) => {
    const first = moduleOf(attempt, section, 1);
    const second = moduleOf(attempt, section, 2);
    const correct1 = first?.responses.filter((r) => r.isCorrect).length ?? 0;
    const correct2 = second?.responses.filter((r) => r.isCorrect).length ?? 0;
    return {
      section,
      module_1_correct: correct1,
      module_1_of: first?.questionIds.length ?? 0,
      module_2_target: second?.target ?? "not reached",
      module_2_correct: correct2,
      module_2_of: second?.questionIds.length ?? 0,
      total_correct: correct1 + correct2,
      total_of: (first?.questionIds.length ?? 0) + (second?.questionIds.length ?? 0),
    };
  });

  return {
    attempt_id: attempt.id,
    assessment: attempt.assessment,
    // There is deliberately no scaled score here. Converting raw counts from a
    // 14-question form onto the 240–1440 scale would be inventing a number.
    shortened: true,
    sections,
    traps_fired: [...traps.entries()]
      .map(([trap_id, count]) => ({ trap_id, count }))
      .sort((a, b) => b.count - a.count),
    late_submissions: attempt.modules.filter((m) => m.submittedLate).length,
  };
}
