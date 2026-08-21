import "server-only";

import type { StoredCandidateProfile } from "@/lib/application-store";
import type { Job } from "@/lib/jobs";

type DirectApplyResult =
  | { status: "submitted"; provider: "Greenhouse" | "Workable" }
  | { status: "unavailable"; reason: string };

type AtsTarget = {
  provider: "Greenhouse" | "Workable" | "Lever" | "Ashby";
  board: string;
  externalId: string;
};

function configuredKeys(name: string): Record<string, string> {
  const raw = process.env[name];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

function urlSegments(value: string): string[] {
  try {
    return new URL(value).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
}

function detectAtsTarget(job: Job): AtsTarget | null {
  const segments = urlSegments(job.url);

  if (job.source === "Greenhouse") {
    const jobsIndex = segments.findIndex((segment) => segment === "jobs");
    const fallback = job.id.match(/^greenhouse-(.+)-(\d+)$/);
    const board = jobsIndex > 0 ? segments[jobsIndex - 1] : fallback?.[1];
    const externalId =
      jobsIndex >= 0 ? segments[jobsIndex + 1]?.split("?")[0] : fallback?.[2];
    if (board && externalId) return { provider: "Greenhouse", board, externalId };
  }

  if (job.source === "Workable") {
    const jobIndex = segments.findIndex((segment) => segment === "j");
    const fallback = job.id.match(/^workable-(.+)-([a-z0-9]+)$/i);
    const board = jobIndex > 0 ? segments[jobIndex - 1] : fallback?.[1];
    const externalId = jobIndex >= 0 ? segments[jobIndex + 1] : fallback?.[2];
    if (board && externalId) return { provider: "Workable", board, externalId };
  }

  if (job.source === "Lever") {
    const fallback = job.id.match(/^lever-(.+)-([a-f0-9-]+)$/i);
    if (fallback) {
      return { provider: "Lever", board: fallback[1], externalId: fallback[2] };
    }
  }

  if (job.source === "Ashby") {
    const fallback = job.id.match(/^ashby-(.+)-([a-f0-9-]+)$/i);
    if (fallback) {
      return { provider: "Ashby", board: fallback[1], externalId: fallback[2] };
    }
  }

  return null;
}

async function applyThroughGreenhouse(
  target: AtsTarget,
  profile: StoredCandidateProfile,
  apiKey: string
): Promise<DirectApplyResult> {
  type GreenhouseQuestion = {
    required?: boolean;
    fields?: { name?: string }[];
  };
  type GreenhouseJobForm = { questions?: GreenhouseQuestion[] };

  const endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(target.board)}/jobs/${encodeURIComponent(target.externalId)}`;
  const details = await fetch(`${endpoint}?questions=true`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!details.ok) {
    return {
      status: "unavailable",
      reason: "The employer's Greenhouse application form is unavailable.",
    };
  }

  const formDefinition = (await details.json()) as GreenhouseJobForm;
  const supportedFields = new Set([
    "first_name",
    "last_name",
    "email",
    "phone",
    "resume",
    "cover_letter",
  ]);
  const hasUnsupportedRequiredQuestion = (formDefinition.questions ?? []).some(
    (question) =>
      question.required === true &&
      (question.fields ?? []).some(
        (field) => !field.name || !supportedFields.has(field.name)
      )
  );
  if (hasUnsupportedRequiredQuestion) {
    return {
      status: "unavailable",
      reason: "This application has required questions that need your answer.",
    };
  }

  const body = new FormData();
  body.set("first_name", profile.firstName);
  body.set("last_name", profile.lastName);
  body.set("email", profile.email);
  if (profile.phone) body.set("phone", profile.phone);
  if (profile.coverLetter) body.set("cover_letter", profile.coverLetter);
  if (profile.resumeData && profile.resumeFileName) {
    body.set(
      "resume",
      new Blob([Uint8Array.from(profile.resumeData)], {
        type: profile.resumeMimeType ?? "application/octet-stream",
      }),
      profile.resumeFileName
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  return response.ok
    ? { status: "submitted", provider: "Greenhouse" }
    : {
        status: "unavailable",
        reason: "Greenhouse needs information that only you can provide.",
      };
}

async function applyThroughWorkable(
  target: AtsTarget,
  profile: StoredCandidateProfile,
  accessToken: string
): Promise<DirectApplyResult> {
  const resume = profile.resumeData;
  const response = await fetch(
    `https://${encodeURIComponent(target.board)}.workable.com/spi/v3/jobs/${encodeURIComponent(target.externalId)}/candidates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourced: false,
        candidate: {
          firstname: profile.firstName,
          lastname: profile.lastName,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          email: profile.email,
          phone: profile.phone || undefined,
          address: profile.location || undefined,
          cover_letter: profile.coverLetter || undefined,
          social_profiles: profile.linkedinUrl
            ? [
                {
                  type: "linkedin",
                  name: "LinkedIn",
                  url: profile.linkedinUrl,
                },
              ]
            : undefined,
          resume:
            resume && profile.resumeFileName
              ? {
                  name: profile.resumeFileName,
                  data: resume.toString("base64"),
                }
              : undefined,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    }
  );
  return response.ok
    ? { status: "submitted", provider: "Workable" }
    : {
        status: "unavailable",
        reason: "Workable needs information that only you can provide.",
      };
}

export async function tryDirectAtsApply(
  job: Job,
  profile: StoredCandidateProfile
): Promise<DirectApplyResult> {
  const target = detectAtsTarget(job);
  if (!target) {
    return {
      status: "unavailable",
      reason: "This employer does not provide Apply Ink with direct ATS access.",
    };
  }

  try {
    if (target.provider === "Greenhouse") {
      const key = configuredKeys("GREENHOUSE_JOB_BOARD_API_KEYS")[target.board];
      return key
        ? await applyThroughGreenhouse(target, profile, key)
        : {
            status: "unavailable",
            reason: "This employer has not connected direct Greenhouse access.",
          };
    }

    if (target.provider === "Workable") {
      const key = configuredKeys("WORKABLE_ACCESS_TOKENS")[target.board];
      return key
        ? await applyThroughWorkable(target, profile, key)
        : {
            status: "unavailable",
            reason: "This employer has not connected direct Workable access.",
          };
    }

    return {
      status: "unavailable",
      reason: `This employer has not connected direct ${target.provider} access.`,
    };
  } catch {
    return {
      status: "unavailable",
      reason: "The direct ATS connection was unavailable, so your help is needed.",
    };
  }
}
