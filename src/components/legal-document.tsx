import Link from "next/link";
import type { ReactNode } from "react";

type LegalDocumentProps = {
  title: string;
  description: string;
  updated: string;
  children: ReactNode;
};

export function LegalDocument({
  title,
  description,
  updated,
  children,
}: LegalDocumentProps) {
  return (
    <main className="min-h-screen bg-cream pt-18 text-espresso">
      <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-sienna transition-colors hover:text-espresso"
        >
          <span aria-hidden="true">&larr;</span>
          Back to Apply Ink
        </Link>

        <header className="mt-8 border-b border-sand pb-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">
            Apply Ink legal
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-espresso/65">
            {description}
          </p>
          <p className="mt-4 text-xs font-semibold text-espresso/45">
            Last updated: {updated}
          </p>
        </header>

        <article className="legal-copy py-10">{children}</article>

        <footer className="flex flex-col gap-4 border-t border-sand py-7 text-xs text-espresso/50 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-bold text-espresso/70 hover:text-sienna">
            apply.ink
          </Link>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-sienna">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-sienna">
              Terms of Service
            </Link>
            <a
              href="mailto:torniketsagareishvili64@gmail.com"
              className="hover:text-sienna"
            >
              Contact
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10 last:mb-0">
      <h2 className="text-xl font-bold tracking-[-0.02em] text-espresso">
        {title}
      </h2>
      <div className="mt-3 space-y-4 text-sm leading-7 text-espresso/68 sm:text-base">
        {children}
      </div>
    </section>
  );
}
