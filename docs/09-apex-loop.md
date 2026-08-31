# 09 — The Apex Loop

> Goal → Diagnose → Plan → Train → Retest → Adapt → Reach Goal

The loop is **owned by the backend**. The engine participates at two stages
(Diagnose and Train) and supplies evidence at a third (Adapt). It never advances
the loop itself.

## 1. Stage ownership

| Stage | Owner | Engine's part |
|---|---|---|
| **Goal** | Product / backend | None. Target assessment, test date, and aspirational goal are collected in onboarding. |
| **Diagnose** | Backend orchestrates | Generates the diagnostic set; tags each response into a calibration quadrant; names the traps that fired |
| **Plan** | **Backend only** | None. Roadmap construction is deterministic policy over the Student Model |
| **Train** | Backend orchestrates | Generates practice sets and clones; writes explanations; runs the Socratic tutor; coaches Desmos |
| **Retest** | Backend | None during the sim (engine unreachable). Post-submission it explains and clones |
| **Adapt** | **Backend only** | Emits `engine_signals` as advisory evidence; the backend mutates the roadmap |

## 2. Roadmap phases

`[DRAFTED]` — a 12-week shape consistent with the seed profile's
`"Phase 2: Repair (Week 3 of 12)"`.

| Phase | Typical weeks | Purpose |
|---|---|---|
| `diagnose` | 1 | Establish a baseline and a trap profile |
| `repair` | 2–5 | Fix the top cognitive traps; stop bleeding points on known behaviours |
| `build` | 6–8 | Acquire missing skills, widen domain coverage |
| `sharpen` | 9–10 | Speed, triage, pacing under load, Desmos restraint |
| `simulate` | 11–12 | Full-length sims, taper, test-day conditions |

Phases are not strictly sequential. The backend may re-enter `repair` from any
later phase when a trap resurfaces; the engine must handle any phase value at
any week without assuming monotonic progress.

## 3. Phase → generation posture

This is the table the engine actually consumes. `current_roadmap_phase.phase`
selects a row.

| Phase | Difficulty spread | Scaffolding | Clone density | Explanation length | Desmos emphasis | Tone |
|---|---|---|---|---|---|---|
| `diagnose` | Full range, blueprint-proportional | **None** — no hints, no cues in-item | 0 | Deferred to review | Neutral labels only | Neutral, non-leading |
| `repair` | Narrow, centred on the trap's home difficulty | High — restated stems, bolded target quantity on the scaffolded rung | **High** — up to `clone_budget`, laddered | Long, trap-first | Tier matched to the trap (Tier 2 for the seed student) | Direct, behavioural |
| `build` | Moderate spread, skill-adjacent | Medium — worked example before the set | Low — one per new miss | Medium, concept-first | Tier acquisition (3–4) | Instructional |
| `sharpen` | Wide, weighted hard | Low | Low | Short, key-move only | **Tier 5 restraint** | Brisk, timed framing |
| `simulate` | Blueprint-exact | None | 0 during sims | Post-sim only, full | Verification only | Test-day neutral |

Session sizing comes from `training_availability`. At 45 min/day the engine
targets a set that leaves room for review: roughly **8–12 questions plus
explanations**, not a set that consumes the whole window and leaves the review
unread. Review is where the loop actually closes.

## 4. The seed student's current row

```
phase: repair, week 3 of 12
target: PSAT 8/9
traps:  MATH_PREMATURE_STOP, RW_COMMA_SPLICE
flag:   high_overconfidence
budget: 45 min/day
```

Resolved posture:

* **Set shape:** ~10 questions, weighted toward the two active traps, with the
  rest sampled from blueprint-proportional coverage so the session doesn't feel
  like remediation-only.
* **Clones:** laddered on `MATH_PREMATURE_STOP` (scaffolded → neutral →
  adversarial), up to `clone_budget: 4`.
* **Every Math item** carries a `desmos` block; systems items use `T2.SYSTEM`
  with the read-the-right-coordinate cue attached.
* **Explanations** open with the wrong path, named, because certainty-5 misses
  do not respond to correct-path-first.
* **Tone:** no praise on correct-at-5. Acknowledge in a clause; move on.

## 5. Adapt — evidence, not decisions

The engine emits signals; the backend owns what happens next.

| Signal | Meaning | Backend policy (illustrative, backend-owned) |
|---|---|---|
| `trap_recurrence` | Same trap fired ≥3 times in the window | Extend `repair`; escalate the clone ladder |
| `trap_cleared` | Adversarial rung passed with certainty ≥4 | Retire from `top_cognitive_traps`; spiral it |
| `prerequisite_gap` | Failures cluster at a prerequisite skill | Insert a `build` block inside `repair` |
| `state_disagreement` | Observed work contradicts `skill_state` | Trigger a verification set |
| `scale_mismatch` | Cross-scale score arithmetic requested | Fix the caller; never surface to the student |
| `incomplete_student_model` | Required field missing | Log; engine already fell back to safest settings |

The engine never writes "extend Phase 2 by a week." It writes what it saw. The
distinction is the whole architecture: a deterministic roadmap a student can
trust, fed by a generative engine that is very good at the one thing generative
models are actually reliable for — writing and diagnosing content.
