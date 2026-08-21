import {
  claimDailyApiAction,
  getCandidateProfile,
  saveCandidateProfile,
  type StoredCandidateProfile,
} from "@/lib/application-store";
import {
  candidateProfileFromForm,
  publicCandidateProfile,
  resumeFieldsFromFile,
  ResumeUploadError,
} from "@/lib/profile-form";
import {
  prefillFromResumeText,
  type ResumePrefill,
} from "@/lib/resume-prefill";
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

function mergeResumePrefill(
  profile: StoredCandidateProfile,
  prefill: ResumePrefill
): StoredCandidateProfile {
  const answers = profile.applicationAnswers;
  const mergedSkills = Array.from(new Set([...profile.skills, ...prefill.skills])).slice(
    0,
    50
  );
  return {
    ...profile,
    firstName: profile.firstName || prefill.firstName,
    lastName: profile.lastName || prefill.lastName,
    email: profile.email || prefill.email,
    phone: profile.phone || prefill.phone,
    location: profile.location || prefill.location,
    linkedinUrl: profile.linkedinUrl || prefill.linkedinUrl,
    portfolioUrl: profile.portfolioUrl || prefill.portfolioUrl,
    githubUrl: profile.githubUrl || prefill.githubUrl,
    coverLetter: profile.coverLetter || prefill.coverLetter,
    skills: mergedSkills,
    skillsInventoryFileName: mergedSkills.length
      ? profile.skillsInventoryFileName || "CV-detected skills"
      : null,
    skillsInventoryJson: mergedSkills.length
      ? JSON.stringify({
          skills: mergedSkills.map((name) => ({
            name,
            aliases: [],
            categories: [],
            claim_confidence: "confirmed",
            experience_level: "unspecified",
            resume_use: "skills_section",
            evidence: [],
          })),
        })
      : null,
    applicationAnswers: {
      ...answers,
      yearsProductExperience:
        answers.yearsProductExperience || prefill.yearsProductExperience,
      yearsAiExperience:
        answers.yearsAiExperience || prefill.yearsAiExperience,
      medicalExperience:
        answers.medicalExperience || prefill.medicalExperience,
      startupExperience:
        answers.startupExperience || prefill.startupExperience,
      aiProductionExperience:
        answers.aiProductionExperience || prefill.aiProductionExperience,
      typescriptExperience:
        answers.typescriptExperience || prefill.typescriptExperience,
      aiFrameworksExperience:
        answers.aiFrameworksExperience || prefill.aiFrameworksExperience,
    },
  };
}

async function withResumePrefill(
  sessionId: string,
  profile: StoredCandidateProfile
): Promise<StoredCandidateProfile> {
  const canUseAi = Boolean(process.env.OPENAI_API_KEY?.trim()) &&
    (await claimDailyApiAction(sessionId, "resume_prefill", 5));
  const result = await prefillFromResumeText(profile.resumeText, {
    useAi: canUseAi,
  });
  return mergeResumePrefill(profile, result.answers);
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
    const next = await withResumePrefill(sessionId, {
      ...current,
      ...(await resumeFieldsFromFile(resume)),
    });
    const saved = await saveCandidateProfile(sessionId, next);
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
    let next = await candidateProfileFromForm(formData, current);
    const resume = formData.get("resume");
    if (resume instanceof File && resume.size > 0) {
      next = await withResumePrefill(sessionId, next);
    }
    const saved = await saveCandidateProfile(
      sessionId,
      next
    );
    return Response.json({ profile: publicCandidateProfile(saved) });
  } catch (error) {
    return uploadError(error, "Could not save the profile.");
  }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  try {
    const sessionId = await getUserSessionId(request);
    const current = await getCandidateProfile(sessionId);
    const saved = await saveCandidateProfile(sessionId, {
      ...current,
      resumeData: null,
      resumeFileName: null,
      resumeMimeType: null,
      resumeText: "",
    });
    return Response.json({ profile: publicCandidateProfile(saved) });
  } catch {
    return Response.json(
      { error: "Could not remove the resume." },
      { status: 500 }
    );
  }
}
