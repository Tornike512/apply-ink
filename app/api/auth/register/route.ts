import { NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  setAuthCookie,
  authenticatedSessionId,
} from "@/lib/auth";
import {
  deleteCandidateProfile,
  getCandidateProfile,
  saveCandidateProfile,
} from "@/lib/application-store";
import {
  candidateProfileFromForm,
  onboardingValidationError,
  publicCandidateProfile,
  ResumeUploadError,
} from "@/lib/profile-form";
import {
  createUser,
  deleteUser,
  DuplicateEmailError,
  normalizeEmail,
  passwordValidationError,
  type AuthUser,
} from "@/lib/user-store";
import {
  getUserSessionId,
  isTrustedMutation,
  untrustedMutationResponse,
} from "@/lib/user-session";

export const runtime = "nodejs";
export const maxDuration = 60;

function text(formData: FormData, name: string, maxLength: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return untrustedMutationResponse();
  if (await getAuthenticatedUser(request)) {
    return Response.json({ error: "You are already logged in." }, { status: 409 });
  }

  let createdUser: AuthUser | null = null;
  let createdSessionId: string | null = null;
  try {
    const formData = await request.formData();
    const firstName = text(formData, "firstName", 100);
    const lastName = text(formData, "lastName", 100);
    const email = normalizeEmail(text(formData, "email", 254));
    const phone = text(formData, "phone", 50);
    const location = text(formData, "location", 150);
    const passwordValue = formData.get("password");
    const password = typeof passwordValue === "string" ? passwordValue : "";

    if (!firstName || !lastName) {
      return Response.json(
        { error: "Enter your first and last name." },
        { status: 400 }
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!phone || !location) {
      return Response.json(
        { error: "Enter your phone number and current location." },
        { status: 400 }
      );
    }
    const passwordError = passwordValidationError(password);
    if (passwordError) {
      return Response.json({ error: passwordError }, { status: 400 });
    }

    const anonymousSessionId = await getUserSessionId(request);
    const anonymousProfile = await getCandidateProfile(anonymousSessionId);
    const nextProfile = await candidateProfileFromForm(formData, anonymousProfile);
    const onboardingError = onboardingValidationError(nextProfile);
    if (onboardingError) {
      return Response.json(
        { error: onboardingError },
        { status: 400 }
      );
    }

    createdUser = await createUser({ firstName, lastName, email, password });
    createdSessionId = authenticatedSessionId(createdUser);
    const saved = await saveCandidateProfile(createdSessionId, nextProfile);

    const response = NextResponse.json({
      user: {
        id: createdUser.id,
        email: createdUser.email,
        firstName,
        lastName,
      },
      profile: publicCandidateProfile(saved),
    });
    await setAuthCookie(response, createdUser);
    return response;
  } catch (error) {
    if (createdSessionId) await deleteCandidateProfile(createdSessionId).catch(() => {});
    if (createdUser) await deleteUser(createdUser.id).catch(() => {});
    if (error instanceof DuplicateEmailError || error instanceof ResumeUploadError) {
      return Response.json({ error: error.message }, { status: error instanceof DuplicateEmailError ? 409 : 400 });
    }
    return Response.json(
      { error: "Could not create your account. Try again." },
      { status: 500 }
    );
  }
}
