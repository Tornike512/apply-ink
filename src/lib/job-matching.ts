import "server-only";

import type { StoredCandidateProfile } from "@/lib/application-store";
import type { Job } from "@/lib/jobs";

const STOP_WORDS = new Set(
  `a about above after again against all also am an and any are as at be because
  been before being below between both but by can did do does doing down during
  each few for from further had has have having he her here hers herself him
  himself his how i if in into is it its itself just me more most my myself no
  nor not of off on once only or other our ours ourselves out over own same she
  should so some such than that the their theirs them themselves then there these
  they this those through to too under until up very was we were what when where
  which while who whom why will with would you your yours yourself yourselves
  ability across candidate company experience experienced including job must new
  opportunity preferred required requirements responsibility responsibilities
  role team work working years`.split(/\s+/)
);

const GENERIC_TITLE_WORDS = new Set([
  "engineer",
  "developer",
  "specialist",
  "professional",
  "remote",
  "software",
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/c\+\+/g, "cplusplus")
    .replace(/c#/g, "csharp")
    .replace(/\.net/g, " dotnet ")
    .replace(/node\.js/g, " nodejs ")
    .replace(/next\.js/g, " nextjs ")
    .replace(/react\.js/g, " react ")
    .replace(/[^a-z0-9]+/g, " ");
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 2 &&
        token.length <= 40 &&
        !STOP_WORDS.has(token) &&
        !/^\d+$/.test(token)
    );
}

function inventoryText(value: string | null): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as {
      skills?: { name?: unknown; aliases?: unknown }[];
    };
    return (parsed.skills ?? [])
      .flatMap((skill) => [
        typeof skill.name === "string" ? skill.name : "",
        ...(Array.isArray(skill.aliases)
          ? skill.aliases.filter((alias): alias is string => typeof alias === "string")
          : []),
      ])
      .join(" ");
  } catch {
    return "";
  }
}

function candidateWeights(profile: StoredCandidateProfile): Map<string, number> {
  const weights = new Map<string, number>();
  for (const token of tokens(profile.resumeText)) {
    weights.set(token, Math.min(6, (weights.get(token) ?? 0) + 1));
  }
  for (const token of tokens(inventoryText(profile.skillsInventoryJson))) {
    weights.set(token, Math.min(10, (weights.get(token) ?? 0) + 4));
  }
  return weights;
}

function coverage(
  values: string[],
  candidate: Map<string, number>,
  ignored: Set<string> = new Set()
): number {
  const unique = [...new Set(values)].filter((token) => !ignored.has(token));
  if (unique.length === 0) return 0;
  return unique.filter((token) => candidate.has(token)).length / unique.length;
}

function descriptionEvidence(job: Job, candidate: Map<string, number>): number {
  const jobTokens = new Set(tokens(job.description));
  const strongestCandidateTerms = [...candidate.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80);
  const matchedWeight = strongestCandidateTerms.reduce(
    (sum, [token, weight]) => sum + (jobTokens.has(token) ? weight : 0),
    0
  );
  return Math.min(1, matchedWeight / 30);
}

function scoreJob(job: Job, candidate: Map<string, number>): number {
  const titleCoverage = coverage(tokens(job.title), candidate, GENERIC_TITLE_WORDS);
  const tagCoverage = coverage(tokens(job.tags.join(" ")), candidate);
  const evidence = descriptionEvidence(job, candidate);
  const hasUsefulTags = tokens(job.tags.join(" ")).length > 0;
  const combined = hasUsefulTags
    ? titleCoverage * 0.5 + tagCoverage * 0.25 + evidence * 0.25
    : titleCoverage * 0.65 + evidence * 0.35;
  return Math.max(35, Math.min(98, Math.round(35 + combined * 63)));
}

export function personalizeJobs(
  jobs: Job[],
  profile: StoredCandidateProfile
): { jobs: Job[]; personalized: boolean } {
  if (!profile.resumeText.trim()) {
    return {
      jobs: jobs.map((job) => ({ ...job, match: 0 })),
      personalized: false,
    };
  }

  const candidate = candidateWeights(profile);
  if (candidate.size === 0) {
    return {
      jobs: jobs.map((job) => ({ ...job, match: 0 })),
      personalized: false,
    };
  }

  const personalized = jobs.map((job) => ({
    ...job,
    match: scoreJob(job, candidate),
  }));
  personalized.sort((a, b) => b.match - a.match || (b.postedAt ?? 0) - (a.postedAt ?? 0));
  return { jobs: personalized, personalized: true };
}
