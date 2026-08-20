import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import pg from "pg";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is required.");

const sqlitePath = process.env.APPLY_INK_DB_PATH
  ? path.resolve(process.env.APPLY_INK_DB_PATH)
  : path.join(projectRoot, "data", "apply-ink.sqlite");
const schema = await readFile(
  new URL("./postgres-schema.sql", import.meta.url),
  "utf8"
);
const client = new pg.Client({ connectionString });
await client.connect();

const counts = {
  profiles: 0,
  applications: 0,
  usageEvents: 0,
  jobStore: 0,
  sharedCaches: 0,
  tailoredResumes: 0,
};

function jsonText(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    JSON.parse(value);
    return value;
  }
  return JSON.stringify(value);
}

function tableExists(database, table) {
  return Boolean(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table)
  );
}

async function readOptionalFile(value) {
  if (!value || !existsSync(value)) return null;
  return readFile(value);
}

try {
  await client.query("BEGIN");
  await client.query(schema);

  let migratedApplications = [];
  if (existsSync(sqlitePath)) {
    const sqlite = new Database(sqlitePath, { readonly: true });
    try {
      let profiles = [];
      if (tableExists(sqlite, "candidate_profiles")) {
        profiles = sqlite.prepare("SELECT * FROM candidate_profiles").all();
      } else if (tableExists(sqlite, "candidate_profile")) {
        profiles = sqlite
          .prepare("SELECT 'local' AS session_id, * FROM candidate_profile")
          .all();
      }

      for (const profile of profiles) {
        const resumeData = await readOptionalFile(profile.resume_path);
        await client.query(
          `INSERT INTO candidate_profiles (
            session_id, first_name, last_name, email, phone, location,
            linkedin_url, portfolio_url, cover_letter, resume_data,
            resume_file_name, resume_mime_type, resume_text,
            skills_inventory_file_name, skills_inventory_json, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15::jsonb, $16
          )
          ON CONFLICT (session_id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            location = EXCLUDED.location,
            linkedin_url = EXCLUDED.linkedin_url,
            portfolio_url = EXCLUDED.portfolio_url,
            cover_letter = EXCLUDED.cover_letter,
            resume_data = EXCLUDED.resume_data,
            resume_file_name = EXCLUDED.resume_file_name,
            resume_mime_type = EXCLUDED.resume_mime_type,
            resume_text = EXCLUDED.resume_text,
            skills_inventory_file_name = EXCLUDED.skills_inventory_file_name,
            skills_inventory_json = EXCLUDED.skills_inventory_json,
            updated_at = EXCLUDED.updated_at`,
          [
            profile.session_id,
            profile.first_name ?? "",
            profile.last_name ?? "",
            profile.email ?? "",
            profile.phone ?? "",
            profile.location ?? "",
            profile.linkedin_url ?? "",
            profile.portfolio_url ?? "",
            profile.cover_letter ?? "",
            resumeData,
            profile.resume_file_name ?? null,
            profile.resume_mime_type ?? null,
            profile.resume_text ?? "",
            profile.skills_inventory_file_name ?? null,
            jsonText(profile.skills_inventory_json),
            profile.updated_at ?? 0,
          ]
        );
        counts.profiles += 1;
      }

      if (tableExists(sqlite, "user_applications")) {
        migratedApplications = sqlite
          .prepare("SELECT * FROM user_applications")
          .all();
      } else if (tableExists(sqlite, "applications")) {
        migratedApplications = sqlite
          .prepare("SELECT 'local' AS session_id, * FROM applications")
          .all();
      }

      for (const application of migratedApplications) {
        await client.query(
          `INSERT INTO user_applications (
            id, session_id, job_id, job_json, status, method, via,
            needs_user_reason, created_at, updated_at, submitted_at,
            tailored_resume_file_name
          ) VALUES (
            $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12
          )
          ON CONFLICT (session_id, job_id) DO UPDATE SET
            job_json = EXCLUDED.job_json,
            status = EXCLUDED.status,
            method = EXCLUDED.method,
            via = EXCLUDED.via,
            needs_user_reason = EXCLUDED.needs_user_reason,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            submitted_at = EXCLUDED.submitted_at,
            tailored_resume_file_name = EXCLUDED.tailored_resume_file_name`,
          [
            application.id,
            application.session_id,
            application.job_id,
            jsonText(application.job_json),
            application.status,
            application.method,
            application.via,
            application.needs_user_reason,
            application.created_at,
            application.updated_at,
            application.submitted_at,
            application.tailored_resume_file_name,
          ]
        );
        counts.applications += 1;
      }

      if (tableExists(sqlite, "api_usage")) {
        for (const usage of sqlite.prepare("SELECT * FROM api_usage").all()) {
          await client.query(
            `INSERT INTO api_usage (id, session_id, action, created_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`,
            [usage.id, usage.session_id, usage.action, usage.created_at]
          );
          counts.usageEvents += 1;
        }
      }
    } finally {
      sqlite.close();
    }
  }

  const jobStorePath = path.join(projectRoot, "data", "jobs-store.json");
  if (existsSync(jobStorePath)) {
    const store = JSON.parse(await readFile(jobStorePath, "utf8"));
    await client.query(
      `INSERT INTO job_store (id, jobs, sources, refreshed_at)
       VALUES (1, $1::jsonb, $2::jsonb, $3)
       ON CONFLICT (id) DO UPDATE SET
         jobs = EXCLUDED.jobs,
         sources = EXCLUDED.sources,
         refreshed_at = EXCLUDED.refreshed_at`,
      [JSON.stringify(store.jobs ?? []), JSON.stringify(store.sources ?? {}), store.refreshedAt ?? 0]
    );
    counts.jobStore = 1;
  }

  const jsearchPath = path.join(projectRoot, "data", "jsearch-cache.json");
  if (existsSync(jsearchPath)) {
    const cache = JSON.parse(await readFile(jsearchPath, "utf8"));
    await client.query(
      `INSERT INTO shared_cache (cache_key, version, payload, fetched_at)
       VALUES ('jsearch-jobs', $1, $2::jsonb, $3)
       ON CONFLICT (cache_key) DO UPDATE SET
         version = EXCLUDED.version,
         payload = EXCLUDED.payload,
         fetched_at = EXCLUDED.fetched_at`,
      [cache.version ?? 0, JSON.stringify(cache.jobs ?? []), cache.fetchedAt ?? 0]
    );
    counts.sharedCaches = 1;
  }

  const fileNamesByJobHash = new Map();
  for (const application of migratedApplications) {
    if (!application.tailored_resume_file_name) continue;
    const job = JSON.parse(application.job_json);
    const jobHash = createHash("sha256")
      .update(job.id)
      .digest("hex")
      .slice(0, 20);
    fileNamesByJobHash.set(jobHash, application.tailored_resume_file_name);
  }

  const tailoredDirectory = path.join(projectRoot, "data", "tailored-resumes");
  if (existsSync(tailoredDirectory)) {
    const entries = await readdir(tailoredDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".pdf")) continue;
      const cacheKey = entry.name.slice(0, -4);
      const jobHash = cacheKey.split("-")[0];
      const data = await readFile(path.join(tailoredDirectory, entry.name));
      await client.query(
        `INSERT INTO tailored_resumes (
          cache_key, pdf_data, file_name, mime_type, created_at
        ) VALUES ($1, $2, $3, 'application/pdf', $4)
        ON CONFLICT (cache_key) DO UPDATE SET
          pdf_data = EXCLUDED.pdf_data,
          file_name = EXCLUDED.file_name,
          mime_type = EXCLUDED.mime_type,
          created_at = EXCLUDED.created_at`,
        [cacheKey, data, fileNamesByJobHash.get(jobHash) ?? entry.name, Date.now()]
      );
      counts.tailoredResumes += 1;
    }
  }

  await client.query("COMMIT");
  process.stdout.write(`${JSON.stringify(counts)}\n`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
