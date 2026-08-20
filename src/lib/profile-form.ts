import "server-only";

import path from "node:path";
import type {
  ApplicationAnswers,
  YesNoAnswer,
} from "@/lib/candidate-profile";
import type { StoredCandidateProfile } from "@/lib/application-store";
import {
  extractResumeText,
  parseSkillsInventory,
  RESUME_EXTENSIONS,
} from "@/lib/resume-parser";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const MAX_INVENTORY_BYTES = 10 * 1024 * 1024;

export class ResumeUploadError extends Error {}

export function publicCandidateProfile(profile: StoredCandidateProfile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
    portfolioUrl: profile.portfolioUrl,
    coverLetter: profile.coverLetter,
    resumeFileName: profile.resumeFileName,
    cvUploaded: profile.cvUploaded,
    resumeParsed: profile.resumeParsed,
    skillsInventoryFileName: profile.skillsInventoryFileName,
    skillsInventoryCount: profile.skillsInventoryCount,
    tailoringConfigured: profile.tailoringConfigured,
    tailoringReady: profile.tailoringReady,
    complete: profile.complete,
    onboardingComplete: profile.onboardingComplete,
    applicationAnswers: profile.applicationAnswers,
    applicationAnswerCount: profile.applicationAnswerCount,
    applicationAnswerTotal: profile.applicationAnswerTotal,
    autoSubmitEnabled: profile.autoSubmitEnabled,
    privacyConsentAllowed: profile.privacyConsentAllowed,
    talentPoolOptIn: profile.talentPoolOptIn,
    matchVersion: profile.matchVersion,
  };
}

function field(formData: FormData, name: string, maxLength: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function fieldOrCurrent(
  formData: FormData,
  name: string,
  maxLength: number,
  current: string
): string {
  return formData.has(name) ? field(formData, name, maxLength) : current;
}

function yesNoField(
  formData: FormData,
  name: keyof ApplicationAnswers,
  current: YesNoAnswer
): YesNoAnswer {
  if (!formData.has(name)) return current;
  const value = field(formData, name, 3);
  return value === "yes" || value === "no" ? value : "";
}

function yearsField(
  formData: FormData,
  name: "yearsProductExperience" | "yearsAiExperience",
  current: string
): string {
  const value = fieldOrCurrent(formData, name, 3, current);
  if (value && (!/^\d{1,2}$/.test(value) || Number(value) > 60)) {
    throw new ResumeUploadError("Experience years must be between 0 and 60.");
  }
  return value;
}

function applicationAnswersFromForm(
  formData: FormData,
  current: ApplicationAnswers
): ApplicationAnswers {
  const currency = fieldOrCurrent(
    formData,
    "salaryCurrency",
    10,
    current.salaryCurrency
  ).toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    throw new ResumeUploadError("Salary currency must be a 3-letter code.");
  }
  return {
    expectedAnnualSalary: fieldOrCurrent(
      formData,
      "expectedAnnualSalary",
      30,
      current.expectedAnnualSalary
    ),
    expectedHourlyRate: fieldOrCurrent(
      formData,
      "expectedHourlyRate",
      30,
      current.expectedHourlyRate
    ),
    salaryCurrency: currency,
    preferredLocation: fieldOrCurrent(
      formData,
      "preferredLocation",
      150,
      current.preferredLocation
    ),
    authorizedWorkRegions: fieldOrCurrent(
      formData,
      "authorizedWorkRegions",
      500,
      current.authorizedWorkRegions
    ),
    needsSponsorship: yesNoField(
      formData,
      "needsSponsorship",
      current.needsSponsorship
    ),
    willingToRelocate: yesNoField(
      formData,
      "willingToRelocate",
      current.willingToRelocate
    ),
    noticePeriod: fieldOrCurrent(
      formData,
      "noticePeriod",
      100,
      current.noticePeriod
    ),
    yearsProductExperience: yearsField(
      formData,
      "yearsProductExperience",
      current.yearsProductExperience
    ),
    yearsAiExperience: yearsField(
      formData,
      "yearsAiExperience",
      current.yearsAiExperience
    ),
    medicalExperience: yesNoField(
      formData,
      "medicalExperience",
      current.medicalExperience
    ),
    startupExperience: yesNoField(
      formData,
      "startupExperience",
      current.startupExperience
    ),
    aiProductionExperience: yesNoField(
      formData,
      "aiProductionExperience",
      current.aiProductionExperience
    ),
    typescriptExperience: yesNoField(
      formData,
      "typescriptExperience",
      current.typescriptExperience
    ),
    aiFrameworksExperience: yesNoField(
      formData,
      "aiFrameworksExperience",
      current.aiFrameworksExperience
    ),
  };
}

function checked(formData: FormData, name: string): boolean {
  return formData.getAll(name).some((value) => value === "on" || value === "true");
}

export async function resumeFieldsFromFile(resume: File) {
  const extension = path.extname(resume.name).toLowerCase();
  if (!RESUME_EXTENSIONS.has(extension)) {
    throw new ResumeUploadError(
      "CV must be a PDF, DOC, DOCX, RTF, ODT, or TXT file."
    );
  }
  if (resume.size > MAX_RESUME_BYTES) {
    throw new ResumeUploadError("Resume must be 10 MB or smaller.");
  }

  const buffer = Buffer.from(await resume.arrayBuffer());
  let resumeText: string;
  try {
    resumeText = await extractResumeText(buffer, resume.name);
  } catch (error) {
    throw new ResumeUploadError(
      error instanceof Error ? error.message : "Could not read this CV file."
    );
  }

  return {
    resumeData: buffer,
    resumeFileName: resume.name.slice(0, 255),
    resumeMimeType: resume.type || "application/octet-stream",
    resumeText,
  };
}

async function skillsInventoryFields(file: File) {
  if (path.extname(file.name).toLowerCase() !== ".json") {
    throw new ResumeUploadError("Skills inventory must be a JSON file.");
  }
  if (file.size > MAX_INVENTORY_BYTES) {
    throw new ResumeUploadError("Skills inventory must be 10 MB or smaller.");
  }

  const value = Buffer.from(await file.arrayBuffer()).toString("utf8");
  const parsed = parseSkillsInventory(value);
  return {
    skillsInventoryFileName: file.name.slice(0, 255),
    skillsInventoryJson: parsed.json,
  };
}

export async function candidateProfileFromForm(
  formData: FormData,
  current: StoredCandidateProfile
): Promise<StoredCandidateProfile> {
  const next: StoredCandidateProfile = {
    ...current,
    firstName: field(formData, "firstName", 100),
    lastName: field(formData, "lastName", 100),
    email: field(formData, "email", 254),
    phone: field(formData, "phone", 50),
    location: field(formData, "location", 150),
    linkedinUrl: field(formData, "linkedinUrl", 500),
    portfolioUrl: field(formData, "portfolioUrl", 500),
    coverLetter: field(formData, "coverLetter", 8_000),
    applicationAnswers: applicationAnswersFromForm(
      formData,
      current.applicationAnswers
    ),
    onboardingComplete:
      current.onboardingComplete || formData.get("finishOnboarding") === "1",
    autoSubmitEnabled: formData.has("permissionsPresent")
      ? checked(formData, "autoSubmitEnabled")
      : current.autoSubmitEnabled,
    privacyConsentAllowed: formData.has("permissionsPresent")
      ? checked(formData, "privacyConsentAllowed")
      : current.privacyConsentAllowed,
    talentPoolOptIn: formData.has("permissionsPresent")
      ? checked(formData, "talentPoolOptIn")
      : current.talentPoolOptIn,
  };

  if (next.email && !/^\S+@\S+\.\S+$/.test(next.email)) {
    throw new ResumeUploadError("Enter a valid email address.");
  }

  const resume = formData.get("resume");
  if (resume instanceof File && resume.size > 0) {
    Object.assign(next, await resumeFieldsFromFile(resume));
  }

  const skillsInventory = formData.get("skillsInventory");
  if (skillsInventory instanceof File && skillsInventory.size > 0) {
    Object.assign(next, await skillsInventoryFields(skillsInventory));
  }

  return next;
}
