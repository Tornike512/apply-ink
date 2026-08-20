import {
  passwordValidationError,
  resetPasswordWithToken,
} from "@/lib/user-store";
import {
  isTrustedMutation,
  untrustedMutationResponse,
} from "@/lib/user-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const passwordError = passwordValidationError(password);
    if (passwordError) {
      return Response.json({ error: passwordError }, { status: 400 });
    }
    if (token.length < 32 || !(await resetPasswordWithToken(token, password))) {
      return Response.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Could not reset the password." },
      { status: 500 }
    );
  }
}
