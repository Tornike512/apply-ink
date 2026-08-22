import { NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";
import { authenticateUser, normalizeEmail } from "@/lib/user-store";
import {
  isTrustedMutation,
  untrustedMutationResponse,
} from "@/lib/user-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || password.length > 200) {
      return Response.json(
        { error: "Email or password is incorrect." },
        { status: 401 }
      );
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return Response.json(
        { error: "Email or password is incorrect." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
    await setAuthCookie(response, user);
    return response;
  } catch {
    return Response.json({ error: "Could not log in. Try again." }, { status: 500 });
  }
}
