import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/constants";
import { grade } from "@/lib/practice/grade";
import { SEED_QUESTIONS_BY_ID } from "@/lib/seed/questions";
import { SUBMIT_GRACE_SECONDS } from "@/lib/sim/blueprint";
import { buildReport, nextStep } from "@/lib/sim/flow";
import { presentModule, BREAK_PAYLOAD } from "@/lib/sim/present";
import { beginModule, currentModule, deadlineOf, getAttempt } from "@/lib/sim/store";

export const runtime = "nodejs";

interface Answer {
  question_id: string;
  selected_option?: string | null;
  submitted_response?: string | null;
}

/**
 * Submit the open module.
 *
 * Grading happens here, against the bank, because the client was never given a
 * key. Timing is checked here too: the module's deadline is derived from a
 * server-held start time, so a client that stops its own countdown gains
 * nothing.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    attempt_id?: string;
    answers?: Answer[];
  } | null;

  if (!body?.attempt_id) {
    return NextResponse.json({ error: "attempt_id is required" }, { status: 400 });
  }

  const attempt = getAttempt(body.attempt_id);
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  if (attempt.userId !== DEMO_USER_ID) {
    return NextResponse.json({ error: "not your attempt" }, { status: 403 });
  }

  const module = currentModule(attempt);
  if (!module) return NextResponse.json({ error: "no module is open" }, { status: 409 });

  const deadline = deadlineOf(module);
  const now = Date.now();
  const late = deadline !== null && now > deadline + SUBMIT_GRACE_SECONDS * 1000;

  const answers = body.answers ?? [];
  for (const questionId of module.questionIds) {
    const question = SEED_QUESTIONS_BY_ID.get(questionId);
    if (!question) continue;
    const answer = answers.find((a) => a.question_id === questionId);
    const result = grade(question, {
      selected_option: answer?.selected_option ?? null,
      submitted_response: answer?.submitted_response ?? null,
    });
    module.responses.push({
      questionId,
      selectedOption: answer?.selected_option ?? null,
      submittedResponse: answer?.submitted_response ?? null,
      isCorrect: result.is_correct,
      trapId: result.trap_id,
    });
  }

  module.submittedAt = now;
  module.submittedLate = late;

  // The sim writes to the same response log practice does — the error log is
  // one log, so a trap that fires under time pressure informs the same roadmap.
  const repo = db();
  for (const r of module.responses) {
    await repo.recordResponse({
      user_id: DEMO_USER_ID,
      question_id: r.questionId,
      set_id: null,
      selected_option: r.selectedOption,
      submitted_response: r.submittedResponse,
      is_correct: r.isCorrect,
      // No certainty rating in a simulation: the real test does not ask for one,
      // so there is no quadrant to assign either.
      certainty: null,
      quadrant: null,
      trap_id: r.trapId,
      time_seconds: null,
    });
  }

  const step = nextStep(attempt);
  if (step.kind === "report") {
    return NextResponse.json({ kind: "report", report: buildReport(attempt) });
  }
  if (step.kind === "break") {
    return NextResponse.json(BREAK_PAYLOAD);
  }

  beginModule(step.module);
  return NextResponse.json({ kind: "module", module: presentModule(step.module) });
}
