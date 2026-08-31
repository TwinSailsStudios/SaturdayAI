import { Card, Pill } from "@/components/ui";
import { TIERS } from "@/lib/seed/academy";

export default function AcademyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Desmos SAT Academy</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The digital Math section allows the graphing calculator on every question, which turns a
          large class of items from &ldquo;can you do the algebra&rdquo; into &ldquo;can you set up
          a graph in fifteen seconds.&rdquo; Five tiers, ending with one about when{" "}
          <em>not</em> to use it.
        </p>
      </div>

      <p className="rounded border border-line bg-surface p-4 text-xs text-muted">
        <strong className="text-ink">Skeleton.</strong> The curriculum and its plays are specified
        and shown here; the live Desmos API environment and per-tier exercises are not built yet.
        Practice items already carry their Desmos play, so Tier 2 and Tier 5 are being taught
        inside ordinary practice today.
      </p>

      <div className="space-y-5">
        {TIERS.map((t) => (
          <Card key={t.tier} title={`Tier ${t.tier} — ${t.name}`} subtitle={t.objective}>
            <ul className="space-y-2">
              {t.plays.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <Pill tone="info">{p.id}</Pill>
                  <span className="text-muted">{p.trigger}</span>
                  <span>→ {p.move}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              <strong className="text-ink">Fails when:</strong> {t.failureModes}
            </p>
            <p className="mt-1 text-xs text-muted">
              <strong className="text-ink">Exit:</strong> {t.exit}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
