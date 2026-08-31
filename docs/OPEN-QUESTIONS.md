# Open Questions — Decisions Required Before Build

Everything here needs an authoring decision. Items marked **blocking** will
produce wrong content or wrong measurement if guessed.

## A. From the source specification

### A1. The source document is truncated — **blocking**

The specification as received ends mid-way through the Section 2 JSON block:
the code fence never closes, and there is no Section 3 or beyond. Sections 1
and 2 are preserved verbatim in
[`00-master-architecture.md`](./00-master-architecture.md); everything after is
marked `[DRAFTED]` and was constructed from the four pillars and the seed
Student Model.

**Needed:** the remainder of the original document, so the drafted sections can
be reconciled rather than treated as the spec.

Most likely to be wrong in the drafted material:

* the 5-tier Desmos curriculum's tier boundaries ([`06`](./06-desmos-academy.md));
* the roadmap phase names and the 12-week shape ([`09`](./09-apex-loop.md));
* the generation-posture table, which is an inference from the pillars.

### A2. The score-scale conflict — **blocking**

The seed profile sets `active_target` to **PSAT 8/9** (composite 240–1440) and
`aspirational_goal.target_score` to **1450** with a precomputed **gap of 170**
against a `current_estimate` of 1280. Those numbers cannot coexist:

* 1450 is above the PSAT 8/9 maximum, so it is an SAT-scale goal;
* subtracting an SAT-scale target from a PSAT-scale estimate (or vice versa)
  produces a number with no meaning, since the scales do not share a zero point
  or a range.

The architecture resolves this by making `scale` mandatory on every score and
removing the precomputed gap
([`01`](./01-engine-boundaries.md) §4, [`03`](./03-student-model.md) §2).

**Needed — pick one:**

1. `current_estimate` is an SAT-scale projection and the student trains on PSAT
   8/9 as a waypoint. The UI shows two tracks and never subtracts across them.
2. The active target should be SAT, and PSAT 8/9 is only a practice instrument.
3. The goal should be restated on the PSAT 8/9 scale for the current phase, with
   the SAT goal shown separately as aspirational.

Option 1 is the recommendation: it matches a 9th grader's real situation and
keeps the aspirational goal motivating without faking precision.

### A3. `training_availability` as a string

The seed model gives `"45 min/day"`. The normalised model uses
`{ minutes_per_day, days_per_week }`. **Confirm** the backend emits the
structured form — no component should be parsing that string.

### A4. `current_roadmap_phase` as a string

Same issue: `"Phase 2: Repair (Week 3 of 12)"` is normalised to
`{ phase, phase_label, week, total_weeks }`. **Confirm.**

## B. Assessment facts to verify against primary sources — **blocking**

Pillar 1's entire claim is Bluebook-mirror fidelity, so none of this should
ship on inference. Verify against the current College Board specification and a
live Bluebook practice test:

1. Module structure and timing (RW 27/32, Math 22/35) for **PSAT 8/9
   specifically**, not just the SAT.
2. The **question-ordering convention within an RW module** — whether questions
   are grouped by domain and in which order. Flagged inline in
   [`02`](./02-assessment-blueprints.md) §4. The sim cannot be faithful without
   this.
3. Exact domain share percentages per assessment.
4. Pretest (unscored) item counts per module.
5. SPR entry limits (5 characters positive / 6 with sign) and the accepted-form
   rules.
6. The **in-test Desmos build's** feature set versus the public graphing
   calculator — every play in [`06`](./06-desmos-academy.md) assumes a feature.

## C. Product decisions

### C1. Adaptive routing threshold

[`07`](./07-test-sim-fidelity.md) §4 requires a documented, versioned, backend
constant. **Needed:** the actual threshold, and whether it approximates College
Board routing or is Apex's own.

### C2. Practice-mode adaptivity

Does Targeted Practice adapt within a set, or is difficulty fixed at set
construction? The generation posture table assumes fixed-at-construction.

### C3. Item exposure policy

`spec.exclude_question_ids` exists, but the policy does not. How long before a
student may see an item again? Different answers for the practice pool and the
sim pool.

### C4. Bank promotion criteria

[`07`](./07-test-sim-fidelity.md) §5 says generated items must behave in
practice before entering the sim pool. **Needed:** how many responses, and what
counts as behaving (p-value band? discrimination? distractor spread?).

### C5. Clone budget default

`engine_directives.clone_budget` is set to 4 in the seed model. Is that a
constant, a per-phase value, or computed from the session's remaining minutes?

### C6. BYOK provider support

[`08`](./08-byok-tutor.md) assumes direct browser-to-provider calls. **Needed:**
which providers are supported, and whether any of them forbid browser-origin
requests — that determines whether the stateless non-logging proxy is required
at launch or deferred.

### C7. Tutor availability during Desmos Academy

Listed as available. Confirm that Academy work does not carry a calibration
signal that a tutor would contaminate.

## D. Deferred / non-blocking

* **Accessibility.** Screen-reader behaviour for the split-screen sim and for
  `stimulus_data` tables. Needs a pass before launch, not before build.
* **Trap taxonomy coverage.** 25 traps is deliberately small. Two were already
  added at v1.1.0 while authoring the first seed items (see the changelog in
  [`04`](./04-cognitive-trap-taxonomy.md) §5). Expect more after the first
  cohort's error logs; the append-only rule in §2 covers the mechanics.
* **Item images.** `stimulus_data` covers tables and simple plots. Geometry
  figures are not yet representable and will need either a figure DSL or
  authored assets.
* **Localisation.** Not addressed anywhere.
