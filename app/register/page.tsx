import { redirect } from "next/navigation";
import { RegistrationWizard } from "@/components/registration-landing";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard/jobs");
  return (
    <>
      <SiteHeader />
      <RegistrationWizard />
    </>
  );
}
