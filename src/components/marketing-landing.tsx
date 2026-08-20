import Link from "next/link";

const steps = [
  ["01", "Create your profile", "Upload your resume and save the answers employers ask most."],
  ["02", "Get matched", "AI ranks remote roles against your real skills and preferences."],
  ["03", "Apply automatically", "Complete forms are submitted; unknown or sensitive choices pause for you."],
];

export function MarketingLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream pt-18">
      <div className="pointer-events-none absolute inset-x-0 top-18 h-[40rem] overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-sand/55 blur-3xl" />
        <div className="absolute top-12 right-[-7rem] size-[28rem] rounded-full bg-terracotta/20 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-5 pb-24 sm:px-8 lg:px-12">
        <section className="grid min-h-[calc(100vh-4.5rem)] items-center gap-10 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sienna/20 bg-surface/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-sienna">
              <span className="size-2 rounded-full bg-success" />
              AI job search on autopilot
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl leading-[0.98] font-bold tracking-[-0.055em] text-espresso sm:text-6xl lg:text-7xl">
              Answer once.
              <span className="block text-terracotta">Apply everywhere.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-espresso/68 sm:text-xl">
              Apply Ink finds matching remote jobs, tailors your CV, and completes
              straightforward applications using answers you approved during registration.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-sienna px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-espresso"
              >
                Upload your resume
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-sand bg-surface/75 px-6 py-3 text-sm font-semibold text-espresso transition-colors hover:bg-surface"
              >
                I already have an account
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-sand bg-surface/85 p-6 shadow-[0_24px_80px_rgba(78,47,36,0.12)] backdrop-blur sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sienna">
              One profile powers every application
            </p>
            <p className="mt-4 text-3xl font-bold tracking-tight text-espresso">
              More saved answers means fewer interruptions.
            </p>
            <div className="mt-6 grid gap-3">
              {["Salary and availability", "Work authorization and sponsorship", "Experience and location preferences"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-cream/70 p-4 text-sm font-semibold text-espresso">
                  <span className="flex size-6 items-center justify-center rounded-full bg-success/12 text-xs text-success">✓</span>
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-espresso/60">
              AI never invents missing facts. Legal declarations, CAPTCHAs, and uncertain
              answers stay in Messages for your review.
            </p>
          </aside>
        </section>

        <section className="scroll-mt-28 border-t border-sand/70 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">How it works</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-espresso sm:text-4xl">
            Set it up once, then let the queue move.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <article key={number} className="rounded-3xl border border-sand bg-surface/75 p-6">
                <span className="text-sm font-bold text-terracotta">{number}</span>
                <h3 className="mt-5 text-xl font-bold text-espresso">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-espresso/60">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
