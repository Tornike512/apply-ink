import { redirect } from "next/navigation";
import { AuthCard, AuthLink } from "@/components/auth-card";
import { LoginForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/dashboard/jobs");
  const parameters = await searchParams;
  const requested = typeof parameters.next === "string" ? parameters.next : "";
  const nextPath = requested.startsWith("/dashboard/") ? requested : "/dashboard/jobs";
  const reset = parameters.reset === "1";

  return (
    <>
      <SiteHeader />
      <AuthCard
        eyebrow="Welcome back"
        title="Log in to Apply Ink"
        description="Your saved answers, applications, and matching jobs are waiting."
        footer={<>New here? <AuthLink href="/register">Create your account</AuthLink></>}
      >
        {reset && <p className="mb-4 rounded-xl border border-success/25 bg-success/8 px-4 py-3 text-sm text-success">Password updated. Log in with your new password.</p>}
        <LoginForm nextPath={nextPath} />
      </AuthCard>
    </>
  );
}
