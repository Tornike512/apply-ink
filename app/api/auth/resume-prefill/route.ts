import { getCandidateProfile, claimDailyApiAction } from "@/lib/application-store";
import { prefillFromResumeText } from "@/lib/resume-prefill";
import { resumeFieldsFromFile, ResumeUploadError } from "@/lib/profile-form";
import {
  getUserSessionId,
  isTrustedMutation,
  untrustedMutationResponse,
} from "@/lib/user-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  try {
    const sessionId = await getUserSessionId(request);
    const formData = await request.formData();
    const resume = formData.get("resume");
    const resumeText =
      resume instanceof File && resume.size > 0
        ? (await resumeFieldsFromFile(resume)).resumeText
        : (await getCandidateProfile(sessionId)).resumeText;

    if (!resumeText.trim()) {
      return Response.json(
        { error: "Upload a readable CV before filling answers." },
        { status: 400 }
      );
    }

    const canUseAi = Boolean(process.env.OPENAI_API_KEY?.trim()) &&
      (await claimDailyApiAction(sessionId, "resume_prefill", 5));
    const result = await prefillFromResumeText(resumeText, { useAi: canUseAi });

    const filledFields = Object.entries(result.answers)
      .filter(([, value]) => value !== "")
      .map(([name]) => name);
    return Response.json({ ...result, filledFields });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ResumeUploadError
            ? error.message
            : "Could not read answers from this CV.",
      },
      { status: error instanceof ResumeUploadError ? 400 : 500 }
    );
  }
}
