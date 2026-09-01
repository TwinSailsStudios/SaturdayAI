import { NextResponse } from "next/server";
import { DEMO_USER_ID } from "@/lib/constants";
import { nextStep } from "@/lib/sim/flow";
import { presentModule } from "@/lib/sim/present";
import { beginModule, getAttempt } from "@/lib/sim/store";

export const runtime = "nodejs";

/** Ends the break and starts the next module's clock. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { attempt_id?: string } | null;
  if (!body?.attempt_id) {
    return NextResponse.json({ error: "attempt_id is required" }, { status: 400 });
  }

  const attempt = getAttempt(body.attempt_id);
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  if (attempt.userId !== DEMO_USER_ID) {
    return NextResponse.json({ error: "not your attempt" }, { status: 403 });
  }

  if (attempt.breakTakenAt === null) attempt.breakTakenAt = Date.now();

  const step = nextStep(attempt);
  if (step.kind !== "module") {
    return NextResponse.json({ error: "no module to begin" }, { status: 409 });
  }
  beginModule(step.module);
  return NextResponse.json({ kind: "module", module: presentModule(step.module) });
}
