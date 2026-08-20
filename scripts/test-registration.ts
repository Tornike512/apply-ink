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
    const apiResponses: string[] = [];
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
    await page.locator('input[name="firstName"]').fill("Registration");
    await page.locator('input[name="lastName"]').fill("Test");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(`Account-${suffix}-6`);
    await page
      .locator('input[name="passwordConfirmation"]')
      .fill(`Account-${suffix}-6`);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Resume", exact: true }).waitFor();
    await page.locator('input[name="phone"]').fill("+1 555 0100");
    await page.locator('input[name="location"]').fill("Remote");
    await page.locator('input[name="resume"]').setInputFiles({
      name: "invalid-resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Too short"),
    });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Preferences", exact: true }).waitFor();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Experience", exact: true }).waitFor();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Permissions", exact: true }).waitFor();
    await page.getByRole("button", { name: "Create account and find jobs" }).click();
    await page.getByText("No usable CV text was found", { exact: false }).waitFor();
    const prematureUser = await postgresQuery<{ count: string }>(
      "SELECT COUNT(*) AS count FROM users WHERE email = $1",
      [email]
    );
    if (Number(prematureUser.rows[0].count) !== 0) {
      throw new Error("Invalid registration created an account before validation.");
    }

    await page.locator('input[name="resume"]').setInputFiles({
      name: "registration-test-resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Registration Test\nProduct engineer with TypeScript, React, Node.js, PostgreSQL, and production AI experience. Built and shipped reliable remote software products."
      ),
    });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Preferences", exact: true }).waitFor();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("heading", { name: "Experience", exact: true }).waitFor();
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

    await page.getByRole("button", { name: /Messages/ }).click();
    await page.waitForURL("**/dashboard/messages");
    if ((await page.locator('a[aria-label="Apply Ink home"]').count()) !== 1) {
      throw new Error("Dashboard logo does not link to the landing page.");
    }

    console.log(
      JSON.stringify({
        registrationForm: true,
        stepByStepQuestions: true,
        headerRegisterAnchor: true,
        validatesBeforeAccountCreation: true,
        resumeUpload: true,
        httpOnlyInBrowser: true,
        jobsRoute: true,
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
