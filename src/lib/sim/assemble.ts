import type { ModuleTarget, Question, Section } from "@contracts";
import { SEED_QUESTIONS } from "@/lib/seed/questions";

/**
 * Form assembly.
 *
 * Sim items come from the bank; they are never generated on demand. A sim is
 * the measurement instrument, and a freshly generated item has no response data
 * behind it, so it would corrupt the measurement (docs/07 §5). That rule is
 * enforced here by only considering items already promoted past `candidate`.
 */
export interface AssembleArgs {
  section: Section;
  target: ModuleTarget;
  count: number;
  assessment: Question["assessment"];
  exclude: Set<string>;
}

const DIFFICULTY_ORDER: Record<Question["difficulty"], number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

/** Difficulty the routed form should lean on. */
function preference(target: ModuleTarget): Question["difficulty"][] {
  if (target === "module_2_upper") return ["hard", "medium", "easy"];
  if (target === "module_2_lower") return ["easy", "medium", "hard"];
  return ["medium", "easy", "hard"]; // module 1 is a mixed form
}

export function assembleModule(args: AssembleArgs): Question[] {
  const pool = SEED_QUESTIONS.filter(
    (q) =>
      q.section === args.section &&
      q.assessment === args.assessment &&
      !args.exclude.has(q.id) &&
      q.provenance.bank_status !== "candidate" &&
      q.provenance.bank_status !== "retired"
  );

  const order = preference(args.target);
  const ranked = [...pool].sort(
    (a, b) =>
      order.indexOf(a.difficulty) - order.indexOf(b.difficulty) ||
      a.id.localeCompare(b.id)
  );

  const picked = ranked.slice(0, args.count);

  // Within a module, present easy → hard, and put grid-ins last in Math the way
  // the real form does.
  return picked.sort((a, b) => {
    const sprA = a.format === "student_produced_response" ? 1 : 0;
    const sprB = b.format === "student_produced_response" ? 1 : 0;
    return sprA - sprB || DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
  });
}

/** How many items the bank can actually supply for a section. */
export function bankDepth(section: Section, assessment: Question["assessment"]): number {
  return SEED_QUESTIONS.filter(
    (q) =>
      q.section === section &&
      q.assessment === assessment &&
      q.provenance.bank_status !== "candidate" &&
      q.provenance.bank_status !== "retired"
  ).length;
}
