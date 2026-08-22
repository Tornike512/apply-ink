import { AuthCard, AuthLink } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site-header";

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <AuthCard
        eyebrow="Account recovery"
        title="Reset your password"
        description="Enter your account email. The reset link works once and expires after one hour."
        footer={<AuthLink href="/login">Back to log in</AuthLink>}
      >
        <ForgotPasswordForm />
      </AuthCard>
    </>
  );
}
