import { prefillFromResumeText } from "../src/lib/resume-prefill";

async function main() {
  const result = await prefillFromResumeText(
    `Jamie Candidate
Email: jamie@example.test
Phone: +1 555 010 2200
Location: Tbilisi, Georgia
https://www.linkedin.com/in/jamie-candidate
https://jamie.example.test

Product engineer at a venture-backed startup. Built production software with
TypeScript and LangChain, and deployed AI systems to production for a medical
workflow.`,
    { useAi: false }
  );

  const expected = {
    email: "jamie@example.test",
    phone: "+1 555 010 2200",
    location: "Tbilisi, Georgia",
    linkedinUrl: "https://www.linkedin.com/in/jamie-candidate",
    portfolioUrl: "https://jamie.example.test",
    medicalExperience: "yes",
    startupExperience: "yes",
    aiProductionExperience: "yes",
    typescriptExperience: "yes",
    aiFrameworksExperience: "yes",
  } as const;

  for (const [field, value] of Object.entries(expected)) {
    if (result.answers[field as keyof typeof result.answers] !== value) {
      throw new Error(`Expected ${field} to equal ${value}.`);
    }
  }
  if (
    result.answers.yearsProductExperience ||
    result.answers.yearsAiExperience ||
    result.answers.firstName ||
    result.answers.lastName
  ) {
    throw new Error("The parser invented an answer that was not safely extracted.");
  }

  console.log(
    JSON.stringify({
      evidenceOnlyFallback: true,
      contactPrefill: true,
      experiencePrefill: true,
      unsupportedAnswersStayBlank: true,
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
