export type YesNoAnswer = "" | "yes" | "no";
export type GenderAnswer =
  | ""
  | "woman"
  | "man"
  | "non_binary"
  | "self_describe"
  | "prefer_not_to_say";
export type VeteranAnswer =
  | ""
  | "not_veteran"
  | "protected_veteran"
  | "prefer_not_to_say";
export type DisabilityAnswer = "" | "yes" | "no" | "prefer_not_to_say";

export type ApplicationAnswers = {
  workAuthorizationCountries: string[];
  needsSponsorship: YesNoAnswer;
  noticePeriod: string;
  yearsProductExperience: string;
  yearsAiExperience: string;
  medicalExperience: YesNoAnswer;
  startupExperience: YesNoAnswer;
  aiProductionExperience: YesNoAnswer;
  typescriptExperience: YesNoAnswer;
  aiFrameworksExperience: YesNoAnswer;
  gender: GenderAnswer;
  raceEthnicities: string[];
  veteranStatus: VeteranAnswer;
  disabilityStatus: DisabilityAnswer;
};

export const EMPTY_APPLICATION_ANSWERS: ApplicationAnswers = {
  workAuthorizationCountries: [],
  needsSponsorship: "",
  noticePeriod: "",
  yearsProductExperience: "",
  yearsAiExperience: "",
  medicalExperience: "",
  startupExperience: "",
  aiProductionExperience: "",
  typescriptExperience: "",
  aiFrameworksExperience: "",
  gender: "",
  raceEthnicities: [],
  veteranStatus: "",
  disabilityStatus: "",
};

export const APPLICATION_ANSWER_KEYS = Object.keys(
  EMPTY_APPLICATION_ANSWERS
) as (keyof ApplicationAnswers)[];

export const APPLICATION_ANSWER_TOTAL = APPLICATION_ANSWER_KEYS.length;

export function countApplicationAnswers(answers: ApplicationAnswers): number {
  return Object.values(answers).filter((value) =>
    Array.isArray(value) ? value.length > 0 : value.trim().length > 0
  ).length;
}

export type CandidateProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  githubUrl: string;
  coverLetter: string;
  skills: string[];
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
  githubUrl: "",
  coverLetter: "",
  skills: [],
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
