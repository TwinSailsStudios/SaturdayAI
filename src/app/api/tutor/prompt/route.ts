import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

/**
 * Serves the tutor's system prompt.
 *
 * The prompt lives in prompts/socratic-tutor.system.md and that file stays the
 * single source of truth — editing the spec changes the running tutor. The
 * server sends the prompt; the browser holds the key and makes the model call.
 * Nothing secret crosses either way.
 */
export async function GET() {
  const prompt = readFileSync(
    join(process.cwd(), "prompts", "socratic-tutor.system.md"),
    "utf8"
  );
  return NextResponse.json(
    { prompt },
    { headers: { "cache-control": "public, max-age=60" } }
  );
}
