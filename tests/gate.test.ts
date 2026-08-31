import { describe, expect, it } from "vitest";
import { runGate, MECHANICAL_CHECKS, ATTESTED_CHECKS } from "@/lib/engine/gate";
import { SEED_QUESTIONS, SEED_QUESTIONS_BY_ID } from "@/lib/seed/questions";
import type { Question } from "@contracts";

const clone = (q: Question): Question => structuredClone(q);
const failed = (q: Question, ctx = {}) => runGate(q, ctx).failures.map((f) => f.check);

describe("validation gate", () => {
  it("passes every authored seed item", () => {
    for (const q of SEED_QUESTIONS) {
      const result = runGate(q, { pii: ["Pratik Dash", "Athens High School"] });
      expect(result.failures, `${q.id}: ${JSON.stringify(result.failures)}`).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it("leaves no attested check unclaimed on a seed item", () => {
    for (const q of SEED_QUESTIONS) {
      expect(runGate(q).unattested, `${q.id}`).toEqual([]);
    }
  });

  it("separates what it verifies from what it merely relays", () => {
    // The distinction is the point: a green check on a judgement nobody made
    // is worse than no check at all.
    expect(MECHANICAL_CHECKS).not.toHaveLength(0);
    expect(ATTESTED_CHECKS).toContain("G01_SINGLE_DEFENSIBLE_ANSWER");
    expect(MECHANICAL_CHECKS as readonly string[]).not.toContain("G03_NO_OUTSIDE_KNOWLEDGE");
  });

  it("G02 — rejects a distractor with no trap mapping", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_001")!);
    delete q.options![0]!.trap_id;
    expect(failed(q)).toContain("G02_ALL_DISTRACTORS_TRAP_MAPPED");
  });

  it("G02 — rejects a trap id that is not in the taxonomy", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_001")!);
    q.options![0]!.trap_id = "MATH_INVENTED_TRAP";
    expect(failed(q)).toContain("G02_ALL_DISTRACTORS_TRAP_MAPPED");
  });

  it("G01 — rejects an item with two defensible answers", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_001")!);
    q.options![0]!.is_correct = true;
    expect(failed(q)).toContain("G01_SINGLE_DEFENSIBLE_ANSWER");
  });

  it("G10 — rejects a bank item containing a student's details", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_004")!);
    q.prompt = `Pratik Dash is reading the passage above. ${q.prompt}`;
    expect(failed(q, { pii: ["Pratik Dash"] })).toContain("G10_NO_PII");
  });

  it("G07 — rejects an SPR answer that cannot be entered", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_007")!);
    q.acceptable_answers = ["3.14159"]; // 7 characters; the field allows 5
    expect(failed(q)).toContain("G07_SPR_ENTRY_VALID");
  });

  it("G07 — allows six characters when the value is negative", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_007")!);
    q.acceptable_answers = ["-1.125"];
    expect(failed(q)).not.toContain("G07_SPR_ENTRY_VALID");
  });

  it("G09 — rejects a math item that discourages Desmos with no reason", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_002")!);
    q.desmos!.restraint_note = null;
    expect(failed(q)).toContain("G09_DESMOS_BLOCK_PRESENT");
  });

  it("G12 — rejects a clone that reuses the source's correct letter", () => {
    const source = SEED_QUESTIONS_BY_ID.get("q_001")!;
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_003")!);
    for (const o of q.options!) o.is_correct = o.id === "B"; // q_001's key is B
    expect(failed(q, { source })).toContain("G12_ANSWER_POSITION_BALANCED");
  });

  it("G15 — caps arithmetic-slip distractors at one", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_001")!);
    q.options![0]!.trap_id = "MATH_ARITHMETIC_SLIP";
    q.options![3]!.trap_id = "MATH_ARITHMETIC_SLIP";
    expect(failed(q)).toContain("G15_SLIP_CAP");
  });

  it("G06 — rejects an RW stimulus outside 25–150 words", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_004")!);
    q.stimulus = "Too short.";
    expect(failed(q)).toContain("G06_RW_STIMULUS_BOUNDS");
  });

  it("reports a schema violation separately from a gate check", () => {
    const q = clone(SEED_QUESTIONS_BY_ID.get("q_001")!);
    q.options!.pop(); // 3 options
    expect(failed(q)).toContain("SCHEMA");
  });
});

describe("authored bank invariants", () => {
  it("spreads correct answers across the option letters", () => {
    const letters = SEED_QUESTIONS.filter((q) => q.options).map(
      (q) => q.options!.find((o) => o.is_correct)!.id
    );
    // No single letter should carry more than half the set.
    for (const letter of new Set(letters)) {
      const share = letters.filter((l) => l === letter).length / letters.length;
      expect(share, `option ${letter} is the key ${Math.round(share * 100)}% of the time`)
        .toBeLessThanOrEqual(0.5);
    }
  });

  it("gives every clone a different key from its source", () => {
    for (const q of SEED_QUESTIONS.filter((x) => x.clone_of)) {
      const source = SEED_QUESTIONS_BY_ID.get(q.clone_of!)!;
      const here = q.options?.find((o) => o.is_correct)?.id;
      const there = source.options?.find((o) => o.is_correct)?.id;
      if (here && there) expect(here, `${q.id} vs ${source.id}`).not.toBe(there);
    }
  });

  it("gives every math item a Desmos verdict", () => {
    for (const q of SEED_QUESTIONS.filter((x) => x.section === "math")) {
      expect(q.desmos, q.id).toBeTruthy();
      if (!q.desmos!.recommended) expect(q.desmos!.restraint_note, q.id).toBeTruthy();
    }
  });
});
