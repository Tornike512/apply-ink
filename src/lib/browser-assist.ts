import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  chromium,
  type BrowserContext,
  type Frame,
} from "playwright-core";
import type { StoredCandidateProfile } from "@/lib/application-store";
import { portfolioUrlForApplication } from "@/lib/application-profile-values";
import type { Job } from "@/lib/jobs";

type GlobalWithBrowser = typeof globalThis & {
  __applyInkBrowserContext?: BrowserContext;
  __applyInkBrowserPromise?: Promise<BrowserContext>;
};

export type BrowserAssistResult = {
  opened: boolean;
  fieldsFilled: number;
  captchaDetected: boolean;
  autoSubmitted: boolean;
  blockerReason: string | null;
};

async function getBrowserContext(): Promise<BrowserContext> {
  const globalBrowser = globalThis as GlobalWithBrowser;
  if (globalBrowser.__applyInkBrowserContext) {
    return globalBrowser.__applyInkBrowserContext;
  }
  if (globalBrowser.__applyInkBrowserPromise) {
    return globalBrowser.__applyInkBrowserPromise;
  }

  const userDataDirectory = path.join(process.cwd(), "data", "apply-browser");
  mkdirSync(userDataDirectory, { recursive: true });
  globalBrowser.__applyInkBrowserPromise = chromium
    .launchPersistentContext(userDataDirectory, {
      channel: "chrome",
      headless: false,
      viewport: null,
      args: ["--start-maximized"],
    })
    .then((context) => {
      globalBrowser.__applyInkBrowserContext = context;
      globalBrowser.__applyInkBrowserPromise = undefined;
      context.on("close", () => {
        globalBrowser.__applyInkBrowserContext = undefined;
      });
      return context;
    })
    .catch((error) => {
      globalBrowser.__applyInkBrowserPromise = undefined;
      throw error;
    });
  return globalBrowser.__applyInkBrowserPromise;
}

async function fillFirst(
  frame: Frame,
  selectors: string[],
  value: string
): Promise<boolean> {
  if (!value) return false;
  for (const selector of selectors) {
    const locator = frame.locator(selector).first();
    try {
      if ((await locator.count()) && (await locator.isVisible())) {
        await locator.fill(value, { timeout: 1_500 });
        return true;
      }
    } catch {
      // Try the next selector when a site replaces an input while loading.
    }
  }
  return false;
}

async function fillFirstLabel(
  frame: Frame,
  labels: RegExp[],
  value: string
): Promise<boolean> {
  if (!value) return false;
  for (const label of labels) {
    const locator = frame.getByLabel(label).first();
    try {
      if ((await locator.count()) && (await locator.isVisible())) {
        await locator.fill(value, { timeout: 1_500 });
        return true;
      }
    } catch {
      // Try the next label when a custom input is not directly editable.
    }
  }
  return false;
}

async function chooseYesNo(
  frame: Frame,
  questions: RegExp[],
  answer: "" | "yes" | "no"
): Promise<boolean> {
  if (!answer) return false;
  const optionName = answer === "yes" ? /^yes$/i : /^no$/i;
  for (const question of questions) {
    try {
      const group = frame.getByRole("group", { name: question }).first();
      if (await group.count()) {
        const option = group.getByRole("radio", { name: optionName }).first();
        if ((await option.count()) && (await option.isVisible())) {
          await option.check({ timeout: 1_500 });
          return true;
        }
      }

      const questionText = frame.getByText(question).first();
      if (!(await questionText.count())) continue;
      const container = questionText.locator(
        "xpath=ancestor::*[.//input[@type='radio']][1]"
      );
      const option = container.getByLabel(optionName).first();
      if ((await option.count()) && (await option.isVisible())) {
        await option.check({ timeout: 1_500 });
        return true;
      }
    } catch {
      // Leave ambiguous or custom questions for the user.
    }
  }
  return false;
}

async function checkConsent(
  frame: Frame,
  labels: RegExp[],
  allowed: boolean
): Promise<boolean> {
  if (!allowed) return false;
  for (const label of labels) {
    try {
      const checkbox = frame.getByLabel(label).first();
      if ((await checkbox.count()) && (await checkbox.isVisible())) {
        await checkbox.check({ timeout: 1_500 });
        return true;
      }
    } catch {
      // Consent remains unchecked when the label is unclear.
    }
  }
  return false;
}

async function openLinkedApplication(pageUrl: string, frame: Frame) {
  const applyLink = frame
    .getByRole("link", {
      name: /^(?:apply|apply now|apply for this (?:job|position))$/i,
    })
    .first();
  try {
    if (!(await applyLink.count()) || !(await applyLink.isVisible())) return null;
    const href = await applyLink.getAttribute("href");
    if (!href) return null;
    const destination = new URL(href, pageUrl);
    return destination.protocol === "https:" ? destination.toString() : null;
  } catch {
    return null;
  }
}

async function findSubmitButton(frame: Frame) {
  const buttonPatterns = [
    frame.getByRole("button", { name: /^submit$/i }),
    frame.getByRole("button", { name: /^submit application$/i }),
    frame.getByRole("button", { name: /^apply$/i }),
    frame.getByRole("button", { name: /^apply now$/i }),
    frame.getByRole("button", { name: /^send application$/i }),
    frame.locator('button[type="submit"]'),
    frame.locator('input[type="submit"]'),
  ];

  for (const pattern of buttonPatterns) {
    const button = pattern.first();
    try {
      if ((await button.count()) && (await button.isVisible()) && (await button.isEnabled())) {
        return button;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function checkForUnfilledRequired(frame: Frame): Promise<string[]> {
  const unfilled: string[] = [];
  try {
    const requiredInputs = await frame.locator('input[required], select[required], textarea[required]').all();
    for (const input of requiredInputs) {
      try {
        if (!(await input.isVisible())) continue;
        const value = await input.inputValue().catch(() => "");
        const tagName = await input.evaluate((el) => el.tagName.toLowerCase());

        if (tagName === "select") {
          const selectedIndex = await input.evaluate((el: HTMLSelectElement) => el.selectedIndex);
          if (selectedIndex <= 0) {
            const label = await input.getAttribute("aria-label") || await input.getAttribute("name") || "field";
            unfilled.push(label);
          }
        } else if (!value?.trim()) {
          const label = await input.getAttribute("aria-label") || await input.getAttribute("name") || "field";
          unfilled.push(label);
        }
      } catch {
        continue;
      }
    }
  } catch {
    // If we can't check, assume fields might be unfilled
  }
  return unfilled;
}

async function fillFrame(
  frame: Frame,
  profile: StoredCandidateProfile
): Promise<number> {
  let filled = 0;
  const fill = async (selectors: string[], value: string) => {
    if (await fillFirst(frame, selectors, value)) filled += 1;
  };

  await fill(
    [
      'input[autocomplete="given-name"]',
      'input[name*="first_name" i]',
      'input[name*="firstname" i]',
      'input[id*="first_name" i]',
      'input[id*="firstname" i]',
    ],
    profile.firstName
  );
  await fill(
    [
      'input[autocomplete="family-name"]',
      'input[name*="last_name" i]',
      'input[name*="lastname" i]',
      'input[id*="last_name" i]',
      'input[id*="lastname" i]',
    ],
    profile.lastName
  );
  await fill(
    [
      'input[autocomplete="name"]',
      'input[name="name" i]',
      'input[name*="full_name" i]',
      'input[id*="full_name" i]',
    ],
    `${profile.firstName} ${profile.lastName}`.trim()
  );
  await fill(
    [
      'input[type="email"]',
      'input[autocomplete="email"]',
      'input[name*="email" i]',
    ],
    profile.email
  );
  await fill(
    [
      'input[type="tel"]',
      'input[autocomplete="tel"]',
      'input[name*="phone" i]',
    ],
    profile.phone
  );
  await fill(
    [
      'input[autocomplete="address-level2"]',
      'input[name*="location" i]',
      'input[id*="location" i]',
    ],
    profile.location
  );
  await fill(
    [
      'input[name*="linkedin" i]',
      'input[id*="linkedin" i]',
      'input[placeholder*="linkedin" i]',
    ],
    profile.linkedinUrl
  );
  await fill(
    [
      'input[name*="portfolio" i]',
      'input[id*="portfolio" i]',
      'input[name*="website" i]',
      'input[placeholder*="portfolio" i]',
    ],
    portfolioUrlForApplication(profile)
  );
  await fill(
    [
      'input[name*="github" i]',
      'input[id*="github" i]',
      'input[placeholder*="github" i]',
    ],
    profile.githubUrl
  );
  await fill(
    [
      'textarea[name*="cover_letter" i]',
      'textarea[id*="cover_letter" i]',
      'textarea[aria-label*="cover letter" i]',
    ],
    profile.coverLetter
  );

  const labeledFill = async (labels: RegExp[], value: string) => {
    if (await fillFirstLabel(frame, labels, value)) filled += 1;
  };
  const answers = profile.applicationAnswers;
  await labeledFill(
    [/countries.*authori[sz]ed to work/i, /work authori[sz]ation countries/i],
    answers.workAuthorizationCountries.join(", ").toUpperCase()
  );
  await labeledFill([/notice period/i, /available to start/i], answers.noticePeriod);
  await labeledFill(
    [/years.*product.*experience/i, /product experience.*years/i],
    answers.yearsProductExperience
  );
  await labeledFill(
    [/years.*(?:ai|artificial intelligence).*experience/i],
    answers.yearsAiExperience
  );

  const yesNo = async (
    questions: RegExp[],
    answer: "" | "yes" | "no"
  ) => {
    if (await chooseYesNo(frame, questions, answer)) filled += 1;
  };
  await yesNo([/visa sponsorship/i, /require sponsorship/i], answers.needsSponsorship);
  await yesNo([/medical field/i, /healthcare experience/i], answers.medicalExperience);
  await yesNo([/startup/i, /high-growth experience/i], answers.startupExperience);
  await yesNo(
    [/built.*(?:ai|llm).*(?:production|deployed)/i, /shipped.*ai.*production/i],
    answers.aiProductionExperience
  );
  await yesNo(
    [/typescript/i, /javascript.*(?:react|node)/i],
    answers.typescriptExperience
  );
  await yesNo(
    [/langchain/i, /llamaindex/i, /ai orchestration framework/i],
    answers.aiFrameworksExperience
  );

  if (
    await checkConsent(
      frame,
      [
        /^(?![\s\S]*talent pool)[\s\S]*privacy (?:notice|statement)/i,
        /^(?![\s\S]*talent pool)[\s\S]*data processing.*required/i,
      ],
      profile.privacyConsentAllowed
    )
  ) {
    filled += 1;
  }
  if (
    await checkConsent(
      frame,
      [/talent pool/i],
      profile.talentPoolOptIn
    )
  ) {
    filled += 1;
  }

  if (profile.resumeData && profile.resumeFileName) {
    const fileInput = frame.locator('input[type="file"]').first();
    try {
      if (await fileInput.count()) {
        await fileInput.setInputFiles(
          {
            name: profile.resumeFileName,
            mimeType: profile.resumeMimeType ?? "application/octet-stream",
            buffer: profile.resumeData,
          },
          { timeout: 2_000 }
        );
        filled += 1;
      }
    } catch {
      // The user can attach the resume manually when a custom uploader blocks it.
    }
  }

  return filled;
}

export async function launchAssistedApplication(
  job: Job,
  profile: StoredCandidateProfile
): Promise<BrowserAssistResult> {
  if (!/^https:\/\//i.test(job.url)) {
    return { opened: false, fieldsFilled: 0, captchaDetected: false, autoSubmitted: false, blockerReason: null };
  }

  const context = await getBrowserContext();
  const page = await context.newPage();
  await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const linkedApplication = await openLinkedApplication(page.url(), page.mainFrame());
  if (linkedApplication && linkedApplication !== page.url()) {
    await page.goto(linkedApplication, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
  }

  await page.waitForTimeout(1_000);
  let fieldsFilled = 0;
  for (const frame of page.frames()) {
    fieldsFilled += await fillFrame(frame, profile);
  }

  const captchaDetected = page.frames().some((frame) =>
    /(?:recaptcha|hcaptcha|turnstile|captcha)/i.test(frame.url())
  );

  let autoSubmitted = false;
  let blockerReason: string | null = null;

  if (captchaDetected) {
    blockerReason = "CAPTCHA detected";
  } else {
    const unfilledFields = await checkForUnfilledRequired(page.mainFrame());
    if (unfilledFields.length > 0) {
      blockerReason = `Required fields not filled: ${unfilledFields.slice(0, 3).join(", ")}`;
    } else {
      const submitButton = await findSubmitButton(page.mainFrame());
      if (submitButton) {
        try {
          await submitButton.click({ timeout: 2_000 });
          await page.waitForTimeout(1_500);
          autoSubmitted = true;
        } catch {
          blockerReason = "Submit button not clickable";
        }
      } else {
        blockerReason = "Submit button not found";
      }
    }
  }

  if (!autoSubmitted) {
    await page.evaluate(
      ({ filled, captcha, reason }) => {
        document.getElementById("apply-ink-assistant")?.remove();
        const banner = document.createElement("div");
        banner.id = "apply-ink-assistant";
        banner.style.cssText =
          "position:fixed;z-index:2147483647;left:16px;right:16px;bottom:16px;padding:14px 18px;border-radius:8px;background:#2f241f;color:#fff4df;font:600 14px system-ui;box-shadow:0 8px 30px #0004";
        banner.textContent = `${filled} fields filled by Apply Ink. ${reason}. Review and submit the form yourself.`;
        document.body.appendChild(banner);
      },
      { filled: fieldsFilled, captcha: captchaDetected, reason: blockerReason }
    );
  }

  await page.bringToFront();

  return { opened: true, fieldsFilled, captchaDetected, autoSubmitted, blockerReason };
}
