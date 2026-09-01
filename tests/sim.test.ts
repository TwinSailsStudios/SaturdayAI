import { beforeEach, describe, expect, it } from "vitest";
import { buildReport, nextStep } from "@/lib/sim/flow";
import { createAttempt, currentModule, beginModule, deadlineOf, _resetSimStore } from "@/lib/sim/store";
import { SHORT_FORM, FULL_FORM, secondsPerQuestion } from "@/lib/sim/blueprint";
import { assembleModule } from "@/lib/sim/assemble";
import { routeModuleTwoScaled } from "@/lib/scoring/routing";
import { SEED_QUESTIONS_BY_ID } from "@/lib/seed/questions";
import type { SimAttemptState } from "@/lib/sim/store";

/** Answer every question in the open module, `correct` of them correctly. */
function answerModule(attempt: SimAttemptState, correct: number) {
  const module = currentModule(attempt)!;
  module.questionIds.forEach((id, i) => {
    const q = SEED_QUESTIONS_BY_ID.get(id)!;
    module.responses.push({
      questionId: id,
      selectedOption: null,
      submittedResponse: null,
      isCorrect: i < correct,
      trapId: i < correct ? null : (q.targets_trap ?? null),
    });
  });
  module.submittedAt = Date.now();
  return module;
}

describe("sim form", () => {
  it("keeps the real per-question pace in the shortened form", () => {
    for (const section of ["reading_writing", "math"] as const) {
      const short = SHORT_FORM[section];
      const paceShort = short.durationSecs / short.questions;
      // Within a second of the full form's pace — the point of the short form
      // is that timing pressure is authentic even though length is not.
      expect(Math.abs(paceShort - secondsPerQuestion(section))).toBeLessThan(1);
    }
  });

  it("matches the published structure on the full form", () => {
    expect(FULL_FORM.reading_writing).toMatchObject({ questions: 27, durationSecs: 32 * 60 });
    expect(FULL_FORM.math).toMatchObject({ questions: 22, durationSecs: 35 * 60 });
  });
});

describe("scaled routing", () => {
  it("applies the full form's ratio to a shortened module", () => {
    // Math full form routes up at 13 of 22 (~59%). On 3 questions that is 2.
    expect(routeModuleTwoScaled("math", 2, 3)).toBe("module_2_upper");
    expect(routeModuleTwoScaled("math", 1, 3)).toBe("module_2_lower");
    // RW routes up at 16 of 27 (~59%). On 4 questions that is 3.
    expect(routeModuleTwoScaled("reading_writing", 3, 4)).toBe("module_2_upper");
    expect(routeModuleTwoScaled("reading_writing", 2, 4)).toBe("module_2_lower");
  });

  it("rejects impossible scores", () => {
    expect(() => routeModuleTwoScaled("math", 4, 3)).toThrow(RangeError);
    expect(() => routeModuleTwoScaled("math", 1, 0)).toThrow(RangeError);
  });
});

describe("assembly", () => {
  it("never serves a candidate item into a sim", () => {
    const picked = assembleModule({
      section: "math",
      target: "module_1",
      count: 10,
      assessment: "PSAT_8_9",
      exclude: new Set(),
    });
    expect(picked.length).toBeGreaterThan(0);
    for (const q of picked) expect(q.provenance.bank_status).not.toBe("candidate");
  });

  it("puts grid-ins last, the way the real form does", () => {
    const picked = assembleModule({
      section: "math",
      target: "module_1",
      count: 20,
      assessment: "PSAT_8_9",
      exclude: new Set(),
    });
    const firstSpr = picked.findIndex((q) => q.format === "student_produced_response");
    if (firstSpr !== -1) {
      for (const q of picked.slice(firstSpr)) {
        expect(q.format).toBe("student_produced_response");
      }
    }
  });
});

describe("sim flow", () => {
  beforeEach(() => _resetSimStore());

  it("runs RW 1-2, a break, then Math 1-2, and never repeats a question", () => {
    const attempt = createAttempt("u1", "PSAT_8_9");
    const served: string[] = [];
    const order: string[] = [];

    for (let guard = 0; guard < 10; guard++) {
      const step = nextStep(attempt);
      if (step.kind === "report") break;
      if (step.kind === "break") {
        order.push("break");
        attempt.breakTakenAt = Date.now();
        continue;
      }
      order.push(`${step.module.section}/${step.module.ordinal}`);
      served.push(...step.module.questionIds);
      answerModule(attempt, 0);
    }

    expect(order).toEqual([
      "reading_writing/1",
      "reading_writing/2",
      "break",
      "math/1",
      "math/2",
    ]);
    expect(new Set(served).size).toBe(served.length);
  });

  it("routes each section from that section alone", () => {
    const attempt = createAttempt("u2", "PSAT_8_9");

    // Ace RW module 1, bomb Math module 1.
    nextStep(attempt);
    answerModule(attempt, SHORT_FORM.reading_writing.questions);
    const rw2 = nextStep(attempt);
    expect(rw2.kind).toBe("module");
    if (rw2.kind === "module") expect(rw2.module.target).toBe("module_2_upper");

    answerModule(attempt, 0);
    attempt.breakTakenAt = Date.now();
    nextStep(attempt);
    answerModule(attempt, 0);
    const math2 = nextStep(attempt);
    if (math2.kind === "module") expect(math2.module.target).toBe("module_2_lower");
  });

  it("never puts a score on the report", () => {
    const attempt = createAttempt("u3", "PSAT_8_9");
    for (let guard = 0; guard < 10; guard++) {
      const step = nextStep(attempt);
      if (step.kind === "report") break;
      if (step.kind === "break") {
        attempt.breakTakenAt = Date.now();
        continue;
      }
      answerModule(attempt, 1);
    }
    const report = buildReport(attempt);
    const serialised = JSON.stringify(report);
    expect(report.shortened).toBe(true);
    // Raw counts only. A scaled score off a 14-question form would be invented.
    expect(serialised).not.toMatch(/"(scaled|composite|projected)_?score"/);
    expect(report.sections.every((s) => s.total_of > 0)).toBe(true);
  });
});

describe("sim timing is server-held", () => {
  beforeEach(() => _resetSimStore());

  it("starts the clock once and does not restart it", () => {
    const attempt = createAttempt("u4", "PSAT_8_9");
    const step = nextStep(attempt);
    if (step.kind !== "module") throw new Error("expected a module");

    expect(deadlineOf(step.module)).toBeNull(); // not started yet
    beginModule(step.module);
    const first = deadlineOf(step.module);
    expect(first).not.toBeNull();

    beginModule(step.module); // a second request must not extend the clock
    expect(deadlineOf(step.module)).toBe(first);
  });

  it("derives the deadline from the module's own duration", () => {
    const attempt = createAttempt("u5", "PSAT_8_9");
    const step = nextStep(attempt);
    if (step.kind !== "module") throw new Error("expected a module");
    beginModule(step.module);
    const span = deadlineOf(step.module)! - step.module.startedAt!;
    expect(span).toBe(step.module.durationSecs * 1000);
  });
});
