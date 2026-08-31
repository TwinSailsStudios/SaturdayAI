# Apex SAT

Digital SAT/PSAT preparation built around one loop —

> Goal → Diagnose → Plan → Train → Retest → Adapt → Reach Goal

This repository holds the architecture specification **and** the Next.js +
PostgreSQL application being built against it.

## The central design decision

Apex splits responsibilities on a hard line:

* The **backend** owns every number — scoring, adaptive routing, pacing,
  calibration indices, score projections, roadmap mutations. All deterministic
  and reproducible.
* The **AI Content Engine** owns everything language- and judgement-shaped —
  writing questions, designing distractors that map to named cognitive traps,
  explaining errors, coaching Desmos, Socratic tutoring.

The engine cannot emit a score, a projection, a percentile, or a roadmap
change. That is not a prompt instruction the code trusts: engine output passes
through `src/lib/engine/guard.ts` before it reaches a student or the database,
and a violation throws rather than being quietly sanitised. When the engine
notices something the plan should respond to, it emits structured evidence and
the backend decides.

Full contract: [`docs/01-engine-boundaries.md`](docs/01-engine-boundaries.md).

## What makes the content engine different

Conventional prep records *"missed question 44219, topic: linear systems."*
Apex records *"chose the value of `x` when the question asked for `y` —
`MATH_PREMATURE_STOP`."* Every distractor is a designed reasoning path with a
trap ID; there is no filler. Wrong answers become the diagnostic signal, and a
Mistake Clone is valid only if the student's original wrong reasoning still
lands on an available option.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000 — no database required
npm run check        # spec consistency + typecheck + tests + build
```

The app defaults to an in-memory store seeded with an authored question bank,
so the practice flow works immediately. For Postgres:

```bash
psql "$DATABASE_URL" -f db/schema.sql
APEX_REPOSITORY=pg DATABASE_URL=postgres://… npm run dev
```

## What works today

**Targeted Practice, end to end.** Build a set from the Student Model → answer
with a mandatory 1–5 certainty rating → get a calibration quadrant, the trap
that fired by name, a trap-first explanation, every option's reasoning path,
and the Desmos play → request a Mistake Clone and get the adversarial rung
inserted straight after the item.

Supporting machinery, all exercised by the test suite:

* **Boundary enforcement** — prohibited keys and prose rejected at the seam.
* **The validation gate** — every item re-validated against
  `schemas/question.schema.json` before it can reach a student, with the
  mechanically-checkable checks separated from the ones only a reader can make.
* **Calibration** — the 2×2, Brier-style scoring, degenerate-rating detection.
* **Scale safety** — cross-scale score arithmetic refused, not approximated.
* **Adaptive routing** — deterministic, versioned thresholds.
* **Answer-key privacy** — the client never receives `is_correct`.

## What is skeletal

* **Test Sim** — structure, timing rules and routing constants implemented and
  displayed; form assembly, split-screen UI and scoring tables are not built.
* **Desmos Academy** — the 5-tier curriculum and its plays are specified and
  shown; the live Desmos environment is not wired up. Tiers 2 and 5 are already
  being taught inside ordinary practice.
* **BYOK Tutor** — client-side key storage and the availability gate work; the
  conversation itself is not built.
* **The LLM engine** — `BankEngine` serves authored items through the same
  seam an LLM engine will use. The model-backed implementation is not written;
  `prompts/content-engine.system.md` is what will drive it.
* **The `pg` adapter** — written against `db/schema.sql` and typechecked, but
  **never run against a live server**: the build container had the psql client
  and no Postgres server or Docker. Treat the first connection as the first
  test.

## Layout

| Path | Contents |
|---|---|
| [`src/app/`](src/app) | Next.js App Router pages and API routes |
| [`src/lib/engine/`](src/lib/engine) | The engine seam: boundary guard, validation gate, posture, bank engine |
| [`src/lib/scoring/`](src/lib/scoring) | Backend-owned math: calibration, routing, score scales |
| [`src/lib/db/`](src/lib/db) | Repository interface with `pg` and in-memory adapters |
| [`src/lib/seed/`](src/lib/seed) | Authored question bank, seed student, Academy curriculum |
| [`db/schema.sql`](db/schema.sql) | PostgreSQL DDL, with the architecture's rules as constraints |
| [`docs/`](docs) | Architecture, blueprints, taxonomies, pillar specs |
| [`prompts/`](prompts) | Deployable system prompts |
| [`schemas/`](schemas) | JSON Schemas — the runtime contract, loaded and enforced at request time |
| [`types/apex.ts`](types/apex.ts) | Shared types and constants |
| [`tests/`](tests) | Vitest suite over the boundary, gate, calibration, routing and grading |
| [`scripts/validate.mjs`](scripts/validate.mjs) | Cross-artifact consistency check |

Start at [`docs/00-master-architecture.md`](docs/00-master-architecture.md).

`validate.mjs` asserts that the prose, schemas, prompts and TypeScript agree:
every trap ID, skill ID and Desmos play referenced anywhere is defined, the
validation gate list matches between the prompt and the types, the score scales
agree, and every internal link resolves.

## Status and open questions

Sections 1–2 of
[`docs/00-master-architecture.md`](docs/00-master-architecture.md) are the
architecture as authored. **The source specification was truncated
mid-document**, so everything from Section 3 onward is marked `[DRAFTED]`.

Read [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) before building further.
The blocking items include a score-scale conflict in the seed profile (a 1450
target on a test that stops at 1440, and a 170-point gap computed across two
incompatible scales — the app now refuses that arithmetic and shows why), and
the assessment facts that must be verified against College Board sources rather
than inferred.
