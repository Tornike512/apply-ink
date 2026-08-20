import type { Job } from "@/lib/jobs";

export const AUTO_APPLY_RULES = {
  minMatch: 80,
  dailyLimit: 5,
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

export function decideJob(
  job: Job,
  alreadyStarted: boolean
): { status: "ready" | "skipped"; note: string } {
  if (alreadyStarted) {
    return { status: "skipped", note: "Already started in this session" };
  }
  if (job.match < AUTO_APPLY_RULES.minMatch) {
    return {
      status: "skipped",
      note: `Match ${job.match}% is below your ${AUTO_APPLY_RULES.minMatch}% rule`,
    };
  }
  return { status: "ready", note: "Ready for application routing" };
}
