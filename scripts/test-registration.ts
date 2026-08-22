import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import PDFDocument from "pdfkit";
import { closePostgresPool, postgresQuery } from "../src/lib/postgres";

const ORIGIN = process.env.APPLY_INK_TEST_ORIGIN ?? "http://localhost:3000";

async function createResumePdf(label: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const document = new PDFDocument();
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const complete = new Promise<void>((resolve) => document.on("end", resolve));
  document.fontSize(18).text(`${label} Resume`);
  document
    .fontSize(11)
    .text(
      "Product engineer with TypeScript, React, Node.js, PostgreSQL, production AI experience, and reliable remote software delivery."
    );
  document.end();
  await complete;
  return Buffer.concat(chunks);
}

async function main() {
  const suffix = randomUUID();
  const email = `registration-${suffix}@example.test`;
  let userId: string | null = null;
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      extraHTTPHeaders: { "x-vercel-ip-country": "GE" },
    });
    await page.route("**/api/jobs?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            {
              id: "registration-drawer-test",
              title: "Senior Test Engineer",
              company: "Apply Ink QA",
              location: "Remote - Worldwide",
              salary: "$100k - $130k",
              match: 93,
              tags: ["TypeScript", "Playwright"],
              posted: "today",
              postedAt: Date.now(),
              description: "Verify the animated job details experience.",
              logoColor: "#c2452f",
              verified: true,
              source: "Test",
              url: "#",
            },
            {
              id: "registration-drawer-test",
              title: "Duplicate-ID Test Engineer",
              company: "Apply Ink Collision Test",
              location: "Remote - Worldwide",
              match: 90,
              tags: ["React"],
              posted: "today",
              postedAt: Date.now(),
              description: "This colliding ID must not reach the rendered list.",
              logoColor: "#3e8e41",
              verified: false,
              source: "Test",
              url: "#",
            },
          ],
          total: 2,
          grandTotal: 2,
          highMatches: 2,
          page: 1,
          pageSize: 20,
          sources: { Test: 1 },
          refreshedAt: Date.now(),
          refreshing: false,
          personalized: true,
        }),
      });
    });
    const apiResponses: string[] = [];
    const duplicateKeyErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && /same key|unique key/i.test(message.text())) {
        duplicateKeyErrors.push(message.text());
      }
    });
    page.on("response", (response) => {
      if (response.url().includes("/api/")) {
        apiResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
    await page.goto(`${ORIGIN}/register`, { waitUntil: "networkidle" });
    const automationDialog = page.getByRole("dialog", {
      name: "Why these questions matter",
    });
    await automationDialog.waitFor();
    const automationExplanation = await automationDialog.textContent();
    if (
      !automationExplanation?.includes("pause less later") ||
      !automationExplanation.includes("Messages") ||
      !automationExplanation.includes("CAPTCHA")
    ) {
      throw new Error("Registration automation explanation is missing.");
    }
    await automationDialog
      .getByRole("button", { name: "Continue registration" })
      .click();
    try {
      await page.getByText("Continue with Google", { exact: true }).waitFor();
    } catch {
      throw new Error(
        `Registration account step did not render. URL: ${page.url()}. API: ${apiResponses.join(", ")}. UI: ${(await page.locator("body").innerText()).slice(0, 1_500)}`
      );
    }
    await page.locator('header a[href="/register#register"]').click();
    await page.waitForURL("**/register#register");
    const formTop = await page.locator("#register").evaluate((section) =>
      section.getBoundingClientRect().top
    );
    if (formTop < 70 || formTop > 140) {
      throw new Error("Header Register link did not scroll to the form.");
    }
    await page.locator('input[name="email"]').fill("");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const requiredFieldsToast = page
      .getByRole("alert")
      .filter({ hasText: "Complete required fields" });
    await requiredFieldsToast.waitFor();
    const requiredFieldsCopy = await requiredFieldsToast.textContent();
    for (const expected of [
      "Check these 3 fields to continue:",
      "Email address",
      "Password",
      "Password confirmation",
    ]) {
      if (!requiredFieldsCopy?.includes(expected)) {
        throw new Error(`Required-fields toast is missing: ${expected}`);
      }
    }
    await requiredFieldsToast
      .getByRole("button", { name: "Close required fields message" })
      .click();
    await requiredFieldsToast.waitFor({ state: "detached" });
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(`Account-${suffix}-6`);
    await page
      .locator('input[name="passwordConfirmation"]')
      .fill(`Account-${suffix}-6`);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Resume", exact: true }).waitFor();
    await page.locator('input[aria-label="Upload resume to fill the form"]').waitFor();
    await page
      .getByRole("button", {
        name: /^(?:Upload resume and fill form|Replace resume)$/,
      })
      .waitFor();
    await page.locator('input[name="firstName"]').fill("");
    await page.locator('input[name="lastName"]').fill("");
    const phoneCountryButton = page.getByRole("combobox", {
      name: "Phone country",
    });
    const phoneNumberInput = page.getByRole("textbox", { name: "Phone number" });
    if (
      !(await phoneCountryButton.textContent())?.includes("+995") ||
      (await phoneCountryButton.locator('img[data-country="ge"]').count()) !== 1 ||
      (await phoneNumberInput.getAttribute("placeholder")) !== "555 12 34 56"
    ) {
      throw new Error("The IP-derived Georgian phone country or placeholder was not applied.");
    }
    await phoneNumberInput.fill("599 312203 466");
    if ((await phoneNumberInput.inputValue()).replace(/\D/g, "") !== "599312203") {
      throw new Error("Phone input allowed more digits than Georgia supports.");
    }
    await phoneNumberInput.fill("123");
    await phoneNumberInput.blur();
    await page
      .getByText("Enter a complete phone number for Georgia.", { exact: true })
      .waitFor();
    await phoneNumberInput.fill("");
    await page.locator('input[name="location"]').fill("");
    await page.locator('input[name="linkedinUrl"]').fill("");
    await phoneCountryButton.click();
    const phoneCountrySearch = page.getByRole("searchbox", {
      name: "Phone country search",
    });
    await phoneCountrySearch.fill("Georgia");
    await page
      .getByRole("listbox", { name: "Phone country" })
      .getByRole("option", { name: /Georgia \(\+995\)/ })
      .waitFor();
    await phoneCountrySearch.fill("+995");
    await page
      .getByRole("listbox", { name: "Phone country" })
      .getByRole("option", { name: /Georgia \(\+995\)/ })
      .waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("listbox", { name: "Phone country" })
      .waitFor({ state: "detached" });
    await page.locator('input[name="resume"]').setInputFiles({
      name: "invalid-resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Too short"),
    });
    await page
      .getByText(/No (?:usable CV|readable resume) text was found/)
      .waitFor();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Resume", exact: true }).waitFor();
    const prematureUser = await postgresQuery<{ count: string }>(
      "SELECT COUNT(*) AS count FROM users WHERE email = $1",
      [email]
    );
    if (Number(prematureUser.rows[0].count) !== 0) {
      throw new Error("Invalid registration created an account before validation.");
    }

    await page.route("**/api/auth/resume-prefill", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          source: "ai",
          answers: {
            firstName: "Registration",
            lastName: "Test",
            phone: "+995555010100",
            location: "Tbilisi, Georgia",
            linkedinUrl: "https://www.linkedin.com/in/registration-test",
            githubUrl: "https://github.com/registration-test",
            portfolioUrl: "https://registration-test.example.com",
            coverLetter: "I build reliable product software with TypeScript and React.",
            skills: [
              "TypeScript",
              "React",
              "PostgreSQL",
              "Reusable components",
              "reusable components",
              "Lazy loading",
              "lazy loading",
            ],
            aiProductionExperience: "yes",
            typescriptExperience: "yes",
            aiFrameworksExperience: "yes",
          },
          filledFields: [
            "firstName",
            "lastName",
            "phone",
            "location",
            "linkedinUrl",
            "githubUrl",
            "portfolioUrl",
            "coverLetter",
            "skills",
            "aiProductionExperience",
            "typescriptExperience",
            "aiFrameworksExperience",
          ],
        }),
      });
    });
    const firstPdf = await createResumePdf("Registration Test");
    await page.locator('input[name="resume"]').setInputFiles({
      name: "registration-test-resume.pdf",
      mimeType: "application/pdf",
      buffer: firstPdf,
    });
    const resumeReadingState = page.locator("[data-resume-reading]");
    await resumeReadingState.waitFor();
    try {
      await resumeReadingState
        .getByText("Reading or scanning your resume...", { exact: true })
        .waitFor({ timeout: 5_000 });
    } catch {
      throw new Error(
        `CV reading phase did not render. API: ${apiResponses.join(", ")}. State: ${(await resumeReadingState.textContent().catch(() => "detached")) ?? "detached"}`
      );
    }
    await resumeReadingState
      .getByText("registration-test-resume.pdf", { exact: false })
      .waitFor();
    const resumeProgress = resumeReadingState.getByRole("progressbar", {
      name: "Resume upload and reading progress",
    });
    const readingProgress = Number(
      await resumeProgress.getAttribute("aria-valuenow")
    );
    if (readingProgress < 65 || readingProgress >= 100) {
      throw new Error(
        `CV reading progress was not estimated between upload and completion: ${readingProgress}.`
      );
    }
    const cvFieldsDisabled = await page
      .locator('input[name="firstName"]')
      .isDisabled();
    const cvContinueDisabled = await page
      .getByRole("button", { name: "Reading resume...", exact: true })
      .isDisabled();
    if (!cvFieldsDisabled || !cvContinueDisabled) {
      throw new Error(
        `CV loading lock failed: fieldsDisabled=${cvFieldsDisabled}, continueDisabled=${cvContinueDisabled}.`
      );
    }
    await page.getByText("answers filled from your resume", { exact: false }).waitFor();
    await resumeReadingState.waitFor({ state: "detached" });
    const approvedResume = page.locator("[data-resume-approved]");
    await approvedResume.getByText("Resume ready", { exact: true }).waitFor();
    await approvedResume
      .getByText("registration-test-resume.pdf", { exact: false })
      .waitFor();
    if ((await approvedResume.locator("svg").count()) < 1) {
      throw new Error("Approved CV state did not show its green check icon.");
    }
    const secondPdf = await createResumePdf("Replacement Test");
    await page.locator('input[name="resume"]').setInputFiles({
      name: "replacement-resume.pdf",
      mimeType: "application/pdf",
      buffer: secondPdf,
    });
    await approvedResume
      .getByText("replacement-resume.pdf", { exact: false })
      .waitFor();
    await approvedResume
      .getByRole("button", { name: /^Remove(?: resume)?$/ })
      .click();
    await approvedResume
      .getByText("replacement-resume.pdf", { exact: false })
      .waitFor({ state: "detached" });
    await page.locator('input[name="resume"]').setInputFiles({
      name: "registration-test-resume.pdf",
      mimeType: "application/pdf",
      buffer: firstPdf,
    });
    await approvedResume
      .getByText("registration-test-resume.pdf", { exact: false })
      .waitFor();
    if (
      (await page.locator('input[name="firstName"]').inputValue()) !==
        "Registration" ||
      (await page.locator('input[name="lastName"]').inputValue()) !== "Test" ||
      (await page.locator('input[name="phone"]').inputValue()) !==
        "+995555010100" ||
      (await page.locator('input[name="location"]').inputValue()) !==
        "Tbilisi, Georgia" ||
      !(await page
        .getByRole("combobox", { name: "Phone country" })
        .textContent())?.includes("+995") ||
      (await page
        .getByRole("combobox", { name: "Phone country" })
        .locator('img[data-country="ge"]')
        .count()) !== 1 ||
      (await page.getByRole("textbox", { name: "Phone number" }).inputValue()).includes(
        "+995"
      )
    ) {
      throw new Error("CV contact details did not fill the step-two form.");
    }
    const prefilledGithub = await page.locator('input[name="githubUrl"]').inputValue();
    const prefilledIntroduction = await page
      .locator('textarea[name="coverLetter"]')
      .inputValue();
    const prefilledSkillsValue = await page.locator('input[name="skills"]').inputValue();
    const prefilledSkills = JSON.parse(prefilledSkillsValue) as string[];
    if (
      prefilledGithub !== "https://github.com/registration-test" ||
      !prefilledIntroduction.includes("TypeScript") ||
      !prefilledSkills.includes("PostgreSQL")
    ) {
      throw new Error(
        `CV links, introduction, or skills were not prefilled: GitHub=${prefilledGithub}, introduction=${prefilledIntroduction}, skills=${prefilledSkillsValue}.`
      );
    }
    await page.route("**/api/skills?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          skills: ["Next.js", "next.js", "Next.js routing", "React", "react"],
          source: "catalog+esco",
        }),
      });
    });
    await page.getByRole("combobox", { name: "Choose skills" }).click();
    const skillSearch = page.getByRole("searchbox", { name: "Search skills" });
    const skillListbox = page.getByRole("listbox", { name: "Skill suggestions" });
    const skillActions = page.locator("[data-skill-actions]");
    await page.waitForFunction(() => {
      const actions = document.querySelector<HTMLElement>("[data-skill-actions]");
      const bounds = actions?.getBoundingClientRect();
      return Boolean(bounds && bounds.bottom <= window.innerHeight - 2);
    });
    await page.waitForTimeout(200);
    const skillActionsBeforeScroll = await skillActions.boundingBox();
    await skillListbox.evaluate((listbox) => {
      listbox.scrollTop = listbox.scrollHeight;
    });
    const skillActionsAfterScroll = await skillActions.boundingBox();
    if (
      !skillActionsBeforeScroll ||
      !skillActionsAfterScroll ||
      Math.abs(skillActionsBeforeScroll.y - skillActionsAfterScroll.y) > 1 ||
      skillActionsAfterScroll.y + skillActionsAfterScroll.height > 900
    ) {
      throw new Error(
        `Skill Select and Clear all actions did not stay visible while scrolling: ${JSON.stringify({ skillActionsBeforeScroll, skillActionsAfterScroll })}.`
      );
    }
    await skillSearch.fill("Next.js");
    await skillListbox
      .getByRole("option", { name: "Next.js", exact: true })
      .waitFor();
    await skillListbox
      .getByRole("option", { name: "Next.js", exact: true })
      .click();
    await page.getByRole("button", { name: "Clear skill search" }).click();
    await skillListbox
      .getByRole("option", { name: "React", exact: true })
      .waitFor();
    const clearAllSkills = page.getByRole("button", {
      name: /^Clear all \(\d+\)$/,
    });
    if (!/^Clear all \([1-9]\d*\)$/.test((await clearAllSkills.textContent())?.trim() ?? "")) {
      throw new Error("Skill picker did not show the selected count on Clear all.");
    }
    await clearAllSkills.click();
    await page.getByRole("button", { name: "Select skills" }).click();
    await skillListbox.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("alert").getByText("Skills", { exact: true }).waitFor();
    await page.getByRole("combobox", { name: "Choose skills" }).click();
    await skillListbox.getByRole("option", { name: "TypeScript", exact: true }).click();
    await skillListbox.getByRole("option", { name: "React", exact: true }).click();
    await skillListbox.getByRole("option", { name: "PostgreSQL", exact: true }).click();
    await page.getByRole("button", { name: "Select skills" }).click();
    await skillListbox.waitFor({ state: "detached" });
    const registrationCardHeights = await page.evaluate(() => {
      const steps = document.querySelector<HTMLElement>(
        "[data-registration-steps]"
      );
      const form = document.querySelector<HTMLElement>(
        "[data-registration-form]"
      );
      return steps && form
          ? {
            steps: steps.getBoundingClientRect().height,
            form: form.getBoundingClientRect().height,
            viewport: window.innerWidth,
            display: getComputedStyle(steps.parentElement as HTMLElement).display,
            columns: getComputedStyle(steps.parentElement as HTMLElement).gridTemplateColumns,
          }
        : null;
    });
    if (
      !registrationCardHeights ||
      Math.abs(registrationCardHeights.steps - registrationCardHeights.form) > 1
    ) {
      throw new Error(
        `Registration form and step cards are not equal height: ${JSON.stringify(registrationCardHeights)}.`
      );
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Preferences", exact: true }).waitFor();
    if (
      (await page.getByText("Expected annual salary", { exact: true }).count()) ||
      (await page.getByText("Preferred work location", { exact: true }).count())
    ) {
      throw new Error("Removed compensation or preferred-location fields remain.");
    }
    const workCountries = "Countries where you can work without sponsorship";
    await page.getByRole("combobox", { name: workCountries }).click();
    const workCountryListbox = page.getByRole("listbox", { name: workCountries });
    const countryActions = page.locator("[data-multi-select-actions]");
    await page.waitForFunction(() => {
      const actions = document.querySelector<HTMLElement>(
        "[data-multi-select-actions]"
      );
      const bounds = actions?.getBoundingClientRect();
      return Boolean(bounds && bounds.bottom <= window.innerHeight - 2);
    });
    await page.waitForTimeout(200);
    const countryActionsBeforeScroll = await countryActions.boundingBox();
    await workCountryListbox.evaluate((listbox) => {
      listbox.scrollTop = listbox.scrollHeight;
    });
    const countryActionsAfterScroll = await countryActions.boundingBox();
    if (
      !countryActionsBeforeScroll ||
      !countryActionsAfterScroll ||
      Math.abs(countryActionsBeforeScroll.y - countryActionsAfterScroll.y) > 1 ||
      countryActionsAfterScroll.y + countryActionsAfterScroll.height > 900
    ) {
      throw new Error(
        `Country Done and Clear actions did not stay visible while scrolling: ${JSON.stringify({ countryActionsBeforeScroll, countryActionsAfterScroll })}.`
      );
    }
    const workCountrySearch = page.getByRole("searchbox", {
      name: `${workCountries} search`,
    });
    await workCountrySearch.fill("Georgia");
    await workCountryListbox
      .getByRole("option", { name: /Georgia/ })
      .click();
    await page.getByRole("button", { name: "Done" }).click();
    const sponsorshipQuestion = "Visa sponsorship outside selected countries";
    await page.getByRole("combobox", { name: sponsorshipQuestion }).click();
    await page
      .getByRole("listbox", { name: sponsorshipQuestion })
      .getByRole("option", { name: /No.*selected countries/ })
      .click();
    if (
      (await page.locator('input[name="needsSponsorship"]').inputValue()) !== "no"
    ) {
      throw new Error("Application-question dropdown did not update its form value.");
    }
    const preferenceControlTops = await page.evaluate(() => {
      const sponsorship = document.querySelector<HTMLElement>(
        '[aria-label="Visa sponsorship outside selected countries"]'
      );
      const notice = document.querySelector<HTMLElement>(
        '[aria-label="Notice period"]'
      );
      return sponsorship && notice
        ? {
            sponsorship: sponsorship.getBoundingClientRect().top,
            notice: notice.getBoundingClientRect().top,
          }
        : null;
    });
    if (
      !preferenceControlTops ||
      Math.abs(preferenceControlTops.sponsorship - preferenceControlTops.notice) > 1
    ) {
      throw new Error("Sponsorship and notice-period controls are not aligned.");
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByRole("alert")
      .getByText("Notice period", { exact: true })
      .waitFor();
    await page.getByRole("combobox", { name: "Notice period" }).click();
    await page
      .getByRole("listbox", { name: "Notice period" })
      .getByRole("option", { name: "2 weeks", exact: true })
      .click();
    if ((await page.locator('input[name="noticePeriod"]').inputValue()) !== "2 weeks") {
      throw new Error("Notice-period dropdown did not update its form value.");
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Experience", exact: true }).waitFor();
    const experienceControlTops = await page.evaluate(() => {
      const selectors = [
        'input[name="yearsProductExperience"]',
        'input[name="yearsAiExperience"]',
        '[aria-label="Medical or healthcare experience?"]',
      ];
      return selectors.map(
        (selector) =>
          document.querySelector<HTMLElement>(selector)?.getBoundingClientRect().top ?? -1
      );
    });
    if (
      experienceControlTops.some((top) => top < 0) ||
      Math.max(...experienceControlTops) - Math.min(...experienceControlTops) > 1
    ) {
      throw new Error(
        `Common employer-question controls are not aligned: ${JSON.stringify(experienceControlTops)}.`
      );
    }
    const typescriptAnswer = await page
      .locator('input[name="typescriptExperience"]')
      .inputValue();
    const aiProductionAnswer = await page
      .locator('input[name="aiProductionExperience"]')
      .inputValue();
    const aiFrameworksAnswer = await page
      .locator('input[name="aiFrameworksExperience"]')
      .inputValue();
    if (
      typescriptAnswer !== "yes" ||
      aiProductionAnswer !== "yes" ||
      aiFrameworksAnswer !== "yes"
    ) {
      throw new Error(
        `CV answers were not applied to the dropdown form: TypeScript=${typescriptAnswer}, AI=${aiProductionAnswer}.`
      );
    }
    await page.getByRole("combobox", { name: "Gender" }).click();
    await page
      .getByRole("listbox", { name: "Gender" })
      .getByRole("option", { name: "Prefer not to say" })
      .click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Permissions", exact: true }).waitFor();
    await page.getByRole("button", { name: "Create account and find jobs" }).click();
    try {
      await page.waitForURL("**/dashboard/jobs", { timeout: 45_000 });
    } catch {
      const messages = await page.locator('[aria-live="polite"], [role="alert"]').allTextContents();
      throw new Error(
        `Registration stayed on ${page.url()}. API: ${apiResponses.join(", ")}. UI: ${messages.join(" | ")}`
      );
    }

    const session = await page.evaluate(async () => {
      const response = await fetch("/api/auth/me");
      return {
        status: response.status,
        data: await response.json(),
        documentCookie: document.cookie,
      };
    });
    userId = (session.data as { user?: { id?: string } }).user?.id ?? null;
    if (
      session.status !== 200 ||
      !userId ||
      session.documentCookie.includes("apply-ink-auth")
    ) {
      throw new Error("Registration did not create an HTTP-only account session.");
    }
    const storedOnboarding = await postgresQuery<{
      github_url: string;
      cover_letter: string;
      skills_inventory_json: { skills?: Array<{ name?: string }> } | string;
      application_answers: {
        workAuthorizationCountries?: string[];
        gender?: string;
        typescriptExperience?: string;
        aiFrameworksExperience?: string;
      } | string;
    }>(
      `SELECT github_url, cover_letter, skills_inventory_json, application_answers
       FROM candidate_profiles WHERE session_id = $1`,
      [`user:${userId}`]
    );
    const onboardingRow = storedOnboarding.rows[0];
    const storedSkills =
      typeof onboardingRow.skills_inventory_json === "string"
        ? JSON.parse(onboardingRow.skills_inventory_json)
        : onboardingRow.skills_inventory_json;
    const storedAnswers =
      typeof onboardingRow.application_answers === "string"
        ? JSON.parse(onboardingRow.application_answers)
        : onboardingRow.application_answers;
    if (
      onboardingRow.github_url !== "https://github.com/registration-test" ||
      !onboardingRow.cover_letter.includes("TypeScript") ||
      !storedSkills.skills?.some((skill: { name?: string }) => skill.name === "PostgreSQL") ||
      !storedAnswers.workAuthorizationCountries?.includes("ge") ||
      storedAnswers.gender !== "prefer_not_to_say" ||
      storedAnswers.typescriptExperience !== "yes" ||
      storedAnswers.aiFrameworksExperience !== "yes"
    ) {
      throw new Error("New registration answers were not persisted in PostgreSQL.");
    }
    if (duplicateKeyErrors.length > 0) {
      throw new Error(`Dashboard rendered duplicate keys: ${duplicateKeyErrors[0]}`);
    }
    await page
      .getByRole("heading", { name: "Work From Anywhere Jobs", exact: true })
      .waitFor();
    const dashboardOverflow = await page.evaluate(() => {
      const outer = document.querySelector<HTMLElement>("[data-dashboard-scroll]");
      const content = document.querySelector<HTMLElement>("[data-dashboard-content]");
      if (!outer || !content) return null;
      const outerStyle = getComputedStyle(outer);
      const contentStyle = getComputedStyle(content);
      return {
        outerX: outerStyle.overflowX,
        outerY: outerStyle.overflowY,
        contentX: contentStyle.overflowX,
        contentY: contentStyle.overflowY,
      };
    });
    if (
      !dashboardOverflow ||
      dashboardOverflow.outerX !== "auto" ||
      dashboardOverflow.outerY !== "auto" ||
      dashboardOverflow.contentX !== "visible" ||
      dashboardOverflow.contentY !== "visible"
    ) {
      throw new Error("Dashboard scrollbars are not owned by the outer viewport.");
    }
    if (
      (await page
        .getByRole("button", { name: /Upload your (?:CV|resume)/ })
        .count()) > 0
    ) {
      throw new Error("Dashboard header still includes the CV upload button.");
    }
    await page.getByRole("button", { name: "Open notifications" }).click();
    const notificationPopup = page.getByRole("dialog", {
      name: "Notifications",
    });
    await notificationPopup.waitFor();
    if (!(await notificationPopup.textContent())?.trim()) {
      throw new Error("Notification popup did not contain placeholder text.");
    }
    await page.getByRole("button", { name: "Open notifications" }).click();
    await notificationPopup.waitFor({ state: "detached" });

    const searchRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === "/api/jobs" && url.searchParams.get("q") === "Senior";
    });
    const searchStartedAt = Date.now();
    await page.getByRole("searchbox", { name: "Search jobs" }).fill("Senior");
    await searchRequest;
    if (Date.now() - searchStartedAt < 300) {
      throw new Error("Job search request was not debounced.");
    }
    await page.getByRole("searchbox", { name: "Search jobs" }).fill("");
    await page.waitForTimeout(450);

    let roleRequestResolved = false;
    const roleRequest = page
      .waitForRequest((request) => {
        const url = new URL(request.url());
        return (
          url.pathname === "/api/jobs" &&
          url.searchParams.get("role") === "frontend"
        );
      })
      .then((request) => {
        roleRequestResolved = true;
        return request;
      });
    await page.getByRole("combobox", { name: "Role" }).click();
    const roleListbox = page.getByRole("listbox", { name: "Role" });
    await page.waitForFunction(() =>
      document
        .querySelector('[role="listbox"][aria-label="Role"]')
        ?.classList.contains("opacity-100")
    );
    await roleListbox.getByRole("option", { name: "Frontend", exact: true }).click();
    await page.waitForFunction(() =>
      document
        .querySelector('[role="listbox"][aria-label="Role"]')
        ?.classList.contains("opacity-0")
    );
    if (roleRequestResolved) {
      throw new Error("Filter update interrupted the dropdown close animation.");
    }
    await roleListbox.waitFor({ state: "detached" });
    await roleRequest;

    const locationRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === "/api/jobs" && url.searchParams.get("location") === "europe";
    });
    await page.getByRole("combobox", { name: "Location" }).click();
    await page
      .getByRole("listbox", { name: "Location" })
      .getByRole("option", { name: "Europe", exact: true })
      .click();
    await locationRequest;

    await page.getByRole("button", { name: "Salary" }).click();
    const salaryDialog = page.getByRole("dialog", { name: "Salary range" });
    await salaryDialog.waitFor();
    await page
      .getByRole("spinbutton", { name: "Minimum hourly salary" })
      .fill("50");
    await page
      .getByRole("spinbutton", { name: "Maximum hourly salary" })
      .fill("75");
    if (
      (await page
        .getByRole("spinbutton", { name: "Minimum monthly salary" })
        .inputValue()) !== "8666.67" ||
      (await page
        .getByRole("spinbutton", { name: "Minimum yearly salary" })
        .inputValue()) !== "104000" ||
      (await page
        .getByRole("spinbutton", { name: "Maximum yearly salary" })
        .inputValue()) !== "156000"
    ) {
      throw new Error("Salary rates did not stay synchronized.");
    }
    const salaryRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname === "/api/jobs" &&
        url.searchParams.get("minSalary") === "104000" &&
        url.searchParams.get("maxSalary") === "156000"
      );
    });
    await salaryDialog
      .getByRole("button", { name: /^(?:Select|Use salary range)$/ })
      .click();
    await salaryRequest;
    await page.getByRole("button", { name: "Salary" }).click();
    await page
      .getByRole("spinbutton", { name: "Minimum hourly salary" })
      .fill("100");
    await salaryDialog.getByRole("button", { name: "Cancel" }).click();
    if (!(await page.getByRole("button", { name: "Salary" }).textContent())?.includes("$104k - $156k")) {
      throw new Error("Cancel changed the selected salary range.");
    }

    await page.getByText("More filters", { exact: true }).waitFor();
    const postedRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === "/api/jobs" && url.searchParams.get("postedWithinDays") === "7";
    });
    await page.getByRole("combobox", { name: "Posted within" }).click();
    await page
      .getByRole("listbox", { name: "Posted within" })
      .getByRole("option", { name: "Past week", exact: true })
      .click();
    await postedRequest;
    const matchRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === "/api/jobs" && url.searchParams.get("minMatch") === "90";
    });
    await page.getByRole("combobox", { name: "Minimum match" }).click();
    await page
      .getByRole("listbox", { name: "Minimum match" })
      .getByRole("option", { name: "90%+ match", exact: true })
      .click();
    await matchRequest;
    await page.getByRole("button", { name: "Clear filters" }).click();
    if (
      !(await page.getByRole("combobox", { name: "Role" }).textContent())?.includes(
        "All roles"
      ) ||
      !(await page
        .getByRole("combobox", { name: "Location" })
        .textContent())?.includes("Worldwide jobs")
    ) {
      throw new Error("Clear filters did not reset the dropdowns.");
    }
    if ((await page.locator("select").count()) !== 0) {
      throw new Error("A native select remained after the dropdown migration.");
    }

    const jobCard = page
      .locator('[role="button"]')
      .filter({ hasText: "Senior Test Engineer" });
    await jobCard.click();
    const dialog = page.getByRole("dialog", {
      name: "Senior Test Engineer job details",
    });
    await dialog.waitFor();
    await page.waitForFunction(() =>
      document
        .querySelector('[role="dialog"]')
        ?.classList.contains("translate-x-0")
    );
    const backdrop = page.getByRole("button", { name: "Close job details" });
    if ((await backdrop.count()) !== 1) {
      throw new Error("Job details did not render a dark overlay backdrop.");
    }
    await page.getByRole("button", { name: "Close details" }).click();
    await page.waitForFunction(() =>
      document
        .querySelector('[role="dialog"]')
        ?.classList.contains("translate-x-full")
    );
    await dialog.waitFor({ state: "detached" });

    await page.getByRole("button", { name: /Messages/ }).click();
    await page.waitForURL("**/dashboard/messages");
    if ((await page.locator('a[aria-label="Apply Ink home"]').count()) !== 1) {
      throw new Error("Dashboard logo does not link to the landing page.");
    }

    console.log(
      JSON.stringify({
        registrationForm: true,
        stepByStepQuestions: true,
        resumeIsSecondStep: true,
        resumeFirstPrefill: true,
        countryPhoneInput: true,
        searchableCountryCode: true,
        splitLocalPhoneNumber: true,
        ipDerivedPhoneCountry: true,
        countryPhonePlaceholder: true,
        phoneLengthAndValidity: true,
        equalRegistrationCards: true,
        headerRegisterAnchor: true,
        validatesBeforeAccountCreation: true,
        resumeUpload: true,
        approvedResumeState: true,
        resumeReplaceAndRemove: true,
        cvAnswerPrefill: true,
        measuredCvProgress: true,
        duplicateSkillsRemoved: true,
        pinnedDropdownActions: true,
        introductionSkillsAndLinksStored: true,
        workAuthorizationStored: true,
        optionalDemographicsStored: true,
        httpOnlyInBrowser: true,
        jobsRoute: true,
        duplicateClientKeysPrevented: true,
        notificationOnlyHeader: true,
        notificationPopup: true,
        outerDashboardScrollbars: true,
        debouncedJobSearch: true,
        workingJobFilters: true,
        worldwideJobsDefault: true,
        animatedDropdowns: true,
        smoothDropdownClose: true,
        nativeSelectsRemoved: true,
        salaryRangePopup: true,
        linkedSalaryPeriods: true,
        persistentMoreFilters: true,
        animatedJobDrawer: true,
        jobDrawerBackdrop: true,
        messagesRoute: true,
        sidebarHomeLink: true,
      })
    );
  } finally {
    await browser.close();
    if (!userId) {
      const result = await postgresQuery<{ id: string }>(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      userId = result.rows[0]?.id ?? null;
    }
    if (userId) {
      const sessionId = `user:${userId}`;
      await postgresQuery("DELETE FROM api_usage WHERE session_id = $1", [sessionId]);
      await postgresQuery("DELETE FROM user_applications WHERE session_id = $1", [sessionId]);
      await postgresQuery("DELETE FROM candidate_profiles WHERE session_id = $1", [sessionId]);
      await postgresQuery("DELETE FROM users WHERE id = $1 AND email = $2", [userId, email]);
    }
    await closePostgresPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
