import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  tone = "plain",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  tone?: "plain" | "alert" | "warn" | "info" | "good";
}) {
  const border =
    tone === "alert"
      ? "border-l-4 border-l-alert"
      : tone === "warn"
        ? "border-l-4 border-l-warn"
        : tone === "good"
          ? "border-l-4 border-l-good"
          : tone === "info"
            ? "border-l-4 border-l-accent"
            : "";
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 ${border}`}>
      {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      {(title || subtitle) && <div className="mt-3" />}
      {children}
    </section>
  );
}

export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    plain: "bg-ground text-muted",
    alert: "bg-alert/10 text-alert",
    warn: "bg-warn/10 text-warn",
    good: "bg-good/10 text-good",
    info: "bg-accent/10 text-accent",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] ${tones[tone] ?? tones.plain}`}
    >
      {children}
    </span>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
