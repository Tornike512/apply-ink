import "server-only";

import { randomUUID } from "node:crypto";
import type {
  Application,
  ApplicationMethod,
  ApplicationStatus,
} from "@/lib/applications";
import {
  APPLICATION_ANSWER_TOTAL,
  EMPTY_APPLICATION_ANSWERS,
  countApplicationAnswers,
  type ApplicationAnswers,
  type CandidateProfile,
  type YesNoAnswer,
} from "@/lib/candidate-profile";
import type { Job } from "@/lib/jobs";
import { postgresQuery, postgresTransaction } from "@/lib/postgres";

type ApplicationRow = {
  id: string;
  job_json: Job | string;
  status: ApplicationStatus;
  method: ApplicationMethod;
  via: Application["via"];
  created_at: string | number;
  updated_at: string | number;
  submitted_at: string | number | null;
  needs_user_reason: string | null;
  tailored_resume_file_name: string | null;
};

type ProfileRow = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  portfolio_url: string;
  cover_letter: string;
  resume_data: Buffer | null;
  resume_file_name: string | null;
  resume_mime_type: string | null;
  resume_text: string;
  skills_inventory_file_name: string | null;
  skills_inventory_json: unknown | null;
  application_answers: unknown | null;
  auto_submit_enabled: boolean;
  privacy_consent_allowed: boolean;
  talent_pool_opt_in: boolean;
  onboarding_completed_at: string | number | null;
  updated_at: string | number;
};

export type StoredCandidateProfile = CandidateProfile & {
  resumeData: Buffer | null;
  resumeMimeType: string | null;
  resumeText: string;
  skillsInventoryJson: string | null;
};

function numberValue(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

function mapApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    job:
      typeof row.job_json === "string"
        ? (JSON.parse(row.job_json) as Job)
        : row.job_json,
    status: row.status,
    method: row.method,
    via: row.via,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    submittedAt: numberValue(row.submitted_at),
    needsUserReason: row.needs_user_reason,
    tailoredResumeFileName: row.tailored_resume_file_name,
  };
}

function profileIsComplete(row: ProfileRow): boolean {
  return Boolean(
    row.first_name.trim() &&
      row.last_name.trim() &&
      row.email.trim() &&
      row.resume_data?.length &&
      row.resume_text.trim()
  );
}

function inventoryJson(value: unknown | null): string | null {
  if (value === null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function countInventorySkills(value: unknown | null): number {
  if (!value) return 0;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const skills = (parsed as { skills?: unknown }).skills;
    return Array.isArray(skills) ? skills.length : 0;
  } catch {
    return 0;
  }
}

function yesNoAnswer(value: unknown): YesNoAnswer {
  return value === "yes" || value === "no" ? value : "";
}

function applicationAnswers(value: unknown | null): ApplicationAnswers {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
  }
  const source =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  const text = (name: keyof ApplicationAnswers, maxLength: number) =>
    typeof source[name] === "string"
      ? source[name].trim().slice(0, maxLength)
      : "";
  return {
    ...EMPTY_APPLICATION_ANSWERS,
    expectedAnnualSalary: text("expectedAnnualSalary", 30),
    expectedHourlyRate: text("expectedHourlyRate", 30),
    salaryCurrency: text("salaryCurrency", 10),
    preferredLocation: text("preferredLocation", 150),
    authorizedWorkRegions: text("authorizedWorkRegions", 500),
    needsSponsorship: yesNoAnswer(source.needsSponsorship),
    willingToRelocate: yesNoAnswer(source.willingToRelocate),
    noticePeriod: text("noticePeriod", 100),
    yearsProductExperience: text("yearsProductExperience", 3),
    yearsAiExperience: text("yearsAiExperience", 3),
    medicalExperience: yesNoAnswer(source.medicalExperience),
    startupExperience: yesNoAnswer(source.startupExperience),
    aiProductionExperience: yesNoAnswer(source.aiProductionExperience),
    typescriptExperience: yesNoAnswer(source.typescriptExperience),
    aiFrameworksExperience: yesNoAnswer(source.aiFrameworksExperience),
  };
}

function mapProfile(row: ProfileRow): StoredCandidateProfile {
  const complete = profileIsComplete(row);
  const cvUploaded = Boolean(row.resume_data?.length && row.resume_text.trim());
  const tailoringConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const answers = applicationAnswers(row.application_answers);
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    linkedinUrl: row.linkedin_url,
    portfolioUrl: row.portfolio_url,
    coverLetter: row.cover_letter,
    resumeFileName: row.resume_file_name,
    cvUploaded,
    resumeParsed: Boolean(row.resume_text.trim()),
    skillsInventoryFileName: row.skills_inventory_file_name,
    skillsInventoryCount: countInventorySkills(row.skills_inventory_json),
    tailoringConfigured,
    tailoringReady: complete && tailoringConfigured,
    complete,
    onboardingComplete: complete && row.onboarding_completed_at != null,
    applicationAnswers: answers,
    applicationAnswerCount: countApplicationAnswers(answers),
    applicationAnswerTotal: APPLICATION_ANSWER_TOTAL,
    autoSubmitEnabled: Boolean(row.auto_submit_enabled),
    privacyConsentAllowed: Boolean(row.privacy_consent_allowed),
    talentPoolOptIn: Boolean(row.talent_pool_opt_in),
    matchVersion: Number(row.updated_at),
    resumeData: row.resume_data,
    resumeMimeType: row.resume_mime_type,
    resumeText: row.resume_text,
    skillsInventoryJson: inventoryJson(row.skills_inventory_json),
  };
}

async function ensureCandidateProfile(sessionId: string): Promise<void> {
  await postgresQuery(
    `INSERT INTO candidate_profiles (session_id, updated_at)
     VALUES ($1, 0)
     ON CONFLICT (session_id) DO NOTHING`,
    [sessionId]
  );
}

export async function getCandidateProfile(
  sessionId: string
): Promise<StoredCandidateProfile> {
  await ensureCandidateProfile(sessionId);
  const result = await postgresQuery<ProfileRow>(
    "SELECT * FROM candidate_profiles WHERE session_id = $1",
    [sessionId]
  );
  return mapProfile(result.rows[0]);
}

export async function saveCandidateProfile(
  sessionId: string,
  profile: StoredCandidateProfile
): Promise<StoredCandidateProfile> {
  await ensureCandidateProfile(sessionId);
  await postgresQuery(
    `UPDATE candidate_profiles SET
      first_name = $2,
      last_name = $3,
      email = $4,
      phone = $5,
      location = $6,
      linkedin_url = $7,
      portfolio_url = $8,
      cover_letter = $9,
      resume_data = $10,
      resume_file_name = $11,
      resume_mime_type = $12,
      resume_text = $13,
      skills_inventory_file_name = $14,
      skills_inventory_json = $15::jsonb,
      application_answers = $16::jsonb,
      auto_submit_enabled = $17,
      privacy_consent_allowed = $18,
      talent_pool_opt_in = $19,
      onboarding_completed_at = CASE
        WHEN $20::boolean THEN COALESCE(onboarding_completed_at, $21)
        ELSE onboarding_completed_at
      END,
      updated_at = $21
    WHERE session_id = $1`,
    [
      sessionId,
      profile.firstName,
      profile.lastName,
      profile.email,
      profile.phone,
      profile.location,
      profile.linkedinUrl,
      profile.portfolioUrl,
      profile.coverLetter,
      profile.resumeData,
      profile.resumeFileName,
      profile.resumeMimeType,
      profile.resumeText,
      profile.skillsInventoryFileName,
      profile.skillsInventoryJson,
      JSON.stringify(profile.applicationAnswers),
      profile.autoSubmitEnabled,
      profile.privacyConsentAllowed,
      profile.talentPoolOptIn,
      profile.onboardingComplete,
      Date.now(),
    ]
  );
  return getCandidateProfile(sessionId);
}

export async function deleteCandidateProfile(sessionId: string): Promise<void> {
  await postgresQuery("DELETE FROM candidate_profiles WHERE session_id = $1", [
    sessionId,
  ]);
}

export async function listApplications(sessionId: string): Promise<Application[]> {
  const result = await postgresQuery<ApplicationRow>(
    `SELECT * FROM user_applications
     WHERE session_id = $1
     ORDER BY updated_at DESC`,
    [sessionId]
  );
  return result.rows.map(mapApplication);
}

export async function getApplicationByJobId(
  sessionId: string,
  jobId: string
): Promise<Application | null> {
  const result = await postgresQuery<ApplicationRow>(
    `SELECT * FROM user_applications
     WHERE session_id = $1 AND job_id = $2`,
    [sessionId, jobId]
  );
  return result.rows[0] ? mapApplication(result.rows[0]) : null;
}

export async function getApplicationById(
  sessionId: string,
  id: string
): Promise<Application | null> {
  const result = await postgresQuery<ApplicationRow>(
    `SELECT * FROM user_applications
     WHERE session_id = $1 AND id = $2`,
    [sessionId, id]
  );
  return result.rows[0] ? mapApplication(result.rows[0]) : null;
}

export async function saveApplication(input: {
  sessionId: string;
  job: Job;
  status: ApplicationStatus;
  method: ApplicationMethod;
  via: Application["via"];
  needsUserReason?: string | null;
  tailoredResumeFileName?: string | null;
}): Promise<Application> {
  const existing = await getApplicationByJobId(input.sessionId, input.job.id);
  const now = Date.now();
  const id = existing?.id ?? randomUUID();
  const createdAt = existing?.createdAt ?? now;
  const submittedAt =
    input.status === "submitted" ? existing?.submittedAt ?? now : null;

  const result = await postgresQuery<ApplicationRow>(
    `INSERT INTO user_applications (
      id, session_id, job_id, job_json, status, method, via, needs_user_reason,
      created_at, updated_at, submitted_at, tailored_resume_file_name
    ) VALUES (
      $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12
    )
    ON CONFLICT (session_id, job_id) DO UPDATE SET
      job_json = EXCLUDED.job_json,
      status = EXCLUDED.status,
      method = EXCLUDED.method,
      via = EXCLUDED.via,
      needs_user_reason = EXCLUDED.needs_user_reason,
      updated_at = EXCLUDED.updated_at,
      submitted_at = EXCLUDED.submitted_at,
      tailored_resume_file_name = COALESCE(
        EXCLUDED.tailored_resume_file_name,
        user_applications.tailored_resume_file_name
      )
    RETURNING *`,
    [
      id,
      input.sessionId,
      input.job.id,
      JSON.stringify(input.job),
      input.status,
      input.method,
      input.via,
      input.needsUserReason ?? null,
      createdAt,
      now,
      submittedAt,
      input.tailoredResumeFileName ?? null,
    ]
  );
  return mapApplication(result.rows[0]);
}

export async function markApplicationSubmitted(
  sessionId: string,
  id: string
): Promise<Application | null> {
  const now = Date.now();
  const result = await postgresQuery<ApplicationRow>(
    `UPDATE user_applications
     SET status = 'submitted', needs_user_reason = NULL,
         updated_at = $1, submitted_at = COALESCE(submitted_at, $1)
     WHERE session_id = $2 AND id = $3
     RETURNING *`,
    [now, sessionId, id]
  );
  return result.rows[0] ? mapApplication(result.rows[0]) : null;
}

export async function deleteApplication(
  sessionId: string,
  id: string
): Promise<boolean> {
  const result = await postgresQuery(
    "DELETE FROM user_applications WHERE session_id = $1 AND id = $2",
    [sessionId, id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function claimDailyApiAction(
  sessionId: string,
  action: string,
  limit: number
): Promise<boolean> {
  return postgresTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `${sessionId}:${action}`,
    ]);
    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM api_usage
       WHERE session_id = $1 AND action = $2 AND created_at >= $3`,
      [sessionId, action, startOfDay.getTime()]
    );
    if (Number(countResult.rows[0].count) >= limit) return false;
    await client.query(
      `INSERT INTO api_usage (id, session_id, action, created_at)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), sessionId, action, now]
    );
    return true;
  });
}
