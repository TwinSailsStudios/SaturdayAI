# 10 — External Question Sources

**Status: analysed, not built, and blocked on a licensing answer.**
Nothing in this document is implemented. See
[`OPEN-QUESTIONS.md`](./OPEN-QUESTIONS.md) §D for the decision that gates it.

## 1. The problem this would solve

The authored bank holds 14 items. One full-length administration is 98
([`02-assessment-blueprints.md`](./02-assessment-blueprints.md) §1). Authoring
that volume by hand at the quality bar in
[`04-cognitive-trap-taxonomy.md`](./04-cognitive-trap-taxonomy.md) is not a
realistic path to a shippable Test Sim, and it is the single constraint holding
that pillar at a shortened form.

An external bank is the obvious source of volume. The question is what it
actually supplies, and what it leaves us still owing.

## 2. Candidate: OpenSAT

[Anas099X/OpenSAT](https://github.com/Anas099X/OpenSAT) — an open question bank
of 1,000+ SAT items with a public JSON API.

Its item shape:

```json
{
  "id": "70ced8dc",
  "domain": "Standard English Conventions",
  "question": {
    "paragraph": "...lower a book's ______ when the former owner is a famous poet...",
    "question": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "choices": { "A": "value, but", "B": "value", "C": "value,", "D": "value but" },
    "correct_answer": "A",
    "explanation": "Choice A is the best answer. The convention being tested is..."
  }
}
```

### What it supplies

Stem, stimulus, four options, the key, a coarse domain label, and one
explanation — at volume.

### What it does not supply

Everything that makes an Apex item an Apex item:

| Apex field | In OpenSAT? | Consequence |
|---|---|---|
| `trap_id` per distractor | No | `G02_ALL_DISTRACTORS_TRAP_MAPPED` fails |
| `rationale` per distractor | No | No reasoning path to show in review |
| `explanation.trap_first` | No — theirs is correct-answer-first | The review order in [`04`](./04-cognitive-trap-taxonomy.md) §4 is exactly inverted |
| `skill` | No — domain only | `Standard English Conventions` does not distinguish Boundaries from Form, Structure, and Sense |
| `difficulty` | No | Cannot route a module or size a repair set |
| `assessment` | Implicitly SAT | Our seed student targets PSAT 8/9; different calibration |
| `desmos` block | No | `G09_DESMOS_BLOCK_PRESENT` fails on every Math item |
| `targets_trap` / clone support | No | The clone engine has nothing to aim at |

**Imported items therefore fail the validation gate on arrival, by design.**
That is the architecture working. `provenance.source` already has an
`"imported"` value and `bank_status` already starts at `candidate`
([`schemas/question.schema.json`](../schemas/question.schema.json)), so the
quarantine exists; nothing has to be loosened to accommodate this.

## 3. The reframe: enrichment, not import

The useful conclusion is about the **engine**, not the bank.

The LLM content engine's first job should not be generating questions from
scratch. It should be **enrichment**: given a stem, four options and the key,
assign a trap to each distractor and write the reasoning path that produces it.

That is a better first job for three reasons:

1. **It is constrained.** The item already exists and is already known to have
   one defensible answer. The engine is not inventing a question, it is
   explaining one.
2. **It is checkable.** A claimed trap makes a falsifiable assertion — that a
   specific wrong move produces *that* option's value. For Math that is
   arithmetically verifiable; for RW it is at least reviewable against a named
   rule. Free generation has no such anchor.
3. **It fails visibly.** A mis-assigned trap shows up as an option whose
   rationale does not produce it, which a reviewer can catch. A badly generated
   question fails in more ways and in fewer places you can look.

The OpenSAT sample above maps onto the existing taxonomy without strain:

| Option | Text | Trap |
|---|---|---|
| B | `value` | `RW_FUSED_SENTENCE` |
| C | `value,` | `RW_COMMA_SPLICE` |
| D | `value but` | Missing comma before a coordinating conjunction joining independent clauses — a Boundaries error the taxonomy does not yet name |

Note the third row: even one sample surfaces a gap. Expect enrichment at volume
to drive real taxonomy growth, under the append-only rule in
[`04`](./04-cognitive-trap-taxonomy.md) §2.

## 4. Proposed shape `[UNBUILT]`

Sketched so the decision can be made against something concrete. None of this
exists.

```
scripts/import-opensat.ts     snapshot → Question[] with source: "imported",
                              bank_status: "candidate", trap fields empty
```

* A new engine surface, `enrich.question`, taking a bare item and returning the
  trap mapping, per-distractor rationales, a trap-first explanation, a skill, a
  difficulty band and (for Math) a Desmos block. This would need adding to the
  `surface` enum in
  [`generation-request.schema.json`](../schemas/generation-request.schema.json);
  it is not there today.
* The existing gate then runs unchanged. An enriched item that still fails is
  discarded, not patched.
* **A human review pass before promotion.** `candidate` → `practice_pool` is a
  person's decision, not the engine's. Only items that then behave in practice
  reach `sim_pool` ([`07`](./07-test-sim-fidelity.md) §5).

The review pass is not optional politeness. An LLM assigning traps will be
wrong some of the time, and a wrong trap is worse than no trap: it tells a
student their problem is one thing when it is another, and it aims the clone
engine at the wrong behaviour.

## 5. Operational notes

* **Vendor a snapshot; do not call the API at runtime.** The public endpoint is
  a single-maintainer host with no availability guarantee. A pinned copy also
  makes the bank reproducible, which matters for a measurement instrument.
* **Attribute.** Whatever the licence permits, the bank came from somewhere and
  the source belongs in the repo and in the product.
* **Re-calibrate difficulty.** SAT items used for a PSAT 8/9 student need a band
  assigned against that assessment, not inherited.
