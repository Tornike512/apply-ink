import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  claimDailyApiAction,
  deleteApplication,
  getCandidateProfile,
  listApplications,
  markApplicationSubmitted,
  saveApplication,
  saveCandidateProfile,
} from "@/lib/application-store";
import { readStore } from "@/lib/jobs-store";
import type { Job } from "@/lib/jobs";
import { closePostgresPool, postgresQuery } from "@/lib/postgres";
import { getSharedCache, setSharedCache } from "@/lib/shared-cache";
import {
  readTailoredResume,
  writeTailoredResume,
} from "@/lib/tailored-resume-store";

const sessionId = randomUUID();
const cacheKey = `integration-cache-${sessionId}`;
const resumeKey = `integration-resume-${sessionId}`;
const resumeData = Buffer.from("integration resume bytes");
const pdfData = Buffer.from("%PDF-1.7 integration test");
const job: Job = {
  id: `integration-job-${sessionId}`,
  title: "Frontend Engineer",
  company: "Integration Test",
  location: "Remote — Worldwide",
  match: 91,
  tags: ["React", "TypeScript"],
  posted: "today",
  postedAt: Date.now(),
  description: "Build accessible React products with TypeScript.",
  logoColor: "#000000",
  verified: false,
  source: "Integration",
  url: "https://example.com/jobs/integration",
};

async function main() {
try {
  const empty = await getCandidateProfile(sessionId);
  assert.equal(empty.cvUploaded, false);

  const saved = await saveCandidateProfile(sessionId, {
    ...empty,
    firstName: "Postgres",
    lastName: "Test",
    email: "postgres-test@example.com",
    resumeData,
    resumeFileName: "resume.txt",
    resumeMimeType: "text/plain",
    resumeText:
      "Frontend engineer with React and TypeScript experience building accessible products.",
  });
  assert.equal(saved.cvUploaded, true);
  assert.equal(saved.complete, true);
  assert.deepEqual(saved.resumeData, resumeData);

  const application = await saveApplication({
    sessionId,
    job,
    status: "needs_user",
    method: "assisted",
    via: "manual",
  });
  assert.equal((await listApplications(sessionId)).length, 1);
  assert.equal(
    (await markApplicationSubmitted(sessionId, application.id))?.status,
    "submitted"
  );

  assert.equal(await claimDailyApiAction(sessionId, "test", 2), true);
  assert.equal(await claimDailyApiAction(sessionId, "test", 2), true);
  assert.equal(await claimDailyApiAction(sessionId, "test", 2), false);

  await setSharedCache(cacheKey, 1, { works: true });
  assert.deepEqual(await getSharedCache(cacheKey, 1, 60_000), { works: true });

  await writeTailoredResume(resumeKey, {
    data: pdfData,
    fileName: "tailored.pdf",
    mimeType: "application/pdf",
  });
  assert.deepEqual((await readTailoredResume(resumeKey))?.data, pdfData);
  assert.ok(await readStore(), "Migrated PostgreSQL job store should be readable");

  assert.equal(await deleteApplication(sessionId, application.id), true);
  process.stdout.write(
    `${JSON.stringify({
      profileBytes: saved.resumeData?.length,
      applicationRoundTrip: true,
      quotaAtomic: true,
      sharedCache: true,
      tailoredResumeBytes: pdfData.length,
      jobStore: true,
    })}\n`
  );
} finally {
  await postgresQuery("DELETE FROM api_usage WHERE session_id = $1", [sessionId]);
  await postgresQuery("DELETE FROM user_applications WHERE session_id = $1", [
    sessionId,
  ]);
  await postgresQuery("DELETE FROM candidate_profiles WHERE session_id = $1", [
    sessionId,
  ]);
  await postgresQuery("DELETE FROM shared_cache WHERE cache_key = $1", [cacheKey]);
  await postgresQuery("DELETE FROM tailored_resumes WHERE cache_key = $1", [
    resumeKey,
  ]);
  await closePostgresPool();
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
