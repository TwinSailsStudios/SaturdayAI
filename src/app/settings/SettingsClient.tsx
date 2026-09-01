"use client";

import { useEffect, useState } from "react";
import { Card, Pill } from "@/components/ui";
import { TUTOR_KEY_STORAGE } from "@/components/TutorPanel";
import { testKey, TutorError } from "@/lib/tutor/client";

/**
 * BYOK key handling.
 *
 * The key is written to this browser's localStorage and nowhere else. It is
 * never sent to an Apex server — not in a body, a header, or a log line —
 * which is why this page is entirely client-side and there is no API route to
 * POST it to. Even the "test" below calls Anthropic directly from the browser.
 */
export default function SettingsClient() {
  const [key, setKey] = useState("");
  const [stored, setStored] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    try {
      setStored(window.localStorage.getItem(TUTOR_KEY_STORAGE));
      setAvailable(true);
    } catch {
      // Private browsing or blocked site data. The tutor is simply unavailable.
      setAvailable(false);
    }
  }, []);

  function save() {
    try {
      window.localStorage.setItem(TUTOR_KEY_STORAGE, key);
      setStored(key);
      setKey("");
      setResult(null);
    } catch {
      setAvailable(false);
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(TUTOR_KEY_STORAGE);
      setStored(null);
      setResult(null);
    } catch {
      setAvailable(false);
    }
  }

  async function test() {
    if (!stored) return;
    setTesting(true);
    setResult(null);
    try {
      setResult({ ok: true, text: await testKey(stored) });
    } catch (e) {
      setResult({ ok: false, text: describe(e) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Tutor key</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The Socratic tutor runs on your own Claude API key, called directly from this browser.
          Apex does not resell inference and never receives your key.
        </p>
      </div>

      <Card title="Your key" subtitle="Stored in this browser only">
        {!available && (
          <p className="text-sm text-alert">
            This browser is blocking site data, so a key cannot be stored and the tutor stays
            unavailable.
          </p>
        )}
        {available && (
          <>
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={stored ? "•••••••••• (a key is saved)" : "sk-ant-..."}
                className="w-72 rounded border border-line bg-surface px-3 py-2 font-mono text-sm"
              />
              <button
                onClick={save}
                disabled={!key.trim()}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Save
              </button>
              {stored && (
                <>
                  <button
                    onClick={test}
                    disabled={testing}
                    className="rounded border border-line px-4 py-2 text-sm hover:border-muted disabled:opacity-40"
                  >
                    {testing ? "Testing…" : "Test key"}
                  </button>
                  <button
                    onClick={clear}
                    className="rounded border border-line px-4 py-2 text-sm hover:border-muted"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              Status: {stored ? <Pill tone="good">key saved locally</Pill> : <Pill>no key</Pill>}
            </p>
            {result && (
              <p className={`mt-2 text-sm ${result.ok ? "text-good" : "text-alert"}`}>
                {result.text}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Get a key at{" "}
              <a
                className="underline"
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
              >
                console.anthropic.com
              </a>
              . You are billed by Anthropic for what the tutor uses — typically a fraction of a cent
              per exchange.
            </p>
          </>
        )}
      </Card>

      <Card title="When the tutor is reachable" tone="info">
        <ul className="space-y-1 text-sm">
          <li>Test Sim, in progress — <strong>blocked</strong>, architecturally</li>
          <li>Practice, question open and unanswered — <strong>blocked</strong></li>
          <li>Practice, after answering — available</li>
          <li>Review and error log — available</li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          The &ldquo;after answering&rdquo; gate is deliberate. A tutor available before submission
          turns every question into a collaboration and destroys the calibration signal — the
          certainty rating would measure the tutor&rsquo;s confidence, not yours. The gate is
          enforced by where the tutor component can be rendered, not by a flag that could be wrong.
        </p>
      </Card>

      <Card title="What it will and won't do">
        <ul className="space-y-1 text-sm">
          <li>Probes first, narrows second, hints third, works exactly one step at the end.</li>
          <li>Never states the correct option letter while you are still working.</li>
          <li>Gives you the answer if you ask twice — stonewalling teaches nothing.</li>
          <li>Names the trap that fired, and the pattern if it has fired before.</li>
          <li>
            Cannot tell you a score, a projection, or a percentile. Its output passes through the
            same boundary guard as the content engine, and a turn that crosses it is discarded
            rather than shown.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function describe(e: unknown): string {
  if (e instanceof TutorError) return e.message;
  return e instanceof Error ? e.message : "Unknown error.";
}
