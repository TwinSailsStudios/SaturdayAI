import { Card, Pill, Row } from "@/components/ui";
import { BLUEPRINT, SCALES } from "@contracts";
import { ROUTING_VERSION } from "@/lib/scoring/routing";
import { SEED_STUDENT } from "@/lib/seed/student";
import { labelFor } from "@/lib/scoring/scale";

export default function SimPage() {
  const target = SEED_STUDENT.student_profile.active_target.assessment;
  const scale = SCALES[target];
  const rw = BLUEPRINT.reading_writing;
  const math = BLUEPRINT.math;
  const totalQuestions = rw.modules * rw.questionsPerModule + math.modules * math.questionsPerModule;
  const totalMinutes = rw.modules * rw.minutesPerModule + math.modules * math.minutesPerModule;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Test Sim</h1>
        <p className="mt-1 text-sm text-muted">
          Bluebook-mirror fidelity for {labelFor(target)}.
        </p>
      </div>

      <Card tone="alert" title="Not runnable yet">
        <p className="text-sm leading-relaxed">
          The structure, timing rules and routing constants are implemented and shown below, but a
          full form cannot be assembled: the bank holds a handful of authored items against the{" "}
          {totalQuestions} a real administration needs. Generated items are also barred from
          debuting in a simulation — they enter the bank as <Pill>candidate</Pill> and are promoted
          only after behaving in practice, because a sim is the measurement instrument and an
          unvalidated item corrupts the measurement.
        </p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Structure" subtitle="Identical across the digital suite">
          <Row label="Reading &amp; Writing">
            {rw.modules} modules × {rw.questionsPerModule} questions × {rw.minutesPerModule} min
          </Row>
          <Row label="Math">
            {math.modules} modules × {math.questionsPerModule} questions × {math.minutesPerModule}{" "}
            min
          </Row>
          <Row label="Break">{BLUEPRINT.breakMinutes} minutes between sections</Row>
          <Row label="Total">
            {totalQuestions} questions · {totalMinutes} minutes
          </Row>
          <Row label="Composite scale">
            {scale.composite[0]}–{scale.composite[1]}
          </Row>
        </Card>

        <Card title="Rules the sim enforces">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>The engine is unreachable.</strong> Not blocked in the UI — unreachable at
              the API layer, so a client bug cannot leak a tutor into a timed module.
            </li>
            <li>
              <strong>Timing is server-authoritative.</strong> The client renders a countdown; the
              server holds module start time and rejects late responses. A client clock is a cheat
              surface.
            </li>
            <li>
              <strong>Un-pauseable.</strong> Closing the tab does not stop the clock.
            </li>
            <li>
              <strong>No back-navigation.</strong> A submitted module is closed permanently.
            </li>
            <li>
              <strong>Routing is a constant, not a model call.</strong> Version{" "}
              <Pill>{ROUTING_VERSION}</Pill>, applied per section and versioned so a historical
              score can be re-derived.
            </li>
          </ul>
        </Card>
      </div>

      <Card title="Still to build">
        <ul className="list-inside list-disc space-y-1 text-sm text-muted">
          <li>Form assembly from the bank against the blueprint's domain shares</li>
          <li>Split-screen UI, annotation, option eliminator, question navigator</li>
          <li>Embedded Desmos and the reference sheet</li>
          <li>Raw → scaled conversion tables per assessment</li>
          <li>
            The routing threshold itself — the current constants are Apex&rsquo;s own placeholder
            (docs/OPEN-QUESTIONS.md §C1)
          </li>
        </ul>
      </Card>
    </div>
  );
}
