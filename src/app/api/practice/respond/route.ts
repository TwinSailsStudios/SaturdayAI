import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { grade } from "@/lib/practice/grade";
import { quadrantOf, QUADRANT_COPY } from "@/lib/scoring/calibration";
import { knownTrapIds } from "@/lib/engine/gate";
import { scrubEngineOutput } from "@/lib/engine/guard";
import { DEMO_USER_ID } from "@/lib/constants";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

interface TrapDoc {
  traps: Array<{ id: string; label: string; remediation_cue: string; tell: string }>;
}

let trapsById: Map<string, TrapDoc["traps"][number]> | null = null;
function trapInfo(id: string) {
  if (!trapsById) {
    const doc = JSON.parse(
      readFileSync(join(process.cwd(), "schemas", "cognitive-traps.json"), "utf8")
    ) as TrapDoc;
    trapsById = new Map(doc.traps.map((t) => [t.id, t]));
  }
  return trapsById.get(id) ?? null;
}

/**
 * Submit one answer.
 *
 * Certainty is captured with the answer and is never revisable — the whole
 * calibration signal depends on it being a prediction rather than a memory.
 * See docs/05-confidence-calibration.md.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    set_id?: string | null;
    question_id?: string;
    selected_option?: string | null;
    submitted_response?: string | null;
    certainty?: number | null;
    time_seconds?: number | null;
  } | null;

  if (!body?.question_id) {
    return NextResponse.json({ error: "question_id is required" }, { status: 400 });
  }
  if (body.certainty != null && ![1, 2, 3, 4, 5].includes(body.certainty)) {
    return NextResponse.json({ error: "certainty must be 1–5" }, { status: 400 });
  }

  const repo = db();
  const question = await repo.getQuestion(body.question_id);
  if (!question) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  const result = grade(question, {
    selected_option: body.selected_option,
    submitted_response: body.submitted_response,
  });

  const certainty = (body.certainty ?? null) as 1 | 2 | 3 | 4 | 5 | null;
  const quadrant = certainty ? quadrantOf(certainty, result.is_correct) : null;

  const stored = await repo.recordResponse({
    user_id: DEMO_USER_ID,
    question_id: question.id,
    set_id: body.set_id ?? null,
    selected_option: body.selected_option ?? null,
    submitted_response: body.submitted_response ?? null,
    is_correct: result.is_correct,
    certainty,
    quadrant,
    trap_id: result.trap_id,
    time_seconds: body.time_seconds ?? null,
  });

  const traps = knownTrapIds();
  const firedTrap =
    result.trap_id && traps.has(result.trap_id) ? trapInfo(result.trap_id) : null;

  // How often this same trap has already fired. The tutor is allowed to name a
  // pattern it can see in the log; it is not allowed to compute a rate from it.
  const priorSameTrap = result.trap_id
    ? (await repo.listResponses(DEMO_USER_ID, 50)).filter(
        (r) => r.trap_id === result.trap_id && r.id !== stored.id
      ).length
    : 0;

  // Review payload. The explanation is authored trap-first (docs/04 §4); it is
  // released only now, with the answer already committed.
  const review = scrubEngineOutput({
    response_id: stored.id,
    is_correct: result.is_correct,
    correct_option: result.correct_option,
    acceptable_answers: question.acceptable_answers ?? null,
    certainty,
    quadrant,
    quadrant_copy: quadrant ? QUADRANT_COPY[quadrant] : null,
    trap: firedTrap
      ? { id: firedTrap.id, label: firedTrap.label, tell: firedTrap.tell }
      : null,
    recent_same_trap: priorSameTrap,
    trap_attribution:
      question.format === "student_produced_response" && !result.is_correct
        ? "item_level"
        : "option_level",
    explanation: question.explanation,
    desmos: question.desmos ?? null,
    option_rationales: (question.options ?? []).map((o) => ({
      id: o.id,
      is_correct: o.is_correct,
      trap_id: o.trap_id ?? null,
      rationale: o.rationale ?? null,
    })),
    clone_offer:
      !result.is_correct && question.targets_trap
        ? { trap_id: question.targets_trap, source_question_id: question.id }
        : null,
  });

  return NextResponse.json(review);
}
