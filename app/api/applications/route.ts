import {
  claimDailyApiAction,
  deleteApplication,
  getApplicationById,
  getApplicationByJobId,
  getCandidateProfile,
  listApplications,
  markApplicationSubmitted,
  saveApplication,
} from "@/lib/application-store";
import { tryDirectAtsApply } from "@/lib/ats-apply";
import { launchAssistedApplication } from "@/lib/browser-assist";
import type { Application } from "@/lib/applications";
import type { Job } from "@/lib/jobs";
import { AUTO_APPLY_RULES } from "@/lib/auto-apply";
import {
  getCachedTailoredResume,
  prepareTailoredResume,
  ResumeTailoringError,
} from "@/lib/resume-tailoring";
import {
  getAuthenticatedSessionId,
  isLocalRequest,
  isTrustedMutation,
  unauthenticatedResponse,
  untrustedMutationResponse,
} from "@/lib/user-session";

export const runtime = "nodejs";

function parseJob(value: unknown): Job | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Partial<Job>;
  if (
    typeof job.id !== "string" ||
    typeof job.title !== "string" ||
    typeof job.company !== "string" ||
    typeof job.location !== "string" ||
    typeof job.match !== "number" ||
    !Array.isArray(job.tags) ||
    typeof job.posted !== "string" ||
    typeof job.description !== "string" ||
    typeof job.logoColor !== "string" ||
    typeof job.verified !== "boolean" ||
    typeof job.source !== "string" ||
    typeof job.url !== "string"
  ) {
    return null;
  }

  try {
    const url = new URL(job.url);
    if (job.url !== "#" && url.protocol !== "https:") return null;
  } catch {
    if (job.url !== "#") return null;
  }

  return {
    id: job.id.slice(0, 500),
    title: job.title.slice(0, 500),
    company: job.company.slice(0, 300),
    location: job.location.slice(0, 300),
    salary: typeof job.salary === "string" ? job.salary.slice(0, 100) : undefined,
    match: Math.max(0, Math.min(100, job.match)),
    tags: job.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 20),
    posted: job.posted.slice(0, 100),
    postedAt: typeof job.postedAt === "number" ? job.postedAt : null,
    description: job.description.slice(0, 10_000),
    logoColor: job.logoColor.slice(0, 50),
    verified: job.verified,
    source: job.source.slice(0, 100),
    url: job.url,
    logoUrl: typeof job.logoUrl === "string" ? job.logoUrl.slice(0, 2_000) : undefined,
  };
}

export async function GET(request: Request) {
  const sessionId = await getAuthenticatedSessionId(request);
  if (!sessionId) return unauthenticatedResponse();
  const resumeApplicationId = new URL(request.url).searchParams.get("resume");
  if (resumeApplicationId) {
    const application = await getApplicationById(sessionId, resumeApplicationId);
    if (!application) {
      return Response.json({ error: "Application not found. Refresh the page and try again." }, { status: 404 });
    }
    const tailoredResume = await getCachedTailoredResume(
      application.job,
      await getCandidateProfile(sessionId)
    );
    if (!tailoredResume) {
      return Response.json({ error: "Job-specific resume not found. Start the application again." }, { status: 404 });
    }
    return new Response(new Uint8Array(tailoredResume.data), {
      headers: {
        "Content-Type": tailoredResume.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
          tailoredResume.fileName
        )}`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  return Response.json({ applications: await listApplications(sessionId) });
}

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();

  try {
    const sessionId = await getAuthenticatedSessionId(request);
    if (!sessionId) return unauthenticatedResponse();
    const body = (await request.json()) as {
      job?: unknown;
      via?: Application["via"];
      openBrowser?: boolean;
    };
    const job = parseJob(body.job);
    const via = body.via === "auto" ? "auto" : "manual";
    if (!job) {
      return Response.json({ error: "This job is missing required details. Refresh the jobs list and try again." }, { status: 400 });
    }

    const existing = await getApplicationByJobId(sessionId, job.id);
    if (existing?.status === "submitted") {
      return Response.json({
        application: existing,
        browserOpened: false,
        note: "This application is already marked as submitted.",
      });
    }

    const profile = await getCandidateProfile(sessionId);
    if (!profile.cvUploaded) {
      const application = await saveApplication({
        sessionId,
        job,
        status: "needs_user",
        method: "assisted",
        via,
        needsUserReason: "Upload a readable resume before starting an application.",
      });
      return Response.json({
        application,
        browserOpened: false,
        note: application.needsUserReason,
      });
    }
    if (!profile.complete) {
      const application = await saveApplication({
        sessionId,
        job,
        status: "needs_user",
        method: "assisted",
        via,
        needsUserReason:
          "Complete your name and email in Settings before continuing.",
      });
      return Response.json({
        application,
        browserOpened: false,
        note: application.needsUserReason,
      });
    }

    const cachedTailoredResume = await getCachedTailoredResume(job, profile);
    if (
      !cachedTailoredResume &&
      !(await claimDailyApiAction(
        sessionId,
        "resume_tailoring",
        AUTO_APPLY_RULES.dailyLimit
      ))
    ) {
      const reason = `You reached today's application limit (${AUTO_APPLY_RULES.dailyLimit}). Try again tomorrow.`;
      const application = await saveApplication({
        sessionId,
        job,
        status: "needs_user",
        method: "assisted",
        via,
        needsUserReason: reason,
      });
      return Response.json(
        { application, browserOpened: false, note: reason },
        { status: 429 }
      );
    }

    let tailoredResume: Awaited<ReturnType<typeof prepareTailoredResume>>;
    try {
      tailoredResume = await prepareTailoredResume(job, profile);
    } catch (error) {
      const reason =
        error instanceof ResumeTailoringError
          ? error.message
          : "The job-specific resume could not be created from your saved details.";
      const application = await saveApplication({
        sessionId,
        job,
        status: "needs_user",
        method: "assisted",
        via,
        needsUserReason: reason,
      });
      return Response.json({
        application,
        browserOpened: false,
        note: reason,
      });
    }

    const tailoredProfile = {
      ...profile,
      resumeData: tailoredResume.data,
      resumeFileName: tailoredResume.fileName,
      resumeMimeType: tailoredResume.mimeType,
    };
    const direct =
      via === "manual" || profile.autoSubmitEnabled
        ? await tryDirectAtsApply(job, tailoredProfile)
        : {
            status: "unavailable" as const,
            reason:
              "Automatic final submission is off. Enable it in Settings when you are ready.",
          };
    if (direct.status === "submitted") {
      const application = await saveApplication({
        sessionId,
        job,
        status: "submitted",
        method: "ats_api",
        via,
        tailoredResumeFileName: tailoredResume.fileName,
      });
      return Response.json({
        application,
        browserOpened: false,
        note: `Submitted through the employer's ${direct.provider} connection.`,
      });
    }

    let reason = direct.reason;
    let browserOpened = false;
    if (body.openBrowser === true && isLocalRequest(request)) {
      try {
        const assisted = await launchAssistedApplication(job, tailoredProfile);
        browserOpened = assisted.opened;
        reason = assisted.opened
          ? `A job-specific resume was attached and ${assisted.fieldsFilled} fields were filled. Review the form, complete any verification, and submit it.`
          : "Open the employer's application and finish it yourself.";
      } catch {
        reason =
          "The assisted browser could not open. Use the job link and finish the application yourself.";
      }
    } else {
      reason = `Job-specific resume ready. ${reason} Open it from Applications when you are ready to finish.`;
    }

    const application = await saveApplication({
      sessionId,
      job,
      status: "needs_user",
      method: "assisted",
      via,
      needsUserReason: reason,
      tailoredResumeFileName: tailoredResume.fileName,
    });
    return Response.json({ application, browserOpened, note: reason });
  } catch {
    return Response.json(
      { error: "Could not start the application. Try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  try {
    const sessionId = await getAuthenticatedSessionId(request);
    if (!sessionId) return unauthenticatedResponse();
    const body = (await request.json()) as { id?: unknown; status?: unknown };
    if (typeof body.id !== "string" || body.status !== "submitted") {
      return Response.json({ error: "Could not mark this application as submitted. Refresh and try again." }, { status: 400 });
    }
    const application = await markApplicationSubmitted(sessionId, body.id);
    return application
      ? Response.json({ application })
      : Response.json({ error: "Application not found. Refresh the page and try again." }, { status: 404 });
  } catch {
    return Response.json({ error: "Could not update the application. Try again." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  const sessionId = await getAuthenticatedSessionId(request);
  if (!sessionId) return unauthenticatedResponse();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Could not identify this application. Refresh and try again." }, { status: 400 });
  return (await deleteApplication(sessionId, id))
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Application not found. Refresh the page and try again." }, { status: 404 });
}
