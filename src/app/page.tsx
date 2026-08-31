import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Card, Pill, Row } from "@/components/ui";
import { SEED_STUDENT } from "@/lib/seed/student";
import { POSTURE, setSize } from "@/lib/engine/posture";
import { scoreGap, describeScale, labelFor } from "@/lib/scoring/scale";
import { SCALES } from "@contracts";

export const dynamic = "force-dynamic";

function trapLabels(): Map<string, { label: string; remediation_cue: string }> {
  const doc = JSON.parse(
    readFileSync(join(process.cwd(), "schemas", "cognitive-traps.json"), "utf8")
  ) as { traps: Array<{ id: string; label: string; remediation_cue: string }> };
  return new Map(doc.traps.map((t) => [t.id, t]));
}

export default function Dashboard() {
  const p = SEED_STUDENT.student_profile;
  const posture = POSTURE[p.current_roadmap_phase.phase];
  const traps = trapLabels();
  const size = setSize(p.training_availability?.minutes_per_day ?? 45);

  const goal = p.aspirational_goal;
  const gap =
    goal?.target_score && goal.current_estimate
      ? scoreGap(goal.current_estimate, goal.target_score)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {p.user.display_name?.split(" ")[0]}&rsquo;s plan
        </h1>
        <p className="mt-1 text-sm text-muted">
          {p.academic_context?.school} &middot; Grade {p.academic_context?.grade} &middot; training
          for {labelFor(p.active_target.assessment)}
          {p.active_target.test_date ? ` on ${p.active_target.test_date}` : ""}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card
          title={`${p.current_roadmap_phase.phase_label ?? posture.label}`}
          subtitle={`Week ${p.current_roadmap_phase.week} of ${p.current_roadmap_phase.total_weeks} · set by the backend, not the engine`}
        >
          <Row label="Generation posture">
            <Pill tone="info">{posture.tone}</Pill>
          </Row>
          <Row label="Scaffolding">{posture.scaffolding}</Row>
          <Row label="Clone density">{posture.cloneDensity}</Row>
          <Row label="Difficulty spread">{posture.difficultySpread}</Row>
          <Row label="Planned session">
            {size} questions from {p.training_availability?.minutes_per_day} min
          </Row>
        </Card>

        <Card
          title="Goal"
          subtitle={goal?.institution ? `${goal.institution} · aspirational` : undefined}
        >
          <Row label="Target">
            {goal?.target_score
              ? `${goal.target_score.value} on the ${describeScale(goal.target_score.scale)}`
              : "—"}
          </Row>
          <Row label="Current estimate">
            {goal?.current_estimate
              ? `${goal.current_estimate.value} on the ${describeScale(goal.current_estimate.scale)}`
              : "—"}
          </Row>
          <Row label="Training on">{describeScale(p.active_target.assessment)}</Row>

          {gap && !gap.ok && (
            <p className="mt-3 rounded border border-line bg-ground p-3 text-xs leading-relaxed text-muted">
              <strong className="text-ink">No gap shown.</strong> {gap.detail} The two numbers
              live on different scales, so subtracting them would produce a figure that looks
              precise and means nothing. Progress against the {labelFor(p.active_target.assessment)}{" "}
              is tracked on its own scale.
            </p>
          )}
          {gap?.ok && (
            <>
              <Row label="Gap">
                {gap.gap} points on the {labelFor(gap.scale)} scale
              </Row>
              {gap.scale !== p.active_target.assessment && (
                <p className="mt-3 rounded border border-line bg-ground p-3 text-xs leading-relaxed text-muted">
                  <strong className="text-ink">Two different scales.</strong> That gap is on the{" "}
                  {labelFor(gap.scale)} scale; training right now is on the{" "}
                  {describeScale(p.active_target.assessment)}, whose maximum is{" "}
                  {SCALES[p.active_target.assessment].composite[1]}. The two are never subtracted
                  from one another — progress toward the {labelFor(gap.scale)} goal is inferred
                  from the skills, not by converting scores.
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      <Card
        title="Active cognitive traps"
        subtitle="What the clone engine is aiming at this phase"
        tone="alert"
      >
        <ul className="space-y-3">
          {(p.top_cognitive_traps ?? []).map((id) => {
            const t = traps.get(id);
            return (
              <li key={id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{t?.label ?? id}</span>
                  <Pill>{id}</Pill>
                </div>
                {t && <p className="mt-1 text-xs text-muted">Cue: {t.remediation_cue}</p>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Calibration" tone="warn">
        <Row label="Flag">
          <Pill tone="warn">{p.calibration_state?.flag}</Pill>
        </Row>
        <Row label="Detail">{p.calibration_state?.detail}</Row>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Computed by the backend from the response log. While this flag is set, correct answers
          rated 5 get an acknowledgement and nothing more — praise reinforces the pattern that is
          costing the points.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/practice"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Start today&rsquo;s set
        </Link>
        <Link
          href="/sim"
          className="rounded border border-line bg-surface px-4 py-2 text-sm hover:border-muted"
        >
          Test Sim
        </Link>
      </div>
    </div>
  );
}
