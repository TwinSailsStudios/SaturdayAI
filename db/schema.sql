-- Apex SAT — PostgreSQL schema
--
-- This is the backend's half of the architecture: everything deterministic and
-- reproducible. The AI engine never writes here directly; API routes validate
-- engine output against schemas/*.json and then persist.
--
-- See docs/01-engine-boundaries.md for what is deliberately absent: there is no
-- table in which the engine records a score, a projection, or a roadmap change.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerations (mirror types/apex.ts)
-- ---------------------------------------------------------------------------

CREATE TYPE assessment       AS ENUM ('SAT', 'PSAT_NMSQT', 'PSAT_10', 'PSAT_8_9');
CREATE TYPE test_section     AS ENUM ('reading_writing', 'math');
CREATE TYPE difficulty       AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE module_target    AS ENUM ('module_1', 'module_2_lower', 'module_2_upper', 'practice_only');
CREATE TYPE question_format  AS ENUM ('multiple_choice', 'student_produced_response');
CREATE TYPE bank_status      AS ENUM ('candidate', 'practice_pool', 'sim_pool', 'retired');
CREATE TYPE roadmap_phase    AS ENUM ('diagnose', 'repair', 'build', 'sharpen', 'simulate');
CREATE TYPE clone_rung       AS ENUM ('scaffolded', 'neutral', 'adversarial');
CREATE TYPE skill_mastery    AS ENUM ('untested', 'gap', 'developing', 'fragile', 'solid', 'mastered');
CREATE TYPE calibration_flag AS ENUM (
  'well_calibrated', 'high_overconfidence', 'high_underconfidence',
  'ratings_degenerate', 'insufficient_data'
);
CREATE TYPE calibration_quadrant AS ENUM (
  'true_mastery', 'false_mastery', 'fragile_lucky', 'known_gap'
);

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

-- Seeded from schemas/cognitive-traps.json. Append-only: rows are deprecated,
-- never deleted, because the response log joins on trap_id forever.
CREATE TABLE cognitive_traps (
  id                 TEXT PRIMARY KEY CHECK (id ~ '^(MATH|RW)_[A-Z_]+$'),
  label              TEXT NOT NULL,
  section            test_section NOT NULL,
  description        TEXT NOT NULL,
  distractor_recipe  TEXT NOT NULL,
  tell               TEXT NOT NULL,
  remediation_cue    TEXT NOT NULL,
  deprecated         BOOLEAN NOT NULL DEFAULT FALSE,
  superseded_by      TEXT REFERENCES cognitive_traps (id),
  CONSTRAINT trap_prefix_matches_section CHECK (
    (section = 'math' AND id LIKE 'MATH\_%') OR
    (section = 'reading_writing' AND id LIKE 'RW\_%')
  )
);

-- Score scales, one row per assessment. Referenced rather than hardcoded so
-- that no code path can invent a range.
CREATE TABLE score_scales (
  assessment       assessment PRIMARY KEY,
  composite_min    INTEGER NOT NULL,
  composite_max    INTEGER NOT NULL,
  section_min      INTEGER NOT NULL,
  section_max      INTEGER NOT NULL,
  CHECK (composite_min < composite_max AND section_min < section_max)
);

INSERT INTO score_scales VALUES
  ('SAT',        400, 1600, 200, 800),
  ('PSAT_NMSQT', 320, 1520, 160, 760),
  ('PSAT_10',    320, 1520, 160, 760),
  ('PSAT_8_9',   240, 1440, 120, 720);

-- ---------------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  TEXT NOT NULL,
  email         TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_profiles (
  user_id             UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  school              TEXT,
  grade               SMALLINT CHECK (grade BETWEEN 6 AND 12),

  active_assessment   assessment NOT NULL REFERENCES score_scales (assessment),
  test_date           DATE,

  -- A score is meaningless without its scale, so the scale is stored beside
  -- every value and the two must be supplied together. There is deliberately
  -- no `gap` column: a gap across two scales is not a number.
  -- See docs/01-engine-boundaries.md §4.
  goal_kind           TEXT CHECK (goal_kind IN ('dream_school','score_target','scholarship','team_eligibility')),
  goal_institution    TEXT,
  goal_target_value   INTEGER,
  goal_target_scale   assessment REFERENCES score_scales (assessment),
  goal_estimate_value INTEGER,
  goal_estimate_scale assessment REFERENCES score_scales (assessment),

  minutes_per_day     SMALLINT CHECK (minutes_per_day BETWEEN 5 AND 480),
  days_per_week       SMALLINT CHECK (days_per_week BETWEEN 1 AND 7),

  phase               roadmap_phase NOT NULL DEFAULT 'diagnose',
  phase_week          SMALLINT CHECK (phase_week >= 1),
  phase_total_weeks   SMALLINT CHECK (phase_total_weeks >= 1),

  calibration         calibration_flag NOT NULL DEFAULT 'insufficient_data',
  calibration_detail  TEXT,

  clone_budget        SMALLINT NOT NULL DEFAULT 4 CHECK (clone_budget BETWEEN 0 AND 12),
  allow_reveal        BOOLEAN NOT NULL DEFAULT FALSE,

  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT goal_target_needs_scale   CHECK ((goal_target_value IS NULL)   = (goal_target_scale IS NULL)),
  CONSTRAINT goal_estimate_needs_scale CHECK ((goal_estimate_value IS NULL) = (goal_estimate_scale IS NULL))
);

-- The engine's clone targets. Ordered; at most five.
CREATE TABLE student_top_traps (
  user_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  trap_id   TEXT NOT NULL REFERENCES cognitive_traps (id),
  rank      SMALLINT NOT NULL CHECK (rank BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, trap_id),
  UNIQUE (user_id, rank)
);

CREATE TABLE skill_state (
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  skill           TEXT NOT NULL,
  state           skill_mastery NOT NULL DEFAULT 'untested',
  evidence_count  INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill)
);

-- ---------------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------------

CREATE TABLE questions (
  id                  TEXT PRIMARY KEY,
  assessment          assessment NOT NULL,
  section             test_section NOT NULL,
  domain              TEXT NOT NULL,
  skill               TEXT NOT NULL,
  difficulty          difficulty NOT NULL,
  module_target       module_target NOT NULL,
  format              question_format NOT NULL,

  stimulus            TEXT,
  stimulus_word_count INTEGER,
  stimulus_data       JSONB,
  prompt              TEXT NOT NULL,

  -- SPR only. Every accepted equivalent form; each must be enterable.
  acceptable_answers  TEXT[],

  explanation         JSONB NOT NULL,
  desmos              JSONB,

  targets_trap        TEXT REFERENCES cognitive_traps (id),
  clone_of            TEXT REFERENCES questions (id),
  clone_rung          clone_rung,

  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,

  source              TEXT NOT NULL DEFAULT 'apex_generated',
  engine_version      TEXT,
  gate_passed         TEXT[] NOT NULL DEFAULT '{}',
  status              bank_status NOT NULL DEFAULT 'candidate',
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Structural rules from schemas/question.schema.json, enforced in the
  -- database so a bad item cannot be persisted even if a route forgets to
  -- validate.
  CONSTRAINT rw_is_multiple_choice CHECK (
    section <> 'reading_writing' OR format = 'multiple_choice'
  ),
  CONSTRAINT rw_has_stimulus CHECK (
    section <> 'reading_writing' OR stimulus IS NOT NULL
  ),
  CONSTRAINT spr_is_math CHECK (
    format <> 'student_produced_response' OR section = 'math'
  ),
  CONSTRAINT spr_has_answers CHECK (
    format <> 'student_produced_response'
    OR (acceptable_answers IS NOT NULL AND array_length(acceptable_answers, 1) >= 1)
  ),
  -- Digital SPR entry: 5 characters positive, 6 including a leading minus.
  CONSTRAINT spr_answers_fit_entry CHECK (
    acceptable_answers IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM unnest(acceptable_answers) AS a
      WHERE length(a) > CASE WHEN a LIKE '-%' THEN 6 ELSE 5 END
    )
  ),
  CONSTRAINT math_has_desmos CHECK (section <> 'math' OR desmos IS NOT NULL),
  CONSTRAINT clone_has_rung CHECK ((clone_of IS NULL) = (clone_rung IS NULL))
);

CREATE INDEX questions_pool_idx  ON questions (status, section, skill, difficulty);
CREATE INDEX questions_trap_idx  ON questions (targets_trap) WHERE targets_trap IS NOT NULL;
CREATE INDEX questions_clone_idx ON questions (clone_of) WHERE clone_of IS NOT NULL;

-- Options are normalised rather than left in JSON because distractor-level
-- trap analytics are the whole point: "which wrong answer" is the signal.
CREATE TABLE question_options (
  question_id  TEXT NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  option_id    CHAR(1) NOT NULL CHECK (option_id IN ('A','B','C','D')),
  body         TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL,
  trap_id      TEXT REFERENCES cognitive_traps (id),
  rationale    TEXT,
  PRIMARY KEY (question_id, option_id),
  -- Every distractor is a designed reasoning path. No filler options.
  CONSTRAINT distractor_is_trap_mapped CHECK (
    is_correct OR (trap_id IS NOT NULL AND rationale IS NOT NULL)
  )
);

-- Exactly four options, exactly one correct, at most one arithmetic-slip
-- distractor (gate check G15). Deferred so a multi-row insert can complete.
CREATE FUNCTION assert_option_set_valid() RETURNS TRIGGER AS $$
DECLARE
  q_format question_format;
  n_options INTEGER;
  n_correct INTEGER;
  n_slip INTEGER;
  q_id TEXT := COALESCE(NEW.question_id, OLD.question_id);
BEGIN
  SELECT format INTO q_format FROM questions WHERE id = q_id;
  IF q_format IS NULL OR q_format = 'student_produced_response' THEN
    RETURN NULL;
  END IF;
  SELECT count(*), count(*) FILTER (WHERE is_correct),
         count(*) FILTER (WHERE trap_id = 'MATH_ARITHMETIC_SLIP')
    INTO n_options, n_correct, n_slip
    FROM question_options WHERE question_id = q_id;
  IF n_options <> 4 THEN
    RAISE EXCEPTION 'question % has % options, expected exactly 4', q_id, n_options;
  END IF;
  IF n_correct <> 1 THEN
    RAISE EXCEPTION 'question % has % correct options, expected exactly 1', q_id, n_correct;
  END IF;
  IF n_slip > 1 THEN
    RAISE EXCEPTION 'question % has % arithmetic-slip distractors, max 1 (gate G15)', q_id, n_slip;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER question_options_valid
  AFTER INSERT OR UPDATE OR DELETE ON question_options
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_option_set_valid();

-- ---------------------------------------------------------------------------
-- Practice
-- ---------------------------------------------------------------------------

CREATE TABLE practice_sets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  phase        roadmap_phase NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE practice_set_items (
  set_id       UUID NOT NULL REFERENCES practice_sets (id) ON DELETE CASCADE,
  position     SMALLINT NOT NULL CHECK (position >= 1),
  question_id  TEXT NOT NULL REFERENCES questions (id),
  PRIMARY KEY (set_id, position),
  UNIQUE (set_id, question_id)
);

-- The response log. This table is the evidence base for every number the
-- backend computes; the engine only ever reads a capped slice of it.
CREATE TABLE responses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  question_id        TEXT NOT NULL REFERENCES questions (id),
  set_id             UUID REFERENCES practice_sets (id) ON DELETE SET NULL,
  sim_module_id      UUID,

  selected_option    CHAR(1) CHECK (selected_option IN ('A','B','C','D')),
  submitted_response TEXT,
  is_correct         BOOLEAN NOT NULL,

  -- Captured before feedback and never revised. See docs/05.
  certainty          SMALLINT CHECK (certainty BETWEEN 1 AND 5),
  quadrant           calibration_quadrant,

  -- Which trap actually fired, denormalised from the chosen option so that
  -- trap history survives an option edit.
  trap_id            TEXT REFERENCES cognitive_traps (id),

  time_seconds       NUMERIC(7,2) CHECK (time_seconds >= 0),
  answered_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT response_has_an_answer CHECK (
    selected_option IS NOT NULL OR submitted_response IS NOT NULL
  ),
  CONSTRAINT quadrant_requires_certainty CHECK (
    quadrant IS NULL OR certainty IS NOT NULL
  )
);

CREATE INDEX responses_user_recent_idx ON responses (user_id, answered_at DESC);
CREATE INDEX responses_trap_idx        ON responses (user_id, trap_id) WHERE trap_id IS NOT NULL;
CREATE INDEX responses_quadrant_idx    ON responses (user_id, quadrant);

-- ---------------------------------------------------------------------------
-- Test Sim
-- ---------------------------------------------------------------------------

CREATE TABLE sim_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  assessment   assessment NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

-- Timing is server-authoritative: the client renders a countdown, the server
-- holds started_at and rejects late responses. A client clock is a cheat
-- surface. See docs/07-test-sim-fidelity.md §2.
CREATE TABLE sim_modules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id    UUID NOT NULL REFERENCES sim_attempts (id) ON DELETE CASCADE,
  section       test_section NOT NULL,
  ordinal       SMALLINT NOT NULL CHECK (ordinal IN (1, 2)),
  target        module_target NOT NULL,
  duration_secs INTEGER NOT NULL,
  started_at    TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ,
  UNIQUE (attempt_id, section, ordinal),
  -- Structure, from docs/02: RW 32 min, Math 35 min.
  CONSTRAINT module_duration_matches_section CHECK (
    (section = 'reading_writing' AND duration_secs = 32 * 60) OR
    (section = 'math'            AND duration_secs = 35 * 60)
  ),
  -- Module 1 is always the fixed mixed-difficulty form; only module 2 routes.
  CONSTRAINT routing_only_on_module_2 CHECK (
    (ordinal = 1 AND target = 'module_1') OR
    (ordinal = 2 AND target IN ('module_2_lower', 'module_2_upper'))
  )
);

CREATE TABLE sim_module_items (
  module_id   UUID NOT NULL REFERENCES sim_modules (id) ON DELETE CASCADE,
  position    SMALLINT NOT NULL CHECK (position >= 1),
  question_id TEXT NOT NULL REFERENCES questions (id),
  PRIMARY KEY (module_id, position)
);

-- ---------------------------------------------------------------------------
-- Engine signals — advisory evidence, never a decision
-- ---------------------------------------------------------------------------

CREATE TABLE engine_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'trap_recurrence', 'trap_cleared', 'prerequisite_gap',
                'state_disagreement', 'scale_mismatch', 'incomplete_student_model'
              )),
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The backend decides what a signal means. Until it does, nothing has
  -- happened: the engine never assumes a signal was acted on.
  acted_on_at TIMESTAMPTZ
);

CREATE INDEX engine_signals_pending_idx ON engine_signals (user_id, created_at DESC)
  WHERE acted_on_at IS NULL;

COMMIT;
