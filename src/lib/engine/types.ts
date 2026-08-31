import type {
  EngineSignal,
  GenerationRequest,
  Question,
  QuestionBundle,
  StudentModel,
  TrapId,
  CloneRung,
} from "@contracts";

/**
 * The seam between the backend and the content engine.
 *
 * Two implementations are intended:
 *
 *  - `BankEngine` (built) — deterministic, serves authored items from the bank.
 *    No model call, no network, no cost. This is what runs in development and
 *    what the practice flow is demonstrated against.
 *  - An LLM engine (not built) — drives prompts/content-engine.system.md.
 *
 * Both must return output that survives `scrubEngineOutput` and `runGate`.
 * Nothing downstream is allowed to know which implementation answered, which is
 * the point: the boundary is enforced at the seam, not inside the model.
 */
export interface EngineClient {
  readonly name: string;
  generateSet(request: GenerationRequest): Promise<QuestionBundle>;
  clone(args: {
    source: Question;
    trap: TrapId;
    rung: CloneRung;
    student: StudentModel;
  }): Promise<QuestionBundle>;
}

export interface SetPlan {
  questionIds: string[];
  signals: EngineSignal[];
  rationale: string[];
}
