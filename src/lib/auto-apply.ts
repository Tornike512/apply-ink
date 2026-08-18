import type { Job } from "@/lib/jobs";

export const AUTO_APPLY_RULES = {
  minMatch: 80,
  dailyLimit: 5,
  delayMs: 2200,
};

export type AutoApplyStatus =
  | "idle"
  | "running"
  | "stopped"
  | "done"
  | "limit-reached";

export type ActivityStatus = "applied" | "skipped" | "error" | "limit";

export type ActivityEntry = {
  id: string;
  time: string;
  title: string;
  company?: string;
  status: ActivityStatus;
  note: string;
};

export function decideJob(
  job: Job,
  alreadyApplied: boolean
): { status: "applied" | "skipped" | "error"; note: string } {
  if (alreadyApplied) {
    return { status: "skipped", note: "Already applied in this session" };
  }
  if (job.match < AUTO_APPLY_RULES.minMatch) {
    return {
      status: "skipped",
      note: `Match ${job.match}% is below your ${AUTO_APPLY_RULES.minMatch}% rule`,
    };
  }
  // Simulated failure so the error path is visible with mock data
  if (job.id === "3") {
    return { status: "error", note: "Application portal timed out" };
  }
  return {
    status: "applied",
    note: `Cover letter tailored and sent to ${job.company}`,
  };
}
