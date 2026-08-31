# 01 — Engine Boundaries

The single most load-bearing rule in Apex SAT: **the engine writes content, the
backend computes numbers.** Every ambiguity resolves in favour of the backend.

## 1. The split

| Concern | Owner | Why |
|---|---|---|
| Question generation, stimulus authoring | **Engine** | Requires language + psychometric judgement |
| Distractor design and trap mapping | **Engine** | Requires modelling a wrong reasoning path |
| Explanations, Socratic dialogue | **Engine** | Requires pedagogy |
| Desmos play authoring (which keystrokes, which regression) | **Engine** | Requires procedural teaching |
| Raw→scaled score conversion | **Backend** | Deterministic lookup table |
| Adaptive module routing (which Module 2) | **Backend** | Deterministic threshold on Module 1 |
| Pacing averages, seconds-per-question | **Backend** | Arithmetic over the response log |
| Score trajectory / projection / percentile | **Backend** | Statistical model, must be reproducible |
| Calibration index (overconfidence magnitude) | **Backend** | Brier-style scoring over the response log |
| Roadmap mutation (what to study next week) | **Backend** | Deterministic policy over the Student Model |
| Mastery state per skill | **Backend** | Accumulated evidence, not a judgement call |

## 2. Prohibited engine outputs

The engine must never emit, and the backend must reject if present:

1. **A score, score estimate, projection, or percentile.** Not "this puts you
   around a 1300", not "you're on track for 1450". Numbers of this kind are the
   backend's or they are wrong.
2. **A pacing verdict computed from timing data.** The engine may say "this
   question is designed to be a 45-second question"; it may not say "you are
   averaging 92 seconds and are 14% behind."
3. **A probability of anything.** No "you have a 70% chance of hitting your
   goal."
4. **A roadmap change.** The engine may flag *evidence* ("three consecutive
   misses on the same trap") in a structured field; the backend decides what
   that means for the plan.
5. **A mastery declaration.** "You've mastered linear systems" is a backend
   state transition, not an engine opinion.
6. **Cross-scale arithmetic.** See §4.

## 3. How the engine flags evidence instead

When the engine notices something the backend should act on, it uses the
`engine_signals` array — structured, non-numeric, advisory:

```json
{
  "engine_signals": [
    {
      "type": "trap_recurrence",
      "trap_id": "MATH_PREMATURE_STOP",
      "observed_in": ["resp_8812", "resp_8817", "resp_8830"],
      "note": "Solved for the intermediate variable each time; arithmetic was correct."
    },
    {
      "type": "prerequisite_gap",
      "skill": "math.algebra.systems_two_linear",
      "blocking_skill": "math.algebra.linear_equations_two_vars",
      "note": "Substitution attempts fail at the isolation step, not the solving step."
    }
  ]
}
```

The backend consumes these; it is free to ignore them. The engine never assumes
a signal was acted on.

## 4. The cross-scale rule

The digital suite has three composite scales
(see [`02-assessment-blueprints.md`](./02-assessment-blueprints.md)):

| Assessment | Composite | Per-section |
|---|---|---|
| SAT | 400–1600 | 200–800 |
| PSAT/NMSQT & PSAT 10 | 320–1520 | 160–760 |
| PSAT 8/9 | 240–1440 | 120–720 |

Every score in the Student Model carries an explicit `scale`. The engine:

* **may** reason about a gap when both numbers share a scale;
* **must refuse** to compute or narrate a gap across scales, and instead surface
  `{"type": "scale_mismatch"}` in `engine_signals`;
* **may** describe an aspirational SAT goal qualitatively while training on
  PSAT 8/9 content ("this skill is the same one the SAT tests at a harder
  difficulty") — that is content reasoning, not score math.

This is not pedantry. The seed profile in §2 of the master architecture asks for
a 1450 on a test that stops at 1440, and a 170-point gap between two scales that
do not share a zero point. Shipping that arithmetic to a 9th grader is how a
prep product loses trust.

## 5. Failure posture

If the engine is asked to do something on the prohibited list, it does not
comply and does not refuse silently. It returns:

```json
{
  "status": "boundary_refusal",
  "requested": "score_projection",
  "reason": "Score projection is computed by the backend; the engine has no access to the response log or conversion tables.",
  "engine_can_instead": ["generate_diagnostic_set", "explain_error_pattern"]
}
```

The backend surfaces this as a bug in its own prompt construction, not as an
error to the student.
