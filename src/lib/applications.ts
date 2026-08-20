import type { Job } from "@/lib/jobs";

export type ApplicationStatus = "needs_user" | "submitted" | "failed";
export type ApplicationMethod = "assisted" | "ats_api";

export type Application = {
  id: string;
  job: Job;
  status: ApplicationStatus;
  method: ApplicationMethod;
  via: "auto" | "manual";
  createdAt: number;
  updatedAt: number;
  submittedAt: number | null;
  needsUserReason: string | null;
  tailoredResumeFileName: string | null;
};
export type ApplicationAttempt = {
  application: Application;
  note: string;
  browserOpened: boolean;
};
