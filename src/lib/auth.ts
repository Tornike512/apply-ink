import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  getJwtSecret,
  getUserById,
  type AuthUser,
} from "@/lib/user-store";

export const AUTH_COOKIE = "apply-ink-auth";
const JWT_ISSUER = "apply-ink";
const JWT_AUDIENCE = "apply-ink-web";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  ver: number;
  iat: number;
  exp: number;
  iss: typeof JWT_ISSUER;
  aud: typeof JWT_AUDIENCE;
};

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function signature(value: string): Promise<Buffer> {
  return createHmac("sha256", await getJwtSecret()).update(value).digest();
}

export async function createAuthToken(user: AuthUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const payload = encodeJson({
    sub: user.id,
    ver: user.sessionVersion,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  } satisfies SessionPayload);
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${(await signature(unsigned)).toString("base64url")}`;
}

async function verifyAuthToken(token: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerValue, payloadValue, signatureValue] = parts;
  try {
    const header = JSON.parse(
      Buffer.from(headerValue, "base64url").toString("utf8")
    ) as { alg?: unknown; typ?: unknown };
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;

    const expected = await signature(`${headerValue}.${payloadValue}`);
    const actual = Buffer.from(signatureValue, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadValue, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== "string" ||
      typeof payload.ver !== "number" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iss !== JWT_ISSUER ||
      payload.aud !== JWT_AUDIENCE ||
      payload.iat > now + 60 ||
      payload.exp <= now
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function cookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

async function userFromToken(token: string | null): Promise<AuthUser | null> {
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.sub);
  return user && user.sessionVersion === payload.ver ? user : null;
}

export async function getAuthenticatedUser(
  request: Request
): Promise<AuthUser | null> {
  return userFromToken(cookieValue(request, AUTH_COOKIE));
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return userFromToken((await cookies()).get(AUTH_COOKIE)?.value ?? null);
}

export async function setAuthCookie(
  response: NextResponse,
  user: AuthUser
): Promise<void> {
  response.cookies.set(AUTH_COOKIE, await createAuthToken(user), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    priority: "high",
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    priority: "high",
  });
}

export function authenticatedSessionId(user: AuthUser): string {
  return `user:${user.id}`;
}
