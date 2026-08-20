import {
  getCandidateProfile,
  saveCandidateProfile,
} from "@/lib/application-store";
import {
  candidateProfileFromForm,
  publicCandidateProfile,
  resumeFieldsFromFile,
  ResumeUploadError,
} from "@/lib/profile-form";
import {
  getAuthenticatedSessionId,
  getUserSessionId,
  isTrustedMutation,
  unauthenticatedResponse,
  untrustedMutationResponse,
} from "@/lib/user-session";

export const runtime = "nodejs";

function uploadError(error: unknown, fallback: string): Response {
  return Response.json(
    {
      error: error instanceof ResumeUploadError ? error.message : fallback,
    },
    { status: error instanceof ResumeUploadError ? 400 : 500 }
  );
}

export async function GET(request: Request) {
  const sessionId = await getUserSessionId(request);
  return Response.json({
    profile: publicCandidateProfile(await getCandidateProfile(sessionId)),
  });
}

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  try {
    const sessionId = await getAuthenticatedSessionId(request);
    if (!sessionId) return unauthenticatedResponse();
    const formData = await request.formData();
    const resume = formData.get("resume");
    if (!(resume instanceof File) || resume.size === 0) {
      return Response.json({ error: "Choose a resume to upload." }, { status: 400 });
    }
    const current = await getCandidateProfile(sessionId);
    const saved = await saveCandidateProfile(sessionId, {
      ...current,
      ...(await resumeFieldsFromFile(resume)),
    });
    return Response.json({ profile: publicCandidateProfile(saved) });
  } catch (error) {
    return uploadError(error, "Could not upload the resume.");
  }
}

export async function PUT(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  try {
    const sessionId = await getAuthenticatedSessionId(request);
    if (!sessionId) return unauthenticatedResponse();
    const formData = await request.formData();
    const current = await getCandidateProfile(sessionId);
    const saved = await saveCandidateProfile(
      sessionId,
      await candidateProfileFromForm(formData, current)
    );
    return Response.json({ profile: publicCandidateProfile(saved) });
  } catch (error) {
    return uploadError(error, "Could not save the profile.");
  }
}
