import { Pool, type PoolClient } from "pg";
import type { EngineSignal, Question, StudentModel } from "@contracts";
import type { NewResponse, PracticeSet, Repository, StoredResponse } from "./types";

/**
 * PostgreSQL adapter against db/schema.sql.
 *
 * ⚠️ This adapter has NOT been exercised against a live server: the container
 * this was built in has the psql client but no Postgres server and no Docker,
 * so only the in-memory adapter has actually run end to end. The SQL is written
 * to the committed schema and typechecks, but treat the first real connection
 * as the first test. See README "Status".
 */
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set; APEX_REPOSITORY=pg requires it");
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export class PgRepository implements Repository {
  readonly name = "pg";

  async getStudent(userId: string): Promise<StudentModel | null> {
    const client = await getPool().connect();
    try {
      const { rows } = await client.query<ProfileRow>(
        `SELECT u.id, u.display_name, p.*
           FROM users u JOIN student_profiles p ON p.user_id = u.id
          WHERE u.id = $1`,
        [userId]
      );
      const row = rows[0];
      if (!row) return null;

      const traps = await client.query<{ trap_id: string }>(
        `SELECT trap_id FROM student_top_traps WHERE user_id = $1 ORDER BY rank`,
        [userId]
      );
      const skills = await client.query<{ skill: string; state: string; evidence_count: number }>(
        `SELECT skill, state, evidence_count FROM skill_state WHERE user_id = $1`,
        [userId]
      );
      const errors = await client.query<RecentErrorRow>(
        `SELECT r.id AS response_id, r.question_id, q.skill, r.selected_option,
                r.submitted_response, r.certainty, r.trap_id, r.time_seconds
           FROM responses r JOIN questions q ON q.id = r.question_id
          WHERE r.user_id = $1 AND r.is_correct = FALSE
          ORDER BY r.answered_at DESC
          LIMIT 20`,
        [userId]
      );

      return buildStudentModel(row, traps.rows, skills.rows, errors.rows);
    } finally {
      client.release();
    }
  }

  async getQuestion(id: string): Promise<Question | null> {
    const { rows } = await getPool().query<QuestionRow>(
      `SELECT q.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', o.option_id, 'text', o.body, 'is_correct', o.is_correct,
                    'trap_id', o.trap_id, 'rationale', o.rationale
                  ) ORDER BY o.option_id
                ) FILTER (WHERE o.option_id IS NOT NULL), '[]'
              ) AS options
         FROM questions q
         LEFT JOIN question_options o ON o.question_id = q.id
        WHERE q.id = $1
        GROUP BY q.id`,
      [id]
    );
    return rows[0] ? rowToQuestion(rows[0]) : null;
  }

  async createPracticeSet(userId: string, questionIds: string[]): Promise<PracticeSet> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ id: string; created_at: Date }>(
        `INSERT INTO practice_sets (user_id, phase)
         SELECT $1, phase FROM student_profiles WHERE user_id = $1
         RETURNING id, created_at`,
        [userId]
      );
      const set = rows[0];
      if (!set) throw new Error(`no student_profile for user ${userId}`);
      for (const [i, questionId] of questionIds.entries()) {
        await client.query(
          `INSERT INTO practice_set_items (set_id, position, question_id) VALUES ($1, $2, $3)`,
          [set.id, i + 1, questionId]
        );
      }
      await client.query("COMMIT");
      return {
        id: set.id,
        user_id: userId,
        question_ids: questionIds,
        created_at: set.created_at.toISOString(),
        completed_at: null,
      };
    } catch (err) {
      await safeRollback(client);
      throw err;
    } finally {
      client.release();
    }
  }

  async getPracticeSet(id: string): Promise<PracticeSet | null> {
    const { rows } = await getPool().query<{
      id: string;
      user_id: string;
      created_at: Date;
      completed_at: Date | null;
      question_ids: string[];
    }>(
      `SELECT s.id, s.user_id, s.created_at, s.completed_at,
              COALESCE(array_agg(i.question_id ORDER BY i.position)
                       FILTER (WHERE i.question_id IS NOT NULL), '{}') AS question_ids
         FROM practice_sets s
         LEFT JOIN practice_set_items i ON i.set_id = s.id
        WHERE s.id = $1
        GROUP BY s.id`,
      [id]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      question_ids: row.question_ids,
      created_at: row.created_at.toISOString(),
      completed_at: row.completed_at?.toISOString() ?? null,
    };
  }

  async recordResponse(input: NewResponse): Promise<StoredResponse> {
    const { rows } = await getPool().query<{ id: string; answered_at: Date }>(
      `INSERT INTO responses (
         user_id, question_id, set_id, selected_option, submitted_response,
         is_correct, certainty, quadrant, trap_id, time_seconds
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, answered_at`,
      [
        input.user_id,
        input.question_id,
        input.set_id,
        input.selected_option,
        input.submitted_response,
        input.is_correct,
        input.certainty,
        input.quadrant,
        input.trap_id,
        input.time_seconds,
      ]
    );
    const row = rows[0];
    if (!row) throw new Error("insert into responses returned no row");
    return { ...input, id: row.id, answered_at: row.answered_at.toISOString() };
  }

  async listResponses(userId: string, limit = 50): Promise<StoredResponse[]> {
    const { rows } = await getPool().query<StoredResponse & { answered_at: Date }>(
      `SELECT id, user_id, question_id, set_id, selected_option, submitted_response,
              is_correct, certainty, quadrant, trap_id, time_seconds, answered_at
         FROM responses WHERE user_id = $1 ORDER BY answered_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows.map((r) => ({ ...r, answered_at: r.answered_at.toISOString() }));
  }

  async recordSignals(userId: string, signals: EngineSignal[]): Promise<void> {
    if (!signals.length) return;
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      for (const s of signals) {
        const { type, ...payload } = s;
        await client.query(
          `INSERT INTO engine_signals (user_id, type, payload) VALUES ($1, $2, $3)`,
          [userId, type, JSON.stringify(payload)]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await safeRollback(client);
      throw err;
    } finally {
      client.release();
    }
  }
}

async function safeRollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // The connection is already unusable; the original error is the useful one.
  }
}

// --- row mapping ------------------------------------------------------------

interface ProfileRow {
  id: string;
  display_name: string;
  school: string | null;
  grade: number | null;
  active_assessment: string;
  test_date: Date | null;
  goal_kind: string | null;
  goal_institution: string | null;
  goal_target_value: number | null;
  goal_target_scale: string | null;
  goal_estimate_value: number | null;
  goal_estimate_scale: string | null;
  minutes_per_day: number | null;
  days_per_week: number | null;
  phase: string;
  phase_week: number | null;
  phase_total_weeks: number | null;
  calibration: string;
  calibration_detail: string | null;
  clone_budget: number;
  allow_reveal: boolean;
}

interface RecentErrorRow {
  response_id: string;
  question_id: string;
  skill: string;
  selected_option: string | null;
  submitted_response: string | null;
  certainty: number | null;
  trap_id: string | null;
  time_seconds: string | null;
}

interface QuestionRow {
  id: string;
  assessment: string;
  section: string;
  domain: string;
  skill: string;
  difficulty: string;
  module_target: string;
  format: string;
  stimulus: string | null;
  stimulus_word_count: number | null;
  stimulus_data: unknown;
  prompt: string;
  acceptable_answers: string[] | null;
  explanation: unknown;
  desmos: unknown;
  targets_trap: string | null;
  clone_of: string | null;
  clone_rung: string | null;
  metadata: unknown;
  source: string;
  engine_version: string | null;
  gate_passed: string[];
  status: string;
  generated_at: Date;
  options: unknown;
}

function buildStudentModel(
  row: ProfileRow,
  traps: Array<{ trap_id: string }>,
  skills: Array<{ skill: string; state: string; evidence_count: number }>,
  errors: RecentErrorRow[]
): StudentModel {
  return {
    schema_version: "1.0.0",
    student_profile: {
      user: { id: row.id, display_name: row.display_name },
      academic_context: {
        school: row.school ?? undefined,
        grade: row.grade ?? undefined,
      },
      active_target: {
        assessment: row.active_assessment,
        test_date: row.test_date?.toISOString().slice(0, 10),
      },
      aspirational_goal: row.goal_kind
        ? {
            type: row.goal_kind,
            institution: row.goal_institution ?? undefined,
            target_score:
              row.goal_target_value != null && row.goal_target_scale
                ? { value: row.goal_target_value, scale: row.goal_target_scale }
                : undefined,
            current_estimate:
              row.goal_estimate_value != null && row.goal_estimate_scale
                ? {
                    value: row.goal_estimate_value,
                    scale: row.goal_estimate_scale,
                    source: "backend_projection",
                  }
                : undefined,
          }
        : undefined,
      training_availability: {
        minutes_per_day: row.minutes_per_day ?? undefined,
        days_per_week: row.days_per_week ?? undefined,
      },
      current_roadmap_phase: {
        phase: row.phase,
        week: row.phase_week ?? undefined,
        total_weeks: row.phase_total_weeks ?? undefined,
      },
      calibration_state: {
        flag: row.calibration,
        detail: row.calibration_detail ?? undefined,
        computed_by: "backend",
      },
      top_cognitive_traps: traps.map((t) => t.trap_id),
      recent_errors: errors.map((e) => ({
        response_id: e.response_id,
        question_id: e.question_id,
        skill: e.skill,
        selected_option: e.selected_option,
        submitted_response: e.submitted_response,
        certainty: e.certainty,
        trap_id: e.trap_id ?? undefined,
        time_seconds: e.time_seconds != null ? Number(e.time_seconds) : undefined,
      })),
      skill_state: Object.fromEntries(
        skills.map((s) => [s.skill, { state: s.state, evidence_count: s.evidence_count }])
      ),
      engine_directives: { clone_budget: row.clone_budget, allow_reveal: row.allow_reveal },
    },
  } as StudentModel;
}

function rowToQuestion(row: QuestionRow): Question {
  const options = Array.isArray(row.options) && row.options.length ? row.options : undefined;
  return {
    id: row.id,
    schema_version: "1.0.0",
    assessment: row.assessment,
    section: row.section,
    domain: row.domain,
    skill: row.skill,
    difficulty: row.difficulty,
    module_target: row.module_target,
    format: row.format,
    stimulus: row.stimulus,
    stimulus_word_count: row.stimulus_word_count,
    stimulus_data: row.stimulus_data ?? null,
    prompt: row.prompt,
    options,
    acceptable_answers: row.acceptable_answers ?? undefined,
    explanation: row.explanation,
    desmos: row.desmos ?? null,
    targets_trap: row.targets_trap,
    clone_of: row.clone_of,
    clone_rung: row.clone_rung,
    metadata: row.metadata ?? {},
    provenance: {
      source: row.source,
      generated_at: row.generated_at.toISOString(),
      engine_version: row.engine_version ?? undefined,
      gate_passed: row.gate_passed,
      bank_status: row.status,
    },
  } as Question;
}
