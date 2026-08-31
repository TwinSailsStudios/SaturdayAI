import type { Question } from "@contracts";

/**
 * Authored seed bank.
 *
 * These are hand-written rather than generated, on purpose: they are the
 * reference implementation of what the engine is supposed to produce, and the
 * fixtures the validation gate is tested against. Every distractor is a
 * designed reasoning path with a trap ID — there is no filler option anywhere
 * in this file.
 *
 * Coverage is deliberately narrow: it targets the seed student's two active
 * traps (MATH_PREMATURE_STOP, RW_COMMA_SPLICE) so the Phase 2 "repair" posture
 * has something real to work with.
 */

const V = "1.0.0";
const GENERATED_AT = "2026-08-31T00:00:00.000Z";

const MC_GATES = [
  "G01_SINGLE_DEFENSIBLE_ANSWER",
  "G02_ALL_DISTRACTORS_TRAP_MAPPED",
  "G03_NO_OUTSIDE_KNOWLEDGE",
  "G04_OPTIONS_PARALLEL",
  "G05_NO_OVERLAP_AMBIGUITY",
  "G08_DIFFICULTY_MATCHES_ASSESSMENT",
  "G10_NO_PII",
  "G12_ANSWER_POSITION_BALANCED",
  "G13_CONTENT_SAFETY",
  "G14_EXPLANATION_ORDER",
  "G15_SLIP_CAP",
] as const;

export const SEED_QUESTIONS: Question[] = [
  // ---------------------------------------------------------------- q_001
  {
    id: "q_001",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "math",
    domain: "math.algebra",
    skill: "math.algebra.systems_two_linear",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "A caterer charges a one-time setup fee plus a fixed amount per guest. An event with 20 guests costs $560 in total. An event with 35 guests costs $845 in total.",
    prompt: "What is the caterer's one-time setup fee, in dollars?",
    options: [
      {
        id: "A",
        text: "$19",
        is_correct: false,
        trap_id: "MATH_PREMATURE_STOP",
        rationale:
          "Subtracting the equations gives 15p = 285, so p = 19 — the per-guest amount. This is the first value the algebra produces, and the question asks for the other one.",
      },
      {
        id: "B",
        text: "$180",
        is_correct: true,
        rationale:
          "With p = 19, substituting into f + 20(19) = 560 gives f = 560 − 380 = 180. Check: 180 + 35(19) = 180 + 665 = 845.",
      },
      {
        id: "C",
        text: "$145",
        is_correct: false,
        trap_id: "MATH_ARITHMETIC_SLIP",
        rationale:
          "Dividing 285 by 15 as 20 instead of 19, then substituting into the second equation: 845 − 35(20) = 145.",
      },
      {
        id: "D",
        text: "$380",
        is_correct: false,
        trap_id: "MATH_FORM_MISINTERPRETED",
        rationale:
          "Reads 20p = 380 as the fixed portion of the bill, treating the guest-dependent charge as the 'setup' fee.",
      },
    ],
    explanation: {
      trap_first:
        "The move that feels finished isn't. You subtract the two equations, get 15p = 285, divide, and land on 19 — a clean number, right there in the options. But 19 is the per-guest charge. Nobody asked for it.",
      divergence_step:
        "The break happens the moment p = 19 appears. That is the intermediate value, not the answer: solving the system gives you a pair, and the question names which half of the pair it wants.",
      correct_path:
        "f + 20p = 560 and f + 35p = 845. Subtract: 15p = 285, so p = 19. Substitute back: f = 560 − 20(19) = 180.",
      key_move: "Subtract the equations to eliminate f, then substitute back to recover it.",
      remediation_cue: "Re-read the last clause of the question stem before selecting.",
    },
    desmos: {
      recommended: true,
      tier: 2,
      play: "T2.SYSTEM",
      expressions: ["x+20y=560", "x+35y=845"],
      read_off:
        "Click the intersection. It reads (180, 19): x is the setup fee, y is the per-guest charge. The question asks for x — read the coordinate you were asked for, not the one you notice first.",
      time_saved_estimate_seconds: 40,
      restraint_note: null,
    },
    targets_trap: "MATH_PREMATURE_STOP",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 75, calculator_recommended: true },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G09_DESMOS_BLOCK_PRESENT"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_002
  {
    id: "q_002",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "math",
    domain: "math.algebra",
    skill: "math.algebra.linear_equations_one_var",
    difficulty: "easy",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus: null,
    prompt: "If 3(x − 4) = 18, what is the value of x + 5?",
    options: [
      {
        id: "A",
        text: "15",
        is_correct: true,
        rationale:
          "Divide by 3: x − 4 = 6, so x = 10. The question asks for x + 5, which is 15.",
      },
      {
        id: "B",
        text: "6",
        is_correct: false,
        trap_id: "MATH_PREMATURE_STOP",
        rationale: "Stops at x − 4 = 6, one step before isolating x and two before answering.",
      },
      {
        id: "C",
        text: "10",
        is_correct: false,
        trap_id: "MATH_PREMATURE_STOP",
        rationale: "Solves correctly for x and stops there, never applying the '+ 5'.",
      },
      {
        id: "D",
        text: "7",
        is_correct: false,
        trap_id: "MATH_SIGN_FLIP",
        rationale:
          "Distributes to 3x − 12 = 18 and then moves the −12 across as a subtraction: 3x = 6, x = 2, x + 5 = 7.",
      },
    ],
    explanation: {
      trap_first:
        "Two of the four options are places you can stop early, and both feel like arriving: 6 is where the division lands, 10 is where x lands. Neither is what was asked.",
      divergence_step:
        "The stem ends in '+ 5'. Everything before it is setup. If your last written line is 'x = 10', you have done the work and not answered the question.",
      correct_path: "3(x − 4) = 18 → x − 4 = 6 → x = 10 → x + 5 = 15.",
      key_move: "Divide before distributing — it keeps the arithmetic to one step.",
      remediation_cue: "Re-read the last clause of the question stem before selecting.",
    },
    desmos: {
      recommended: false,
      tier: 5,
      play: "T5.SKIP",
      expressions: [],
      read_off: "",
      time_saved_estimate_seconds: 0,
      restraint_note:
        "Two steps of mental algebra. Typing this into Desmos, reading the intersection, and then remembering to add 5 costs more time than solving it does — and the reading step is where the trap lives anyway.",
    },
    targets_trap: "MATH_PREMATURE_STOP",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 40, calculator_recommended: false },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G09_DESMOS_BLOCK_PRESENT"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_003
  // Adversarial-rung clone of q_001: same trap, new scenario, new numbers,
  // correct answer moved off B, and the trap value placed first and round.
  {
    id: "q_003",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "math",
    domain: "math.algebra",
    skill: "math.algebra.systems_two_linear",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "A gym charges a one-time registration fee plus a fixed monthly rate. A member who has paid for 6 months has paid $250 in total. A member who has paid for 11 months has paid $425 in total.",
    prompt: "What is the gym's one-time registration fee, in dollars?",
    options: [
      {
        id: "A",
        text: "$35",
        is_correct: false,
        trap_id: "MATH_PREMATURE_STOP",
        rationale:
          "5m = 175 gives m = 35, the monthly rate. Placed first and deliberately round: this is the adversarial rung, so the trap value is made as attractive as the item allows.",
      },
      {
        id: "B",
        text: "$210",
        is_correct: false,
        trap_id: "MATH_FORM_MISINTERPRETED",
        rationale: "Reports 6m = 210, the months-dependent portion, as the one-time fee.",
      },
      {
        id: "C",
        text: "$40",
        is_correct: true,
        rationale:
          "With m = 35, r = 250 − 6(35) = 250 − 210 = 40. Check: 40 + 11(35) = 40 + 385 = 425.",
      },
      {
        id: "D",
        text: "$15",
        is_correct: false,
        trap_id: "MATH_ARITHMETIC_SLIP",
        rationale: "Computes 11 × 35 as 410 rather than 385, giving 425 − 410 = 15.",
      },
    ],
    explanation: {
      trap_first:
        "35 is first on the list, it's a round number, and it's the first thing your algebra produces. Everything about this item is arranged to make you stop there. It's the monthly rate.",
      divergence_step:
        "Same divergence as before: the system hands you a pair, and 5m = 175 resolves only half of it. The stem says 'one-time registration fee'.",
      correct_path:
        "r + 6m = 250 and r + 11m = 425. Subtract: 5m = 175, so m = 35. Then r = 250 − 6(35) = 40.",
      key_move: "Eliminate r first, then substitute back — the same shape as the last one.",
      remediation_cue: "Re-read the last clause of the question stem before selecting.",
    },
    desmos: {
      recommended: true,
      tier: 2,
      play: "T2.SYSTEM",
      expressions: ["x+6y=250", "x+11y=425"],
      read_off:
        "The intersection is (40, 35). Both numbers are options. The one you want is x.",
      time_saved_estimate_seconds: 40,
      restraint_note: null,
    },
    targets_trap: "MATH_PREMATURE_STOP",
    clone_of: "q_001",
    clone_rung: "adversarial",
    metadata: { estimated_time_seconds: 75, calculator_recommended: true },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G09_DESMOS_BLOCK_PRESENT", "G11_CLONE_TRAP_FIRES"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_004
  {
    id: "q_004",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "reading_writing",
    domain: "rw.standard_english_conventions",
    skill: "rw.standard_english_conventions.boundaries",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "Mycorrhizal fungi form partnerships with the roots of most land plants. The fungi send out thread-like filaments that reach far beyond the roots ______ in exchange, the plant supplies the fungi with sugars it produces during photosynthesis.",
    stimulus_word_count: 45,
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      {
        id: "A",
        text: "roots,",
        is_correct: false,
        trap_id: "RW_COMMA_SPLICE",
        rationale:
          "Joins two independent clauses with only a comma. 'The fungi send out filaments' and 'the plant supplies sugars' each stand alone as a sentence.",
      },
      {
        id: "B",
        text: "roots;",
        is_correct: true,
        rationale:
          "A semicolon is the correct mark between two closely related independent clauses.",
      },
      {
        id: "C",
        text: "roots",
        is_correct: false,
        trap_id: "RW_FUSED_SENTENCE",
        rationale:
          "Runs the two independent clauses together with no punctuation at all. Reads smoothly aloud, which is why it gets picked.",
      },
      {
        id: "D",
        text: "roots, which",
        is_correct: false,
        trap_id: "RW_BOUNDARY_SUBORDINATION",
        rationale:
          "Subordinates the second clause with a relative pronoun that has no sensible antecedent, leaving the sentence without a main clause after 'which'.",
      },
    ],
    explanation: {
      trap_first:
        "A comma feels right here because the two halves are about one continuous exchange, and the sentence reads well aloud with a small pause. Reading well aloud is not the test.",
      divergence_step:
        "Cover each side of the blank. 'The fungi send out thread-like filaments that reach far beyond the roots' is a sentence. 'In exchange, the plant supplies the fungi with sugars' is a sentence. Two sentences joined by a comma is a splice.",
      correct_path:
        "Two independent clauses, closely related, no coordinating conjunction — that is a semicolon.",
      key_move: "Test each side of the punctuation for independence before choosing the mark.",
      remediation_cue:
        "Cover each side of the mark and ask whether it is a complete sentence.",
    },
    desmos: null,
    targets_trap: "RW_COMMA_SPLICE",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 55, reading_level_grade: 9 },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G06_RW_STIMULUS_BOUNDS"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_005
  // Clone of q_004: same trap, new stimulus, correct answer moved off B.
  {
    id: "q_005",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "reading_writing",
    domain: "rw.standard_english_conventions",
    skill: "rw.standard_english_conventions.boundaries",
    difficulty: "easy",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "Sea otters spend a surprising share of the day grooming. Unlike most marine mammals, they carry no insulating blubber ______ the dense coat they spend those hours maintaining is the only thing holding their body heat in cold water.",
    stimulus_word_count: 41,
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      {
        id: "A",
        text: "blubber,",
        is_correct: false,
        trap_id: "RW_COMMA_SPLICE",
        rationale:
          "Two independent clauses joined by a comma alone. The pause feels natural, which is the whole difficulty.",
      },
      {
        id: "B",
        text: "blubber",
        is_correct: false,
        trap_id: "RW_FUSED_SENTENCE",
        rationale: "No punctuation between two independent clauses.",
      },
      {
        id: "C",
        text: "blubber, which",
        is_correct: false,
        trap_id: "RW_BOUNDARY_SUBORDINATION",
        rationale:
          "Turns the second independent clause into a relative clause with no workable antecedent, leaving a fragment.",
      },
      {
        id: "D",
        text: "blubber;",
        is_correct: true,
        rationale: "A semicolon correctly joins two related independent clauses.",
      },
    ],
    explanation: {
      trap_first:
        "The second half explains the first, so a comma feels like the natural connector. It isn't — explanation is a logical relationship, not a punctuation rule.",
      divergence_step:
        "'They carry no insulating blubber' stands alone. 'The dense coat … is the only thing holding their body heat in cold water' stands alone. A comma cannot join them.",
      correct_path: "Semicolon between two independent clauses.",
      key_move: "Independence test on both sides, every time.",
      remediation_cue:
        "Cover each side of the mark and ask whether it is a complete sentence.",
    },
    desmos: null,
    targets_trap: "RW_COMMA_SPLICE",
    clone_of: "q_004",
    clone_rung: "neutral",
    metadata: { estimated_time_seconds: 50, reading_level_grade: 8 },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G06_RW_STIMULUS_BOUNDS", "G11_CLONE_TRAP_FIRES"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_006
  {
    id: "q_006",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "math",
    domain: "math.psda",
    skill: "math.psda.percentages",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "The price of a jacket was increased by 25%. Some weeks later, the increased price was decreased by 20%.",
    prompt: "The final price is what percent of the original price?",
    options: [
      {
        id: "A",
        text: "105%",
        is_correct: false,
        trap_id: "MATH_PERCENT_BASE_SWAP",
        rationale:
          "Adds the percentages (25 − 20 = 5) as though both applied to the original price. The 20% decrease applies to the increased price.",
      },
      {
        id: "B",
        text: "80%",
        is_correct: false,
        trap_id: "MATH_PREMATURE_STOP",
        rationale: "Applies only the decrease and stops, never using the increase.",
      },
      {
        id: "C",
        text: "125%",
        is_correct: false,
        trap_id: "MATH_PREMATURE_STOP",
        rationale: "Applies only the increase and stops.",
      },
      {
        id: "D",
        text: "100%",
        is_correct: true,
        rationale:
          "Take the original as 100. After the increase: 125. The decrease applies to 125, not to 100: 125 × 0.80 = 100. The final price equals the original.",
      },
    ],
    explanation: {
      trap_first:
        "Up 25, down 20, net up 5 — so 105%. It is the fastest reading of the problem and it is wrong, because the two percentages are not measured against the same thing.",
      divergence_step:
        "The 20% decrease is taken off the increased price of 125, not off the original 100. 20% of 125 is 25, not 20.",
      correct_path: "100 → 125 → 125 − 25 = 100. Or in one line: 1.25 × 0.80 = 1.00.",
      key_move: "Multiply the factors instead of adding the percentages.",
      remediation_cue: "Name the base out loud: 'percent of what?'",
    },
    desmos: {
      recommended: false,
      tier: 5,
      play: "T5.SKIP",
      expressions: [],
      read_off: "",
      time_saved_estimate_seconds: 0,
      restraint_note:
        "There is nothing to graph. The difficulty is deciding which base each percentage applies to, and Desmos will faithfully compute whichever wrong expression you hand it.",
    },
    targets_trap: "MATH_PERCENT_BASE_SWAP",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 60, calculator_recommended: false },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G09_DESMOS_BLOCK_PRESENT"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_007
  {
    id: "q_007",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "math",
    domain: "math.algebra",
    skill: "math.algebra.linear_functions",
    difficulty: "medium",
    module_target: "practice_only",
    format: "student_produced_response",
    stimulus: "The function f is defined by f(x) = 2x + 9.",
    prompt: "If f(k) = 23, what is the value of k − 4?",
    acceptable_answers: ["3"],
    spr_entry_check: {
      fits_character_limit: true,
      has_negative_value: false,
      is_repeating_decimal: false,
      multiple_correct_values_stated_in_prompt: false,
    },
    explanation: {
      trap_first:
        "With no options to check yourself against, the danger is worse than usual: you solve 2k + 9 = 23, get k = 7, and type it. Nothing on screen tells you that you answered a question nobody asked.",
      divergence_step:
        "k = 7 is the intermediate value. The stem asks for k − 4. On a grid-in there is no wrong option to catch you — only the blank you filled.",
      correct_path: "2k + 9 = 23 → 2k = 14 → k = 7 → k − 4 = 3.",
      key_move: "Write the requested expression on its own line before entering anything.",
      remediation_cue: "Re-read the last clause of the question stem before selecting.",
    },
    desmos: {
      recommended: true,
      tier: 2,
      play: "T2.SPLIT",
      expressions: ["y=2x+9", "y=23"],
      read_off:
        "The intersection is at x = 7. That is k, not the answer — subtract 4 before you type. The graph gets you to the intermediate value faster, which means it gets you to the trap faster too.",
      time_saved_estimate_seconds: 20,
      restraint_note: null,
    },
    targets_trap: "MATH_PREMATURE_STOP",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 65, calculator_recommended: true },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [
        "G01_SINGLE_DEFENSIBLE_ANSWER",
        "G03_NO_OUTSIDE_KNOWLEDGE",
        "G07_SPR_ENTRY_VALID",
        "G08_DIFFICULTY_MATCHES_ASSESSMENT",
        "G09_DESMOS_BLOCK_PRESENT",
        "G10_NO_PII",
        "G13_CONTENT_SAFETY",
        "G14_EXPLANATION_ORDER",
      ],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_008
  {
    id: "q_008",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "reading_writing",
    domain: "rw.expression_of_ideas",
    skill: "rw.expression_of_ideas.transitions",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "For years, researchers assumed that the faint vibrations picked up by seismometers near the Cascade Range were echoes of distant earthquakes. A 2019 analysis of the vibrations' frequency and duration, ______ traced most of them to meltwater moving through cracks in nearby glaciers.",
    stimulus_word_count: 45,
    prompt:
      "Which choice completes the text with the most logical transition?",
    options: [
      {
        id: "A",
        text: "therefore,",
        is_correct: false,
        trap_id: "RW_TRANSITION_DIRECTION",
        rationale:
          "Signals that the finding follows from the earlier assumption. It overturns it. Causal family, wrong direction.",
      },
      {
        id: "B",
        text: "for example,",
        is_correct: false,
        trap_id: "RW_TRANSITION_DIRECTION",
        rationale:
          "Signals an instance of the earlier claim. The analysis is not an example of the assumption; it contradicts it. Illustration family.",
      },
      {
        id: "C",
        text: "however,",
        is_correct: true,
        rationale:
          "The analysis contradicts the long-held assumption, so the relationship is contrast.",
      },
      {
        id: "D",
        text: "in addition,",
        is_correct: false,
        trap_id: "RW_TRANSITION_DIRECTION",
        rationale:
          "Signals that the finding adds to the earlier claim. It replaces it. Continuation family.",
      },
    ],
    explanation: {
      trap_first:
        "Every option here is idiomatic in isolation, and three of them will read fine if you only glance at the second sentence. Picking on fluency is picking at random.",
      divergence_step:
        "Summarise both sentences in four words each. Before: 'vibrations were distant earthquakes'. After: 'vibrations were glacial meltwater'. The second replaces the first — that is contrast, not cause, illustration, or addition.",
      correct_path:
        "One option comes from each logical family, so naming the relationship resolves the item in one step: contrast → 'however'.",
      key_move: "Name the relationship before looking at the options.",
      remediation_cue:
        "Summarise both sentences in four words each, then name the relation.",
    },
    desmos: null,
    targets_trap: "RW_TRANSITION_DIRECTION",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 55, reading_level_grade: 9 },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G06_RW_STIMULUS_BOUNDS"],
      bank_status: "practice_pool",
    },
  },
];

export const SEED_QUESTIONS_BY_ID = new Map(SEED_QUESTIONS.map((q) => [q.id, q]));
