import type { TutorTurn } from "./schema";
import { findViolations } from "@/lib/engine/guard";

export const TUTOR_MODEL = "claude-opus-5";

export interface TutorContext {
  studentName?: string;
  calibrationFlag?: string;
  phase?: string;
  assessment?: string;
  question: {
    id: string;
    skill: string;
    stimulus: string | null;
    prompt: string;
    options: Array<{ id: string; text: string }>;
  };
  studentAnswer: string;
  certainty: number | null;
  isCorrect: boolean;
  trap: { id: string; label: string } | null;
  remediationCue: string;
  desmosPlay: string | null;
  recentSameTrap: number;
  allowReveal: boolean;
}

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export type TutorErrorKind =
  | "no_key"
  | "bad_key"
  | "rate_limited"
  | "connection"
  | "api"
  | "boundary"
  | "schema"
  | "unknown";

/**
 * Errors are normalised here so the UI never has to import the SDK just to
 * name a failure — that keeps the SDK out of the initial bundle.
 */
export class TutorError extends Error {
  constructor(
    readonly kind: TutorErrorKind,
    message: string
  ) {
    super(message);
    this.name = "TutorError";
  }
}

/**
 * The SDK is ~80kB and only matters once a student actually opens the tutor,
 * so it is imported on demand rather than at page load.
 */
async function loadSdk() {
  const [{ default: Anthropic }, { zodOutputFormat }, { TutorTurnSchema }] = await Promise.all([
    import("@anthropic-ai/sdk"),
    import("@anthropic-ai/sdk/helpers/zod"),
    import("./schema"),
  ]);
  return { Anthropic, zodOutputFormat, TutorTurnSchema };
}

function normalise(e: unknown, Anthropic: typeof import("@anthropic-ai/sdk").default): TutorError {
  if (e instanceof TutorError) return e;
  if (e instanceof Anthropic.AuthenticationError) {
    return new TutorError("bad_key", "That API key was rejected. Check it in Tutor Key.");
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new TutorError("rate_limited", "Your account is rate limited. Wait a moment and retry.");
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new TutorError("connection", "Could not reach the Claude API from this browser.");
  }
  if (e instanceof Anthropic.APIError) {
    return new TutorError("api", `Claude API error ${e.status}: ${e.message}`);
  }
  return new TutorError("unknown", e instanceof Error ? e.message : "Something went wrong.");
}

/** Verifies a key with the smallest possible real call. */
export async function testKey(apiKey: string): Promise<string> {
  const { Anthropic } = await loadSdk();
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  try {
    await client.messages.create({
      model: TUTOR_MODEL,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with the single word: ready" }],
    });
    return `Key works. ${TUTOR_MODEL} responded.`;
  } catch (e) {
    throw normalise(e, Anthropic);
  }
}

/**
 * One tutor turn.
 *
 * Runs entirely in the browser on the student's own key — the key is never sent
 * to an Apex server, which is why this is a client module with no API route
 * behind it. `dangerouslyAllowBrowser` is the SDK's required acknowledgement
 * that the key is client-side; here that is the intended architecture, not an
 * oversight (docs/08-byok-tutor.md).
 */
export async function askTutor(args: {
  apiKey: string;
  systemPrompt: string;
  context: TutorContext;
  history: TutorMessage[];
  escalationLevel: number;
  studentMessage: string;
}): Promise<TutorTurn> {
  if (!args.apiKey.trim()) throw new TutorError("no_key", "No API key saved.");

  const { Anthropic, zodOutputFormat, TutorTurnSchema } = await loadSdk();
  const client = new Anthropic({ apiKey: args.apiKey, dangerouslyAllowBrowser: true });

  try {
    const response = await client.messages.parse({
      model: TUTOR_MODEL,
      // A tutor turn is a few sentences and one question. The student is paying
      // for these tokens, so we buy reasoning room without buying an essay.
      max_tokens: 4000,
      output_config: { effort: "medium", format: zodOutputFormat(TutorTurnSchema) },
      system: [
        // The spec text is stable across every turn and every student, so it is
        // the natural cache breakpoint; the per-turn context follows it.
        { type: "text", text: args.systemPrompt, cache_control: { type: "ephemeral" } },
        { type: "text", text: renderContext(args.context, args.escalationLevel) },
      ],
      messages: [
        ...args.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: args.studentMessage },
      ],
    });

    const turn = response.parsed_output;
    if (!turn) {
      throw new TutorError("schema", "The tutor's reply did not match the required shape.");
    }

    // The same boundary that guards the content engine guards the tutor. A
    // tutor that starts predicting scores is the failure this architecture
    // exists to prevent, so the turn is discarded rather than shown.
    const violations = findViolations({ utterance: turn.utterance });
    if (violations.length) {
      throw new TutorError(
        "boundary",
        `The tutor crossed the backend boundary (${violations
          .map((v) => v.detail)
          .join("; ")}). The turn was discarded — that is the guard working, but the prompt needs a look.`
      );
    }

    return turn;
  } catch (e) {
    throw normalise(e, Anthropic);
  }
}

function renderContext(c: TutorContext, escalationLevel: number): string {
  const lines: string[] = [
    "# This turn's context",
    "",
    `Student: ${c.studentName ?? "the student"}`,
    `Target: ${c.assessment ?? "unknown"} · phase: ${c.phase ?? "unknown"}`,
    `Calibration flag: ${c.calibrationFlag ?? "unknown"}`,
    `Reveal permitted by the backend: ${c.allowReveal ? "yes" : "no"}`,
    "",
    "## The question they just answered",
    `Skill: ${c.question.skill}`,
  ];

  if (c.question.stimulus) lines.push("", `Stimulus: ${c.question.stimulus}`);
  lines.push("", `Prompt: ${c.question.prompt}`);

  if (c.question.options.length) {
    lines.push("", "Options:");
    for (const o of c.question.options) lines.push(`  ${o.id}. ${o.text}`);
  }

  lines.push(
    "",
    "## What happened",
    `They answered: ${c.studentAnswer}`,
    `Certainty they stated: ${c.certainty ?? "not rated"} of 5`,
    `Correct: ${c.isCorrect ? "yes" : "no"}`
  );

  if (c.trap) {
    lines.push(
      `Trap that fired: ${c.trap.id} — ${c.trap.label}`,
      `Remediation cue for that trap: ${c.remediationCue}`
    );
  }
  if (c.recentSameTrap > 0) {
    lines.push(
      `This trap has fired ${c.recentSameTrap} other time(s) in their recent error log.`
    );
  }
  if (c.desmosPlay) lines.push(`Desmos play for this item: ${c.desmosPlay}`);

  lines.push(
    "",
    "## Your move",
    `You are at escalation level ${escalationLevel}. Do not skip past it.`,
    "Answer with one move only, as JSON matching the required schema."
  );

  return lines.join("\n");
}
