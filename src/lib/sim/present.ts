import { present, type PresentedQuestion } from "@/lib/practice/present";
import { SEED_QUESTIONS_BY_ID } from "@/lib/seed/questions";
import { BREAK_SECONDS } from "./blueprint";
import { deadlineOf, type SimModuleState } from "./store";

export interface PresentedModule {
  module_id: string;
  section: SimModuleState["section"];
  ordinal: 1 | 2;
  /** Deliberately not sent: which form the router chose. The real test never tells you. */
  duration_secs: number;
  deadline_iso: string | null;
  questions: PresentedQuestion[];
}

export function presentModule(module: SimModuleState): PresentedModule {
  const deadline = deadlineOf(module);
  return {
    module_id: module.id,
    section: module.section,
    ordinal: module.ordinal,
    duration_secs: module.durationSecs,
    deadline_iso: deadline === null ? null : new Date(deadline).toISOString(),
    questions: module.questionIds
      .map((id) => SEED_QUESTIONS_BY_ID.get(id))
      .filter((q): q is NonNullable<typeof q> => !!q)
      .map(present),
  };
}

export const BREAK_PAYLOAD = { kind: "break" as const, seconds: BREAK_SECONDS };
