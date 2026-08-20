import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  authenticatedSessionId,
  getAuthenticatedUser,
} from "@/lib/auth";

const SESSION_COOKIE = "apply-ink-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const SESSION_ID = /^(?:local|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function requestHostname(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? new URL(request.url).host;
  const normalized = host.includes("://") ? host : `http://${host}`;
  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isLocalRequest(request: Request): boolean {
  return LOCAL_HOSTS.has(requestHostname(request));
}

export async function getUserSessionId(request: Request): Promise<string> {
  const user = await getAuthenticatedUser(request);
  if (user) return authenticatedSessionId(user);

  // Keep existing local-only data attached to the local dashboard.
  if (isLocalRequest(request)) return "local";

  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing && SESSION_ID.test(existing)) return existing;

  const sessionId = randomUUID();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return sessionId;
}

export async function getAuthenticatedSessionId(
  request: Request
): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  return user ? authenticatedSessionId(user) : null;
}

export function unauthenticatedResponse(): Response {
  return Response.json(
    { error: "Log in to access this account." },
    { status: 401 }
  );
}

export function isTrustedMutation(request: Request): boolean {
  if (request.headers.get("x-apply-ink") !== "1") return false;

  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).hostname.toLowerCase() === requestHostname(request);
  } catch {
    return false;
  }
}

export function untrustedMutationResponse(): Response {
  return Response.json({ error: "This request was rejected." }, { status: 403 });
}
