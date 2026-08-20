import { AuthCard, AuthLink } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site-header";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const parameters = await searchParams;
  const token = typeof parameters.token === "string" ? parameters.token : "";
  return (
    <>
      <SiteHeader />
      <AuthCard
        eyebrow="Account recovery"
        title="Choose a new password"
        description={token ? "This will sign out existing sessions for your account." : "The reset token is missing. Request a fresh link to continue."}
        footer={<AuthLink href="/forgot-password">Request another reset link</AuthLink>}
      >
        <ResetPasswordForm token={token} />
      </AuthCard>
    </>
  );
}
