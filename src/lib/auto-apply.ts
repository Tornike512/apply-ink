import type { Job } from "@/lib/jobs";

export const AUTO_APPLY_RULES = {
  minMatch: 80,
  dailyLimit: 20,
  // Must stay in sync with the four overlay phases.
  delayMs: 6000,
};

export type AutoApplyStatus =
  | "idle"
  | "running"
  | "stopped"
  | "done"
  | "limit-reached";

export type ActivityStatus =
  | "applied"
  | "needs_user"
  | "skipped"
  | "error"
  | "limit";

export type ActivityEntry = {
  id: string;
  time: string;
  title: string;
  company?: string;
  status: ActivityStatus;
  note: string;
};

export type AutoApplySettings = {
  minMatch: number;
  runLimit: number;
  autoSubmit: boolean;
};

export function decideJob(
  job: Job,
  alreadyStarted: boolean,
  minMatch = AUTO_APPLY_RULES.minMatch
): { status: "ready" | "skipped"; note: string } {
  if (alreadyStarted) {
    return { status: "skipped", note: "Already started in this session" };
  }
  if (job.match < minMatch) {
    return {
      status: "skipped",
      note: `Match ${job.match}% is below your ${minMatch}% rule`,
    };
  }
  return { status: "ready", note: "Ready to apply" };
}
