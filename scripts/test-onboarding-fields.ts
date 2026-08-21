import assert from "node:assert/strict";
import type { StoredCandidateProfile } from "../src/lib/application-store";
import { EMPTY_CANDIDATE_PROFILE } from "../src/lib/candidate-profile";
import {
  candidateProfileFromForm,
  ResumeUploadError,
} from "../src/lib/profile-form";

const current: StoredCandidateProfile = {
  ...EMPTY_CANDIDATE_PROFILE,
  resumeData: null,
  resumeMimeType: null,
  resumeText: "Jamie builds product software with TypeScript and React.",
  skillsInventoryJson: null,
};

function validForm(): FormData {
  const form = new FormData();
  form.set("firstName", "Jamie");
  form.set("lastName", "Candidate");
  form.set("email", "jamie@example.test");
  form.set("phone", "+995555123456");
  form.set("location", "Tbilisi, Georgia");
  form.set("linkedinUrl", "linkedin.com/in/jamie-candidate");
  form.set("portfolioUrl", "jamie.example.test/work");
  form.set("githubUrl", "github.com/jamie-candidate");
  form.set("skills", JSON.stringify(["TypeScript", "React", "typescript"]));
  form.set("workAuthorizationCountries", JSON.stringify(["ge", "us", "ge"]));
  form.set("needsSponsorship", "yes");
  form.set("raceEthnicities", JSON.stringify(["asian", "prefer_not_to_say"]));
  form.set("gender", "prefer_not_to_say");
  form.set("veteranStatus", "not_veteran");
  form.set("disabilityStatus", "prefer_not_to_say");
  return form;
}

async function main() {
  const profile = await candidateProfileFromForm(validForm(), current);
  assert.equal(profile.linkedinUrl, "https://linkedin.com/in/jamie-candidate");
  assert.equal(profile.portfolioUrl, "https://jamie.example.test/work");
  assert.equal(profile.githubUrl, "https://github.com/jamie-candidate");
  assert.deepEqual(profile.skills, ["TypeScript", "React"]);
  assert.deepEqual(profile.applicationAnswers.workAuthorizationCountries, ["ge", "us"]);
  assert.equal(profile.applicationAnswers.needsSponsorship, "yes");
  assert.deepEqual(profile.applicationAnswers.raceEthnicities, [
    "asian",
    "prefer_not_to_say",
  ]);
  assert.equal(profile.applicationAnswers.gender, "prefer_not_to_say");
  assert.match(profile.coverLetter, /TypeScript|experience and qualifications/);

  for (const [name, value] of [
    ["linkedinUrl", "github.com/not-linkedin"],
    ["githubUrl", "linkedin.com/in/not-github"],
  ] as const) {
    const form = validForm();
    form.set(name, value);
    await assert.rejects(
      () => candidateProfileFromForm(form, current),
      ResumeUploadError
    );
  }

  console.log(
    JSON.stringify({
      schemeOptionalUrls: true,
      socialHostValidation: true,
      skillsDeduplicated: true,
      workCountriesAndDemographicsSaved: true,
      defaultIntroductionGenerated: true,
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
