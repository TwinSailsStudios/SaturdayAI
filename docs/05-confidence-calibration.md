# 05 — Confidence Calibration

Pillar 2's diagnostic core. Every answer in Targeted Practice is submitted with a
**1–5 certainty rating**. The rating is captured *before* feedback and cannot be
revised afterwards.

## 1. The scale

| Level | Student-facing label | Meaning |
|---|---|---|
| 1 | Guessed | No reasoning path; eliminated nothing |
| 2 | Narrowed it down | Eliminated some options, picked among the rest |
| 3 | Fairly sure | Had a path, didn't verify it |
| 4 | Confident | Had a path and a check |
| 5 | Certain | Would bet the section on it |

Copy discipline: the labels are behavioural, not emotional. "Certain" describes
what the student *did* (verified), not how they *feel*. Feelings-based scales
collect noise.

## 2. The 2×2

The engine tags every reviewed response into one quadrant. The **backend**
computes the calibration index across responses; the engine only tags and
responds.

| | **Correct** | **Incorrect** |
|---|---|---|
| **High certainty (4–5)** | **True Mastery** — spiral, space out, stop spending time here | **False Mastery** ⚠️ *highest priority* — a confident misconception, invisible to a score report |
| **Low certainty (1–3)** | **Fragile / Lucky** — verify with a clone before crediting | **Known Gap** — honest ignorance; teach it |

Priority order for a practice set built from an error log:

1. False Mastery (high certainty, wrong)
2. Fragile / Lucky (low certainty, right) — this is where phantom mastery hides
3. Known Gap (low certainty, wrong)
4. True Mastery — sampled only for spacing

That ordering is the product's opinion. Most tools sort by "questions you got
wrong"; this one sorts by *how wrong the student's self-knowledge is*, which is
what actually costs points under time pressure.

## 3. Engine behaviour per quadrant

| Quadrant | Tone | Explanation strategy | Clone policy |
|---|---|---|---|
| False Mastery | Direct, unhedged, no praise buffer | **Wrong path first**, named explicitly, then the divergence step | Clone required; escalate to adversarial rung on recurrence |
| Fragile / Lucky | Curious, verifying | "You got it — let's find out whether it was the method or the odds" | One clone, neutral rung |
| Known Gap | Warm, low-stakes | Teach from the prerequisite up; do not assume the skill | Clone after a micro-lesson, not before |
| True Mastery | Brief acknowledgement, then move on | Skip unless the student asks | None |

The `calibration_state.flag` in the Student Model shifts the **default tone for
the whole session**. For the seed student (`high_overconfidence`):

* No praise for correct answers at certainty 5 — that reinforces the pattern.
* Every certainty-5 miss opens with the trap, by name.
* The tutor is permitted to ask "what did you check before you chose?" as a
  standing opener, because for this student the answer is usually "nothing".

## 4. What the engine must not do

Per [`01-engine-boundaries.md`](./01-engine-boundaries.md):

* No calibration *score*, index, or percentage. "You are 34% overconfident" is
  backend output, and only if the backend defines it.
* No trend claims. "You're getting better at judging yourself" requires a
  history the engine does not hold.
* No inference of certainty the student did not supply. If `certainty` is
  absent, the engine treats the response as unrated and says nothing about
  confidence.

## 5. Anti-gaming

Students learn to rate everything a 3 once they discover ratings drive
difficulty. Mitigations, all backend-owned:

* Certainty is captured **before** submission, on the same screen as the answer.
* The roadmap never *penalises* honest low certainty — low-certainty-correct
  produces one verification clone, not a punishment block.
* The backend watches for rating collapse (variance approaching zero) and can
  set `engine_directives` to suppress certainty-dependent copy rather than
  reason from degenerate data.

The engine is told about collapse via `calibration_state.flag =
"ratings_degenerate"`, in which case it drops all confidence framing and
generates as if certainty were unavailable.
