import { randomUUID } from "node:crypto";
import type { Assessment, ModuleTarget, Section, TrapId } from "@contracts";

/**
 * In-memory sim state.
 *
 * db/schema.sql already defines sim_attempts, sim_modules and sim_module_items
 * as the destination for all of this; nothing here is written to Postgres yet.
 * That is a deliberate limit, not an oversight: an attempt does not survive a
 * server restart, so this is a working simulator, not a durable record.
 *
 * What is NOT in memory is the part that matters for integrity: timing is
 * server-held (startedAt lives here, never on the client) and answers are
 * graded here against the bank, so a client cannot lengthen its own clock or
 * see a key it hasn't earned.
 */
export interface SimResponse {
  questionId: string;
  selectedOption: string | null;
  submittedResponse: string | null;
  isCorrect: boolean;
  trapId: TrapId | null;
}

export interface SimModuleState {
  id: string;
  attemptId: string;
  section: Section;
  ordinal: 1 | 2;
  target: ModuleTarget;
  questionIds: string[];
  durationSecs: number;
  startedAt: number | null;
  submittedAt: number | null;
  submittedLate: boolean;
  responses: SimResponse[];
}

export interface SimAttemptState {
  id: string;
  userId: string;
  assessment: Assessment;
  createdAt: number;
  modules: SimModuleState[];
  /** Index into the section order; a break sits between the two sections. */
  breakTakenAt: number | null;
}

const attempts = new Map<string, SimAttemptState>();

export function createAttempt(userId: string, assessment: Assessment): SimAttemptState {
  const attempt: SimAttemptState = {
    id: randomUUID(),
    userId,
    assessment,
    createdAt: Date.now(),
    modules: [],
    breakTakenAt: null,
  };
  attempts.set(attempt.id, attempt);
  return attempt;
}

export function getAttempt(id: string): SimAttemptState | null {
  return attempts.get(id) ?? null;
}

export function addModule(
  attempt: SimAttemptState,
  module: Omit<SimModuleState, "id" | "attemptId" | "startedAt" | "submittedAt" | "submittedLate" | "responses">
): SimModuleState {
  const created: SimModuleState = {
    ...module,
    id: randomUUID(),
    attemptId: attempt.id,
    startedAt: null,
    submittedAt: null,
    submittedLate: false,
    responses: [],
  };
  attempt.modules.push(created);
  return created;
}

export function beginModule(module: SimModuleState): SimModuleState {
  // Idempotent: re-requesting a started module must not restart its clock.
  if (module.startedAt === null) module.startedAt = Date.now();
  return module;
}

export function deadlineOf(module: SimModuleState): number | null {
  return module.startedAt === null ? null : module.startedAt + module.durationSecs * 1000;
}

export function currentModule(attempt: SimAttemptState): SimModuleState | null {
  return attempt.modules.find((m) => m.submittedAt === null) ?? null;
}

/** Test-only: clears state between runs. */
export function _resetSimStore(): void {
  attempts.clear();
}
