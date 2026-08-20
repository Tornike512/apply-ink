import { randomUUID } from "node:crypto";
import { closePostgresPool, postgresQuery } from "../src/lib/postgres";
import { createUser } from "../src/lib/user-store";

const ORIGIN = process.env.APPLY_INK_TEST_ORIGIN ?? "http://localhost:3000";

async function main() {
  const suffix = randomUUID();
  const email = `auth-api-${suffix}@example.test`;
  const password = `Browser-${suffix}-8`;
  let userId: string | null = null;

  try {
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
        httpOnlyCookie: true,
        authenticatedPage: true,
        guestRedirect: true,
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
