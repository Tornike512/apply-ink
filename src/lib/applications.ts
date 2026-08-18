import type { Job } from "@/lib/jobs";

export type Application = {
  job: Job;
  appliedAt: number;
  via: "auto" | "manual";
};

const STORAGE_KEY = "apply-ink:applications";

export function readApplications(): Application[] {
  try {
    return JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    ) as Application[];
  } catch {
    return [];
  }
}

export function saveApplications(applications: Application[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch {
    // storage unavailable — applications stay in memory for the session
  }
}
