import { createPasswordResetToken, normalizeEmail } from "@/lib/user-store";
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
    const token = /^\S+@\S+\.\S+$/.test(email)
      ? await createPasswordResetToken(email)
      : null;

    return Response.json({
      message:
        "If an account exists for that email, a password reset link is ready.",
      ...(process.env.NODE_ENV !== "production" && token
        ? { resetPath: `/reset-password?token=${encodeURIComponent(token)}` }
        : {}),
    });
  } catch {
    return Response.json(
      { error: "Could not start password recovery." },
      { status: 500 }
    );
  }
}
