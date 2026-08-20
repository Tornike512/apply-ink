import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  if (!(await getCurrentUser())) redirect("/login?next=/dashboard/jobs");
  return children;
}
