import type { PresentedQuestion } from "@/lib/practice/present";

export type { PresentedQuestion };

export interface PresentedModule {
  module_id: string;
  section: "reading_writing" | "math";
  ordinal: 1 | 2;
  duration_secs: number;
  deadline_iso: string | null;
  questions: PresentedQuestion[];
}

export interface ModuleSpec {
  section: string;
  questions: number;
  durationSecs: number;
}

export interface StartResponse {
  attempt_id: string;
  assessment: string;
  form: {
    shortened: true;
    reading_writing: ModuleSpec;
    math: ModuleSpec;
    full_reading_writing: ModuleSpec;
    full_math: ModuleSpec;
  };
  module: PresentedModule;
}

export interface SimReport {
  attempt_id: string;
  assessment: string;
  shortened: true;
  sections: Array<{
    section: string;
    module_1_correct: number;
    module_1_of: number;
    module_2_target: string;
    module_2_correct: number;
    module_2_of: number;
    total_correct: number;
    total_of: number;
  }>;
  traps_fired: Array<{ trap_id: string; count: number }>;
  late_submissions: number;
}

export type StepResponse =
  | { kind: "module"; module: PresentedModule }
  | { kind: "break"; seconds: number }
  | { kind: "report"; report: SimReport };
