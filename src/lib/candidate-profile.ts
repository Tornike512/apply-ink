export type YesNoAnswer = "" | "yes" | "no";

export type ApplicationAnswers = {
  expectedAnnualSalary: string;
  expectedHourlyRate: string;
  salaryCurrency: string;
  preferredLocation: string;
  authorizedWorkRegions: string;
  needsSponsorship: YesNoAnswer;
  willingToRelocate: YesNoAnswer;
  noticePeriod: string;
  yearsProductExperience: string;
  yearsAiExperience: string;
  medicalExperience: YesNoAnswer;
  startupExperience: YesNoAnswer;
  aiProductionExperience: YesNoAnswer;
  typescriptExperience: YesNoAnswer;
  aiFrameworksExperience: YesNoAnswer;
};

export const EMPTY_APPLICATION_ANSWERS: ApplicationAnswers = {
  expectedAnnualSalary: "",
  expectedHourlyRate: "",
  salaryCurrency: "",
  preferredLocation: "",
  authorizedWorkRegions: "",
  needsSponsorship: "",
  willingToRelocate: "",
  noticePeriod: "",
  yearsProductExperience: "",
  yearsAiExperience: "",
  medicalExperience: "",
  startupExperience: "",
  aiProductionExperience: "",
  typescriptExperience: "",
  aiFrameworksExperience: "",
};

export const APPLICATION_ANSWER_KEYS = Object.keys(
  EMPTY_APPLICATION_ANSWERS
) as (keyof ApplicationAnswers)[];

export const APPLICATION_ANSWER_TOTAL = APPLICATION_ANSWER_KEYS.length;

export function countApplicationAnswers(answers: ApplicationAnswers): number {
  return Object.values(answers).filter((value) => value.trim().length > 0).length;
}

export type CandidateProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  coverLetter: string;
  resumeFileName: string | null;
  cvUploaded: boolean;
  resumeParsed: boolean;
  skillsInventoryFileName: string | null;
  skillsInventoryCount: number;
  tailoringConfigured: boolean;
  tailoringReady: boolean;
  complete: boolean;
  onboardingComplete: boolean;
  applicationAnswers: ApplicationAnswers;
  applicationAnswerCount: number;
  applicationAnswerTotal: number;
  autoSubmitEnabled: boolean;
  privacyConsentAllowed: boolean;
  talentPoolOptIn: boolean;
  matchVersion: number;
};

export const EMPTY_CANDIDATE_PROFILE: CandidateProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  portfolioUrl: "",
  coverLetter: "",
  resumeFileName: null,
  cvUploaded: false,
  resumeParsed: false,
  skillsInventoryFileName: null,
  skillsInventoryCount: 0,
  tailoringConfigured: false,
  tailoringReady: false,
  complete: false,
  onboardingComplete: false,
  applicationAnswers: EMPTY_APPLICATION_ANSWERS,
  applicationAnswerCount: 0,
  applicationAnswerTotal: APPLICATION_ANSWER_TOTAL,
  autoSubmitEnabled: false,
  privacyConsentAllowed: false,
  talentPoolOptIn: false,
  matchVersion: 0,
};
