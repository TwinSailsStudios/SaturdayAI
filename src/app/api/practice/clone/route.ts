import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BankEngine, piiOf } from "@/lib/engine/bank-engine";
import { runGate } from "@/lib/engine/gate";
import { present } from "@/lib/practice/present";
import { DEMO_USER_ID } from "@/lib/constants";
import type { CloneRung, TrapId } from "@contracts";

export const runtime = "nodejs";

/**
 * Request a Mistake Clone: a new item that recreates the trap, not the
 * question. The engine runs the clone validity test before emitting (the
 * student's wrong reasoning path must still land on an available option), and
 * the gate re-checks that the clone does not reuse the source's correct letter.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    source_question_id?: string;
    trap_id?: string;
    rung?: CloneRung;
  } | null;

  if (!body?.source_question_id || !body.trap_id) {
    return NextResponse.json(
      { error: "source_question_id and trap_id are required" },
      { status: 400 }
    );
  }

  const repo = db();
  const [student, source] = await Promise.all([
    repo.getStudent(DEMO_USER_ID),
    repo.getQuestion(body.source_question_id),
  ]);
  if (!student || !source) {
    return NextResponse.json({ error: "student or source question not found" }, { status: 404 });
  }

  const engine = new BankEngine();
  const bundle = await engine.clone({
    source,
    trap: body.trap_id as TrapId,
    rung: body.rung ?? "neutral",
    student,
  });

  await repo.recordSignals(DEMO_USER_ID, bundle.engine_signals ?? []);

  const pii = piiOf(student);
  const clone = bundle.questions.find((q) => runGate(q, { source, pii }).ok);

  if (!clone) {
    return NextResponse.json({
      clone: null,
      reason:
        "No clone available. The authored bank ships a limited number; an LLM engine would write one here.",
    });
  }

  return NextResponse.json({ clone: present(clone), rung: clone.clone_rung });
}
