import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  googleAuthConfigured,
  googleAuthorizationUrl,
  newGoogleOAuthValue,
  safeGoogleNextPath,
} from "@/lib/google-auth";

export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const intent = requestUrl.searchParams.get("intent") === "register" ? "register" : "login";
  const nextPath = safeGoogleNextPath(
    requestUrl.searchParams.get("next") ?? (intent === "register" ? "/register" : null)
  );
  if (!googleAuthConfigured()) {
    const fallback = new URL(intent === "register" ? "/register" : "/login", request.url);
    fallback.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(fallback);
  }

  const state = newGoogleOAuthValue();
  const nonce = newGoogleOAuthValue();
  const response = NextResponse.redirect(
    googleAuthorizationUrl({ requestUrl: request.url, state, nonce })
  );
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_NONCE_COOKIE, nonce, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE, nextPath, cookieOptions);
  return response;
}
