import Link from "next/link";
import { MarketingFaq } from "./marketing-faq";
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
      "We read your skills and work history, then build a profile for you to review.",
  },
  {
    number: "02",
    title: "Review your matches",
    description:
      "See global remote jobs ranked by how well they fit your profile.",
  },
  {
    number: "03",
    title: "Start applying",
    description:
      "One click starts applications using the answers and rules you approved.",
  },
] as const;

const runItems = [
  ["Match checked", "The role fits your skills and job preferences"],
  ["Resume prepared", "Your real experience is adapted to the role"],
  ["Form filled", "Saved answers fill questions Apply Ink can answer"],
  ["Result recorded", "See it later in Applications or Messages"],
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

function UploadFileIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.5 2.8h7.2l3.8 3.8v14.6h-11z" strokeLinejoin="round" />
      <path d="M13.7 2.8v3.8h3.8M9 14l3-3 3 3M12 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2.8c.7 5.4 3.4 8.1 8.8 8.8-5.4.7-8.1 3.4-8.8 8.8-.7-5.4-3.4-8.1-8.8-8.8C8.6 10.9 11.3 8.2 12 2.8Z" strokeLinejoin="round" />
      <path d="M19.2 2.8c.2 1.7 1 2.5 2.7 2.7-1.7.2-2.5 1-2.7 2.7-.2-1.7-1-2.5-2.7-2.7 1.7-.2 2.5-1 2.7-2.7Z" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className={className}
    >
      <path d="m3.1 10.8 17.8-7.3-5.6 17-4-7.1z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11.3 13.4 4-4" strokeLinecap="round" />
    </svg>
  );
}

function UploadTrayIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 15V3m0 0L7.8 7.2M12 3l4.2 4.2M4 14.5v5h16v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BriefcaseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.5 7.5h17v12h-17zM9 7.5V5h6v2.5M3.5 12h17M10 12v2h4v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepIcon({ index }: { index: number }) {
  if (index === 0) return <UploadFileIcon />;
  if (index === 1) return <SparkleIcon />;
  return <SendIcon />;
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

      <div className="relative mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <section className="grid min-h-[calc(100vh-4.5rem)] grid-cols-1 items-center gap-12 py-14 lg:grid-cols-[1.03fr_0.97fr] lg:gap-16 lg:py-20">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-sm font-semibold text-sienna">
              <span className="h-px w-10 bg-terracotta" aria-hidden="true" />
              Skip the repeated application forms
            </p>

            <h1 className="hero-title mt-6 max-w-3xl text-[2.55rem] text-espresso sm:text-6xl lg:text-[4.45rem]">
              One resume.
              <span className="block text-terracotta">Many applications.</span>
              One click.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-espresso/68 sm:text-xl">
              Apply Ink finds global remote jobs that match your profile,
              prepares each application, and fills forms with answers you approved.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register#register"
                className="group inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-sienna px-6 py-3 text-sm font-bold text-cream shadow-[0_14px_35px_rgba(98,65,55,0.22)] transition-all hover:-translate-y-0.5 hover:bg-espresso"
              >
                Start applying
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
              {["Global remote jobs", "Missing facts stay blank", "You set the rules"].map(
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
                    Apply to matching jobs
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
              Applications sent
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

        <section id="how-it-works" className="scroll-mt-28 py-24 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-terracotta">
              How it works
            </p>
            <h2 className={`${styles.editorialHeading} mt-5 text-4xl leading-[1.02] tracking-[-0.045em] text-espresso sm:text-5xl lg:text-6xl`}>
              From one resume to many applications.
            </h2>
          </div>

          <div className={`${styles.stepsStage} mt-14 lg:mt-8`}>
            <span className={`${styles.stepConnector} ${styles.stepConnectorOne}`} aria-hidden="true" />
            <span className={`${styles.stepConnector} ${styles.stepConnectorTwo}`} aria-hidden="true" />

            {steps.map((step, index) => (
              <article
                key={step.number}
                className={`${styles.stepCard} ${
                  index === 0
                    ? styles.stepCardOne
                    : index === 1
                      ? styles.stepCardTwo
                      : styles.stepCardThree
                }`}
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-terracotta/14 text-terracotta sm:size-16">
                  <StepIcon index={index} />
                </span>
                <div className="relative z-10 min-w-0 pt-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">
                    Step {step.number}
                  </p>
                  <span className="mt-3 block h-px w-6 bg-terracotta" aria-hidden="true" />
                  <h3 className={`${styles.editorialHeading} mt-5 text-2xl leading-tight text-espresso`}>
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-64 text-sm leading-7 text-espresso/58">
                    {step.description}
                  </p>
                </div>
                <span className={`${styles.editorialHeading} absolute top-5 right-6 text-7xl leading-none text-terracotta/14`} aria-hidden="true">
                  {step.number}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="grid items-center gap-12 rounded-[1.75rem] border border-sand bg-[#2F1C17] px-6 py-10 text-cream shadow-[0_24px_80px_rgba(42,23,19,0.18)] sm:px-10 sm:py-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">What happens after one click</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
              One click starts your applications.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-cream/65 sm:text-base">
              Apply Ink checks each match, prepares a job-specific resume, fills
              questions it can answer, and records the result. You do not have to repeat the same form.
            </p>
            <div className="mt-7 rounded-2xl border border-cream/12 bg-cream/6 p-4">
              <p className="flex items-start gap-3 text-sm leading-6 text-cream/72">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-terracotta/20 text-terracotta">!</span>
                Apply Ink pauses when a company asks a new question, requests a sensitive choice, or shows a CAPTCHA.
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

        <section id="safety-and-control" className={`${styles.controlSection} relative my-24 scroll-mt-28 overflow-hidden rounded-[1.75rem] border border-sand/80 px-6 py-12 shadow-[0_24px_80px_rgba(78,47,36,0.08)] sm:px-10 sm:py-16 lg:px-16 lg:py-18`}>
          <div className={styles.controlArcs} aria-hidden="true" />
          <div className={styles.controlDots} aria-hidden="true" />

          <div className="relative z-10 max-w-3xl">
            <p className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.18em] text-terracotta">
              <span className="h-px w-12 bg-terracotta" aria-hidden="true" />
              You stay in control
            </p>
            <h2 className={`${styles.editorialHeading} mt-7 text-5xl leading-[0.94] tracking-[-0.05em] text-espresso sm:text-6xl lg:text-7xl`}>
              Your profile sets<br className="hidden sm:block" /> the limits<span className="text-terracotta">.</span>
            </h2>
            <p className="mt-7 max-w-2xl text-base leading-8 text-espresso/62 sm:text-lg">
              Each application uses facts from your resume and saved answers.
              If information is missing, Apply Ink pauses and asks you.
            </p>
          </div>

          <div className="relative z-10 mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["Your real experience", "Job-specific resumes stay based on the work and skills in your uploaded resume."],
              ["Your saved answers", "Apply Ink reuses your answers for common application questions."],
              ["Your submission rules", "You choose when Apply Ink may submit and when it must pause."],
            ].map(([title, description]) => (
              <article key={title} className={`${styles.controlCard} rounded-3xl border border-sand/90 bg-surface/88 p-7 sm:p-8`}>
                <span className={styles.checkHalo}>
                  <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                    <CheckIcon />
                  </span>
                </span>
                <h3 className={`${styles.editorialHeading} mt-7 text-2xl leading-tight text-espresso`}>
                  {title}
                </h3>
                <span className="mt-5 block h-px w-8 bg-terracotta/65" aria-hidden="true" />
                <p className="mt-5 text-sm leading-7 text-espresso/58">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="grid scroll-mt-28 gap-10 border-t border-sand/70 py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">
              Common questions
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-espresso sm:text-5xl">
              Questions before you start
            </h2>
            <p className="mt-4 text-sm leading-7 text-espresso/60 sm:text-base">
              Learn how applications work, which jobs you will see, when you
              need to step in, and how your data is handled.
            </p>
          </div>

          <MarketingFaq />
        </section>

        <section className={`${styles.finalCta} relative mb-14 overflow-hidden rounded-[1.75rem] border border-sand/90 px-6 py-12 shadow-[0_26px_90px_rgba(78,47,36,0.1)] sm:px-10 sm:py-16 lg:px-16`}>
          <div className={styles.finalDots} aria-hidden="true" />
          <div className={styles.finalGlow} aria-hidden="true" />

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-sand bg-surface/55 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em] text-sienna">
                <SparkleIcon className="size-4" />
                Skip the repeated forms
              </p>
              <h2 className="mt-7 text-4xl leading-[1.04] font-bold tracking-[-0.045em] text-espresso sm:text-5xl lg:text-6xl">
                Upload once. Apply to global remote jobs.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-8 text-espresso/60 sm:text-lg">
                Build your profile, review your matches, and start applications
                when you are ready.
              </p>
              <Link
                href="/register#register"
                className="group mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-sienna px-7 py-3 text-sm font-bold text-cream shadow-[0_16px_40px_rgba(98,65,55,0.24)] transition-all hover:-translate-y-0.5 hover:bg-espresso"
              >
                <UploadTrayIcon className="size-5" />
                Start applying
                <span className="transition-transform group-hover:translate-x-1">
                  <ArrowIcon />
                </span>
              </Link>

              <div className="mt-8 flex flex-wrap gap-2.5">
                {["Global remote jobs", "Missing facts stay blank", "You stay in control"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-sand/80 bg-surface/38 px-3 py-2 text-xs font-semibold text-espresso/62">
                    <CheckIcon className="size-4 text-sienna" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <figure
              aria-label="Resume upload becomes a complete profile and matching remote jobs"
              className={styles.finalIllustration}
            >
              <svg className={styles.finalRoute} viewBox="0 0 640 500" fill="none" aria-hidden="true">
                <path d="M35 420C8 285 123 238 232 236C335 234 377 287 472 268C557 251 615 278 603 373" stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 7" />
                <path d="m596 363 7 10 7-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div className={styles.resumeSheet}>
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-surface text-sienna shadow-[0_8px_22px_rgba(78,47,36,0.12)]">
                    <UploadFileIcon className="size-6" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-espresso">Your Resume</span>
                    <span className="mt-1 block text-xs text-espresso/45">PDF · ready</span>
                  </span>
                </div>
                <div className="mt-7 space-y-2" aria-hidden="true">
                  <span className="block h-2 rounded-full bg-sand/38" />
                  <span className="block h-2 w-4/5 rounded-full bg-sand/28" />
                </div>
                {[
                  ["Experience", "w-full", "w-4/5"],
                  ["Skills", "w-3/4", "w-5/6"],
                  ["Education", "w-4/5", "w-2/3"],
                ].map(([label, firstWidth, secondWidth]) => (
                  <div key={label} className="mt-7">
                    <p className="text-[0.64rem] font-bold uppercase tracking-[0.08em] text-espresso/70">
                      {label}
                    </p>
                    <div className="mt-3 space-y-2" aria-hidden="true">
                      <span className={`block h-2 rounded-full bg-sand/34 ${firstWidth}`} />
                      <span className={`block h-2 rounded-full bg-sand/24 ${secondWidth}`} />
                    </div>
                  </div>
                ))}
              </div>

              <ol className={styles.finalStepList}>
                {[
                  ["Upload resume", "Add your resume", 0],
                  ["Build profile", "Review extracted facts", 1],
                  ["Find matches", "See global remote jobs", 2],
                ].map(([title, description, iconIndex], index) => (
                  <li key={String(title)} className={styles.finalStepCard}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sienna text-xs font-bold text-cream shadow-sm">
                      {index + 1}
                    </span>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-espresso shadow-[0_8px_20px_rgba(78,47,36,0.1)]">
                      {iconIndex === 2 ? <BriefcaseIcon className="size-5" /> : <StepIcon index={Number(iconIndex)} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold capitalize text-espresso">{title}</span>
                      <span className="mt-1 block text-xs leading-5 text-espresso/48">{description}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className={styles.matchCard}>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-terracotta/14 text-sienna">
                  <BriefcaseIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-espresso">Product Designer</span>
                  <span className="mt-1 block text-xs text-espresso/48">Worldwide · Remote</span>
                  <span className="mt-2 inline-flex rounded-full bg-success/10 px-2 py-1 text-[0.62rem] font-bold text-success">
                    98% match
                  </span>
                </span>
                <svg viewBox="0 0 20 24" width="18" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-espresso/35" aria-hidden="true">
                  <path d="M3 2h14v19l-7-4-7 4z" strokeLinejoin="round" />
                </svg>
              </div>
            </figure>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-sand/70 py-7 text-xs text-espresso/45 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-espresso/60">apply.ink</p>
          <p>Apply to global remote jobs, with you in control.</p>
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
