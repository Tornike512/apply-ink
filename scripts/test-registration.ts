import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import { closePostgresPool, postgresQuery } from "../src/lib/postgres";

const ORIGIN = process.env.APPLY_INK_TEST_ORIGIN ?? "http://localhost:3000";

async function main() {
  const suffix = randomUUID();
  const email = `registration-${suffix}@example.test`;
  let userId: string | null = null;
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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
    await page.getByRole("link", { name: "Register", exact: true }).click();
    await page.waitForURL("**/register#register");
    const formTop = await page.locator("#register").evaluate((section) =>
      section.getBoundingClientRect().top
    );
    if (formTop < 70 || formTop > 140) {
      throw new Error("Header Register link did not scroll to the form.");
    }
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(`Account-${suffix}-6`);
    await page
      .locator('input[name="passwordConfirmation"]')
      .fill(`Account-${suffix}-6`);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Resume", exact: true }).waitFor();
    await page.getByText("Fill the form from your resume", { exact: true }).waitFor();
    await page
      .getByRole("button", {
        name: /^(?:Upload CV and fill my form|Replace CV and refill form)$/,
      })
      .waitFor();
    await page.locator('input[name="firstName"]').fill("");
    await page.locator('input[name="lastName"]').fill("");
    await page.getByRole("textbox", { name: "Phone number" }).fill("");
    await page.locator('input[name="location"]').fill("");
    await page.locator('input[name="linkedinUrl"]').fill("");
    await page.getByRole("combobox", { name: "Phone country" }).click();
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
    await page.getByText("No usable CV text was found", { exact: false }).waitFor();
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
            aiProductionExperience: "yes",
            typescriptExperience: "yes",
          },
          filledFields: [
            "firstName",
            "lastName",
            "phone",
            "location",
            "linkedinUrl",
            "aiProductionExperience",
            "typescriptExperience",
          ],
        }),
      });
    });
    await page.locator('input[name="resume"]').setInputFiles({
      name: "registration-test-resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Registration Test\nProduct engineer with TypeScript, React, Node.js, PostgreSQL, and production AI experience. Built and shipped reliable remote software products."
      ),
    });
    await page.getByText("answers filled from your CV", { exact: false }).waitFor();
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
        .textContent())?.includes("Georgia")
    ) {
      throw new Error("CV contact details did not fill the step-two form.");
    }
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
          }
        : null;
    });
    if (
      !registrationCardHeights ||
      Math.abs(registrationCardHeights.steps - registrationCardHeights.form) > 1
    ) {
      throw new Error("Registration form and step cards are not equal height.");
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Preferences", exact: true }).waitFor();
    const sponsorshipQuestion = "Do you need visa sponsorship?";
    await page.getByRole("combobox", { name: sponsorshipQuestion }).click();
    await page
      .getByRole("listbox", { name: sponsorshipQuestion })
      .getByRole("option", { name: "No", exact: true })
      .click();
    if (
      (await page.locator('input[name="needsSponsorship"]').inputValue()) !== "no"
    ) {
      throw new Error("Application-question dropdown did not update its form value.");
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Experience", exact: true }).waitFor();
    const typescriptAnswer = await page
      .locator('input[name="typescriptExperience"]')
      .inputValue();
    const aiProductionAnswer = await page
      .locator('input[name="aiProductionExperience"]')
      .inputValue();
    if (
      typescriptAnswer !== "yes" ||
      aiProductionAnswer !== "yes"
    ) {
      throw new Error(
        `CV answers were not applied to the dropdown form: TypeScript=${typescriptAnswer}, AI=${aiProductionAnswer}.`
      );
    }
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
    if ((await page.getByRole("button", { name: "Upload your CV" }).count()) > 0) {
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
    await salaryDialog.getByRole("button", { name: "Select" }).click();
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
        equalRegistrationCards: true,
        headerRegisterAnchor: true,
        validatesBeforeAccountCreation: true,
        resumeUpload: true,
        cvAnswerPrefill: true,
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
