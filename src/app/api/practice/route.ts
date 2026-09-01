import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BankEngine, piiOf } from "@/lib/engine/bank-engine";
import { runGate } from "@/lib/engine/gate";
import { POSTURE, setSize } from "@/lib/engine/posture";
import { present } from "@/lib/practice/present";
import { DEMO_USER_ID } from "@/lib/constants";
import type { GenerationRequest } from "@contracts";

export const runtime = "nodejs";

/**
 * Build a practice set.
 *
 * The order here is the architecture in miniature: the backend assembles the
 * request from the Student Model, the engine returns items, and every item is
 * re-validated against schemas/question.schema.json before anyone sees it.
 * An item that fails the gate is dropped, not patched.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    section?: "reading_writing" | "math" | "mixed";
    count?: number;
  };

  const repo = db();
  const student = await repo.getStudent(DEMO_USER_ID);
  if (!student) {
    return NextResponse.json({ error: "student not found" }, { status: 404 });
  }

  const profile = student.student_profile;
  const posture = POSTURE[profile.current_roadmap_phase.phase];
  const count =
    body.count ?? setSize(profile.training_availability?.minutes_per_day ?? 45);

  const engineRequest: GenerationRequest = {
    schema_version: "1.0.0",
    surface: "generate.questions",
    student_model: student,
    spec: { count, section: body.section ?? "mixed" },
  };

  const engine = new BankEngine();
  const bundle = await engine.generateSet(engineRequest);

  const pii = piiOf(student);
  const accepted = [];
  const rejected = [];
  for (const q of bundle.questions) {
    const gate = runGate(q, { pii });
    if (gate.ok) accepted.push(q);
    else rejected.push({ id: q.id, failures: gate.failures });
  }

  await repo.recordSignals(DEMO_USER_ID, bundle.engine_signals ?? []);
  const set = await repo.createPracticeSet(
    DEMO_USER_ID,
    accepted.map((q) => q.id)
  );

  return NextResponse.json({
    set_id: set.id,
    engine: engine.name,
    student: {
      display_name: profile.user.display_name ?? null,
      assessment: profile.active_target.assessment,
      calibration_flag: profile.calibration_state?.flag ?? null,
      phase: profile.current_roadmap_phase.phase,
      allow_reveal: profile.engine_directives?.allow_reveal ?? false,
    },
    posture: { phase: profile.current_roadmap_phase.phase, ...posture },
    questions: accepted.map(present),
    // Surfaced rather than swallowed: a rejected item is a content bug and
    // should be visible to whoever is looking at the app.
    rejected,
    signals: bundle.engine_signals ?? [],
  });
}
