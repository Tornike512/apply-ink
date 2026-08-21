import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { POST as postApplication } from "../app/api/applications/route";
import {
  claimDailyApiAction,
  getApplicationByJobId,
  getCandidateProfile,
  saveCandidateProfile,
  type StoredCandidateProfile,
} from "../src/lib/application-store";
import { AUTH_COOKIE, createAuthToken } from "../src/lib/auth";
import { tryDirectAtsApply } from "../src/lib/ats-apply";
import { AUTO_APPLY_RULES, decideJob } from "../src/lib/auto-apply";
import {
  EMPTY_APPLICATION_ANSWERS,
  EMPTY_CANDIDATE_PROFILE,
} from "../src/lib/candidate-profile";
import type { Job } from "../src/lib/jobs";
import { closePostgresPool, postgresQuery } from "../src/lib/postgres";
import {
  ResumeUploadError,
  resumeFieldsFromFile,
} from "../src/lib/profile-form";
import {
  generateTailoredResumePdf,
  type TailoredResumeContent,
} from "../src/lib/resume-pdf";
import { extractResumeText } from "../src/lib/resume-parser";
import {
  getTailoredResumeCacheDetails,
  prepareTailoredResume,
  ResumeTailoringError,
  validateTailoredResumeContent,
} from "../src/lib/resume-tailoring";
import { writeTailoredResume } from "../src/lib/tailored-resume-store";
import { createUser } from "../src/lib/user-store";

type CaseKind = "test" | "known-gap";

type ManualTestCase = {
  id: string;
  description: string;
  failureMeans: string;
  kind?: CaseKind;
  run: () => Promise<void>;
};

type DatabaseContext = {
  userId: string;
  sessionId: string;
  authToken: string;
};

type RouteResponseBody = {
  application: {
    id: string;
    status: string;
    method: string;
    via: string;
    tailoredResumeFileName: string | null;
  };
  browserOpened: boolean;
  note: string;
  error: string;
};

type RouteResult = {
  response: Response;
  body: RouteResponseBody;
};

type WorkablePayload = {
  candidate: {
    firstname: string;
    email: string;
    resume: {
      name: string;
      data: string;
    };
  };
};

const TEST_ORIGIN = "http://localhost:3000";
const RUN_ID = randomUUID();
const ORIGINAL_FETCH = globalThis.fetch;
const MANAGED_ENV_KEYS = [
  "GREENHOUSE_JOB_BOARD_API_KEYS",
  "WORKABLE_ACCESS_TOKENS",
  "OPENAI_API_KEY",
] as const;
const ORIGINAL_ENV = Object.fromEntries(
  MANAGED_ENV_KEYS.map((key) => [key, process.env[key]])
) as Record<(typeof MANAGED_ENV_KEYS)[number], string | undefined>;
const cachedResumeKeys = new Set<string>();

let databaseContextPromise: Promise<DatabaseContext> | null = null;
let databaseUserId: string | null = null;
let jobSequence = 0;

const readableResumeText = `
Jamie Candidate
jamie@example.test
Tbilisi, Georgia
Product Engineer at Acme Corp
January 2020 - Present
Improved conversion by 20% using TypeScript and React.
BSc Computer Science, Test University, 2016 - 2020
English
`.trim();

function restoreManagedEnvironment(): void {
  for (const key of MANAGED_ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function blockUnexpectedNetwork(): void {
  globalThis.fetch = (async (input) => {
    const value =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    throw new Error(`Test blocked an unexpected external request to ${value}.`);
  }) as typeof fetch;
}

function memoryProfile(
  overrides: Partial<StoredCandidateProfile> = {}
): StoredCandidateProfile {
  return {
    ...EMPTY_CANDIDATE_PROFILE,
    applicationAnswers: {
      ...EMPTY_APPLICATION_ANSWERS,
      expectedAnnualSalary: "120000",
      salaryCurrency: "USD",
      needsSponsorship: "no",
    },
    firstName: "Jamie",
    lastName: "Candidate",
    email: "jamie@example.test",
    phone: "+1 555 0100",
    location: "Tbilisi, Georgia",
    linkedinUrl: "https://www.linkedin.com/in/jamie-candidate",
    portfolioUrl: "https://jamie.example.test",
    coverLetter: "I am interested in this role.",
    resumeFileName: "Jamie_Candidate_Resume.txt",
    cvUploaded: true,
    resumeParsed: true,
    complete: true,
    onboardingComplete: true,
    resumeData: Buffer.from(readableResumeText),
    resumeMimeType: "text/plain",
    resumeText: readableResumeText,
    skillsInventoryJson: null,
    autoSubmitEnabled: true,
    privacyConsentAllowed: false,
    talentPoolOptIn: false,
    ...overrides,
  };
}

function jobFor(
  source: string,
  overrides: Partial<Job> = {}
): Job {
  jobSequence += 1;
  const sourceSlug = source.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const defaults: Record<string, { id: string; url: string }> = {
    Greenhouse: {
      id: `greenhouse-apply-ink-test-${10000 + jobSequence}`,
      url: `https://boards.greenhouse.io/apply-ink-test/jobs/${10000 + jobSequence}`,
    },
    Workable: {
      id: `workable-apply-ink-test-TEST${10000 + jobSequence}`,
      url: `https://apply.workable.com/apply-ink-test/j/TEST${10000 + jobSequence}/`,
    },
  };
  const target = defaults[source] ?? {
    id: `${sourceSlug || "unknown"}-manual-test-${RUN_ID}-${jobSequence}`,
    url: `https://example.test/jobs/${jobSequence}`,
  };
  return {
    id: target.id,
    title: "Senior Software Engineer",
    company: "Apply Ink Test Employer",
    location: "Remote - Worldwide",
    salary: "$120k - $150k",
    match: 93,
    tags: ["TypeScript", "React"],
    posted: "today",
    postedAt: Date.now(),
    description:
      "Build reliable TypeScript products with React and PostgreSQL for remote users.",
    logoColor: "#c2452f",
    verified: true,
    source,
    url: target.url,
    ...overrides,
  };
}

function supportedTailoredContent(job: Job): TailoredResumeContent {
  return {
    summary: `${job.title}. Product engineer building reliable software products.`,
    experiences: [
      {
        title: "Product Engineer",
        company: "Acme Corp",
        dates: "January 2020 - Present",
        bullets: ["Improved conversion by 20% using TypeScript and React."],
      },
    ],
    skills: [{ category: "Engineering", items: ["TypeScript", "React"] }],
    education: [
      {
        credential: "BSc Computer Science",
        institution: "Test University",
        dates: "2016 - 2020",
      },
    ],
    languages: ["English"],
  };
}

async function databaseContext(): Promise<DatabaseContext> {
  if (!databaseContextPromise) {
    databaseContextPromise = (async () => {
      const user = await createUser({
        email: `job-sending-${RUN_ID}@example.test`,
        firstName: "Job",
        lastName: "Sending Test",
        password: `JobSending-${RUN_ID}-7`,
      });
      databaseUserId = user.id;
      return {
        userId: user.id,
        sessionId: `user:${user.id}`,
        authToken: await createAuthToken(user),
      };
    })();
  }
  return databaseContextPromise;
}

async function resetDatabaseState(): Promise<DatabaseContext> {
  const context = await databaseContext();
  await postgresQuery("DELETE FROM api_usage WHERE session_id = $1", [
    context.sessionId,
  ]);
  await postgresQuery("DELETE FROM user_applications WHERE session_id = $1", [
    context.sessionId,
  ]);
  await postgresQuery("DELETE FROM candidate_profiles WHERE session_id = $1", [
    context.sessionId,
  ]);
  return context;
}

async function saveReadyDatabaseProfile(
  autoSubmitEnabled = true,
  overrides: Partial<StoredCandidateProfile> = {}
): Promise<StoredCandidateProfile> {
  const context = await databaseContext();
  const current = await getCandidateProfile(context.sessionId);
  return saveCandidateProfile(context.sessionId, {
    ...current,
    ...memoryProfile(),
    autoSubmitEnabled,
    ...overrides,
  });
}

async function seedCachedResume(
  job: Job,
  profile: StoredCandidateProfile
): Promise<void> {
  const details = getTailoredResumeCacheDetails(job, profile);
  cachedResumeKeys.add(details.cacheKey);
  await writeTailoredResume(details.cacheKey, {
    data: Buffer.from("%PDF-1.7\nApply Ink isolated test resume\n%%EOF"),
    fileName: details.fileName,
    mimeType: "application/pdf",
  });
}

async function postRoute(
  body: unknown,
  options: { authenticated?: boolean; trusted?: boolean } = {}
): Promise<RouteResult> {
  const authenticated = options.authenticated ?? true;
  const trusted = options.trusted ?? true;
  const headers = new Headers({
    "content-type": "application/json",
    host: "localhost:3000",
  });
  if (trusted) {
    headers.set("origin", TEST_ORIGIN);
    headers.set("x-apply-ink", "1");
  }
  if (authenticated) {
    const context = await databaseContext();
    headers.set("cookie", `${AUTH_COOKIE}=${context.authToken}`);
  }
  const response = await postApplication(
    new Request(`${TEST_ORIGIN}/api/applications`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
  );
  return {
    response,
    body: (await response.json()) as RouteResponseBody,
  };
}

function connectGreenhouse(secret = "greenhouse-test-secret"): void {
  process.env.GREENHOUSE_JOB_BOARD_API_KEYS = JSON.stringify({
    "apply-ink-test": secret,
  });
}

function connectWorkable(secret = "workable-test-token"): void {
  process.env.WORKABLE_ACCESS_TOKENS = JSON.stringify({
    "apply-ink-test": secret,
  });
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function greenhouseMock(options: {
  requiredFields?: string[];
  postStatus?: number;
  throwNetworkError?: boolean;
} = {}) {
  const state: {
    detailCalls: number;
    postCalls: number;
    authorization: string | null;
    form: FormData | null;
  } = {
    detailCalls: 0,
    postCalls: 0,
    authorization: null,
    form: null,
  };
  globalThis.fetch = (async (input, init) => {
    assert.match(requestUrl(input), /boards-api\.greenhouse\.io/);
    if (options.throwNetworkError) throw new Error("Mock network failure");
    const method = init?.method ?? "GET";
    if (method === "GET") {
      state.detailCalls += 1;
      return Response.json({
        questions: (options.requiredFields ?? [
          "first_name",
          "last_name",
          "email",
          "phone",
          "resume",
          "cover_letter",
        ]).map((name) => ({ required: true, fields: [{ name }] })),
      });
    }
    assert.equal(method, "POST");
    state.postCalls += 1;
    state.authorization = new Headers(init?.headers).get("authorization");
    state.form = init?.body instanceof FormData ? init.body : null;
    const status = options.postStatus ?? 201;
    return new Response(status >= 400 ? "rejected" : "accepted", { status });
  }) as typeof fetch;
  return state;
}

function workableMock(status = 201) {
  const state: {
    calls: number;
    authorization: string | null;
    body: WorkablePayload | null;
  } = { calls: 0, authorization: null, body: null };
  globalThis.fetch = (async (input, init) => {
    assert.match(requestUrl(input), /apply-ink-test\.workable\.com\/spi\/v3/);
    assert.equal(init?.method, "POST");
    state.calls += 1;
    state.authorization = new Headers(init?.headers).get("authorization");
    state.body = JSON.parse(String(init?.body)) as WorkablePayload;
    return new Response(status >= 400 ? "rejected" : "accepted", { status });
  }) as typeof fetch;
  return state;
}

function applicationStatus(result: RouteResult): string | undefined {
  return result.body.application?.status as string | undefined;
}

const cases: ManualTestCase[] = [
  {
    id: "cv-readable",
    description: "A text CV with usable content is accepted and its bytes are kept.",
    failureMeans: "A normal text-based CV cannot pass the upload gate.",
    async run() {
      const file = new File([readableResumeText], "resume.txt", {
        type: "text/plain",
      });
      const fields = await resumeFieldsFromFile(file);
      assert.equal(fields.resumeText, readableResumeText);
      assert.deepEqual(fields.resumeData, Buffer.from(readableResumeText));
      assert.equal(fields.resumeFileName, "resume.txt");
    },
  },
  {
    id: "cv-too-short",
    description: "A CV with fewer than 80 extracted characters is rejected.",
    failureMeans: "The app could mark an empty or nearly empty CV as readable.",
    async run() {
      const file = new File(["Too short"], "resume.txt", { type: "text/plain" });
      await assert.rejects(
        resumeFieldsFromFile(file),
        (error) =>
          error instanceof ResumeUploadError &&
          /No usable CV text was found/.test(error.message)
      );
    },
  },
  {
    id: "cv-unsupported-extension",
    description: "An unsupported CV filename extension is rejected.",
    failureMeans: "The server is accepting file types outside the CV allowlist.",
    async run() {
      const file = new File([readableResumeText], "resume.png", {
        type: "image/png",
      });
      await assert.rejects(
        resumeFieldsFromFile(file),
        (error) =>
          error instanceof ResumeUploadError && /PDF, DOC, DOCX/.test(error.message)
      );
    },
  },
  {
    id: "cv-over-10mb",
    description: "A CV larger than 10 MB is rejected before parsing.",
    failureMeans: "Oversized uploads can consume parser and database resources.",
    async run() {
      const file = new File([Buffer.alloc(10 * 1024 * 1024 + 1, 65)], "resume.txt", {
        type: "text/plain",
      });
      await assert.rejects(
        resumeFieldsFromFile(file),
        (error) =>
          error instanceof ResumeUploadError && /10 MB or smaller/.test(error.message)
      );
    },
  },
  {
    id: "cv-image-only-pdf",
    kind: "known-gap",
    description: "A PDF without extractable text is rejected because OCR is not installed.",
    failureMeans: "The current no-OCR limitation changed and must be reviewed.",
    async run() {
      const file = new File(
        [Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF")],
        "scanned-resume.pdf",
        { type: "application/pdf" }
      );
      await assert.rejects(resumeFieldsFromFile(file), ResumeUploadError);
    },
  },
  {
    id: "cv-mime-mismatch",
    description: "A CV is rejected when its MIME type conflicts with its extension.",
    failureMeans: "A disguised upload can reach a document parser it does not belong to.",
    async run() {
      const file = new File([readableResumeText], "resume.txt", {
        type: "image/png",
      });
      await assert.rejects(
        resumeFieldsFromFile(file),
        (error) =>
          error instanceof ResumeUploadError &&
          /does not match its file extension/.test(error.message)
      );
    },
  },
  {
    id: "profile-bytes-without-text",
    description: "Stored CV bytes without extracted text do not mark the profile ready.",
    failureMeans: "A filename or byte array alone can incorrectly enable applications.",
    async run() {
      const context = await resetDatabaseState();
      const current = await getCandidateProfile(context.sessionId);
      const saved = await saveCandidateProfile(context.sessionId, {
        ...current,
        ...memoryProfile({ resumeText: "" }),
      });
      assert.equal(saved.cvUploaded, false);
      assert.equal(saved.resumeParsed, false);
      assert.equal(saved.complete, false);
    },
  },
  {
    id: "profile-ready",
    description: "Name, email, original CV bytes, and extracted text make a profile complete.",
    failureMeans: "A valid candidate profile cannot reach the application flow.",
    async run() {
      await resetDatabaseState();
      const saved = await saveReadyDatabaseProfile();
      assert.equal(saved.cvUploaded, true);
      assert.equal(saved.resumeParsed, true);
      assert.equal(saved.complete, true);
    },
  },
  {
    id: "queue-low-match",
    description: "A job below the 80% match rule is skipped.",
    failureMeans: "Auto Apply can queue jobs below the configured match threshold.",
    async run() {
      const decision = decideJob(jobFor("Test", { match: 79 }), false);
      assert.equal(decision.status, "skipped");
      assert.match(decision.note, /below/);
    },
  },
  {
    id: "queue-duplicate",
    description: "A job already started in the browser session is skipped.",
    failureMeans: "The browser queue can start the same job twice in one run.",
    async run() {
      const decision = decideJob(jobFor("Test"), true);
      assert.equal(decision.status, "skipped");
      assert.match(decision.note, /Already started/);
    },
  },
  {
    id: "queue-ready",
    description: "A new job at or above 80% is ready for routing.",
    failureMeans: "Eligible matching jobs cannot enter the application route.",
    async run() {
      const decision = decideJob(jobFor("Test", { match: 80 }), false);
      assert.equal(decision.status, "ready");
    },
  },
  {
    id: "tailoring-requires-cv",
    description: "CV tailoring stops before AI when no readable CV exists.",
    failureMeans: "The AI can be called without a valid source CV.",
    async run() {
      const profile = memoryProfile({
        cvUploaded: false,
        resumeData: null,
        resumeText: "",
      });
      await assert.rejects(
        prepareTailoredResume(jobFor("Test"), profile),
        (error) =>
          error instanceof ResumeTailoringError && /readable CV/.test(error.message)
      );
    },
  },
  {
    id: "tailoring-rejects-employer-invention",
    description: "Tailored content with an employer absent from the source CV is rejected.",
    failureMeans: "The tailoring safety gate can invent employment history.",
    async run() {
      const job = jobFor("Test");
      const content = supportedTailoredContent(job);
      content.experiences[0].company = "Invented Employer";
      assert.throws(
        () => validateTailoredResumeContent(content, job, memoryProfile()),
        ResumeTailoringError
      );
    },
  },
  {
    id: "tailoring-rejects-number-invention",
    description: "A numeric claim absent from the source CV is rejected.",
    failureMeans: "The tailored CV can add unsupported percentages or metrics.",
    async run() {
      const job = jobFor("Test");
      const content = supportedTailoredContent(job);
      content.experiences[0].bullets[0] = "Improved conversion by 99%.";
      assert.throws(
        () => validateTailoredResumeContent(content, job, memoryProfile()),
        ResumeTailoringError
      );
    },
  },
  {
    id: "tailored-pdf-readable",
    description: "The generated PDF can be read back and contains name, email, and job title.",
    failureMeans: "A generated CV can look ready while its required text is missing or unreadable.",
    async run() {
      const job = jobFor("Test");
      const profile = memoryProfile();
      const content = validateTailoredResumeContent(
        supportedTailoredContent(job),
        job,
        profile
      );
      const pdf = await generateTailoredResumePdf(content, profile, job);
      const text = await extractResumeText(pdf, "tailored-resume.pdf");
      assert.match(text, /Jamie Candidate/i);
      assert.match(text, /jamie@example\.test/i);
      assert.match(text, /Senior Software Engineer/i);
    },
  },
  {
    id: "route-rejects-untrusted-request",
    description: "An application mutation without trusted browser headers returns 403.",
    failureMeans: "Another website could trigger application attempts from a signed-in browser.",
    async run() {
      const result = await postRoute(
        { job: jobFor("Test"), via: "auto", openBrowser: false },
        { authenticated: false, trusted: false }
      );
      assert.equal(result.response.status, 403);
    },
  },
  {
    id: "route-requires-login",
    description: "A trusted application request without a login returns 401.",
    failureMeans: "Anonymous visitors can create application records.",
    async run() {
      const result = await postRoute(
        { job: jobFor("Test"), via: "auto", openBrowser: false },
        { authenticated: false }
      );
      assert.equal(result.response.status, 401);
    },
  },
  {
    id: "route-rejects-invalid-job",
    description: "Incomplete or malformed job data returns 400.",
    failureMeans: "Invalid client data can reach CV tailoring or an ATS connector.",
    async run() {
      await resetDatabaseState();
      const result = await postRoute({ job: { id: "missing-fields" }, via: "auto" });
      assert.equal(result.response.status, 400);
    },
  },
  {
    id: "route-needs-readable-cv",
    description: "A signed-in user without a readable CV gets Needs you.",
    failureMeans: "An application can start before the server has usable CV text.",
    async run() {
      const context = await resetDatabaseState();
      const job = jobFor("Test");
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /Upload a readable CV/);
      assert.equal((await getApplicationByJobId(context.sessionId, job.id))?.status, "needs_user");
    },
  },
  {
    id: "route-needs-profile-identity",
    description: "CV bytes and text without name and email still produce Needs you.",
    failureMeans: "The ATS can receive an application without candidate identity fields.",
    async run() {
      const context = await resetDatabaseState();
      const current = await getCandidateProfile(context.sessionId);
      await saveCandidateProfile(context.sessionId, {
        ...current,
        ...memoryProfile({ firstName: "", lastName: "", email: "" }),
      });
      const result = await postRoute({
        job: jobFor("Test"),
        via: "auto",
        openBrowser: false,
      });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /Complete your name and email/);
    },
  },
  {
    id: "route-daily-ai-limit",
    description: "The sixth uncached CV-tailoring request in one day returns 429.",
    failureMeans: "The server-side daily AI limit is not enforced atomically.",
    async run() {
      const context = await resetDatabaseState();
      await saveReadyDatabaseProfile();
      for (let index = 0; index < AUTO_APPLY_RULES.dailyLimit; index += 1) {
        assert.equal(
          await claimDailyApiAction(
            context.sessionId,
            "resume_tailoring",
            AUTO_APPLY_RULES.dailyLimit
          ),
          true
        );
      }
      const result = await postRoute({
        job: jobFor("Test"),
        via: "auto",
        openBrowser: false,
      });
      assert.equal(result.response.status, 429);
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /Daily AI tailoring limit reached/);
    },
  },
  {
    id: "route-missing-openai-key",
    description: "An uncached job without OPENAI_API_KEY stops safely at Needs you.",
    failureMeans: "Missing AI configuration is hidden or becomes an unsafe submission attempt.",
    async run() {
      await resetDatabaseState();
      await saveReadyDatabaseProfile();
      delete process.env.OPENAI_API_KEY;
      const result = await postRoute({
        job: jobFor("Test"),
        via: "auto",
        openBrowser: false,
      });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /OPENAI_API_KEY/);
    },
  },
  {
    id: "route-auto-submit-disabled",
    description: "Auto mode prepares a CV but does not contact an ATS when final submission is off.",
    failureMeans: "The app can submit without the candidate enabling automatic final submission.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(false);
      const job = jobFor("Greenhouse");
      await seedCachedResume(job, profile);
      connectGreenhouse();
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "needs_user");
      assert.equal(result.body.browserOpened, false);
      assert.match(result.body.note, /Automatic final submission is off/);
    },
  },
  {
    id: "route-greenhouse-not-connected",
    description: "A Greenhouse employer without its own API key produces Needs you.",
    failureMeans: "Public Greenhouse job URLs are being mistaken for submission permission.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Greenhouse");
      await seedCachedResume(job, profile);
      delete process.env.GREENHOUSE_JOB_BOARD_API_KEYS;
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /has not connected direct Greenhouse access/);
    },
  },
  {
    id: "route-greenhouse-custom-question",
    description: "An unknown required Greenhouse question blocks direct submission.",
    failureMeans: "The app can submit a form while silently omitting a required answer.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Greenhouse");
      await seedCachedResume(job, profile);
      connectGreenhouse();
      const mock = greenhouseMock({
        requiredFields: ["first_name", "last_name", "email", "custom_salary_answer"],
      });
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /required questions/);
      assert.equal(mock.detailCalls, 1);
      assert.equal(mock.postCalls, 0);
    },
  },
  {
    id: "route-greenhouse-success",
    description: "A connected Greenhouse standard form receives the tailored CV and is marked submitted.",
    failureMeans: "The Greenhouse request, credentials, form fields, or saved status are incorrect.",
    async run() {
      const context = await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Greenhouse");
      await seedCachedResume(job, profile);
      connectGreenhouse();
      const mock = greenhouseMock();
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(result.response.status, 200);
      assert.equal(applicationStatus(result), "submitted");
      assert.equal(result.body.application.method, "ats_api");
      assert.equal(result.body.application.via, "auto");
      assert.equal(result.body.browserOpened, false);
      assert.equal(mock.detailCalls, 1);
      assert.equal(mock.postCalls, 1);
      assert.equal(
        mock.authorization,
        `Basic ${Buffer.from("greenhouse-test-secret:").toString("base64")}`
      );
      assert.ok(mock.form);
      assert.equal(mock.form.get("first_name"), "Jamie");
      assert.equal(mock.form.get("last_name"), "Candidate");
      assert.equal(mock.form.get("email"), "jamie@example.test");
      assert.ok(mock.form.get("resume") instanceof File);
      assert.equal((await getApplicationByJobId(context.sessionId, job.id))?.status, "submitted");
    },
  },
  {
    id: "route-greenhouse-rejected",
    description: "A Greenhouse 422 response is not marked submitted.",
    failureMeans: "The app can report success when Greenhouse rejected the application.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Greenhouse");
      await seedCachedResume(job, profile);
      connectGreenhouse();
      const mock = greenhouseMock({ postStatus: 422 });
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /Greenhouse needs information/);
      assert.equal(mock.postCalls, 1);
    },
  },
  {
    id: "route-greenhouse-network-error",
    description: "A Greenhouse network error falls back to Needs you.",
    failureMeans: "A connector outage can become a false successful application.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Greenhouse");
      await seedCachedResume(job, profile);
      connectGreenhouse();
      greenhouseMock({ throwNetworkError: true });
      const direct = await tryDirectAtsApply(job, profile);
      assert.equal(direct.status, "unavailable");
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(
        applicationStatus(result),
        "needs_user",
        `Route returned ${result.response.status}: ${JSON.stringify(result.body)}`
      );
      assert.match(result.body.note, /direct ATS connection was unavailable/);
    },
  },
  {
    id: "route-workable-success",
    description: "A connected Workable account receives candidate JSON and is marked submitted.",
    failureMeans: "The Workable token, payload, resume encoding, or saved status is incorrect.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Workable");
      await seedCachedResume(job, profile);
      connectWorkable();
      const mock = workableMock(201);
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "submitted");
      assert.equal(mock.calls, 1);
      assert.equal(mock.authorization, "Bearer workable-test-token");
      assert.equal(mock.body?.candidate.firstname, "Jamie");
      assert.equal(mock.body?.candidate.email, "jamie@example.test");
      assert.equal(mock.body?.candidate.resume.name, result.body.application.tailoredResumeFileName);
      assert.ok(mock.body?.candidate.resume.data);
    },
  },
  {
    id: "route-workable-rejected",
    description: "A Workable 422 response is not marked submitted.",
    failureMeans: "The app can report success when Workable rejected the candidate.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Workable");
      await seedCachedResume(job, profile);
      connectWorkable();
      const mock = workableMock(422);
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /Workable needs information/);
      assert.equal(mock.calls, 1);
    },
  },
  {
    id: "route-workable-network-error",
    description: "A Workable network error falls back to Needs you.",
    failureMeans: "A Workable connector outage can become a false successful application or HTTP 500.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Workable");
      await seedCachedResume(job, profile);
      connectWorkable();
      globalThis.fetch = (async () => {
        throw new Error("Mock Workable network failure");
      }) as typeof fetch;
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /direct ATS connection was unavailable/);
    },
  },
  {
    id: "route-unsupported-ats",
    description: "A job without a direct connector gets a tailored CV and Needs you.",
    failureMeans: "Unknown ATS providers can be incorrectly reported as submitted.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Other ATS");
      await seedCachedResume(job, profile);
      const result = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(result), "needs_user");
      assert.match(result.body.note, /does not provide Apply Ink with direct ATS access/);
    },
  },
  {
    id: "route-no-duplicate-submission",
    description: "A job already marked submitted returns the existing record without another ATS call.",
    failureMeans: "Retrying the same job can create a duplicate employer application.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(true);
      const job = jobFor("Greenhouse");
      await seedCachedResume(job, profile);
      connectGreenhouse();
      const mock = greenhouseMock();
      const first = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(first), "submitted");
      const callsAfterFirst = mock.detailCalls + mock.postCalls;
      const second = await postRoute({ job, via: "auto", openBrowser: false });
      assert.equal(applicationStatus(second), "submitted");
      assert.equal(second.body.application.id, first.body.application.id);
      assert.match(second.body.note, /already marked as submitted/);
      assert.equal(mock.detailCalls + mock.postCalls, callsAfterFirst);
    },
  },
  {
    id: "route-manual-direct-submit",
    description: "A manual Apply click can use a connected ATS even when automatic final submission is off.",
    failureMeans: "The manual direct-apply path is incorrectly blocked by the auto-submit preference.",
    async run() {
      await resetDatabaseState();
      const profile = await saveReadyDatabaseProfile(false);
      const job = jobFor("Greenhouse");
      await seedCachedResume(job, profile);
      connectGreenhouse();
      const mock = greenhouseMock();
      const result = await postRoute({ job, via: "manual", openBrowser: false });
      assert.equal(applicationStatus(result), "submitted");
      assert.equal(result.body.application.via, "manual");
      assert.equal(mock.postCalls, 1);
    },
  },
];

async function cleanup(): Promise<void> {
  if (databaseUserId) {
    const sessionId = `user:${databaseUserId}`;
    await postgresQuery("DELETE FROM api_usage WHERE session_id = $1", [sessionId]);
    await postgresQuery("DELETE FROM user_applications WHERE session_id = $1", [
      sessionId,
    ]);
    await postgresQuery("DELETE FROM candidate_profiles WHERE session_id = $1", [
      sessionId,
    ]);
    await postgresQuery("DELETE FROM users WHERE id = $1", [databaseUserId]);
  }
  for (const cacheKey of cachedResumeKeys) {
    await postgresQuery("DELETE FROM tailored_resumes WHERE cache_key = $1", [
      cacheKey,
    ]);
  }
  await closePostgresPool();
}

function requestedCaseId(): string | null {
  const direct = process.argv.find((argument) => argument.startsWith("--case="));
  if (direct) return direct.slice("--case=".length);
  const index = process.argv.indexOf("--case");
  return index >= 0 ? process.argv[index + 1] ?? "" : null;
}

async function main(): Promise<void> {
  if (process.argv.includes("--list")) {
    for (const testCase of cases) {
      console.log(`${testCase.id} - ${testCase.description}`);
    }
    return;
  }

  const requested = requestedCaseId();
  const selected = requested
    ? cases.filter((testCase) => testCase.id === requested)
    : cases;
  if (selected.length === 0) {
    throw new Error(
      `Unknown case "${requested}". Run npm run job-sending:test -- --list.`
    );
  }

  const failures: { id: string; error: string; failureMeans: string }[] = [];
  let passed = 0;
  let knownGaps = 0;

  try {
    for (const testCase of selected) {
      restoreManagedEnvironment();
      blockUnexpectedNetwork();
      try {
        await testCase.run();
        if (testCase.kind === "known-gap") {
          knownGaps += 1;
          console.log(`KNOWN GAP ${testCase.id} - ${testCase.description}`);
        } else {
          passed += 1;
          console.log(`PASS ${testCase.id} - ${testCase.description}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({
          id: testCase.id,
          error: message,
          failureMeans: testCase.failureMeans,
        });
        console.error(`FAIL ${testCase.id} - ${message}`);
        console.error(`  Meaning: ${testCase.failureMeans}`);
      } finally {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreManagedEnvironment();
      }
    }
  } finally {
    await cleanup();
  }

  console.log(
    `RESULT ${passed} passed, ${knownGaps} known gaps, ${failures.length} failed, ${selected.length} total.`
  );
  if (failures.length > 0) {
    console.error("FAILED CASES");
    for (const failure of failures) {
      console.error(`- ${failure.id}: ${failure.error}`);
      console.error(`  Meaning: ${failure.failureMeans}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
