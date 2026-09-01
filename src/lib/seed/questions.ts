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
  // ---------------------------------------------------------------- q_009
  {
    id: "q_009",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "reading_writing",
    domain: "rw.craft_and_structure",
    skill: "rw.craft_and_structure.words_in_context",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "For decades the standard account of the Bronze Age collapse held that a single invading force toppled the eastern Mediterranean's palace economies. Recent excavations have ______ that account rather than overturning it: the destruction layers at different sites are separated by as much as a century, which rules out one campaign but leaves open the possibility of several waves of attackers.",
    stimulus_word_count: 62,
    prompt:
      "Which choice completes the text with the most logical and precise word or phrase?",
    options: [
      {
        id: "A",
        text: "complicated",
        is_correct: true,
        rationale:
          "The new evidence makes the single-invasion story harder to hold without replacing it — exactly what 'rather than overturning it' sets up.",
      },
      {
        id: "B",
        text: "corroborated",
        is_correct: false,
        trap_id: "RW_SENSE_REVERSAL",
        rationale:
          "Reverses the direction. The century-wide spread works against the single-campaign account, not for it.",
      },
      {
        id: "C",
        text: "summarized",
        is_correct: false,
        trap_id: "RW_COMMON_MEANING",
        rationale:
          "'Summarize an account' is the phrase that comes to mind first because accounts are things one summarizes. Excavations do not summarize anything.",
      },
      {
        id: "D",
        text: "demolished",
        is_correct: false,
        trap_id: "RW_EXTREME_LANGUAGE",
        rationale:
          "Stronger than the sentence licenses — 'rather than overturning it' rules this out explicitly, and the clause is easy to skim past.",
      },
    ],
    explanation: {
      trap_first:
        "'Demolished' feels right if you read the first half of the sentence and stop. New evidence contradicting an old theory usually does demolish it, so the word arrives before the rest of the sentence does.",
      divergence_step:
        "The sentence has already told you the answer's direction and strength: 'rather than overturning it'. Any word meaning destroy is excluded by that clause, and any word meaning support is excluded by the evidence that follows.",
      correct_path:
        "The evidence weakens the account without replacing it — it 'complicated' the account.",
      key_move: "Predict the word from the sentence before looking at the options.",
      remediation_cue: "Predict a replacement word before reading the options.",
    },
    desmos: null,
    targets_trap: "RW_EXTREME_LANGUAGE",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 60, reading_level_grade: 9 },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G06_RW_STIMULUS_BOUNDS"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_010
  {
    id: "q_010",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "reading_writing",
    domain: "rw.information_and_ideas",
    skill: "rw.information_and_ideas.central_ideas_and_details",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "Archaeologists studying the Nazca lines long assumed the enormous desert figures were meant to be seen from above. Because no natural vantage point nearby is high enough to take in a whole figure, some researchers now argue that the lines were meant to be walked instead: many of them form a single unbroken path that returns to where it began, a shape better suited to procession than to viewing.",
    stimulus_word_count: 71,
    prompt: "Which choice best states the main idea of the text?",
    options: [
      {
        id: "A",
        text: "No natural vantage point near the Nazca lines is high enough to see an entire figure.",
        is_correct: false,
        trap_id: "RW_SCOPE_ERROR",
        rationale:
          "A true detail, and the one the text spends a clause on. It is the evidence for the main idea, not the main idea.",
      },
      {
        id: "B",
        text: "Archaeologists have abandoned every earlier theory about why the Nazca lines were made.",
        is_correct: false,
        trap_id: "RW_EXTREME_LANGUAGE",
        rationale:
          "'Some researchers now argue' is a long way from 'every earlier theory abandoned'.",
      },
      {
        id: "C",
        text: "The Nazca lines may be better understood as paths to be walked than as images to be viewed from above.",
        is_correct: true,
        rationale:
          "Captures the shift the whole text is built around, and keeps the text's hedging ('some researchers now argue').",
      },
      {
        id: "D",
        text: "The Nazca lines were created by large processions of people walking in unbroken paths.",
        is_correct: false,
        trap_id: "RW_HALF_RIGHT",
        rationale:
          "The first half matches — walking, processions — and the second half asserts how the lines were made, which the text never claims.",
      },
    ],
    explanation: {
      trap_first:
        "Option A is the sentence you remember most clearly, because it is the concrete fact in a passage otherwise made of argument. Remembering a detail best is not the same as it being the point.",
      divergence_step:
        "Ask what the text is for. Every sentence here exists to set up one shift: from figures-to-be-seen to paths-to-be-walked. A is a step in that argument, not its conclusion.",
      correct_path:
        "The passage moves from an old assumption to a new proposal and hedges it — 'some researchers now argue'. Choice C states that shift with the hedging intact.",
      key_move: "Find the sentence the rest of the passage is serving.",
      remediation_cue: "Ask whether the option covers the whole text or one line.",
    },
    desmos: null,
    targets_trap: "RW_SCOPE_ERROR",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 70, reading_level_grade: 9 },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G06_RW_STIMULUS_BOUNDS"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_011
  {
    id: "q_011",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "reading_writing",
    domain: "rw.information_and_ideas",
    skill: "rw.information_and_ideas.inferences",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "Honeybees recruited to a food source by a waggle dance often arrive long after the dancer's information could still be accurate, since nectar flow at a patch can stop within an hour. Researchers tracking marked bees found that these late arrivals rarely fed at the advertised patch itself and instead searched the area around it. The finding suggests that the dance works less as a precise set of directions than as ______",
    stimulus_word_count: 74,
    prompt: "Which choice most logically completes the text?",
    options: [
      {
        id: "A",
        text: "a warning that a food source has already been exhausted.",
        is_correct: false,
        trap_id: "RW_SENSE_REVERSAL",
        rationale:
          "Inverts the dance's purpose. Bees still go and still search — a warning would send them elsewhere entirely.",
      },
      {
        id: "B",
        text: "a rough indication of where searching is likely to be worthwhile.",
        is_correct: true,
        rationale:
          "Follows from both observations: the bees go to the right area and forage around it rather than at the exact spot.",
      },
      {
        id: "C",
        text: "a signal that the hive should send out more foragers than usual.",
        is_correct: false,
        trap_id: "RW_OUTSIDE_KNOWLEDGE",
        rationale:
          "A reasonable-sounding claim about hive behaviour that the text gives no evidence for — nothing here counts foragers.",
      },
      {
        id: "D",
        text: "the only method by which honeybees are able to locate flowers.",
        is_correct: false,
        trap_id: "RW_EXTREME_LANGUAGE",
        rationale:
          "'The only method' is an absolute the passage never approaches; the bees in it are searching on their own.",
      },
    ],
    explanation: {
      trap_first:
        "The sentence sets up a contrast — 'less as a precise set of directions than as ___' — and it is tempting to fill it with something dramatic. But the blank has to be filled by what the bees actually did.",
      divergence_step:
        "Two observations constrain the answer: the bees still went to the area, and they searched around rather than at the patch. Anything that stops them going, or that claims more than the text measured, is out.",
      correct_path:
        "Went to the right neighbourhood, searched from there — that is a rough indication of where to look, which is choice B.",
      key_move: "Let the two stated observations do the eliminating.",
      remediation_cue: "Underline the words in the text that force the answer.",
    },
    desmos: null,
    targets_trap: "RW_OUTSIDE_KNOWLEDGE",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 70, reading_level_grade: 9 },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G06_RW_STIMULUS_BOUNDS"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_012
  {
    id: "q_012",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "reading_writing",
    domain: "rw.information_and_ideas",
    skill: "rw.information_and_ideas.command_of_evidence_quantitative",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "A student investigated how storage temperature affects how long fresh basil stays usable. She stored identical bunches at four temperatures and recorded the number of days before visible wilting. She concluded that basil keeps longest at a moderate temperature near 10 °C, rather than at colder or warmer temperatures.",
    stimulus_word_count: 51,
    stimulus_data: {
      kind: "table",
      title: "Days until visible wilting, by storage temperature",
      columns: ["Storage temperature (°C)", "Days until wilting"],
      rows: [
        [2, 6],
        [10, 12],
        [18, 7],
        [26, 3],
      ],
    },
    prompt:
      "Which choice most effectively uses data from the table to support the student's conclusion?",
    options: [
      {
        id: "A",
        text: "Basil stored at 10 °C lasted 12 days, longer than at 2 °C (6 days), 18 °C (7 days), or 26 °C (3 days).",
        is_correct: true,
        rationale:
          "The claim is that 10 °C beats both colder and warmer storage, so the support has to reach both directions. This is the only option that does.",
      },
      {
        id: "B",
        text: "Basil stored at 26 °C lasted only 3 days, the shortest duration of any temperature tested.",
        is_correct: false,
        trap_id: "RW_EVIDENCE_TOPIC_MATCH",
        rationale:
          "True, and about the right experiment, but it only shows that hot storage is bad. It says nothing about 10 °C being the best.",
      },
      {
        id: "C",
        text: "Basil stored at 2 °C lasted 6 days, fewer than basil stored at 18 °C, which lasted 7 days.",
        is_correct: false,
        trap_id: "RW_EVIDENCE_TOPIC_MATCH",
        rationale:
          "A correct reading of two rows that compares the wrong pair — neither is the moderate temperature the conclusion is about.",
      },
      {
        id: "D",
        text: "Basil stored at 10 °C lasted twice as long as basil stored at 2 °C.",
        is_correct: false,
        trap_id: "RW_HALF_RIGHT",
        rationale:
          "Handles the colder half of the claim and drops the warmer half, so the conclusion is only half supported.",
      },
    ],
    explanation: {
      trap_first:
        "Option B is the most striking number in the table, and picking the most striking number is what most students do on these. It is true. It supports a different claim.",
      divergence_step:
        "Write the claim out: 10 °C beats colder *and* warmer. Support has to cover both sides of that. B covers warm only, C covers neither, D covers cold only.",
      correct_path:
        "Choice A compares 10 °C against every other temperature tested, in both directions.",
      key_move:
        "State the claim in one sentence, then ask which rows of the table would have to be cited.",
      remediation_cue:
        "State the claim in one sentence, then ask what would have to be true.",
    },
    desmos: null,
    targets_trap: "RW_EVIDENCE_TOPIC_MATCH",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 80, reading_level_grade: 9 },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G06_RW_STIMULUS_BOUNDS"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_013
  {
    id: "q_013",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "reading_writing",
    domain: "rw.standard_english_conventions",
    skill: "rw.standard_english_conventions.form_structure_and_sense",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "The collection of letters that the museum acquired last spring ______ a side of the composer that his published writings carefully conceal: impatient, superstitious, and perpetually short of money.",
    stimulus_word_count: 29,
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      {
        id: "A",
        text: "reveal",
        is_correct: false,
        trap_id: "RW_SUBJECT_VERB_DISTANCE",
        rationale:
          "Agrees with 'letters', the nearest noun, rather than with 'collection', the actual subject.",
      },
      {
        id: "B",
        text: "reveals",
        is_correct: true,
        rationale:
          "The subject is 'The collection', which is singular. Everything between it and the verb is a modifier.",
      },
      {
        id: "C",
        text: "have revealed",
        is_correct: false,
        trap_id: "RW_SUBJECT_VERB_DISTANCE",
        rationale: "Plural again, and the tense shift does not rescue the agreement.",
      },
      {
        id: "D",
        text: "are revealing",
        is_correct: false,
        trap_id: "RW_SUBJECT_VERB_DISTANCE",
        rationale: "Plural once more, this time disguised as a progressive.",
      },
    ],
    explanation: {
      trap_first:
        "By the time you reach the blank you have just read 'letters', and a plural verb sounds correct because a plural noun is still in your ear. Three of the four options are built on that.",
      divergence_step:
        "'of letters that the museum acquired last spring' is a modifier. Strike it out and the sentence reads 'The collection ______ a side of the composer' — the subject was singular the whole time.",
      correct_path: "The collection reveals.",
      key_move: "Delete every modifier between the subject and the verb, then read them adjacent.",
      remediation_cue:
        "Strike out every prepositional phrase, then read subject and verb adjacent.",
    },
    desmos: null,
    targets_trap: "RW_SUBJECT_VERB_DISTANCE",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 45, reading_level_grade: 9 },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G06_RW_STIMULUS_BOUNDS"],
      bank_status: "practice_pool",
    },
  },

  // ---------------------------------------------------------------- q_014
  {
    id: "q_014",
    schema_version: V,
    assessment: "PSAT_8_9",
    section: "math",
    domain: "math.geometry_trig",
    skill: "math.geometry_trig.right_triangles_and_trig",
    difficulty: "medium",
    module_target: "practice_only",
    format: "multiple_choice",
    stimulus:
      "In right triangle ABC, the right angle is at C. Side AC has length 9 and side BC has length 12. Point M is the midpoint of side AB.",
    prompt: "What is the length of segment CM?",
    options: [
      {
        id: "A",
        text: "15",
        is_correct: false,
        trap_id: "MATH_PREMATURE_STOP",
        rationale:
          "The Pythagorean step gives AB = 15, which feels like the answer because it is the hard part. The question asks for CM.",
      },
      {
        id: "B",
        text: "7.5",
        is_correct: true,
        rationale:
          "Place C at the origin, A at (0, 9) and B at (12, 0). Then M is (6, 4.5) and CM = √(36 + 20.25) = √56.25 = 7.5 — half of AB, as the median to a right angle's hypotenuse always is.",
      },
      {
        id: "C",
        text: "10.5",
        is_correct: false,
        trap_id: "MATH_FORM_MISINTERPRETED",
        rationale:
          "Averages the two legs, (9 + 12)/2, applying the midpoint idea to the wrong segment.",
      },
      {
        id: "D",
        text: "6",
        is_correct: false,
        trap_id: "MATH_ARITHMETIC_SLIP",
        rationale: "Halves the longer leg (12) instead of the hypotenuse.",
      },
    ],
    explanation: {
      trap_first:
        "You compute AB = 15 and 15 is sitting right there in the options. It is the number the work produces, and it is not the segment you were asked about.",
      divergence_step:
        "AB is the hypotenuse; CM runs from the right angle to the middle of it. Finding AB is the setup, not the finish.",
      correct_path:
        "AB = √(9² + 12²) = 15. The median from the right angle to the hypotenuse is half the hypotenuse, so CM = 7.5. If you don't recall that fact, coordinates give it: C(0,0), A(0,9), B(12,0), M(6,4.5), CM = √56.25 = 7.5.",
      key_move: "Recognise CM as the median to the hypotenuse — it is always half of it.",
      remediation_cue: "Re-read the last clause of the question stem before selecting.",
    },
    desmos: {
      recommended: false,
      tier: 5,
      play: "T5.GEOMETRY_LIMIT",
      expressions: [],
      read_off: "",
      time_saved_estimate_seconds: 0,
      restraint_note:
        "There is no coordinate frame in the question, so Desmos only helps after you invent one — and once you have placed C, A and B on axes, the distance is faster by hand than by plotting. This is the item type where the calculator reliably loses.",
    },
    targets_trap: "MATH_PREMATURE_STOP",
    clone_of: null,
    clone_rung: null,
    metadata: { estimated_time_seconds: 80, calculator_recommended: false },
    provenance: {
      source: "apex_authored",
      generated_at: GENERATED_AT,
      engine_version: "seed",
      gate_passed: [...MC_GATES, "G09_DESMOS_BLOCK_PRESENT"],
      bank_status: "practice_pool",
    },
  },

];

export const SEED_QUESTIONS_BY_ID = new Map(SEED_QUESTIONS.map((q) => [q.id, q]));
