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

Requires **Node 20+** (Tailwind v4's native engine will not build on 18).

Two optional environment variables, both with working defaults:

| Variable | Default | Why you'd change it |
|---|---|---|
| `NEXT_PUBLIC_DESMOS_API_KEY` | Desmos's public demo key | Required before shipping to students — see `docs/OPEN-QUESTIONS.md` §C8 |
| `NEXT_PUBLIC_DESMOS_API_VERSION` | `v1.11` | If the calculator script 404s, point it at a version Desmos currently publishes |

The AI tutor needs no environment variable: the student adds their own Claude
API key in the app, and it is stored in their browser and never sent to a
server.

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

**Embedded Desmos.** The real Desmos graphing calculator, available on every
Math item as it is on the real test, seeded with the item's expressions when a
play is recommended and deliberately still available when it isn't — learning
when *not* to open it is Tier 5 of the Academy.

**The Socratic tutor.** Calls `claude-opus-5` from the browser on the student's
own key, with structured output validated against the tutor-turn schema and the
system prompt served live from `prompts/`. Reachable only after an answer is
submitted, and every turn passes the same boundary guard as the content engine.

**The Test Sim**, as a shortened form (RW 2×4, Math 2×3) at the real
per-question pace: server-authoritative timing, per-section adaptive routing,
question navigator, Mark for Review, option eliminator, split screen, the break,
and embedded Desmos. The report gives raw counts and refuses to invent a scaled
score.

Supporting machinery, all exercised by the test suite:

* **Boundary enforcement** — prohibited keys and prose rejected at the seam.
* **The validation gate** — every item re-validated against
  `schemas/question.schema.json` before it can reach a student, with the
  mechanically-checkable checks separated from the ones only a reader can make.
* **Calibration** — the 2×2, Brier-style scoring, degenerate-rating detection.
* **Scale safety** — cross-scale score arithmetic refused, not approximated.
* **Adaptive routing** — deterministic, versioned thresholds.
* **Answer-key privacy** — the client never receives `is_correct`.

## What is not built

* **Full-length sims.** The bank holds 14 authored items; a real administration
  is 98. Raw→scaled conversion tables do not exist either, which is why the sim
  report stops at raw counts. Sourcing that volume from an external bank is
  analysed in [`docs/10-external-question-sources.md`](docs/10-external-question-sources.md)
  and is blocked on a licensing question, not a technical one.
* **Desmos Academy exercises.** The 5-tier curriculum and its plays are
  specified and displayed, and the calculator is embedded, but the per-tier
  guided exercises are not written. Tiers 2 and 5 are taught inside ordinary
  practice today through each item's `desmos` block.
* **The LLM content engine.** `BankEngine` serves authored items through the
  same seam an LLM engine will use — same request shape, same boundary scrub,
  same validation gate. The model-backed implementation is not written;
  `prompts/content-engine.system.md` is what will drive it.
* **Durable sim state.** Attempts live in memory and do not survive a restart.
  `db/schema.sql` already defines `sim_attempts` / `sim_modules` as the
  destination.
* **The `pg` adapter.** Written against `db/schema.sql` and typechecked, but
  **never run against a live server**: the build container had the psql client
  and no Postgres server or Docker. Treat the first connection as the first
  test.

### Verified how

The practice flow, the sim (all four modules, the break, routing and the
report), and the tutor's availability gate were driven in a real browser. **The
Desmos embed could not be verified** — the build container's proxy blocks
`desmos.com`, so only its failure path was exercised. The tutor's model call was
not exercised either: that needs a real API key, which is the student's to
supply.

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
| [`src/lib/sim/`](src/lib/sim) | Form assembly, flow, server-held timing and the sim report |
| [`src/lib/tutor/`](src/lib/tutor) | BYOK tutor: schema, browser client, boundary check |
| [`tests/`](tests) | Vitest suite over the boundary, gate, calibration, routing, grading and the sim |
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
