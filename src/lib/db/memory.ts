import { randomUUID } from "node:crypto";
import type { EngineSignal, Question, StudentModel } from "@contracts";
import { SEED_QUESTIONS_BY_ID } from "@/lib/seed/questions";
import { SEED_STUDENT } from "@/lib/seed/student";
import type { NewResponse, PracticeSet, Repository, StoredResponse } from "./types";

/**
 * In-memory adapter.
 *
 * Development only, and deliberately honest about it: state lives in module
 * scope, so it resets on reload and is not shared between server processes.
 * It exists so `npm run dev` gives a working practice flow with no database,
 * not as a fallback anyone should reach for in production.
 */

const responses: StoredResponse[] = [];
const sets = new Map<string, PracticeSet>();
const signals: Array<EngineSignal & { user_id: string; created_at: string }> = [];

export class MemoryRepository implements Repository {
  readonly name = "memory";

  async getStudent(userId: string): Promise<StudentModel | null> {
    if (userId !== SEED_STUDENT.student_profile.user.id) return null;
    // Fold anything answered this session into recent_errors so the engine
    // sees a live slice rather than only the fixture.
    const live = responses
      .filter((r) => r.user_id === userId && !r.is_correct)
      .slice(-20)
      .reverse()
      .map((r) => ({
        response_id: r.id,
        question_id: r.question_id,
        skill: SEED_QUESTIONS_BY_ID.get(r.question_id)?.skill ?? "",
        selected_option: r.selected_option,
        submitted_response: r.submitted_response,
        certainty: r.certainty,
        trap_id: r.trap_id ?? undefined,
        time_seconds: r.time_seconds ?? undefined,
      }));

    const base = SEED_STUDENT.student_profile;
    return {
      ...SEED_STUDENT,
      student_profile: {
        ...base,
        recent_errors: [...live, ...(base.recent_errors ?? [])].slice(0, 20),
      },
    } as StudentModel;
  }

  async getQuestion(id: string): Promise<Question | null> {
    return SEED_QUESTIONS_BY_ID.get(id) ?? null;
  }

  async createPracticeSet(userId: string, questionIds: string[]): Promise<PracticeSet> {
    const set: PracticeSet = {
      id: randomUUID(),
      user_id: userId,
      question_ids: questionIds,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    sets.set(set.id, set);
    return set;
  }

  async getPracticeSet(id: string): Promise<PracticeSet | null> {
    return sets.get(id) ?? null;
  }

  async recordResponse(input: NewResponse): Promise<StoredResponse> {
    const row: StoredResponse = {
      ...input,
      id: randomUUID(),
      answered_at: new Date().toISOString(),
    };
    responses.push(row);
    return row;
  }

  async listResponses(userId: string, limit = 50): Promise<StoredResponse[]> {
    return responses
      .filter((r) => r.user_id === userId)
      .slice(-limit)
      .reverse();
  }

  async recordSignals(userId: string, incoming: EngineSignal[]): Promise<void> {
    const now = new Date().toISOString();
    for (const s of incoming) signals.push({ ...s, user_id: userId, created_at: now });
  }
}

export function memorySignals() {
  return signals;
}
