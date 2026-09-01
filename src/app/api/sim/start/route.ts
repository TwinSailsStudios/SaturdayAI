import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/constants";
import { bankDepth } from "@/lib/sim/assemble";
import { SHORT_FORM, FULL_FORM } from "@/lib/sim/blueprint";
import { nextStep } from "@/lib/sim/flow";
import { presentModule } from "@/lib/sim/present";
import { beginModule, createAttempt } from "@/lib/sim/store";

export const runtime = "nodejs";

export async function POST() {
  const student = await db().getStudent(DEMO_USER_ID);
  if (!student) return NextResponse.json({ error: "student not found" }, { status: 404 });

  const assessment = student.student_profile.active_target.assessment;

  // Two modules per section, drawn without repeats, so the bank must hold at
  // least twice a module's length in each section.
  for (const section of ["reading_writing", "math"] as const) {
    const needed = SHORT_FORM[section].questions * 2;
    const have = bankDepth(section, assessment);
    if (have < needed) {
      return NextResponse.json(
        {
          error: "bank_too_small",
          detail: `${section} needs ${needed} eligible items for two modules; the bank has ${have}.`,
        },
        { status: 409 }
      );
    }
  }

  const attempt = createAttempt(DEMO_USER_ID, assessment);
  const step = nextStep(attempt);
  if (step.kind !== "module") {
    return NextResponse.json({ error: "could not build the first module" }, { status: 500 });
  }
  beginModule(step.module);

  return NextResponse.json({
    attempt_id: attempt.id,
    assessment,
    form: {
      shortened: true,
      reading_writing: SHORT_FORM.reading_writing,
      math: SHORT_FORM.math,
      full_reading_writing: FULL_FORM.reading_writing,
      full_math: FULL_FORM.math,
    },
    module: presentModule(step.module),
  });
}
