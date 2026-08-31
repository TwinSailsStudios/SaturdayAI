import type {
  CloneRung,
  GenerationRequest,
  Question,
  QuestionBundle,
  StudentModel,
  TrapId,
} from "@contracts";
import { SEED_QUESTIONS, SEED_QUESTIONS_BY_ID } from "@/lib/seed/questions";
import { POSTURE, setSize } from "./posture";
import { scrubEngineOutput, signal } from "./guard";
import { runGate } from "./gate";
import type { EngineClient } from "./types";

/**
 * Deterministic engine backed by the authored bank.
 *
 * It makes no model call, so the practice flow is demonstrable with no API key
 * and no cost — but it goes through exactly the same seam as an LLM engine
 * would: same request shape, same boundary scrub, same validation gate. When
 * the LLM implementation lands, nothing downstream of this file changes.
 */
export class BankEngine implements EngineClient {
  readonly name = "bank-engine";

  async generateSet(request: GenerationRequest): Promise<QuestionBundle> {
    const profile = request.student_model.student_profile;
    const posture = POSTURE[profile.current_roadmap_phase.phase];
    const count =
      request.spec?.count ??
      profile.engine_directives?.max_questions ??
      setSize(profile.training_availability?.minutes_per_day ?? 45);

    const topTraps = profile.top_cognitive_traps ?? [];
    const exclude = new Set(request.spec?.exclude_question_ids ?? []);

    const eligible = SEED_QUESTIONS.filter((q) => {
      if (exclude.has(q.id)) return false;
      if (q.provenance.bank_status === "retired") return false;
      if (q.assessment !== profile.active_target.assessment) return false;
      const section = request.spec?.section;
      if (section && section !== "mixed" && q.section !== section) return false;
      const skills = request.spec?.skills;
      if (skills?.length && !skills.includes(q.skill)) return false;
      return true;
    });

    // Repair posture weights the active traps heavily; other postures spread.
    const weight = (q: Question): number => {
      let w = 0;
      if (q.targets_trap && topTraps.includes(q.targets_trap)) {
        w += posture.cloneDensity === "high" ? 100 : 30;
        w -= topTraps.indexOf(q.targets_trap); // preserve trap ranking
      }
      const state = profile.skill_state?.[q.skill]?.state;
      if (state === "fragile") w += 20;
      else if (state === "developing") w += 12;
      else if (state === "gap") w += 16;
      else if (state === "mastered" || state === "solid") w -= 10;
      if (q.clone_of && posture.cloneDensity === "none") w -= 60;
      return w;
    };

    const ordered = [...eligible].sort(
      (a, b) => weight(b) - weight(a) || a.id.localeCompare(b.id)
    );

    // Keep the set from becoming remediation-only: cap trap-targeted items at
    // roughly two thirds so ordinary coverage still appears. docs/09 §4.
    const trapCap = Math.max(1, Math.ceil(count * 0.66));
    const picked: Question[] = [];
    let trapCount = 0;
    for (const q of ordered) {
      if (picked.length >= count) break;
      const isTrapItem = !!q.targets_trap && topTraps.includes(q.targets_trap);
      if (isTrapItem && trapCount >= trapCap) continue;
      picked.push(q);
      if (isTrapItem) trapCount++;
    }
    for (const q of ordered) {
      if (picked.length >= count) break;
      if (!picked.includes(q)) picked.push(q);
    }

    const signals = detectSignals(request.student_model);
    return scrubEngineOutput({ questions: picked, engine_signals: signals });
  }

  async clone(args: {
    source: Question;
    trap: TrapId;
    rung: CloneRung;
    student: StudentModel;
  }): Promise<QuestionBundle> {
    // The authored bank ships one clone per source. A real engine writes a new
    // item here; the contract and the checks are identical either way.
    const match = SEED_QUESTIONS.find(
      (q) => q.clone_of === args.source.id && q.targets_trap === args.trap
    );

    const budget = args.student.student_profile.engine_directives?.clone_budget ?? 0;
    if (budget <= 0 || !match) {
      return scrubEngineOutput({
        questions: [],
        engine_signals: match
          ? [signal("trap_recurrence", { trap_id: args.trap, note: "clone budget exhausted" })]
          : [],
      });
    }

    const gate = runGate(match, {
      source: args.source,
      pii: piiOf(args.student),
    });
    if (!gate.ok) {
      // A clone that fails the gate is discarded, never emitted with a note.
      return scrubEngineOutput({ questions: [], engine_signals: [] });
    }

    return scrubEngineOutput({
      questions: [match],
      engine_signals: [
        signal("trap_recurrence", {
          trap_id: args.trap,
          observed_in: (args.student.student_profile.recent_errors ?? [])
            .filter((e) => e.trap_id === args.trap)
            .map((e) => e.response_id),
          note: `Emitted the ${args.rung} rung.`,
        }),
      ],
    });
  }
}

export function piiOf(student: StudentModel): string[] {
  const p = student.student_profile;
  return [p.user.display_name, p.academic_context?.school].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
}

/**
 * Evidence, not decisions. The engine reports what it saw in the slice it was
 * handed; the backend's roadmap policy decides what any of it means.
 */
function detectSignals(student: StudentModel) {
  const p = student.student_profile;
  const errors = p.recent_errors ?? [];
  const signals = [];

  const byTrap = new Map<string, string[]>();
  for (const e of errors) {
    if (!e.trap_id) continue;
    byTrap.set(e.trap_id, [...(byTrap.get(e.trap_id) ?? []), e.response_id]);
  }
  for (const [trap, responses] of byTrap) {
    if (responses.length >= 3) {
      signals.push(
        signal("trap_recurrence", {
          trap_id: trap as TrapId,
          observed_in: responses,
          note: "Same trap in three or more recent responses.",
        })
      );
    }
  }

  if (!p.active_target?.assessment || !p.current_roadmap_phase?.phase) {
    signals.push(signal("incomplete_student_model", { note: "missing target or phase" }));
  }

  const goal = p.aspirational_goal;
  if (goal?.target_score && goal.target_score.scale !== p.active_target.assessment) {
    signals.push(
      signal("scale_mismatch", {
        note:
          `Aspirational goal is on the ${goal.target_score.scale} scale while the active ` +
          `target is ${p.active_target.assessment}. No gap is computed across the two.`,
      })
    );
  }

  return signals;
}

export function questionById(id: string): Question | undefined {
  return SEED_QUESTIONS_BY_ID.get(id);
}
