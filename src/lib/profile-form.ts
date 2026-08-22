import "server-only";

import path from "node:path";
import type {
  ApplicationAnswers,
  DisabilityAnswer,
  GenderAnswer,
  YesNoAnswer,
  VeteranAnswer,
} from "@/lib/candidate-profile";
import type { StoredCandidateProfile } from "@/lib/application-store";
import {
  extractResumeText,
  parseSkillsInventory,
  RESUME_EXTENSIONS,
} from "@/lib/resume-parser";
import { defaultIntroductionFromSkills } from "@/lib/resume-prefill";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const MAX_INVENTORY_BYTES = 10 * 1024 * 1024;
const RESUME_MIME_TYPES: Readonly<Record<string, readonly string[]>> = {
  ".pdf": ["application/pdf", "application/x-pdf"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".rtf": ["application/rtf", "text/rtf"],
  ".odt": ["application/vnd.oasis.opendocument.text"],
  ".txt": ["text/plain"],
};

export class ResumeUploadError extends Error {}

export function onboardingValidationError(
  profile: StoredCandidateProfile
): string | null {
  if (!profile.firstName.trim() || !profile.lastName.trim()) {
    return "Enter your first and last name.";
  }
  if (!profile.phone.trim() || !profile.location.trim()) {
    return "Enter your phone number and current location.";
  }
  if (!profile.resumeData?.length || !profile.resumeText.trim()) {
    return "Choose a readable resume to create your account.";
  }
  if (profile.skills.length === 0) {
    return "Choose at least one skill Apply Ink can use to match jobs.";
  }
  if (profile.applicationAnswers.workAuthorizationCountries.length === 0) {
    return "Select at least one country where you can work without sponsorship.";
  }
  if (!profile.applicationAnswers.needsSponsorship) {
    return "Choose whether you need sponsorship outside those countries.";
  }
  if (!profile.applicationAnswers.noticePeriod.trim()) {
    return "Select your notice period.";
  }
  return null;
}

export function publicCandidateProfile(profile: StoredCandidateProfile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
    portfolioUrl: profile.portfolioUrl,
    githubUrl: profile.githubUrl,
    coverLetter: profile.coverLetter,
    skills: profile.skills,
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

function stringListField(
  formData: FormData,
  name: keyof ApplicationAnswers,
  current: string[],
  maxItems: number,
  maxLength: number
): string[] {
  if (!formData.has(name)) return current;
  const raw = field(formData, name, 10_000);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean)
      .filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, maxItems);
  } catch {
    return [];
  }
}

function choiceField<T extends string>(
  formData: FormData,
  name: keyof ApplicationAnswers,
  current: T,
  choices: readonly T[]
): T {
  if (!formData.has(name)) return current;
  const value = field(formData, name, 50) as T;
  return choices.includes(value) ? value : ("" as T);
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
  return {
    workAuthorizationCountries: stringListField(
      formData,
      "workAuthorizationCountries",
      current.workAuthorizationCountries,
      50,
      2
    ),
    needsSponsorship: yesNoField(
      formData,
      "needsSponsorship",
      current.needsSponsorship
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
    gender: choiceField<GenderAnswer>(
      formData,
      "gender",
      current.gender,
      ["", "woman", "man", "non_binary", "self_describe", "prefer_not_to_say"]
    ),
    raceEthnicities: stringListField(
      formData,
      "raceEthnicities",
      current.raceEthnicities,
      12,
      50
    ),
    veteranStatus: choiceField<VeteranAnswer>(
      formData,
      "veteranStatus",
      current.veteranStatus,
      ["", "not_veteran", "protected_veteran", "prefer_not_to_say"]
    ),
    disabilityStatus: choiceField<DisabilityAnswer>(
      formData,
      "disabilityStatus",
      current.disabilityStatus,
      ["", "yes", "no", "prefer_not_to_say"]
    ),
  };
}

function normalizedUrl(
  formData: FormData,
  name: string,
  label: string,
  requiredHost?: RegExp
): string {
  const raw = field(formData, name, 500);
  if (!raw) return "";
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (!/^https?:$/.test(url.protocol) || (requiredHost && !requiredHost.test(url.hostname))) {
      throw new Error("invalid");
    }
    return url.toString().slice(0, 500);
  } catch {
    throw new ResumeUploadError(`Enter a valid ${label} URL.`);
  }
}

function skillsFromForm(
  formData: FormData,
  current: StoredCandidateProfile
): Pick<
  StoredCandidateProfile,
  "skills" | "skillsInventoryFileName" | "skillsInventoryJson"
> {
  if (!formData.has("skills")) {
    return {
      skills: current.skills,
      skillsInventoryFileName: current.skillsInventoryFileName,
      skillsInventoryJson: current.skillsInventoryJson,
    };
  }
  const raw = field(formData, "skills", 10_000);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = [];
  }
  const skills = Array.isArray(parsed)
    ? parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 80))
        .filter(Boolean)
        .filter(
          (item, index, all) =>
            all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) ===
            index
        )
        .slice(0, 50)
    : [];
  return {
    skills,
    skillsInventoryFileName: skills.length ? "Profile skills" : null,
    skillsInventoryJson: skills.length
      ? JSON.stringify({
          skills: skills.map((name) => ({
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
  };
}

function checked(formData: FormData, name: string): boolean {
  return formData.getAll(name).some((value) => value === "on" || value === "true");
}

export async function resumeFieldsFromFile(resume: File) {
  const extension = path.extname(resume.name).toLowerCase();
  if (!RESUME_EXTENSIONS.has(extension)) {
    throw new ResumeUploadError(
      "Resume must be a PDF, DOC, DOCX, RTF, ODT, or TXT file."
    );
  }
  if (resume.size > MAX_RESUME_BYTES) {
    throw new ResumeUploadError("Resume must be 10 MB or smaller.");
  }
  const providedMime = resume.type.toLowerCase();
  const allowedMimeTypes = RESUME_MIME_TYPES[extension] ?? [];
  if (
    providedMime &&
    providedMime !== "application/octet-stream" &&
    !allowedMimeTypes.includes(providedMime)
  ) {
    throw new ResumeUploadError(
      "The resume file type does not match its extension. Export it again and try again."
    );
  }

  const buffer = Buffer.from(await resume.arrayBuffer());
  let resumeText: string;
  try {
    resumeText = await extractResumeText(buffer, resume.name);
  } catch (error) {
    throw new ResumeUploadError(
      error instanceof Error ? error.message : "Could not read this resume. Try another file."
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
  const skills = skillsFromForm(formData, current);
  const next: StoredCandidateProfile = {
    ...current,
    firstName: field(formData, "firstName", 100),
    lastName: field(formData, "lastName", 100),
    email: field(formData, "email", 254),
    phone: field(formData, "phone", 50),
    location: field(formData, "location", 150),
    linkedinUrl: normalizedUrl(
      formData,
      "linkedinUrl",
      "LinkedIn",
      /(?:^|\.)linkedin\.com$/i
    ),
    portfolioUrl: normalizedUrl(formData, "portfolioUrl", "portfolio"),
    githubUrl: normalizedUrl(
      formData,
      "githubUrl",
      "GitHub",
      /(?:^|\.)github\.com$/i
    ),
    coverLetter: field(formData, "coverLetter", 8_000),
    ...skills,
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

  if (!next.coverLetter && next.resumeText.trim()) {
    next.coverLetter = defaultIntroductionFromSkills(next.skills);
  }

  const skillsInventory = formData.get("skillsInventory");
  if (skillsInventory instanceof File && skillsInventory.size > 0) {
    Object.assign(next, await skillsInventoryFields(skillsInventory));
  }

  return next;
}
