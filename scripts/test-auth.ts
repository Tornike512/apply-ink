import { randomUUID } from "node:crypto";
import {
  createAuthToken,
  getAuthenticatedUser,
  AUTH_COOKIE,
} from "../src/lib/auth";
import { closePostgresPool, postgresQuery } from "../src/lib/postgres";
import {
  authenticateUser,
  createPasswordResetToken,
  createUser,
  findOrCreateGoogleUser,
  passwordValidationError,
  resetPasswordWithToken,
} from "../src/lib/user-store";

async function main() {
  const suffix = randomUUID();
  const email = `auth-test-${suffix}@example.test`;
  const password = `Start-${suffix}-9`;
  const nextPassword = `Changed-${suffix}-7`;
  let userId: string | null = null;

  try {
    const user = await createUser({
      email,
      firstName: "Auth",
      lastName: "Test",
      password,
    });
    userId = user.id;

    const goodLogin = await authenticateUser(email, password);
    const badLogin = await authenticateUser(email, `${password}-wrong`);
    if (!goodLogin || badLogin) throw new Error("Credential verification failed.");
    if (passwordValidationError("abc12345") !== null) {
      throw new Error("An eight-character password was rejected.");
    }
    if (!passwordValidationError("abc1234")) {
      throw new Error("A seven-character password was accepted.");
    }

    const googleLink = await findOrCreateGoogleUser({
      subject: `google-${suffix}`,
      email,
      firstName: "Different",
      lastName: "Name",
    });
    const repeatedGoogleLink = await findOrCreateGoogleUser({
      subject: `google-${suffix}`,
      email,
      firstName: "Different",
      lastName: "Name",
    });
    if (googleLink.created || repeatedGoogleLink.user.id !== user.id) {
      throw new Error("Google did not safely link the existing verified email.");
    }

    const token = await createAuthToken(user);
    const request = new Request("http://localhost:3000/api/auth/me", {
      headers: { cookie: `${AUTH_COOKIE}=${encodeURIComponent(token)}` },
    });
    if ((await getAuthenticatedUser(request))?.id !== user.id) {
      throw new Error("JWT verification failed.");
    }

    const resetToken = await createPasswordResetToken(email);
    if (!resetToken || !(await resetPasswordWithToken(resetToken, nextPassword))) {
      throw new Error("Password reset failed.");
    }
    if (await resetPasswordWithToken(resetToken, nextPassword)) {
      throw new Error("Password reset token was reusable.");
    }
    if (await getAuthenticatedUser(request)) {
      throw new Error("Password reset did not invalidate the old JWT.");
    }
    if (!(await authenticateUser(email, nextPassword))) {
      throw new Error("New password was not accepted.");
    }

    console.log(
      JSON.stringify({
        passwordHashing: true,
        jwtCookieSession: true,
        resetOneTimeUse: true,
        resetInvalidatesSessions: true,
        eightCharacterMinimum: true,
        googleAccountLinking: true,
      })
    );
  } finally {
    if (userId) {
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
