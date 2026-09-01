"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Pill } from "@/components/ui";
import DesmosCalculator from "@/components/DesmosCalculator";
import TutorPanel from "@/components/TutorPanel";
import { entryLimitFor } from "@/lib/practice/grade";
import type { TutorContext } from "@/lib/tutor/client";
import type { PresentedQuestion, Review, SetResponse, StudentSummary } from "./types";

const CERTAINTY_LABELS: Record<number, string> = {
  1: "Guessed",
  2: "Narrowed it down",
  3: "Fairly sure",
  4: "Confident",
  5: "Certain",
};

export default function PracticeClient() {
  const [set, setSet] = useState<SetResponse | null>(null);
  const [queue, setQueue] = useState<PresentedQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [certainty, setCertainty] = useState<number | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [cloneNote, setCloneNote] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);

  const startedAt = useRef<number>(Date.now());
  const question = queue[index] ?? null;

  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  const startSet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`set build failed (${res.status})`);
      const data = (await res.json()) as SetResponse;
      setSet(data);
      setQueue(data.questions);
      setIndex(0);
      resetItem();
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not build a set");
    } finally {
      setLoading(false);
    }
  }, []);

  function resetItem() {
    setSelected(null);
    setTyped("");
    setCertainty(null);
    setReview(null);
    setCloneNote(null);
    setCalcOpen(false);
  }

  async function submit() {
    if (!question || certainty == null) return;
    setLoading(true);
    try {
      const res = await fetch("/api/practice/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          set_id: set?.set_id ?? null,
          question_id: question.id,
          selected_option: question.format === "multiple_choice" ? selected : null,
          submitted_response: question.format === "multiple_choice" ? null : typed,
          certainty,
          time_seconds: Math.round((Date.now() - startedAt.current) / 1000),
        }),
      });
      if (!res.ok) throw new Error(`submit failed (${res.status})`);
      setReview((await res.json()) as Review);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not submit");
    } finally {
      setLoading(false);
    }
  }

  async function requestClone() {
    if (!review?.clone_offer) return;
    setLoading(true);
    try {
      const res = await fetch("/api/practice/clone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_question_id: review.clone_offer.source_question_id,
          trap_id: review.clone_offer.trap_id,
          rung: "adversarial",
        }),
      });
      const data = (await res.json()) as { clone: PresentedQuestion | null; reason?: string };
      if (!data.clone) {
        setCloneNote(data.reason ?? "No clone available.");
        return;
      }
      // Insert the clone directly after the current item: the repair happens
      // now, while the wrong reasoning is still in working memory.
      setQueue((q) => [...q.slice(0, index + 1), data.clone!, ...q.slice(index + 1)]);
      setCloneNote(null);
      next();
    } finally {
      setLoading(false);
    }
  }

  function next() {
    resetItem();
    setIndex((i) => i + 1);
  }

  if (!set) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Targeted Practice</h1>
        <Card subtitle="The set is built from your Student Model: phase, availability, and the traps you are actively repairing.">
          <button
            onClick={startSet}
            disabled={loading}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Building…" : "Build today's set"}
          </button>
          {error && <p className="mt-3 text-sm text-alert">{error}</p>}
        </Card>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Set complete</h1>
        <Card subtitle="Scoring, pacing and any roadmap change are computed by the backend from the response log — not here, and not by the engine.">
          <button
            onClick={startSet}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Build another set
          </button>
        </Card>
      </div>
    );
  }

  const answered = question.format === "multiple_choice" ? selected != null : typed.trim() !== "";
  const overLimit = typed.length > entryLimitFor(typed);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">
          Question {index + 1}
          <span className="ml-2 text-sm font-normal text-muted">of {queue.length}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{question.skill}</Pill>
          <Pill>{question.difficulty}</Pill>
          {question.is_clone && <Pill tone="warn">clone · {question.clone_rung}</Pill>}
        </div>
      </div>

      <Card>
        {question.stimulus && <p className="stimulus mb-4">{question.stimulus}</p>}
        <p className="text-sm font-medium">{question.prompt}</p>

        {question.format === "multiple_choice" ? (
          <ul className="mt-4 space-y-2">
            {question.options.map((o) => {
              const isChosen = selected === o.id;
              const isKey = review?.correct_option === o.id;
              const tone = review
                ? isKey
                  ? "border-good bg-good/5"
                  : isChosen
                    ? "border-alert bg-alert/5"
                    : "border-line"
                : isChosen
                  ? "border-accent bg-accent/5"
                  : "border-line";
              return (
                <li key={o.id}>
                  <button
                    disabled={!!review}
                    onClick={() => setSelected(o.id)}
                    className={`flex w-full gap-3 rounded border p-3 text-left text-sm disabled:cursor-default ${tone}`}
                  >
                    <span className="font-mono text-xs text-muted">{o.id}</span>
                    <span>{o.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4">
            <label className="block text-xs text-muted" htmlFor="spr">
              Student-produced response
            </label>
            <input
              id="spr"
              value={typed}
              disabled={!!review}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 w-40 rounded border border-line bg-surface px-3 py-2 font-mono text-sm"
              placeholder="answer"
            />
            <p className={`mt-1 text-xs ${overLimit ? "text-alert" : "text-muted"}`}>
              {typed.length}/{entryLimitFor(typed)} characters — the digital entry field allows 5,
              or 6 including a minus sign.
            </p>
          </div>
        )}

        {question.section === "math" && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3 rounded border border-line bg-ground p-3">
              <p className="flex-1 text-xs text-muted">
                {question.desmos?.recommended ? (
                  <>
                    <strong className="text-ink">Desmos {question.desmos.play}</strong> — a graph
                    wins here.
                    {question.desmos.expressions?.length ? (
                      <span className="ml-1 font-mono">
                        {question.desmos.expressions.join("  ·  ")}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <strong className="text-ink">Desmos won&rsquo;t help here.</strong> Solve it
                    directly — the setup costs more than the solve. It stays available anyway,
                    because on test day it always is.
                  </>
                )}
              </p>
              <button
                onClick={() => setCalcOpen((o) => !o)}
                className="rounded border border-line bg-surface px-3 py-1.5 text-xs hover:border-muted"
              >
                {calcOpen ? "Hide calculator" : "Open calculator"}
              </button>
            </div>
            {calcOpen && (
              <div className="mt-2">
                <DesmosCalculator
                  expressions={
                    question.desmos?.recommended ? (question.desmos.expressions ?? []) : []
                  }
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {!review && (
        <Card
          title="How sure are you?"
          subtitle="Captured with your answer and never revisable. This is the diagnosis, not a formality."
        >
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCertainty(n)}
                className={`rounded border px-3 py-2 text-xs ${
                  certainty === n ? "border-accent bg-accent/5 text-ink" : "border-line text-muted"
                }`}
              >
                <span className="font-mono">{n}</span> · {CERTAINTY_LABELS[n]}
              </button>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={!answered || certainty == null || loading || overLimit}
            className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Checking…" : "Submit"}
          </button>
          {(!answered || certainty == null) && (
            <p className="mt-2 text-xs text-muted">
              Both an answer and a certainty are required before submitting.
            </p>
          )}
        </Card>
      )}

      {review && (
        <ReviewPanel
          review={review}
          question={question}
          student={set.student}
          studentAnswer={
            question.format === "multiple_choice"
              ? `option ${selected ?? "—"}${optionText(question, selected)}`
              : typed || "(blank)"
          }
          onNext={next}
          onClone={requestClone}
          note={cloneNote}
        />
      )}
    </div>
  );
}

function ReviewPanel({
  review,
  question,
  student,
  studentAnswer,
  onNext,
  onClone,
  note,
}: {
  review: Review;
  question: PresentedQuestion;
  student: StudentSummary;
  studentAnswer: string;
  onNext: () => void;
  onClone: () => void;
  note: string | null;
}) {
  const tone = (review.quadrant_copy?.tone ?? "info") as "alert" | "warn" | "info" | "good";
  const tutorContext: TutorContext = {
    studentName: student.display_name ?? undefined,
    calibrationFlag: student.calibration_flag ?? undefined,
    phase: student.phase,
    assessment: student.assessment,
    question: {
      id: question.id,
      skill: question.skill,
      stimulus: question.stimulus,
      prompt: question.prompt,
      options: question.options,
    },
    studentAnswer,
    certainty: review.certainty,
    isCorrect: review.is_correct,
    trap: review.trap ? { id: review.trap.id, label: review.trap.label } : null,
    remediationCue: review.explanation.remediation_cue,
    desmosPlay: review.desmos?.play ?? null,
    recentSameTrap: review.recent_same_trap,
    allowReveal: student.allow_reveal,
  };
  return (
    <div className="space-y-4">
      <Card
        title={review.quadrant_copy?.title ?? (review.is_correct ? "Correct" : "Incorrect")}
        tone={tone}
      >
        <p className="text-sm">{review.quadrant_copy?.note}</p>
        {review.trap && (
          <p className="mt-3 text-sm">
            <Pill tone="alert">{review.trap.id}</Pill>{" "}
            <span className="font-medium">{review.trap.label}</span>
            {review.trap_attribution === "item_level" && (
              <span className="ml-1 text-xs text-muted">
                (attributed from the item, not from a chosen option — a weaker signal on a grid-in)
              </span>
            )}
          </p>
        )}
      </Card>

      {/* Trap first, then the divergence, then the correct path. The order is
          not cosmetic: a confident student shown the right answer first reads
          it as agreement. docs/04 §4. */}
      <Card title="What happened">
        <p className="text-sm leading-relaxed">{review.explanation.trap_first}</p>
        <p className="mt-3 text-sm leading-relaxed">{review.explanation.divergence_step}</p>
        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
          The correct path
        </h3>
        <p className="mt-1 text-sm leading-relaxed">{review.explanation.correct_path}</p>
        {review.explanation.key_move && (
          <p className="mt-2 text-sm text-muted">Key move: {review.explanation.key_move}</p>
        )}
        <p className="mt-4 rounded border border-line bg-ground p-3 text-sm">
          <strong>Cue:</strong> {review.explanation.remediation_cue}
        </p>
      </Card>

      {review.option_rationales.length > 0 && (
        <Card title="Every option, and the reasoning that produces it">
          <ul className="space-y-2">
            {review.option_rationales.map((o) => (
              <li key={o.id} className="text-sm">
                <span className="font-mono text-xs text-muted">{o.id}</span>{" "}
                {o.is_correct ? <Pill tone="good">correct</Pill> : <Pill>{o.trap_id}</Pill>}
                <p className="mt-1 text-xs text-muted">{o.rationale}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {review.desmos?.read_off && (
        <Card title={`Desmos · ${review.desmos.play ?? ""}`}>
          <p className="font-mono text-xs text-muted">
            {review.desmos.expressions?.join("   ·   ")}
          </p>
          <p className="mt-2 text-sm">{review.desmos.read_off}</p>
        </Card>
      )}
      {review.desmos && !review.desmos.recommended && review.desmos.restraint_note && (
        <Card title="Why not Desmos here">
          <p className="text-sm">{review.desmos.restraint_note}</p>
        </Card>
      )}

      <TutorPanel context={tutorContext} />

      <div className="flex flex-wrap items-center gap-3">
        {review.clone_offer && (
          <button
            onClick={onClone}
            className="rounded border border-alert px-4 py-2 text-sm text-alert hover:bg-alert/5"
          >
            Give me the same trap again
          </button>
        )}
        <button
          onClick={onNext}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Next question
        </button>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
    </div>
  );
}

function optionText(question: PresentedQuestion, selected: string | null): string {
  const option = question.options.find((o) => o.id === selected);
  return option ? ` (${option.text})` : "";
}
