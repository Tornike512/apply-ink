import Link from "next/link";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-sand/70 bg-cream/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Apply Ink home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Account" className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-espresso/60 md:inline">
                {user.firstName || user.email}
              </span>
              <Link
                href="/dashboard/jobs"
                className="whitespace-nowrap rounded-xl bg-sienna px-3 py-2 text-sm font-bold text-cream transition-colors hover:bg-espresso sm:px-4"
              >
                Dashboard
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-xl border border-sand bg-surface/75 px-3 py-2 text-sm font-semibold text-espresso transition-colors hover:bg-surface sm:px-4"
              >
                Log in
              </Link>
              <Link
                href="/register#register"
                className="whitespace-nowrap rounded-xl bg-sienna px-3 py-2 text-sm font-bold text-cream transition-colors hover:bg-espresso sm:px-4"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
