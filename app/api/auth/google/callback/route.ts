import { NextResponse } from "next/server";
import { authenticatedSessionId, setAuthCookie } from "@/lib/auth";
import {
  deleteCandidateProfile,
  getCandidateProfile,
  saveCandidateProfile,
} from "@/lib/application-store";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  safeGoogleNextPath,
  secureValuesMatch,
} from "@/lib/google-auth";
import { getUserSessionId } from "@/lib/user-session";
import { findOrCreateGoogleUser } from "@/lib/user-store";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

function clearOAuthCookies(response: NextResponse): void {
  for (const name of [
    GOOGLE_OAUTH_STATE_COOKIE,
    GOOGLE_OAUTH_NONCE_COOKIE,
    GOOGLE_OAUTH_NEXT_COOKIE,
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
}

function errorRedirect(request: Request, error: string): NextResponse {
  const nextPath = safeGoogleNextPath(
    cookieValue(request, GOOGLE_OAUTH_NEXT_COOKIE)
  );
  const target = new URL(nextPath === "/register" ? "/register" : "/login", request.url);
  target.searchParams.set("error", error);
  if (nextPath.startsWith("/dashboard/")) target.searchParams.set("next", nextPath);
  const response = NextResponse.redirect(target);
  clearOAuthCookies(response);
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const expectedState = cookieValue(request, GOOGLE_OAUTH_STATE_COOKIE);
  const returnedState = requestUrl.searchParams.get("state") ?? "";
  const nonce = cookieValue(request, GOOGLE_OAUTH_NONCE_COOKIE);
  const code = requestUrl.searchParams.get("code") ?? "";
  if (
    requestUrl.searchParams.has("error") ||
    !expectedState ||
    !returnedState ||
    !nonce ||
    !code ||
    !secureValuesMatch(expectedState, returnedState)
  ) {
    return errorRedirect(request, "google_cancelled");
  }

  try {
    const requestedNext = safeGoogleNextPath(
      cookieValue(request, GOOGLE_OAUTH_NEXT_COOKIE)
    );
    const anonymousSessionId = await getUserSessionId(request);
    const anonymousProfile = await getCandidateProfile(anonymousSessionId);
    const identity = await exchangeGoogleCode({
      requestUrl: request.url,
      code,
      nonce,
    });
    const { user } = await findOrCreateGoogleUser(identity);
    const userSessionId = authenticatedSessionId(user);
    const currentUserProfile = await getCandidateProfile(userSessionId);
    const source =
      requestedNext === "/register" && anonymousProfile.cvUploaded
        ? anonymousProfile
        : currentUserProfile;
    const saved = await saveCandidateProfile(userSessionId, {
      ...source,
      firstName: source.firstName || user.firstName,
      lastName: source.lastName || user.lastName,
      email: user.email,
    });

    if (
      anonymousSessionId !== "local" &&
      anonymousSessionId !== userSessionId &&
      requestedNext === "/register" &&
      anonymousProfile.cvUploaded
    ) {
      await deleteCandidateProfile(anonymousSessionId).catch(() => {});
    }

    const target = saved.onboardingComplete
      ? requestedNext === "/register"
        ? "/dashboard/jobs"
        : requestedNext
      : "/register";
    const response = NextResponse.redirect(new URL(target, request.url));
    await setAuthCookie(response, user);
    clearOAuthCookies(response);
    return response;
  } catch {
    return errorRedirect(request, "google_failed");
  }
}
