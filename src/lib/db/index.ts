import { MemoryRepository } from "./memory";
import { PgRepository } from "./pg";
import type { Repository } from "./types";

export type { Repository } from "./types";
export type { NewResponse, PracticeSet, StoredResponse } from "./types";

let repository: Repository | null = null;

/**
 * Adapter selection. Defaults to the in-memory store so the app runs with no
 * database; set APEX_REPOSITORY=pg (with DATABASE_URL) for Postgres.
 */
export function db(): Repository {
  if (!repository) {
    repository = process.env.APEX_REPOSITORY === "pg" ? new PgRepository() : new MemoryRepository();
  }
  return repository;
}
