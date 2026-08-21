import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { OAuth2Client, type TokenPayload } from "google-auth-library";

export const GOOGLE_OAUTH_STATE_COOKIE = "apply-ink-google-state";
export const GOOGLE_OAUTH_NONCE_COOKIE = "apply-ink-google-nonce";
export const GOOGLE_OAUTH_NEXT_COOKIE = "apply-ink-google-next";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export type GoogleIdentity = {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
};

export function googleAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function googleCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("Google sign-in is not configured.");
  }
  return { clientId, clientSecret };
}

export function googleCallbackUrl(requestUrl: string): string {
  return new URL("/api/auth/google/callback", requestUrl).toString();
}

export function safeGoogleNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard/jobs";
  }
  return value === "/register" || value.startsWith("/dashboard/")
    ? value
    : "/dashboard/jobs";
}

export function newGoogleOAuthValue(): string {
  return randomBytes(32).toString("base64url");
}

export function secureValuesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function oauthClient(requestUrl: string): OAuth2Client {
  const { clientId, clientSecret } = googleCredentials();
  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: googleCallbackUrl(requestUrl),
  });
}

export function googleAuthorizationUrl(input: {
  requestUrl: string;
  state: string;
  nonce: string;
}): string {
  return oauthClient(input.requestUrl).generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state: input.state,
    nonce: input.nonce,
  });
}

export function googleIdentityFromPayload(
  payload: TokenPayload,
  expectedNonce: string
): GoogleIdentity {
  if (
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true ||
    typeof payload.nonce !== "string" ||
    !secureValuesMatch(expectedNonce, payload.nonce)
  ) {
    throw new Error("Google did not return a verified account.");
  }
  const firstName = payload.given_name?.trim().slice(0, 100) ?? "";
  const lastName = payload.family_name?.trim().slice(0, 100) ?? "";
  return {
    subject: payload.sub,
    email: payload.email,
    firstName,
    lastName,
  };
}

export async function exchangeGoogleCode(input: {
  requestUrl: string;
  code: string;
  nonce: string;
}): Promise<GoogleIdentity> {
  const { clientId } = googleCredentials();
  const client = oauthClient(input.requestUrl);
  const { tokens } = await client.getToken(input.code);
  if (!tokens.id_token) {
    throw new Error("Google did not return an identity token.");
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("Google did not return a verified account.");
  return googleIdentityFromPayload(payload, input.nonce);
}
