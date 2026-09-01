"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, Pill } from "@/components/ui";
import {
  askTutor,
  TutorError,
  TUTOR_MODEL,
  type TutorContext,
  type TutorMessage,
} from "@/lib/tutor/client";
import type { TutorTurn } from "@/lib/tutor/schema";

export const TUTOR_KEY_STORAGE = "apex.byok.key";

const MOVE_LABEL: Record<TutorTurn["move"], string> = {
  probe: "Probe",
  narrow: "Narrowing",
  hint: "Hint",
  worked_step: "One worked step",
  micro_lesson: "Micro-lesson",
  confirm: "Confirming",
  handoff: "Over to you",
};

/**
 * The Socratic tutor.
 *
 * Rendered only inside the review panel, which is only reachable after an
 * answer is submitted — the availability gate from docs/08 §2 is enforced by
 * where this component can exist, not by a flag it could be wrong about.
 */
export default function TutorPanel({ context }: { context: TutorContext }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [history, setHistory] = useState<TutorMessage[]>([]);
  const [turns, setTurns] = useState<TutorTurn[]>([]);
  const [level, setLevel] = useState(1);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setApiKey(window.localStorage.getItem(TUTOR_KEY_STORAGE));
    } catch {
      setApiKey(null);
    }
  }, []);

  useEffect(() => {
    if (!open || systemPrompt) return;
    fetch("/api/tutor/prompt")
      .then((r) => r.json() as Promise<{ prompt: string }>)
      .then((d) => setSystemPrompt(d.prompt))
      .catch(() => setError("Could not load the tutor's system prompt."));
  }, [open, systemPrompt]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send(message: string, atLevel: number) {
    if (!apiKey || !systemPrompt) return;
    setBusy(true);
    setError(null);
    try {
      const turn = await askTutor({
        apiKey,
        systemPrompt,
        context,
        history,
        escalationLevel: atLevel,
        studentMessage: message,
      });
      setTurns((t) => [...t, turn]);
      setHistory((h) => [
        ...h,
        { role: "user", content: message },
        { role: "assistant", content: turn.utterance },
      ]);
      // The ladder advances one rung per exchange and never skips.
      setLevel(Math.min(4, Math.max(atLevel, turn.escalation_level) + 1));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-line bg-surface px-4 py-2 text-sm hover:border-muted"
      >
        Talk it through with the tutor
      </button>
    );
  }

  if (apiKey === null) {
    return (
      <Card title="Tutor needs your API key" tone="info">
        <p className="text-sm leading-relaxed">
          The tutor runs on your own Claude API key, called straight from this browser. Apex never
          receives it.
        </p>
        <Link
          href="/settings"
          className="mt-3 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Add a key
        </Link>
      </Card>
    );
  }

  return (
    <Card
      title="Socratic tutor"
      subtitle={`${TUTOR_MODEL} · your key, called from this browser · rung ${Math.min(level, 4)} of 4`}
      tone="info"
    >
      <div ref={scroller} className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {turns.length === 0 && !busy && (
          <p className="text-sm text-muted">
            It won&rsquo;t hand you the answer. It asks first, narrows second, hints third, and
            works exactly one step at the end.
          </p>
        )}
        {history.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className="ml-8 rounded bg-ground p-3 text-sm">
              {m.content}
            </p>
          ) : null
        )}
        {turns.map((t, i) => (
          <div key={i} className="rounded border border-line p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Pill tone="info">{MOVE_LABEL[t.move]}</Pill>
              {t.trap_named && <Pill tone="alert">{t.trap_named}</Pill>}
              {t.desmos_play && <Pill>{t.desmos_play}</Pill>}
            </div>
            <p className="text-sm leading-relaxed">{t.utterance}</p>
          </div>
        ))}
        {busy && <p className="text-sm text-muted">Thinking…</p>}
      </div>

      {error && (
        <p className="mt-3 rounded border border-alert/40 bg-alert/5 p-3 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {turns.length === 0 ? (
          <button
            onClick={() => send(OPENING_MESSAGE(context), 1)}
            disabled={busy || !systemPrompt}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {systemPrompt ? "Start" : "Loading…"}
          </button>
        ) : (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim() && !busy) {
                  send(draft.trim(), level);
                  setDraft("");
                }
              }}
              placeholder="Answer the question, or say where you're stuck"
              className="min-w-64 flex-1 rounded border border-line bg-surface px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                send(draft.trim() || "I'm still stuck.", level);
                setDraft("");
              }}
              disabled={busy}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Send
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

function OPENING_MESSAGE(c: TutorContext): string {
  return c.isCorrect
    ? `I got this one right and rated my certainty ${c.certainty ?? "unrated"}. I'd like to check whether my method was actually sound.`
    : `I answered ${c.studentAnswer} and rated my certainty ${c.certainty ?? "unrated"}. Help me see where I went wrong.`;
}

function describeError(e: unknown): string {
  if (e instanceof TutorError) return e.message;
  return e instanceof Error ? e.message : "Something went wrong.";
}
