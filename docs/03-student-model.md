# 03 — The Student Model

The Student Model is the backend's property. The engine receives a snapshot of
it on every call and **never writes to it** — it influences generation, tone,
and Desmos advice, and nothing else.

Schema: [`schemas/student-model.schema.json`](../schemas/student-model.schema.json).

## 1. Field-by-field behavioural contract

Every field must have a defined effect on engine output, or it should not be in
the payload. Fields the engine ignores are wasted tokens and a maintenance trap.

| Field | Effect on engine output |
|---|---|
| `user.display_name` | Direct address in tutor turns only. Never in question stimuli. |
| `academic_context.grade` | Caps stimulus complexity and cultural references. A 9th grader gets no assumed knowledge of pre-calculus, US tax code, or college admissions jargon. |
| `active_target` | Selects the difficulty calibration and the score scale. PSAT 8/9 items are *not* SAT items relabelled. |
| `aspirational_goal` | Motivational framing in tutor copy. **Never** score arithmetic (see boundaries §4). |
| `training_availability` | Sizes generated sets so one set fits one sitting. 45 min/day → sets of 8–12 questions with review, not 30. |
| `current_roadmap_phase` | Selects the **generation posture** (see [`09-apex-loop.md`](./09-apex-loop.md) §3): how much scaffolding, how many clones, how wide the difficulty spread. |
| `calibration_state` | Drives the certainty prompt copy and the review ordering. High overconfidence → the engine leads with the *wrong reasoning path* before the correct one. |
| `top_cognitive_traps` | The clone engine's targets. These IDs directly select distractor designs. |
| `recent_errors[]` | The raw material for the Socratic tutor and for clone generation. |
| `skill_state{}` | Read-only mastery evidence from the backend; narrows generation to skills that are actually next. |
| `engine_directives` | Backend-set overrides (e.g. "no clones this session"). Engine obeys without negotiating. |

## 2. Normalised shape

The §2 seed object is the human-readable form. The wire form the engine
consumes is normalised so that nothing requires string parsing — no engine
should be splitting `"Phase 2: Repair (Week 3 of 12)"` on a colon.

```json
{
  "schema_version": "1.0.0",
  "student_profile": {
    "user": { "id": "usr_01H...", "display_name": "Pratik Dash" },
    "academic_context": { "school": "Athens High School", "grade": 9 },
    "active_target": {
      "assessment": "PSAT_8_9",
      "scale": { "composite": [240, 1440], "section": [120, 720] },
      "test_date": "2026-10-14"
    },
    "aspirational_goal": {
      "type": "dream_school",
      "institution": "University of Michigan",
      "target_score": { "value": 1450, "scale": "SAT" },
      "current_estimate": { "value": 1280, "scale": "SAT", "source": "backend_projection" }
    },
    "training_availability": { "minutes_per_day": 45, "days_per_week": 5 },
    "current_roadmap_phase": {
      "phase": "repair",
      "phase_label": "Phase 2: Repair",
      "week": 3,
      "total_weeks": 12
    },
    "calibration_state": {
      "flag": "high_overconfidence",
      "detail": "Consistently missing Level-5 certainty Math questions",
      "computed_by": "backend"
    },
    "top_cognitive_traps": ["MATH_PREMATURE_STOP", "RW_COMMA_SPLICE"],
    "recent_errors": [
      {
        "response_id": "resp_8830",
        "question_id": "q_44219",
        "skill": "math.algebra.systems_two_linear",
        "selected_option": "B",
        "correct_option": "D",
        "certainty": 5,
        "trap_id": "MATH_PREMATURE_STOP",
        "time_seconds": 71
      }
    ],
    "skill_state": {
      "math.algebra.systems_two_linear": { "state": "fragile", "evidence_count": 9 },
      "rw.standard_english_conventions.boundaries": { "state": "developing", "evidence_count": 14 }
    },
    "engine_directives": { "clone_budget": 4, "allow_reveal": false }
  }
}
```

Note that `aspirational_goal` no longer carries a precomputed `gap`. The gap in
the seed object (170) was arithmetic across two scales; the normalised model
does not represent it at all, which is the point — the engine cannot narrate a
number that isn't there.

## 3. Snapshot discipline

* The snapshot is **immutable for the duration of a request**. The engine does
  not ask for updated state mid-generation.
* `recent_errors` is capped by the backend (suggested: 20 most recent, or all
  errors from the current session, whichever is smaller). The engine does not
  request more.
* The engine treats `skill_state` as **evidence, not instruction**. If the
  backend says a skill is `fragile` and the student's recent work looks solid,
  the engine generates for `fragile` and raises a `state_disagreement` signal.
* If a required field is missing, the engine generates at the **safest**
  setting — lowest assumed grade level, no clones, maximum scaffolding — and
  raises `{"type": "incomplete_student_model"}`. It never guesses a target
  assessment.

## 4. Privacy

The engine receives a display name and a school name because tutor copy reads
better with them. Those two fields must **never** appear in generated question
content, in a stimulus, in an explanation, or in anything written to the
question bank — bank items are shared across users. The validation gate rejects
any generated item containing a value from `student_profile.user` or
`academic_context`.
