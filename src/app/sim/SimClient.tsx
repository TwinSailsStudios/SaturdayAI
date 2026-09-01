"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Pill, Row } from "@/components/ui";
import DesmosCalculator from "@/components/DesmosCalculator";
import { entryLimitFor } from "@/lib/practice/grade";
import { BLUEPRINT, SCALES, type Assessment } from "@contracts";
import { ROUTING_VERSION } from "@/lib/scoring/routing";
import type { PresentedModule, SimReport, StartResponse, StepResponse } from "./types";

type Phase =
  | { kind: "intro" }
  | { kind: "module"; module: PresentedModule }
  | { kind: "break"; seconds: number }
  | { kind: "report"; report: SimReport };

interface AnswerState {
  selected: string | null;
  typed: string;
  marked: boolean;
  eliminated: string[];
}

const blank = (): AnswerState => ({ selected: null, typed: "", marked: false, eliminated: [] });

export default function SimClient() {
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [form, setForm] = useState<StartResponse["form"] | null>(null);
  const [assessment, setAssessment] = useState<Assessment>("PSAT_8_9");
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimer, setShowTimer] = useState(true);
  const [calcOpen, setCalcOpen] = useState(false);
  const submitting = useRef(false);

  const module = phase.kind === "module" ? phase.module : null;
  const question = module?.questions[index] ?? null;

  const applyStep = useCallback((step: StepResponse) => {
    if (step.kind === "module") {
      setPhase({ kind: "module", module: step.module });
      setAnswers({});
      setIndex(0);
      setCalcOpen(false);
    } else if (step.kind === "break") {
      setPhase({ kind: "break", seconds: step.seconds });
    } else {
      setPhase({ kind: "report", report: step.report });
    }
  }, []);

  const submitModule = useCallback(async () => {
    if (!attemptId || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/sim/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          answers: Object.entries(answers).map(([question_id, a]) => ({
            question_id,
            selected_option: a.selected,
            submitted_response: a.typed || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(`submit failed (${res.status})`);
      applyStep((await res.json()) as StepResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit the module.");
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }, [attemptId, answers, applyStep]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sim/start", { method: "POST" });
      const data = (await res.json()) as StartResponse & { error?: string; detail?: string };
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `start failed (${res.status})`);
      setAttemptId(data.attempt_id);
      setForm(data.form);
      setAssessment(data.assessment as Assessment);
      applyStep({ kind: "module", module: data.module });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the sim.");
    } finally {
      setBusy(false);
    }
  }

  async function resumeAfterBreak() {
    if (!attemptId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sim/begin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId }),
      });
      if (!res.ok) throw new Error(`could not resume (${res.status})`);
      applyStep((await res.json()) as StepResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resume.");
    } finally {
      setBusy(false);
    }
  }

  if (phase.kind === "intro") {
    return <Intro onStart={start} busy={busy} error={error} />;
  }
  if (phase.kind === "break") {
    return <Break seconds={phase.seconds} onResume={resumeAfterBreak} busy={busy} />;
  }
  if (phase.kind === "report") {
    return <Report report={phase.report} assessment={assessment} form={form} />;
  }
  if (!module || !question) return null;

  const state = answers[question.id] ?? blank();
  const update = (patch: Partial<AnswerState>) =>
    setAnswers((a) => ({ ...a, [question.id]: { ...(a[question.id] ?? blank()), ...patch } }));

  const answeredCount = module.questions.filter((q) => {
    const s = answers[q.id];
    return s && (s.selected !== null || s.typed.trim() !== "");
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">
            {module.section === "math" ? "Math" : "Reading and Writing"} · Module {module.ordinal}
          </h1>
          <p className="text-xs text-muted">
            Question {index + 1} of {module.questions.length} · {answeredCount} answered
          </p>
        </div>
        <Timer
          deadlineIso={module.deadline_iso}
          durationSecs={module.duration_secs}
          visible={showTimer}
          onToggle={() => setShowTimer((v) => !v)}
          onExpire={submitModule}
        />
      </div>

      <div className={question.stimulus ? "grid gap-5 lg:grid-cols-2" : ""}>
        {question.stimulus && (
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="stimulus">{question.stimulus}</p>
            {question.stimulus_data ? <StimulusTable data={question.stimulus_data} /> : null}
          </div>
        )}

        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted">#{index + 1}</span>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={state.marked}
                onChange={(e) => update({ marked: e.target.checked })}
              />
              Mark for Review
            </label>
          </div>

          <p className="text-sm font-medium">{question.prompt}</p>

          {question.format === "multiple_choice" ? (
            <ul className="mt-4 space-y-2">
              {question.options.map((o) => {
                const struck = state.eliminated.includes(o.id);
                return (
                  <li key={o.id} className="flex items-center gap-2">
                    <button
                      onClick={() => update({ selected: o.id })}
                      className={`flex flex-1 gap-3 rounded border p-3 text-left text-sm ${
                        state.selected === o.id ? "border-accent bg-accent/5" : "border-line"
                      } ${struck ? "opacity-40" : ""}`}
                    >
                      <span className="font-mono text-xs text-muted">{o.id}</span>
                      <span className={struck ? "line-through" : ""}>{o.text}</span>
                    </button>
                    <button
                      title="Cross out this option"
                      onClick={() =>
                        update({
                          eliminated: struck
                            ? state.eliminated.filter((id) => id !== o.id)
                            : [...state.eliminated, o.id],
                        })
                      }
                      className="rounded border border-line px-2 py-1 font-mono text-xs text-muted hover:border-muted"
                    >
                      {struck ? "undo" : "✕"}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4">
              <input
                value={state.typed}
                onChange={(e) => update({ typed: e.target.value })}
                placeholder="answer"
                className="w-40 rounded border border-line bg-surface px-3 py-2 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted">
                {state.typed.length}/{entryLimitFor(state.typed)} characters
              </p>
            </div>
          )}

          {module.section === "math" && (
            <div className="mt-4">
              <button
                onClick={() => setCalcOpen((o) => !o)}
                className="rounded border border-line px-3 py-1.5 text-xs hover:border-muted"
              >
                {calcOpen ? "Hide calculator" : "Calculator"}
              </button>
              {calcOpen && (
                <div className="mt-2">
                  <DesmosCalculator expressions={[]} height={360} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Navigator
        questions={module.questions}
        answers={answers}
        current={index}
        onJump={setIndex}
      />

      {error && <p className="text-sm text-alert">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded border border-line px-4 py-2 text-sm disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(module.questions.length - 1, i + 1))}
            disabled={index === module.questions.length - 1}
            className="rounded border border-line px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
        <button
          onClick={submitModule}
          disabled={busy}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Submitting…" : "Submit module"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Submitting closes this module permanently. There is no going back, and the clock does not
        stop if you leave the page.
      </p>
    </div>
  );
}

function Timer({
  deadlineIso,
  durationSecs,
  visible,
  onToggle,
  onExpire,
}: {
  deadlineIso: string | null;
  durationSecs: number;
  visible: boolean;
  onToggle: () => void;
  onExpire: () => void;
}) {
  // Bluebook warns at five minutes on a 32-minute module. Applying a flat 300s
  // to a shortened module would leave the warning on for its whole life, so it
  // scales with the module and caps at the real value.
  const warnAt = Math.min(300, Math.round(durationSecs * 0.2));
  const deadline = useMemo(
    () => (deadlineIso ? new Date(deadlineIso).getTime() : null),
    [deadlineIso]
  );
  const [remaining, setRemaining] = useState<number>(() =>
    deadline ? Math.max(0, deadline - Date.now()) : 0
  );
  const fired = useRef(false);

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left === 0 && !fired.current) {
        fired.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const seconds = Math.ceil(remaining / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const warning = seconds <= warnAt;

  return (
    <div className="flex items-center gap-3">
      <span
        className={`font-mono text-lg tabular-nums ${warning ? "text-alert" : ""} ${
          visible ? "" : "invisible"
        }`}
      >
        {mm}:{ss}
      </span>
      <button onClick={onToggle} className="text-xs text-muted underline">
        {visible ? "Hide" : "Show"}
      </button>
      {warning && visible && (
        <Pill tone="alert">{warnAt >= 60 ? `${Math.round(warnAt / 60)} min` : `${warnAt}s`} left</Pill>
      )}
    </div>
  );
}

function Navigator({
  questions,
  answers,
  current,
  onJump,
}: {
  questions: PresentedModule["questions"];
  answers: Record<string, AnswerState>;
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-line bg-surface p-3">
      <span className="mr-1 text-xs text-muted">Go to</span>
      {questions.map((q, i) => {
        const s = answers[q.id];
        const answered = s && (s.selected !== null || s.typed.trim() !== "");
        return (
          <button
            key={q.id}
            onClick={() => onJump(i)}
            className={`relative h-8 w-8 rounded border font-mono text-xs ${
              i === current
                ? "border-accent bg-accent text-white"
                : answered
                  ? "border-accent/50 bg-accent/10"
                  : "border-line"
            }`}
          >
            {i + 1}
            {s?.marked && (
              <span className="absolute -right-1 -top-1 text-[10px] text-warn">●</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StimulusTable({ data }: { data: NonNullable<PresentedModule["questions"][number]["stimulus_data"]> }) {
  if (data.kind !== "table" || !data.columns || !data.rows) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      {data.title && <p className="mb-1 text-xs font-medium">{data.title}</p>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {data.columns.map((c) => (
              <th key={c} className="border border-line px-3 py-1.5 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-line px-3 py-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Intro({
  onStart,
  busy,
  error,
}: {
  onStart: () => void;
  busy: boolean;
  error: string | null;
}) {
  const rw = BLUEPRINT.reading_writing;
  const math = BLUEPRINT.math;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Test Sim</h1>
        <p className="mt-1 text-sm text-muted">Bluebook-mirror conditions.</p>
      </div>

      <Card tone="warn" title="This is a shortened form">
        <p className="text-sm leading-relaxed">
          A real administration is {rw.modules * rw.questionsPerModule + math.modules * math.questionsPerModule}{" "}
          questions over{" "}
          {rw.modules * rw.minutesPerModule + math.modules * math.minutesPerModule} minutes. The
          authored bank cannot fill that yet, so this runs 4 modules of 4 and 3 questions —{" "}
          <strong>at the real per-question pace</strong>, so the timing pressure is authentic even
          though the endurance and the domain mix are not.
        </p>
        <p className="mt-3 text-sm leading-relaxed">
          You will not get a score out of it. Converting raw counts from a 14-question form onto the{" "}
          {SCALES.PSAT_8_9.composite[0]}–{SCALES.PSAT_8_9.composite[1]} scale would be inventing a
          number, so the report gives you raw counts, the form you were routed to, and the traps
          that fired.
        </p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="What is enforced">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>The engine is unreachable.</strong> No tutor, no hints, no explanations until
              the section is submitted.
            </li>
            <li>
              <strong>Timing is server-held.</strong> The countdown you see is rendered from a
              deadline the server owns; stopping it in devtools buys nothing.
            </li>
            <li>
              <strong>Un-pauseable.</strong> Leaving the page does not stop the clock.
            </li>
            <li>
              <strong>No back-navigation.</strong> A submitted module is closed permanently.
            </li>
            <li>
              <strong>Routing is a constant.</strong> <Pill>{ROUTING_VERSION}</Pill>, applied per
              section, never a model call.
            </li>
            <li>
              <strong>Desmos throughout Math</strong>, as on the real test.
            </li>
          </ul>
        </Card>
        <Card title="Tools">
          <ul className="space-y-2 text-sm">
            <li>Question navigator with answered and flagged state</li>
            <li>Mark for Review</li>
            <li>Option eliminator (cross out answers)</li>
            <li>Hideable timer with a five-minute warning</li>
            <li>Split screen for passages and figures</li>
            <li>Embedded Desmos graphing calculator</li>
          </ul>
        </Card>
      </div>

      {error && (
        <p className="rounded border border-alert/40 bg-alert/5 p-3 text-sm text-alert">{error}</p>
      )}

      <button
        onClick={onStart}
        disabled={busy}
        className="rounded bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "Building the form…" : "Begin — the clock starts immediately"}
      </button>
    </div>
  );
}

function Break({
  seconds,
  onResume,
  busy,
}: {
  seconds: number;
  onResume: () => void;
  busy: boolean;
}) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Break</h1>
      <Card>
        <p className="font-mono text-4xl tabular-nums">
          {mm}:{ss}
        </p>
        <p className="mt-3 text-sm text-muted">
          Reading and Writing is finished and closed. Math begins when you resume — the break can be
          cut short but not extended.
        </p>
        <button
          onClick={onResume}
          disabled={busy}
          className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Starting…" : "Resume — starts the Math clock"}
        </button>
      </Card>
    </div>
  );
}

function Report({
  report,
  assessment,
  form,
}: {
  report: SimReport;
  assessment: Assessment;
  form: StartResponse["form"] | null;
}) {
  const total = report.sections.reduce((n, s) => n + s.total_correct, 0);
  const outOf = report.sections.reduce((n, s) => n + s.total_of, 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sim report</h1>
        <p className="mt-1 text-sm text-muted">
          {total} of {outOf} correct on a shortened {assessment.replace(/_/g, " ")} form.
        </p>
      </div>

      <Card tone="warn" title="No scaled score, on purpose">
        <p className="text-sm leading-relaxed">
          A {outOf}-question form cannot be converted onto the{" "}
          {SCALES[assessment].composite[0]}–{SCALES[assessment].composite[1]} scale. Any number
          produced that way would look precise and mean nothing, so the report stops at what was
          actually measured.
          {form ? (
            <>
              {" "}
              A full form is {form.full_reading_writing.questions * 2} Reading and Writing questions
              and {form.full_math.questions * 2} Math.
            </>
          ) : null}
        </p>
      </Card>

      {report.sections.map((s) => (
        <Card key={s.section} title={s.section === "math" ? "Math" : "Reading and Writing"}>
          <Row label="Module 1">
            {s.module_1_correct} of {s.module_1_of} correct
          </Row>
          <Row label="Routed to">
            <Pill tone="info">{s.module_2_target.replace(/_/g, " ")}</Pill>
          </Row>
          <Row label="Module 2">
            {s.module_2_correct} of {s.module_2_of} correct
          </Row>
          <Row label="Section total">
            {s.total_correct} of {s.total_of}
          </Row>
        </Card>
      ))}

      {report.traps_fired.length > 0 && (
        <Card title="Traps that fired" tone="alert">
          <ul className="space-y-1 text-sm">
            {report.traps_fired.map((t) => (
              <li key={t.trap_id}>
                <Pill tone="alert">{t.trap_id}</Pill>{" "}
                <span className="text-muted">
                  {t.count} time{t.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            These went into the same error log as your practice work, so the traps you hit under
            time pressure feed the same roadmap.
          </p>
        </Card>
      )}

      {report.late_submissions > 0 && (
        <p className="text-sm text-muted">
          {report.late_submissions} module(s) were submitted after the deadline and were graded on
          whatever had been entered.
        </p>
      )}

      <a
        href="/practice"
        className="inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Review these in Practice
      </a>
    </div>
  );
}
