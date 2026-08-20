import "server-only";

import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS app_secrets (
    secret_key TEXT PRIMARY KEY,
    secret_value TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    session_version INTEGER NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS users_normalized_email_idx
  ON users (LOWER(email));

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at BIGINT NOT NULL,
    used_at BIGINT,
    created_at BIGINT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS candidate_profiles (
    session_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    linkedin_url TEXT NOT NULL DEFAULT '',
    portfolio_url TEXT NOT NULL DEFAULT '',
    cover_letter TEXT NOT NULL DEFAULT '',
    resume_data BYTEA,
    resume_file_name TEXT,
    resume_mime_type TEXT,
    resume_text TEXT NOT NULL DEFAULT '',
    skills_inventory_file_name TEXT,
    skills_inventory_json JSONB,
    application_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    auto_submit_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_consent_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    talent_pool_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_completed_at BIGINT,
    updated_at BIGINT NOT NULL
  );

  ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS application_answers JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS auto_submit_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS privacy_consent_allowed BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS talent_pool_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE candidate_profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed_at BIGINT;

  CREATE TABLE IF NOT EXISTS user_applications (
    id UUID PRIMARY KEY,
    session_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    job_json JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('needs_user', 'submitted', 'failed')),
    method TEXT NOT NULL CHECK (method IN ('assisted', 'ats_api')),
    via TEXT NOT NULL CHECK (via IN ('auto', 'manual')),
    needs_user_reason TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    submitted_at BIGINT,
    tailored_resume_file_name TEXT,
    UNIQUE (session_id, job_id)
  );

  CREATE INDEX IF NOT EXISTS user_applications_session_status_idx
  ON user_applications (session_id, status, updated_at DESC);

  CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY,
    session_id TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS api_usage_session_action_created_idx
  ON api_usage (session_id, action, created_at DESC);

  CREATE TABLE IF NOT EXISTS job_store (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    jobs JSONB NOT NULL,
    sources JSONB NOT NULL,
    refreshed_at BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shared_cache (
    cache_key TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    payload JSONB NOT NULL,
    fetched_at BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tailored_resumes (
    cache_key TEXT PRIMARY KEY,
    pdf_data BYTEA NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
`;

type GlobalWithPostgres = typeof globalThis & {
  __applyInkPostgresPool?: Pool;
  __applyInkPostgresSchema?: Promise<void>;
};

function connectionString(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "DATABASE_URL is required. Point it at PostgreSQL before starting Apply Ink."
    );
  }
  return value;
}

function pool(): Pool {
  const globalPostgres = globalThis as GlobalWithPostgres;
  if (globalPostgres.__applyInkPostgresPool) {
    return globalPostgres.__applyInkPostgresPool;
  }

  const created = new Pool({
    connectionString: connectionString(),
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  created.on("error", (error) => {
    console.error("[postgres] idle client error:", error);
  });
  globalPostgres.__applyInkPostgresPool = created;
  return created;
}

export async function ensurePostgresSchema(): Promise<void> {
  const globalPostgres = globalThis as GlobalWithPostgres;
  if (!globalPostgres.__applyInkPostgresSchema) {
    globalPostgres.__applyInkPostgresSchema = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((error) => {
        globalPostgres.__applyInkPostgresSchema = undefined;
        throw error;
      });
  }
  await globalPostgres.__applyInkPostgresSchema;
}

export async function postgresQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  await ensurePostgresSchema();
  return pool().query<T>(text, values);
}

export async function postgresTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  await ensurePostgresSchema();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePostgresPool(): Promise<void> {
  const globalPostgres = globalThis as GlobalWithPostgres;
  const existing = globalPostgres.__applyInkPostgresPool;
  globalPostgres.__applyInkPostgresPool = undefined;
  globalPostgres.__applyInkPostgresSchema = undefined;
  if (existing) await existing.end();
}
