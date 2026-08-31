import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { GateCheckId, Question, TrapId } from "@contracts";

/**
 * The validation gate, backend side.
 *
 * The engine is instructed to run all fifteen checks and to report the ones it
 * passed (prompts/content-engine.system.md). We do not take its word for it:
 * anything mechanically checkable is re-checked here before an item can reach
 * the bank.
 *
 * The split matters and is deliberate. MECHANICAL checks are decided by this
 * code. ATTESTED checks are judgements only a reader can make — whether the
 * distractors are genuinely parallel, whether the stimulus smuggles in outside
 * knowledge, whether exactly one answer is truly defensible. For those we
 * record that the engine claimed them and flag any it did not, but we cannot
 * verify them here, and pretending otherwise would be the most dangerous kind
 * of green check.
 */

export const MECHANICAL_CHECKS = [
  "G02_ALL_DISTRACTORS_TRAP_MAPPED",
  "G05_NO_OVERLAP_AMBIGUITY",
  "G06_RW_STIMULUS_BOUNDS",
  "G07_SPR_ENTRY_VALID",
  "G09_DESMOS_BLOCK_PRESENT",
  "G10_NO_PII",
  "G12_ANSWER_POSITION_BALANCED",
  "G15_SLIP_CAP",
] as const satisfies readonly GateCheckId[];

export const ATTESTED_CHECKS = [
  "G01_SINGLE_DEFENSIBLE_ANSWER",
  "G03_NO_OUTSIDE_KNOWLEDGE",
  "G04_OPTIONS_PARALLEL",
  "G08_DIFFICULTY_MATCHES_ASSESSMENT",
  "G11_CLONE_TRAP_FIRES",
  "G13_CONTENT_SAFETY",
  "G14_EXPLANATION_ORDER",
] as const satisfies readonly GateCheckId[];

export interface GateFailure {
  check: GateCheckId | "SCHEMA";
  detail: string;
}

export interface GateResult {
  ok: boolean;
  /** Mechanical checks this item actually passed here. */
  verified: GateCheckId[];
  /** Attested checks the engine claimed. Not verified by this code. */
  attested: GateCheckId[];
  /** Attested checks the engine did not claim — review before promoting. */
  unattested: GateCheckId[];
  failures: GateFailure[];
}

export interface GateContext {
  /** Values that must never appear in bank content (docs/03 §4). */
  pii?: string[];
  /** Source item, when validating a clone. */
  source?: Question;
}

// --- schema validation ------------------------------------------------------

let questionValidator: ValidateFunction | null = null;
let trapIds: Set<string> | null = null;

function schemaPath(name: string): string {
  return join(process.cwd(), "schemas", name);
}

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(schemaPath(name), "utf8")) as T;
}

/** schemas/*.json is the runtime contract, exactly as docs/01 claims. */
function getQuestionValidator(): ValidateFunction {
  if (!questionValidator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    questionValidator = ajv.compile(loadJson("question.schema.json"));
  }
  return questionValidator;
}

export function knownTrapIds(): Set<string> {
  if (!trapIds) {
    const doc = loadJson<{ traps: Array<{ id: string }> }>("cognitive-traps.json");
    trapIds = new Set(doc.traps.map((t) => t.id));
  }
  return trapIds;
}

// --- the gate ---------------------------------------------------------------

export function runGate(question: Question, ctx: GateContext = {}): GateResult {
  const failures: GateFailure[] = [];
  const verified: GateCheckId[] = [];
  const pass = (id: (typeof MECHANICAL_CHECKS)[number], ok: boolean, detail: string) => {
    if (ok) verified.push(id);
    else failures.push({ check: id, detail });
  };

  const validate = getQuestionValidator();
  if (!validate(question)) {
    for (const e of validate.errors ?? []) {
      failures.push({ check: "SCHEMA", detail: `${e.instancePath || "/"} ${e.message}` });
    }
  }

  const options = question.options ?? [];
  const distractors = options.filter((o) => !o.is_correct);
  const traps = knownTrapIds();

  // G02 — every distractor is a designed reasoning path.
  if (question.format === "multiple_choice") {
    const unmapped = distractors.filter((o) => !o.trap_id || !o.rationale);
    const unknown = distractors
      .map((o) => o.trap_id)
      .filter((t): t is TrapId => !!t && !traps.has(t));
    pass(
      "G02_ALL_DISTRACTORS_TRAP_MAPPED",
      unmapped.length === 0 && unknown.length === 0,
      unmapped.length
        ? `options ${unmapped.map((o) => o.id).join(", ")} lack a trap_id or rationale`
        : `unknown trap ids: ${unknown.join(", ")}`
    );

    const correct = options.filter((o) => o.is_correct);
    if (correct.length !== 1) {
      failures.push({
        check: "G01_SINGLE_DEFENSIBLE_ANSWER",
        detail: `${correct.length} options marked correct, expected exactly 1`,
      });
    }

    // G05 — mechanical half only: identical option text is always ambiguous.
    const texts = options.map((o) => o.text.trim().toLowerCase());
    pass(
      "G05_NO_OVERLAP_AMBIGUITY",
      new Set(texts).size === texts.length,
      "two or more options have identical text"
    );

    // G15 — at most one arithmetic-slip distractor.
    const slips = distractors.filter((o) => o.trap_id === "MATH_ARITHMETIC_SLIP").length;
    pass("G15_SLIP_CAP", slips <= 1, `${slips} arithmetic-slip distractors, max 1`);
  }

  // G06 — RW structure.
  if (question.section === "reading_writing") {
    const words = question.stimulus ? question.stimulus.trim().split(/\s+/).length : 0;
    pass(
      "G06_RW_STIMULUS_BOUNDS",
      options.length === 4 && words >= 25 && words <= 150,
      options.length !== 4
        ? `${options.length} options, expected 4`
        : `stimulus is ${words} words, expected 25–150`
    );
  }

  // G07 — SPR entry limits: 5 characters positive, 6 including a leading minus.
  if (question.format === "student_produced_response") {
    const answers = question.acceptable_answers ?? [];
    const tooLong = answers.filter((a) => a.length > (a.startsWith("-") ? 6 : 5));
    pass(
      "G07_SPR_ENTRY_VALID",
      answers.length > 0 && tooLong.length === 0,
      answers.length === 0
        ? "no acceptable_answers"
        : `unenterable answers: ${tooLong.join(", ")}`
    );
  }

  // G09 — Desmos block on every Math item; a reason whenever it is discouraged.
  if (question.section === "math") {
    const d = question.desmos;
    pass(
      "G09_DESMOS_BLOCK_PRESENT",
      !!d && (d.recommended || !!d.restraint_note),
      !d ? "math item has no desmos block" : "desmos.recommended is false with no restraint_note"
    );
  }

  // G10 — bank items are shared across users, so no student's details in them.
  const haystack = [
    question.stimulus ?? "",
    question.prompt,
    ...options.map((o) => `${o.text} ${o.rationale ?? ""}`),
    Object.values(question.explanation).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  const leaked = (ctx.pii ?? []).filter((v) => v.trim() && haystack.includes(v.toLowerCase()));
  pass("G10_NO_PII", leaked.length === 0, `item contains student details: ${leaked.join(", ")}`);

  // G12 — a clone must not reuse the source's correct letter.
  if (question.clone_of && ctx.source) {
    const here = options.find((o) => o.is_correct)?.id;
    const there = ctx.source.options?.find((o) => o.is_correct)?.id;
    pass(
      "G12_ANSWER_POSITION_BALANCED",
      !here || !there || here !== there,
      `clone reuses the source's correct option (${here})`
    );
  } else if (question.format === "multiple_choice") {
    verified.push("G12_ANSWER_POSITION_BALANCED");
  }

  const claimed = new Set(question.provenance.gate_passed);
  const attested = ATTESTED_CHECKS.filter((c) => claimed.has(c));
  const unattested = ATTESTED_CHECKS.filter(
    (c) => !claimed.has(c) && appliesTo(c, question)
  );

  return { ok: failures.length === 0, verified, attested, unattested, failures };
}

function appliesTo(check: GateCheckId, q: Question): boolean {
  if (check === "G11_CLONE_TRAP_FIRES") return q.clone_of != null;
  if (check === "G04_OPTIONS_PARALLEL") return q.format === "multiple_choice";
  return true;
}
