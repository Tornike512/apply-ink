import Link from "next/link";
import styles from "./marketing-landing.module.css";

const companies = [
  {
    initials: "NL",
    color: "bg-[#DCE8D5] text-[#46613F]",
    company: "Northstar Labs",
    role: "Product Designer · Remote",
    match: "96% match",
    status: "Applied",
  },
  {
    initials: "CP",
    color: "bg-[#DDE7F3] text-[#405A78]",
    company: "Cloudpeak",
    role: "Senior Developer · Worldwide",
    match: "92% match",
    status: "Applying",
  },
  {
    initials: "VO",
    color: "bg-[#F2E0D6] text-sienna",
    company: "Verve Ops",
    role: "Marketing Manager · Remote",
    match: "89% match",
    status: "Next",
  },
] as const;

const steps = [
  {
    number: "01",
    title: "Upload your resume",
    description:
      "We read your skills and experience, then build a profile you can check and edit.",
  },
  {
    number: "02",
    title: "See your best matches",
    description:
      "Apply Ink finds global remote jobs and puts the strongest matches first.",
  },
  {
    number: "03",
    title: "Click once to apply",
    description:
      "Start many applications at once using the answers and rules you approved.",
  },
] as const;

const runItems = [
  ["Match checked", "Role fits your skills and job choices"],
  ["Resume prepared", "Your real experience is shaped for the role"],
  ["Form completed", "Saved answers fill common questions"],
  ["Application sent", "The result is saved in your activity"],
] as const;

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={className}
    >
      <path d="m4.5 10.2 3.2 3.2 7.8-7.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MarketingLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream pt-18">
      <div
        className="pointer-events-none absolute inset-x-0 top-18 h-[46rem] overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-sand/55 blur-3xl" />
        <div className="absolute top-4 right-[-8rem] size-[32rem] rounded-full bg-terracotta/20 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
        <section className="grid min-h-[calc(100vh-4.5rem)] grid-cols-1 items-center gap-12 py-14 lg:grid-cols-[1.03fr_0.97fr] lg:gap-16 lg:py-20">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-sienna/20 bg-surface/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-sienna shadow-sm backdrop-blur sm:tracking-[0.16em]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              For global remote job seekers
            </span>

            <h1 className="mt-6 max-w-3xl text-[2.55rem] leading-[0.98] font-bold tracking-[-0.055em] text-espresso sm:text-6xl lg:text-[4.45rem]">
              One resume.
              <span className="block text-terracotta">Many applications.</span>
              One click.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-espresso/68 sm:text-xl">
              Apply Ink finds global remote jobs that match you, prepares each
              application, and fills the forms using answers you approved.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register#register"
                className="group inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-sienna px-6 py-3 text-sm font-bold text-cream shadow-[0_14px_35px_rgba(98,65,55,0.22)] transition-all hover:-translate-y-0.5 hover:bg-espresso"
              >
                Upload your resume
                <span className="transition-transform group-hover:translate-x-1">
                  <ArrowIcon />
                </span>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex min-h-13 items-center justify-center rounded-xl border border-sand bg-surface/65 px-6 py-3 text-sm font-semibold text-espresso transition-colors hover:bg-surface"
              >
                See how it works
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-espresso/55">
              {["Global remote roles", "No answers made up", "You set the rules"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckIcon className="size-4 text-success" />
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          <figure
            aria-label="One click starts applications for several matching remote jobs"
            className={`${styles.heroDemo} relative mx-auto min-w-0 w-full max-w-xl`}
          >
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-surface/35 blur-xl" />
            <div className="overflow-hidden rounded-3xl border border-sand bg-surface/92 shadow-[0_30px_90px_rgba(78,47,36,0.16)] backdrop-blur">
              <div className="flex items-center justify-between border-b border-sand/70 px-5 py-3.5">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2 rounded-full bg-terracotta/70" />
                  <span className="size-2 rounded-full bg-sand" />
                  <span className="size-2 rounded-full bg-success/60" />
                </div>
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-espresso/40">
                  Application run
                </span>
                <span className="flex items-center gap-1.5 text-[0.65rem] font-bold text-success">
                  <span className="size-1.5 rounded-full bg-success" /> Live
                </span>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex items-center gap-3 rounded-2xl border border-sand/75 bg-cream/65 p-3.5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface text-terracotta shadow-sm">
                    <svg
                      viewBox="0 0 24 24"
                      width="21"
                      height="21"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M7 3.5h7l4 4V20.5H7z" strokeLinejoin="round" />
                      <path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h4" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-espresso">Your resume is ready</span>
                    <span className="block truncate text-xs text-espresso/50">
                      Skills, choices, and saved answers checked
                    </span>
                  </span>
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-[0.65rem] font-bold text-success">
                    Ready
                  </span>
                </div>

                <div className="relative my-5 flex justify-center">
                  <span className={`${styles.workflowLine} absolute top-1/2 h-px bg-terracotta/30`} />
                  <div className={`${styles.applyButton} relative z-10 flex items-center gap-2 rounded-xl bg-sienna px-5 py-3 text-sm font-bold text-cream shadow-lg`}>
                    <svg
                      viewBox="0 0 20 20"
                      width="17"
                      height="17"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      aria-hidden="true"
                    >
                      <path d="m3 10 14-6-4.5 13-2.7-5.1z" strokeLinejoin="round" />
                      <path d="m9.8 11.9 2.6-2.6" strokeLinecap="round" />
                    </svg>
                    Apply to 24 matches
                  </div>
                  <svg
                    className={styles.demoCursor}
                    viewBox="0 0 28 34"
                    width="28"
                    height="34"
                    aria-hidden="true"
                  >
                    <path d="M3 2.5 24.5 21l-9.2 1.7-5.1 8.2z" fill="#2a1713" stroke="#fffcf9" strokeWidth="2.5" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="grid gap-2.5">
                  {companies.map((company) => (
                    <div
                      key={company.company}
                      className={`${styles.companyCard} flex items-center gap-3 rounded-2xl border border-sand/70 bg-surface p-3.5`}
                    >
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${company.color}`}>
                        {company.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-espresso">{company.company}</span>
                          <span className="hidden text-[0.62rem] font-bold text-success sm:inline">
                            {company.match}
                          </span>
                        </span>
                        <span className="block truncate text-xs text-espresso/48">{company.role}</span>
                      </span>
                      <span className={`${styles.statusBadge} min-w-16 rounded-full px-2.5 py-1 text-center text-[0.62rem] font-bold`}>
                        {company.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${styles.floatingNote} absolute -right-3 -bottom-5 hidden items-center gap-2 rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-xs font-bold text-espresso shadow-xl sm:flex`}>
              <span className="flex size-6 items-center justify-center rounded-full bg-success text-cream">
                <CheckIcon className="size-4" />
              </span>
              8 applications sent
            </div>
          </figure>
        </section>

        <section aria-label="Product benefits" className="border-y border-sand/70 py-5">
          <div className="grid gap-4 text-center sm:grid-cols-2 lg:grid-cols-4">
            {["Worldwide remote jobs", "Skills-based matching", "Automatic form filling", "Human checks when needed"].map(
              (item) => (
                <p key={item} className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-espresso/55">
                  <span className="size-1.5 rounded-full bg-terracotta" />
                  {item}
                </p>
              )
            )}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-espresso sm:text-5xl">
              From resume to applications in three simple steps.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="group relative overflow-hidden rounded-3xl border border-sand bg-surface/70 p-7 transition-all hover:-translate-y-1 hover:bg-surface hover:shadow-[0_18px_55px_rgba(78,47,36,0.09)]"
              >
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-terracotta">Step {step.number}</span>
                <h3 className="mt-12 text-xl font-bold text-espresso">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-espresso/60">{step.description}</p>
                <span className="absolute top-6 right-6 text-6xl font-bold tracking-tighter text-sand/45 transition-colors group-hover:text-terracotta/18" aria-hidden="true">
                  {step.number}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="grid items-center gap-12 rounded-[1.75rem] border border-sand bg-[#2F1C17] px-6 py-10 text-cream shadow-[0_24px_80px_rgba(42,23,19,0.18)] sm:px-10 sm:py-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">One-click application run</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
              One click starts the busy work.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-cream/65 sm:text-base">
              Apply Ink checks the match, prepares your resume, fills known
              questions, and records every result. You do not repeat the same form all day.
            </p>
            <div className="mt-7 rounded-2xl border border-cream/12 bg-cream/6 p-4">
              <p className="flex items-start gap-3 text-sm leading-6 text-cream/72">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-terracotta/20 text-terracotta">!</span>
                Apply Ink pauses when a company asks for a new answer, a sensitive choice, or a CAPTCHA.
              </p>
            </div>
          </div>

          <div className={`${styles.runPanel} rounded-3xl border border-cream/12 bg-cream/7 p-5 sm:p-7`}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold">Application progress</p>
                <p className="mt-1 text-xs text-cream/48">Senior Product Designer · Remote</p>
              </div>
              <span className="rounded-full bg-success/16 px-3 py-1 text-[0.65rem] font-bold text-[#82D591]">Running</span>
            </div>

            <ol className={`${styles.runList} relative grid gap-4`}>
              {runItems.map(([title, description]) => (
                <li key={title} className={`${styles.runItem} relative flex gap-3`}>
                  <span className={`${styles.runCheck} relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-cream/15 bg-[#3A251F] text-[#82D591]`}>
                    <CheckIcon className="size-4" />
                  </span>
                  <span className="pt-0.5">
                    <span className="block text-sm font-bold">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-cream/48">{description}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">You stay in control</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-espresso sm:text-5xl">
              Fast does not mean careless.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-espresso/60">
              Your applications use facts from your resume and answers you approved. If something is missing, Apply Ink asks instead of guessing.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {[
              ["Your real experience", "Resume changes stay based on skills and work you actually have."],
              ["Your approved answers", "Common form questions use the choices saved in your profile."],
              ["Your final rules", "You choose when Apply Ink can submit and when it must pause."],
            ].map(([title, description]) => (
              <article key={title} className="rounded-3xl border border-sand bg-surface/65 p-6 text-center">
                <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckIcon />
                </span>
                <h3 className="mt-4 text-base font-bold text-espresso">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-espresso/55">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-14 overflow-hidden rounded-[1.75rem] border border-sand bg-terracotta/14 px-6 py-12 text-center sm:px-10 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sienna">Your next application can be easier</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-[-0.035em] text-espresso sm:text-5xl">
            Upload once. Start applying everywhere.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-espresso/60">
            Build your profile from your resume and see the remote jobs that match you best.
          </p>
          <Link
            href="/register#register"
            className="group mt-7 inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-sienna px-7 py-3 text-sm font-bold text-cream shadow-[0_14px_35px_rgba(98,65,55,0.2)] transition-all hover:-translate-y-0.5 hover:bg-espresso"
          >
            Upload your resume
            <span className="transition-transform group-hover:translate-x-1"><ArrowIcon /></span>
          </Link>
        </section>

        <footer className="flex flex-col gap-4 border-t border-sand/70 py-7 text-xs text-espresso/45 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-espresso/60">apply.ink</p>
          <p>Global remote applications, with you in control.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-sienna">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-sienna">
              Terms of Service
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
