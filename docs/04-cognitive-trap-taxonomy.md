# 04 — Cognitive Trap Taxonomy & the Clone Engine

Source of truth: [`schemas/cognitive-traps.json`](../schemas/cognitive-traps.json)
(26 traps at v1.2.0 — 11 Math, 15 RW).

## 1. Why traps are the primitive

A conventional prep app records *"missed question 44219, skill:
systems of two linear equations."* That tells you the topic and nothing about
the mind. Apex records *"chose the value of `x` when the question asked for
`y` — `MATH_PREMATURE_STOP`."* That is a repairable behaviour.

Consequences that fall out of this choice:

* **Every distractor is designed, never filler.** An option that no plausible
  reasoning path produces is wasted — it teaches nothing when eliminated and
  diagnoses nothing when chosen.
* **Wrong answers become the signal.** Which wrong option a student picks is
  more informative than whether they were wrong.
* **Remediation is behavioural.** `remediation_cue` is a procedure the student
  runs, not a topic to re-study.

## 2. Rules for trap IDs

1. IDs are **append-only**. Once shipped, an ID is never renamed or repurposed —
   the error log, `top_cognitive_traps`, and the clone engine all join on them,
   and historical rows must keep meaning what they meant.
2. Deprecate by adding `"deprecated": true` plus `"superseded_by"`. Never
   delete.
3. Every distractor in every generated item carries exactly one `trap_id`.
4. `MATH_ARITHMETIC_SLIP` is the only residual category and is capped at **one
   option per item**. If an item needs two slip distractors, the item is
   underdesigned and the gate rejects it.
5. `MATH_ANSWER_FORMAT` is a **response-level** trap (SPR entry failures). It
   never appears on an option.

## 3. The Mistake Clone

A clone is a **new** question that recreates the trap, not a reskin of the
original.

### What must change

| Element | Requirement |
|---|---|
| Surface context | Different scenario, different names, different numbers |
| Stimulus | Rewritten from scratch (RW) |
| Correct answer position | Randomised; never the same letter as the source |
| Numbers | Different, and not proportional to the source's |

### What must hold constant

| Element | Requirement |
|---|---|
| `targets_trap` | Identical trap ID |
| Trap mechanism | The *same wrong move* must produce a listed distractor |
| Skill | Same dotted skill ID |
| Difficulty band | Same, unless the request specifies a ladder |

### The clone validity test

Before emitting a clone, the engine runs the student's original wrong reasoning
path against the new item and confirms it lands on an available option. If
executing the trap on the clone produces something *not* offered, the clone
fails — the student would be forced into the correct answer by elimination, and
the item would teach nothing.

Example, `MATH_PREMATURE_STOP`:

* **Source:** system in `x` and `y`, asks for `y`; student answered `x = 4`.
* **Valid clone:** different system, asks for `x − y`; the value of `x` alone is
  option C.
* **Invalid clone:** different system, asks for `x`. The trap cannot fire — the
  intermediate value *is* the answer.

### Clone ladders

When a trap recurs (three or more times in `recent_errors`), the engine may
emit a **ladder** instead of parallel clones, if `engine_directives.clone_budget`
allows:

1. **Scaffolded** — the question stem's final clause is bolded and the target
   quantity is restated.
2. **Neutral** — standard presentation.
3. **Adversarial** — the trap value is made maximally attractive (round number,
   first option, matches a number in the stem).

A student who clears the adversarial rung has repaired the behaviour. The
backend decides whether that changes mastery state; the engine only reports
which rungs were emitted.

## 4. Trap-aware explanations

Every explanation is written in this order, and the order is not cosmetic:

1. **The trap fires first.** "Here's the move that feels right and isn't."
2. **Where it breaks.** The precise step at which the path diverges.
3. **The correct path.** Minimal, no detours.
4. **The cue.** The `remediation_cue` verbatim, as a portable procedure.

For a student flagged `high_overconfidence`, this order matters more than usual:
a confident student who is shown the correct path first reads it as agreement
with what they already did, and learns nothing. Leading with the wrong path
forces recognition before correction. See
[`05-confidence-calibration.md`](./05-confidence-calibration.md).

## 5. Changelog

**v1.2.0** — added `RW_SENSE_REVERSAL`. Authoring Words in Context and
Inferences items showed that the single most natural distractor for both is the
clean antonym of the correct choice, and no existing ID named it:
`RW_TRANSITION_DIRECTION` is scoped to transitions, and filing a reversal under
`RW_SCOPE_ERROR` would have told a student their problem was breadth when it was
direction.

**v1.1.0** — added `RW_FUSED_SENTENCE` and `RW_BOUNDARY_SUBORDINATION`. Authoring
the first seed items for the Boundaries skill showed that `RW_COMMA_SPLICE`
alone could not express two distinct errors that Boundaries items routinely
test: a join with no punctuation at all, and a join that subordinates a clause
which must stay independent. Collapsing all three into one ID would have made
the seed student's `RW_COMMA_SPLICE` history mean "some boundary error",
which is not a repairable behaviour. Append-only: no existing ID changed.

## 6. Coverage check

The taxonomy is deliberately small. Adding a trap requires evidence that an
existing one cannot express the behaviour, plus a `distractor_recipe` concrete
enough that two different generation runs produce comparable distractors. A
taxonomy that grows without that discipline becomes a synonym list, and the
clone engine's join key stops meaning anything.
