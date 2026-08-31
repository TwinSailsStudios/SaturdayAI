import type { StudentModel } from "@contracts";

/**
 * The seed student from docs/00-master-architecture.md §2, in normalised form.
 *
 * Two things differ from the document's illustrative JSON, both deliberate:
 *
 *  - `training_availability` and `current_roadmap_phase` are structured rather
 *    than strings, so nothing downstream parses "Phase 2: Repair (Week 3 of 12)".
 *  - There is no `gap`. The document's 170 was an SAT-scale target minus a
 *    PSAT-scale estimate; see docs/OPEN-QUESTIONS.md §A2. Both scores keep an
 *    explicit `scale`, and the UI routes any comparison through
 *    lib/scoring/scale.ts, which refuses to subtract across scales.
 */
export const SEED_STUDENT: StudentModel = {
  schema_version: "1.0.0",
  student_profile: {
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      display_name: "Pratik Dash",
    },
    academic_context: { school: "Athens High School", grade: 9 },
    active_target: {
      assessment: "PSAT_8_9",
      scale: { composite: [240, 1440], section: [120, 720] },
      test_date: "2026-10-14",
    },
    aspirational_goal: {
      type: "dream_school",
      institution: "University of Michigan",
      target_score: { value: 1450, scale: "SAT" },
      current_estimate: { value: 1280, scale: "SAT", source: "backend_projection" },
    },
    training_availability: { minutes_per_day: 45, days_per_week: 5 },
    current_roadmap_phase: {
      phase: "repair",
      phase_label: "Phase 2: Repair",
      week: 3,
      total_weeks: 12,
    },
    calibration_state: {
      flag: "high_overconfidence",
      detail: "Consistently missing Level-5 certainty Math questions",
      computed_by: "backend",
    },
    top_cognitive_traps: ["MATH_PREMATURE_STOP", "RW_COMMA_SPLICE"],
    recent_errors: [
      {
        response_id: "resp_8830",
        question_id: "q_001",
        skill: "math.algebra.systems_two_linear",
        selected_option: "A",
        correct_option: "B",
        certainty: 5,
        trap_id: "MATH_PREMATURE_STOP",
        time_seconds: 71,
      },
      {
        response_id: "resp_8817",
        question_id: "q_007",
        skill: "math.algebra.linear_functions",
        submitted_response: "7",
        certainty: 5,
        trap_id: "MATH_PREMATURE_STOP",
        time_seconds: 63,
      },
      {
        response_id: "resp_8812",
        question_id: "q_004",
        skill: "rw.standard_english_conventions.boundaries",
        selected_option: "A",
        correct_option: "B",
        certainty: 4,
        trap_id: "RW_COMMA_SPLICE",
        time_seconds: 48,
      },
    ],
    skill_state: {
      "math.algebra.systems_two_linear": { state: "fragile", evidence_count: 9 },
      "math.algebra.linear_functions": { state: "developing", evidence_count: 6 },
      "rw.standard_english_conventions.boundaries": { state: "developing", evidence_count: 14 },
      "math.psda.percentages": { state: "untested", evidence_count: 0 },
      "rw.expression_of_ideas.transitions": { state: "solid", evidence_count: 11 },
    },
    engine_directives: { clone_budget: 4, allow_reveal: false },
  },
};
