import type { PresentedQuestion } from "@/lib/practice/present";
import type { CalibrationQuadrant } from "@contracts";

export type { PresentedQuestion };

export interface StudentSummary {
  display_name: string | null;
  assessment: string;
  calibration_flag: string | null;
  phase: string;
  allow_reveal: boolean;
}

export interface SetResponse {
  set_id: string;
  engine: string;
  student: StudentSummary;
  posture: { phase: string; label: string; tone: string; cloneDensity: string };
  questions: PresentedQuestion[];
  rejected: Array<{ id: string; failures: Array<{ check: string; detail: string }> }>;
  signals: Array<{ type: string; note?: string; trap_id?: string }>;
}

export interface Review {
  response_id: string;
  is_correct: boolean;
  correct_option: string | null;
  acceptable_answers: string[] | null;
  certainty: 1 | 2 | 3 | 4 | 5 | null;
  quadrant: CalibrationQuadrant | null;
  quadrant_copy: { title: string; note: string; tone: string } | null;
  trap: { id: string; label: string; tell: string } | null;
  recent_same_trap: number;
  trap_attribution: "item_level" | "option_level";
  explanation: {
    trap_first: string;
    divergence_step: string;
    correct_path: string;
    key_move?: string;
    remediation_cue: string;
  };
  desmos: {
    recommended: boolean;
    tier?: number;
    play?: string;
    expressions?: string[];
    read_off?: string;
    restraint_note?: string | null;
  } | null;
  option_rationales: Array<{
    id: string;
    is_correct: boolean;
    trap_id: string | null;
    rationale: string | null;
  }>;
  clone_offer: { trap_id: string; source_question_id: string } | null;
}
