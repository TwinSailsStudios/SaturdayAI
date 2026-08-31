"use client";

import { useEffect, useState } from "react";
import { Card, Pill } from "@/components/ui";

const STORAGE_KEY = "apex.byok.key";

/**
 * BYOK key handling.
 *
 * The key is written to this browser's localStorage and nowhere else. It is
 * never sent to an Apex server — not in a body, a header, or a log line — which
 * is why this page is entirely client-side and there is no corresponding API
 * route to POST it to.
 */
export default function SettingsClient() {
  const [key, setKey] = useState("");
  const [stored, setStored] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    try {
      const existing = window.localStorage.getItem(STORAGE_KEY);
      setStored(existing);
      setAvailable(true);
    } catch {
      // Private browsing or blocked site data. The tutor is simply unavailable.
      setAvailable(false);
    }
  }, []);

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
      setStored(key);
      setKey("");
    } catch {
      setAvailable(false);
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setStored(null);
    } catch {
      setAvailable(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Tutor key</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The Socratic tutor runs on your own model API key. Apex does not resell inference and
          never receives your key.
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
                placeholder={stored ? "•••••••••• (a key is saved)" : "paste your API key"}
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
                <button
                  onClick={clear}
                  className="rounded border border-line px-4 py-2 text-sm hover:border-muted"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              Status: {stored ? <Pill tone="good">key saved locally</Pill> : <Pill>no key</Pill>}
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
          <li>Desmos Academy — available</li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          The &ldquo;after answering&rdquo; gate is deliberate. A tutor available before submission
          turns every question into a collaboration and destroys the calibration signal — the
          certainty rating would measure the tutor&rsquo;s confidence, not yours.
        </p>
      </Card>

      <Card title="Not wired up yet">
        <p className="text-sm leading-relaxed">
          Key storage and the availability gate are implemented. The conversation itself — the
          escalation ladder in <code className="text-xs">prompts/socratic-tutor.system.md</code>,
          the error-log slice, and the direct browser-to-provider call — is not built. Rather than
          fake a tutor, this page stops here.
        </p>
      </Card>
    </div>
  );
}
