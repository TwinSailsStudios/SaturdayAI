import type {
  CalibrationQuadrant,
  EngineSignal,
  Question,
  StudentModel,
  TrapId,
} from "@contracts";

export interface StoredResponse {
  id: string;
  user_id: string;
  question_id: string;
  set_id: string | null;
  selected_option: string | null;
  submitted_response: string | null;
  is_correct: boolean;
  certainty: 1 | 2 | 3 | 4 | 5 | null;
  quadrant: CalibrationQuadrant | null;
  trap_id: TrapId | null;
  time_seconds: number | null;
  answered_at: string;
}

export interface NewResponse {
  user_id: string;
  question_id: string;
  set_id: string | null;
  selected_option: string | null;
  submitted_response: string | null;
  is_correct: boolean;
  certainty: 1 | 2 | 3 | 4 | 5 | null;
  quadrant: CalibrationQuadrant | null;
  trap_id: TrapId | null;
  time_seconds: number | null;
}

export interface PracticeSet {
  id: string;
  user_id: string;
  question_ids: string[];
  created_at: string;
  completed_at: string | null;
}

/**
 * The backend's data access seam. Two adapters implement it: `pg` for
 * production and an in-memory store for development, so the app runs with no
 * database and the practice flow stays demonstrable.
 */
export interface Repository {
  readonly name: string;
  getStudent(userId: string): Promise<StudentModel | null>;
  getQuestion(id: string): Promise<Question | null>;
  createPracticeSet(userId: string, questionIds: string[]): Promise<PracticeSet>;
  getPracticeSet(id: string): Promise<PracticeSet | null>;
  recordResponse(input: NewResponse): Promise<StoredResponse>;
  listResponses(userId: string, limit?: number): Promise<StoredResponse[]>;
  recordSignals(userId: string, signals: EngineSignal[]): Promise<void>;
}
