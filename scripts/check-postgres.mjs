import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const schema = await readFile(
  new URL("./postgres-schema.sql", import.meta.url),
  "utf8"
);
const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query(schema);
  const result = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM candidate_profiles) AS profiles,
      (SELECT COUNT(*) FROM user_applications) AS applications,
      (SELECT COUNT(*) FROM tailored_resumes) AS tailored_resumes,
      (SELECT COUNT(*) FROM job_store) AS job_stores
  `);
  process.stdout.write(`${JSON.stringify(result.rows[0])}\n`);
} finally {
  await client.end();
}
