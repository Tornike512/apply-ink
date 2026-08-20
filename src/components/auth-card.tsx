import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 pb-12 pt-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 -left-24 size-96 rounded-full bg-sand/55 blur-3xl" />
        <div className="absolute top-20 right-[-8rem] size-[28rem] rounded-full bg-terracotta/20 blur-3xl" />
      </div>
      <section className="relative w-full max-w-md rounded-3xl border border-sand bg-surface/90 p-7 shadow-[0_24px_80px_rgba(78,47,36,0.1)] sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-espresso">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-espresso/60">{description}</p>
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 border-t border-sand/60 pt-5 text-center text-sm text-espresso/60">{footer}</div>}
      </section>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="font-semibold text-sienna hover:text-espresso">{children}</Link>;
}
