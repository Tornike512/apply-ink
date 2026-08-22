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
        description={token ? "Changing your password signs out your other sessions." : "This reset link is missing information. Request a new link."}
        footer={<AuthLink href="/forgot-password">Request another reset link</AuthLink>}
      >
        <ResetPasswordForm token={token} />
      </AuthCard>
    </>
  );
}
