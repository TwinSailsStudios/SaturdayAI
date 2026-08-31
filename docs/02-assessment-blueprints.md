# 02 — Assessment Blueprints (Digital Suite)

`[DRAFTED]` — structural figures below match the digital suite as specified by
College Board for the post-2023 (SAT) / post-2023–24 (PSAT) administrations.
**Verify every number against the current official specification and a live
Bluebook build before the Test Sim ships**; test specs change, and Pillar 1's
whole value proposition is that these numbers are exactly right.

## 1. Shared structure

The digital SAT, PSAT/NMSQT, PSAT 10 and PSAT 8/9 share one structure. Only
difficulty calibration and the score scale differ.

| | Reading & Writing | Math |
|---|---|---|
| Modules | 2 | 2 |
| Questions per module | 27 | 22 |
| Minutes per module | 32 | 35 |
| Section total | 54 q / 64 min | 44 q / 70 min |

* **Total:** 98 questions, 134 minutes, plus a **10-minute break** between
  sections.
* Of each module's questions, a small number are unscored pretest items
  (commonly 2 of 27 in RW, 2 of 22 in Math). The Test Sim should model these as
  present-but-unscored so pacing feels authentic.

## 2. Two-stage adaptivity

* **Module 1** is a mixed-difficulty form. Every student sees the same
  difficulty mix.
* **Module 2** is routed to a *lower* or *upper* difficulty form based on
  Module 1 performance, **within a section**. RW routing does not affect Math
  routing.
* Routing is computed by the **backend**, from a deterministic threshold. The
  engine never decides routing; it only generates items tagged
  `module_target: module_1 | module_2_lower | module_2_upper`.
* Once a module is submitted the student cannot return to it.

## 3. Score scales

| Assessment | Composite | Section (each) | Typical audience |
|---|---|---|---|
| SAT | 400–1600 | 200–800 | 11th–12th grade |
| PSAT/NMSQT, PSAT 10 | 320–1520 | 160–760 | 10th–11th grade |
| **PSAT 8/9** | **240–1440** | **120–720** | **8th–9th grade** |

The seed student (9th grade, Athens High School) is correctly targeted at
**PSAT 8/9**. See the cross-scale rule in
[`01-engine-boundaries.md`](./01-engine-boundaries.md) §4.

## 4. Reading & Writing blueprint

* Every question has **its own** short passage (roughly 25–150 words). There are
  no shared multi-question passages.
* All questions are **4-option multiple choice**.
* Within a module, questions are **grouped by domain** and ordered roughly
  easy→hard inside each group. `[VERIFY ORDERING AGAINST BLUEBOOK]` — the Test
  Sim must reproduce the grouping order exactly, so this needs confirmation
  rather than inference.

| Domain | Approx. share | Skills |
|---|---|---|
| Craft and Structure | ~28% | Words in Context; Text Structure and Purpose; Cross-Text Connections |
| Information and Ideas | ~26% | Central Ideas and Details; Command of Evidence (Textual); Command of Evidence (Quantitative); Inferences |
| Standard English Conventions | ~26% | Boundaries; Form, Structure, and Sense |
| Expression of Ideas | ~20% | Rhetorical Synthesis; Transitions |

Notes that matter for generation:

* **Command of Evidence (Quantitative)** and some Central Ideas items include a
  table or graph. The engine emits these as structured `stimulus_data`, never as
  prose descriptions of a chart.
* **Rhetorical Synthesis** items present bulleted student notes plus a stated
  rhetorical goal. The correct answer must satisfy the *stated goal*, which is
  the entire difficulty of the item type.
* **Boundaries** (sentence-boundary punctuation) is the home of the seed
  student's `RW_COMMA_SPLICE` trap.

## 5. Math blueprint

* Roughly **75% multiple choice** (4 options) and **25% student-produced
  response** (SPR / grid-in).
* SPR items appear at the **end** of each module.
* The **Desmos graphing calculator is available for the entire Math section**,
  as is the on-screen reference sheet. There is no "no-calculator" module in the
  digital format — this is why Pillar 3 exists.

| Domain | Approx. share | Skills |
|---|---|---|
| Algebra | ~35% | Linear equations in one variable; linear equations in two variables; linear functions; systems of two linear equations in two variables; linear inequalities |
| Advanced Math | ~35% | Equivalent expressions; nonlinear equations in one variable and systems; nonlinear functions |
| Problem-Solving and Data Analysis | ~15% | Ratios, rates, proportional relationships, units; percentages; one-variable data (distributions and measures); two-variable data (models and scatterplots); probability and conditional probability; inference from sample statistics and margin of error; evaluating statistical claims |
| Geometry and Trigonometry | ~15% | Area and volume; lines, angles, and triangles; right triangles and trigonometry; circles |

### SPR answer-entry rules (generation constraints)

The engine must not author an SPR item whose answer cannot be entered. Enforced
in the validation gate:

* Answer fits the entry limit: **up to 5 characters** for a positive value,
  **up to 6 characters** including the sign for a negative value.
* Fractions and decimals are both accepted; the engine records **all** accepted
  equivalent forms in `acceptable_answers` (e.g. `["7/2", "3.5"]`).
* Repeating decimals must be entered truncated or rounded to fill the entry
  field — items whose exact answer is an awkward repeating decimal are avoided
  rather than authored and patched.
* No percent signs, no commas, no mixed numbers (`3 1/2` is entered as `7/2` or
  `3.5`).
* Negative answers **are** permitted in the digital format.
* If an item admits multiple correct values, the item must state that any one is
  acceptable, and `acceptable_answers` lists every one.

## 6. Machine-readable form

Domain and skill identifiers are stable dotted strings and are the join key
between the engine, the question bank, and the Student Model:

```
rw.information_and_ideas.command_of_evidence_quantitative
rw.standard_english_conventions.boundaries
math.algebra.systems_two_linear
math.advanced.nonlinear_functions
math.psda.percentages
math.geometry_trig.right_triangles_and_trig
```

The full enumeration lives in
[`schemas/question.schema.json`](../schemas/question.schema.json).
