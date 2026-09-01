"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Embedded Desmos graphing calculator.
 *
 * The digital Math section gives students this tool on every question, so
 * practising without it trains the wrong thing. This mounts the real Desmos
 * calculator rather than a picture of one.
 *
 * API KEY: the key below is the public demo key Desmos publishes in its own
 * API documentation for development use. It is fine for local development and
 * evaluation. Shipping this to real students requires a Desmos API partnership
 * and your own key — see docs/OPEN-QUESTIONS.md §C8.
 */
const DESMOS_DEMO_API_KEY = "dcb31709b452b1cf9dc26972add0fda6";

// Overridable because the API version string is the one part of this that can
// go stale: if the script 404s, set NEXT_PUBLIC_DESMOS_API_VERSION rather than
// editing code. Bring your own key with NEXT_PUBLIC_DESMOS_API_KEY.
const API_VERSION = process.env.NEXT_PUBLIC_DESMOS_API_VERSION ?? "v1.11";
const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY ?? DESMOS_DEMO_API_KEY;
const DESMOS_SRC = `https://www.desmos.com/api/${API_VERSION}/calculator.js?apiKey=${API_KEY}`;

interface DesmosCalculatorInstance {
  setExpression(options: { id?: string; latex: string }): void;
  removeExpressions(expressions: Array<{ id: string }>): void;
  destroy(): void;
  resize(): void;
}

interface DesmosGlobal {
  GraphingCalculator(
    element: HTMLElement,
    options?: Record<string, unknown>
  ): DesmosCalculatorInstance;
}

declare global {
  interface Window {
    Desmos?: DesmosGlobal;
  }
}

let loader: Promise<DesmosGlobal> | null = null;

function loadDesmos(): Promise<DesmosGlobal> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Desmos) return Promise.resolve(window.Desmos);
  if (loader) return loader;

  loader = new Promise<DesmosGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${DESMOS_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.src = DESMOS_SRC;
    script.async = true;
    script.addEventListener("load", () => {
      if (window.Desmos) resolve(window.Desmos);
      else reject(new Error("Desmos loaded but the global is missing"));
    });
    script.addEventListener("error", () =>
      reject(
        new Error(
          `Could not load ${DESMOS_SRC}. The calculator needs network access to desmos.com; ` +
            `if that host is reachable, the API version may be wrong — set ` +
            `NEXT_PUBLIC_DESMOS_API_VERSION to a version Desmos currently publishes.`
        )
      )
    );
    if (!existing) document.head.appendChild(script);
  });

  return loader;
}

/** Convert the engine's plain expressions to the LaTeX Desmos expects. */
export function toLatex(expression: string): string {
  return expression
    .replace(/\^\{?(-?\w+)\}?/g, "^{$1}")
    .replace(/(\d)\s*\*\s*/g, "$1")
    .replace(/<=/g, "\\le ")
    .replace(/>=/g, "\\ge ");
}

export default function DesmosCalculator({
  expressions = [],
  height = 420,
}: {
  expressions?: string[];
  height?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const calculator = useRef<DesmosCalculatorInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadDesmos()
      .then((Desmos) => {
        if (cancelled || !container.current || calculator.current) return;
        calculator.current = Desmos.GraphingCalculator(container.current, {
          // Close to the in-test build: keypad and settings available,
          // no branding chrome, no sharing.
          keypad: true,
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          expressionsTopbar: true,
          border: false,
          lockViewport: false,
        });
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
      calculator.current?.destroy();
      calculator.current = null;
    };
  }, []);

  // Seed the item's expressions. Re-seeding on change lets the student move
  // between questions without carrying the last graph forward.
  useEffect(() => {
    const calc = calculator.current;
    if (!calc) return;
    const ids = expressions.map((_, i) => `apex-seed-${i}`);
    expressions.forEach((latex, i) => {
      calc.setExpression({ id: ids[i], latex: toLatex(latex) });
    });
    return () => {
      try {
        calc.removeExpressions(ids.map((id) => ({ id })));
      } catch {
        // Calculator already destroyed.
      }
    };
  }, [expressions]);

  if (error) {
    return (
      <div className="rounded border border-line bg-ground p-4 text-sm text-muted">
        <strong className="text-ink">Calculator unavailable.</strong> {error}
      </div>
    );
  }

  return (
    <div
      ref={container}
      style={{ height }}
      className="w-full overflow-hidden rounded border border-line bg-surface"
    />
  );
}
