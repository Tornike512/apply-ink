import { randomUUID } from "node:crypto";
import PDFDocument from "pdfkit";
import { closePostgresPool, postgresQuery } from "../src/lib/postgres";
import { createUser } from "../src/lib/user-store";

const ORIGIN = process.env.APPLY_INK_TEST_ORIGIN ?? "http://localhost:3000";

function blobBytes(buffer: Buffer): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(buffer);
}

async function createResumePdf(): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const document = new PDFDocument();
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const complete = new Promise<void>((resolve) => document.on("end", resolve));
  document.fontSize(18).text("API Test Resume");
  document
    .fontSize(11)
    .text(
      "Senior product engineer with TypeScript, React, Node.js, PostgreSQL, production AI systems, remote collaboration, and ten years of software delivery experience."
    );
  document.end();
  await complete;
  return Buffer.concat(chunks);
}

async function main() {
  const suffix = randomUUID();
  const email = `auth-api-${suffix}@example.test`;
  const password = `Browser-${suffix}-8`;
  let userId: string | null = null;

  try {
    const googleStart = await fetch(
      `${ORIGIN}/api/auth/google?intent=login&next=/dashboard/messages`,
      { redirect: "manual" }
    );
    const googleLocation = googleStart.headers.get("location") ?? "";
    const googleCookies = googleStart.headers.get("set-cookie") ?? "";
    if (googleStart.status < 300 || googleStart.status >= 400) {
      throw new Error("Google sign-in did not start with a redirect.");
    }
    if (/accounts\.google\.com/.test(googleLocation)) {
      if (
        !googleCookies.includes("apply-ink-google-state=") ||
        !googleCookies.includes("apply-ink-google-nonce=") ||
        !/HttpOnly/i.test(googleCookies)
      ) {
        throw new Error("Google sign-in did not set protected state and nonce cookies.");
      }
    } else if (!/error=google_not_configured/.test(googleLocation)) {
      throw new Error("Unconfigured Google sign-in did not return a safe fallback.");
    }
    const forgedGoogleCallback = await fetch(
      `${ORIGIN}/api/auth/google/callback?code=fake&state=forged`,
      { redirect: "manual" }
    );
    if (
      forgedGoogleCallback.status < 300 ||
      forgedGoogleCallback.status >= 400 ||
      !/error=google_cancelled/.test(
        forgedGoogleCallback.headers.get("location") ?? ""
      )
    ) {
      throw new Error("Google callback accepted missing or forged state.");
    }

    const user = await createUser({
      email,
      firstName: "API",
      lastName: "Test",
      password,
    });
    userId = user.id;

    const login = await fetch(`${ORIGIN}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        "x-apply-ink": "1",
      },
      body: JSON.stringify({ email, password }),
    });
    const setCookie = login.headers.get("set-cookie") ?? "";
    if (
      !login.ok ||
      !setCookie.includes("apply-ink-auth=") ||
      !/HttpOnly/i.test(setCookie) ||
      !/SameSite=Lax/i.test(setCookie)
    ) {
      throw new Error("Login did not return the hardened auth cookie.");
    }
    const cookie = setCookie.split(";", 1)[0];

    const me = await fetch(`${ORIGIN}/api/auth/me`, { headers: { cookie } });
    const meData = (await me.json()) as { user?: { id?: string } };
    if (!me.ok || meData.user?.id !== user.id) {
      throw new Error("Authenticated API session failed.");
    }

    const protectedPage = await fetch(`${ORIGIN}/dashboard/messages`, {
      headers: { cookie },
      redirect: "manual",
    });
    const guestPage = await fetch(`${ORIGIN}/dashboard/messages`, {
      redirect: "manual",
    });
    if (protectedPage.status !== 200 || guestPage.status !== 307) {
      throw new Error("Dashboard route protection failed.");
    }

    const sessionId = `user:${user.id}`;
    const profile = await fetch(`${ORIGIN}/api/profile`, { headers: { cookie } });
    if (!profile.ok) throw new Error("Profile API did not initialize the test profile.");
    for (let index = 0; index < 5; index += 1) {
      await postgresQuery(
        `INSERT INTO api_usage (id, session_id, action, created_at)
         VALUES ($1, $2, 'resume_prefill', $3)`,
        [randomUUID(), sessionId, Date.now()]
      );
    }
    const resumeForm = new FormData();
    resumeForm.set(
      "resume",
      new File([blobBytes(await createResumePdf())], "api-test-resume.pdf", {
        type: "application/pdf",
      })
    );
    const upload = await fetch(`${ORIGIN}/api/profile`, {
      method: "POST",
      headers: { cookie, origin: ORIGIN, "x-apply-ink": "1" },
      body: resumeForm,
    });
    const uploadData = (await upload.json()) as {
      profile?: {
        resumeFileName?: string | null;
        cvUploaded?: boolean;
        resumeParsed?: boolean;
      };
      error?: string;
    };
    if (
      !upload.ok ||
      uploadData.profile?.resumeFileName !== "api-test-resume.pdf" ||
      !uploadData.profile?.cvUploaded ||
      !uploadData.profile?.resumeParsed
    ) {
      throw new Error(`Real PDF profile upload failed: ${uploadData.error ?? upload.status}.`);
    }
    const storedResume = await postgresQuery<{
      bytes: number;
      resume_text: string;
    }>(
      `SELECT octet_length(resume_data)::int AS bytes, resume_text
       FROM candidate_profiles WHERE session_id = $1`,
      [sessionId]
    );
    if (
      Number(storedResume.rows[0]?.bytes ?? 0) < 500 ||
      !storedResume.rows[0]?.resume_text.includes("TypeScript")
    ) {
      throw new Error("Uploaded PDF bytes or extracted text were not stored.");
    }

    const untrustedRemove = await fetch(`${ORIGIN}/api/profile`, {
      method: "DELETE",
      headers: { cookie, origin: ORIGIN },
    });
    if (untrustedRemove.status !== 403) {
      throw new Error("Resume removal accepted a request without the CSRF header.");
    }
    const remove = await fetch(`${ORIGIN}/api/profile`, {
      method: "DELETE",
      headers: { cookie, origin: ORIGIN, "x-apply-ink": "1" },
    });
    const removeData = (await remove.json()) as {
      profile?: {
        resumeFileName?: string | null;
        cvUploaded?: boolean;
        resumeParsed?: boolean;
      };
    };
    if (
      !remove.ok ||
      removeData.profile?.resumeFileName !== null ||
      removeData.profile?.cvUploaded ||
      removeData.profile?.resumeParsed
    ) {
      throw new Error("Resume removal did not clear the public profile state.");
    }
    const removedResume = await postgresQuery<{
      resume_data: Buffer | null;
      resume_text: string;
    }>(
      "SELECT resume_data, resume_text FROM candidate_profiles WHERE session_id = $1",
      [sessionId]
    );
    if (removedResume.rows[0]?.resume_data || removedResume.rows[0]?.resume_text) {
      throw new Error("Resume removal left file bytes or extracted text in PostgreSQL.");
    }

    const logout = await fetch(`${ORIGIN}/api/auth/logout`, {
      method: "POST",
      headers: { cookie, origin: ORIGIN, "x-apply-ink": "1" },
    });
    if (!logout.ok || !/Max-Age=0/i.test(logout.headers.get("set-cookie") ?? "")) {
      throw new Error("Logout did not expire the auth cookie.");
    }

    console.log(
      JSON.stringify({
        loginRoute: true,
        googleStartRoute: true,
        forgedGoogleCallbackRejected: true,
        httpOnlyCookie: true,
        authenticatedPage: true,
        guestRedirect: true,
        realPdfUpload: true,
        pdfStoredInPostgres: true,
        protectedResumeRemoval: true,
        resumeBytesRemoved: true,
        logoutExpiry: true,
      })
    );
  } finally {
    if (userId) {
      const sessionId = `user:${userId}`;
      await postgresQuery("DELETE FROM api_usage WHERE session_id = $1", [sessionId]);
      await postgresQuery("DELETE FROM user_applications WHERE session_id = $1", [sessionId]);
      await postgresQuery("DELETE FROM candidate_profiles WHERE session_id = $1", [sessionId]);
      await postgresQuery("DELETE FROM users WHERE id = $1 AND email = $2", [
        userId,
        email,
      ]);
    }
    await closePostgresPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
