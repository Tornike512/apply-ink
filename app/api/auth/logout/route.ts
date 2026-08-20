import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import {
  isTrustedMutation,
  untrustedMutationResponse,
} from "@/lib/user-session";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  const response = NextResponse.json({ ok: true });
  clearAuthCookie(response);
  return response;
}
