import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { RegistrationWizard } from "@/components/registration-landing";
import { SiteHeader } from "@/components/site-header";
import { authenticatedSessionId, getCurrentUser } from "@/lib/auth";
import { getCandidateProfile } from "@/lib/application-store";
import { googleAuthConfigured } from "@/lib/google-auth";
import { phoneCountryFromHeaders } from "@/lib/phone-number";

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in is not available right now. Use email instead.",
  google_cancelled: "Google sign-in was cancelled or expired. Try again.",
  google_failed: "Google could not sign you in. Try again or use email.",
};

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const defaultPhoneCountry = phoneCountryFromHeaders(await headers());
  const user = await getCurrentUser();
  if (user) {
    const profile = await getCandidateProfile(authenticatedSessionId(user));
    if (profile.onboardingComplete) redirect("/dashboard/jobs");
  }
  const parameters = await searchParams;
  const errorCode = typeof parameters.error === "string" ? parameters.error : "";
  return (
    <>
      <SiteHeader />
      <RegistrationWizard
        googleEnabled={googleAuthConfigured()}
        authenticatedUser={user ? { email: user.email } : null}
        googleError={GOOGLE_ERRORS[errorCode] ?? null}
        defaultPhoneCountry={defaultPhoneCountry}
      />
    </>
  );
}
