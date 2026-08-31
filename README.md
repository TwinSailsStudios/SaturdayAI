# Apex SAT — System Architecture & Content Engine

Specification for **Apex SAT**: a digital SAT/PSAT preparation product built
around one loop —

> Goal → Diagnose → Plan → Train → Retest → Adapt → Reach Goal

This repository holds the architecture, the engine contracts, and the deployable
system prompts. It is a specification repository: there is no application code
here yet, and the Next.js + PostgreSQL implementation lives elsewhere.

## The central design decision

Apex splits responsibilities on a hard line:

* The **backend** (Next.js + PostgreSQL) owns every number — scoring, adaptive
  routing, pacing, calibration indices, score projections, and roadmap
  mutations. All of it deterministic and reproducible.
* The **AI Content Engine** owns everything language- and judgement-shaped —
  writing questions, designing distractors that map to named cognitive traps,
  explaining errors, coaching Desmos, and Socratic tutoring.

The engine cannot emit a score, a projection, a percentile, or a roadmap change.
When it notices something the plan should respond to, it emits structured
evidence and the backend decides. This is what makes a generated-content prep
product trustworthy: the student's plan is deterministic policy, not a model's
opinion.

Full contract: [`docs/01-engine-boundaries.md`](docs/01-engine-boundaries.md).

## The four pillars

1. **Test Sim** — Bluebook-mirror fidelity. RW 2×27 questions/32 min, Math 2×22
   questions/35 min, un-pauseable timers, split-screen, and the engine
   *architecturally unreachable* during a timed module.
   → [`docs/07-test-sim-fidelity.md`](docs/07-test-sim-fidelity.md)
2. **Targeted Practice** — the recovery flywheel. A 1–5 certainty rating on
   every answer diagnoses overconfidence; Mistake Clones regenerate the exact
   cognitive trap a student fell for.
   → [`docs/05-confidence-calibration.md`](docs/05-confidence-calibration.md),
   [`docs/04-cognitive-trap-taxonomy.md`](docs/04-cognitive-trap-taxonomy.md)
3. **Desmos SAT Academy** — a 5-tier curriculum treating the in-test calculator
   as a triage instrument, ending with a tier on when *not* to use it.
   → [`docs/06-desmos-academy.md`](docs/06-desmos-academy.md)
4. **BYOK AI Tutor** — Socratic, decoupled, running on the student's own API
   key, unreachable until a question has been answered.
   → [`docs/08-byok-tutor.md`](docs/08-byok-tutor.md)

## What makes the content engine different

Conventional prep records *"missed question 44219, topic: linear systems."*
Apex records *"chose the value of `x` when the question asked for `y` —
`MATH_PREMATURE_STOP`."* Every distractor in every generated item is a designed
reasoning path with a trap ID; there is no filler. Wrong answers become the
diagnostic signal, and a clone is valid only if the student's original wrong
reasoning still lands on an available option.

## Layout

| Path | Contents |
|---|---|
| [`docs/`](docs/) | Architecture, blueprints, taxonomies, pillar specs |
| [`prompts/`](prompts/) | Deployable system prompts (content engine, Socratic tutor) |
| [`schemas/`](schemas/) | JSON Schemas — the runtime contract the backend validates against |
| [`types/apex.ts`](types/apex.ts) | TypeScript mirror of the schemas plus shared constants |
| [`scripts/validate.mjs`](scripts/validate.mjs) | Cross-artifact consistency check |

Start at [`docs/00-master-architecture.md`](docs/00-master-architecture.md).

## Checks

```bash
node scripts/validate.mjs          # no dependencies
npx tsc --noEmit --strict --target es2022 --module esnext \
        --moduleResolution bundler types/apex.ts
```

`validate.mjs` asserts that the prose, the schemas, the system prompt and the
TypeScript agree: every trap ID, skill ID and Desmos play referenced anywhere is
defined, the validation gate list matches between the prompt and the types, the
score scales agree, and every internal link resolves.

## Status

Sections 1 and 2 of
[`docs/00-master-architecture.md`](docs/00-master-architecture.md) are the
architecture as authored. **The source specification was truncated mid-document**,
so everything from Section 3 onward is marked `[DRAFTED]` — constructed from the
four pillars and the seed Student Model, and awaiting reconciliation.

Read [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) before building.
It lists the blocking items, including a score-scale conflict in the seed
profile (a 1450 target on a test that stops at 1440, and a 170-point gap
computed across two incompatible scales) and the assessment facts that must be
verified against College Board sources rather than inferred.
