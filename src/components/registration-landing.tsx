"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApplicationQuestionFields } from "@/components/application-question-fields";
import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import {
  CANDIDATE_PROFILE_KEY,
  useCandidateProfile,
} from "@/hooks/use-candidate-profile";
import {
  APPLICATION_ANSWER_KEYS,
  EMPTY_CANDIDATE_PROFILE,
  type CandidateProfile,
} from "@/lib/candidate-profile";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors placeholder:text-espresso/35 focus:border-terracotta";

const STEPS = [
  {
    title: "Account",
    description: "Your name, email, and secure password",
  },
  {
    title: "Resume",
    description: "Contact details and your master CV",
  },
  {
    title: "Preferences",
    description: "Compensation, location, and availability",
  },
  {
    title: "Experience",
    description: "Reusable answers employers ask most",
  },
  {
    title: "Permissions",
    description: "Choose what AI may submit for you",
  },
] as const;

type ValidatableField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function countFormAnswers(form: HTMLFormElement): number {
  const formData = new FormData(form);
  return APPLICATION_ANSWER_KEYS.filter((key) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim().length > 0;
  }).length;
}

export function RegistrationWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useCandidateProfile();
  const profile = profileQuery.data ?? EMPTY_CANDIDATE_PROFILE;
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [answerCount, setAnswerCount] = useState<number | null>(null);
  const visibleAnswerCount = answerCount ?? profile.applicationAnswerCount;
  const coverage = Math.round(
    (visibleAnswerCount / profile.applicationAnswerTotal) * 100
  );

  function scrollToWizard() {
    requestAnimationFrame(() => {
      document.getElementById("register")?.scrollIntoView({ block: "start" });
    });
  }

  function stepIsValid(): boolean {
    const form = formRef.current;
    const container = form?.querySelector<HTMLElement>(
      `[data-registration-step="${step}"]`
    );
    if (!container) return false;

    const fields = container.querySelectorAll<ValidatableField>(
      "input, select, textarea"
    );
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    if (step === 0 && form) {
      const formData = new FormData(form);
      if (formData.get("password") !== formData.get("passwordConfirmation")) {
        setMessage("Passwords do not match.");
        form.querySelector<HTMLInputElement>('[name="passwordConfirmation"]')?.focus();
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    setMessage(null);
    if (!stepIsValid()) return;
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setFurthestStep((current) => Math.max(current, next));
    scrollToWizard();
  }

  function previousStep() {
    setMessage(null);
    setStep((current) => Math.max(0, current - 1));
    scrollToWizard();
  }

  function openStep(index: number) {
    if (index > furthestStep || saving) return;
    setMessage(null);
    setStep(index);
    scrollToWizard();
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(
      formData.get("passwordConfirmation") ?? ""
    );
    if (password !== passwordConfirmation) {
      setStep(0);
      setMessage("Passwords do not match.");
      setSaving(false);
      scrollToWizard();
      return;
    }
    formData.set("finishOnboarding", "1");
    try {
      const accountResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "x-apply-ink": "1" },
        body: formData,
      });
      const accountData = (await accountResponse.json().catch(() => ({}))) as {
        profile?: CandidateProfile;
        error?: string;
      };
      if (!accountResponse.ok || !accountData.profile) {
        throw new Error(accountData.error ?? "Could not create your account.");
      }
      queryClient.setQueryData(CANDIDATE_PROFILE_KEY, accountData.profile);
      router.replace("/dashboard/jobs");
      router.refresh();
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "Could not create your application profile.";
      if (/resume|cv|document/i.test(nextMessage)) setStep(1);
      if (/email|password|account already/i.test(nextMessage)) setStep(0);
      setMessage(nextMessage);
      scrollToWizard();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-cream pb-20 pt-18">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-sand/55 blur-3xl" />
        <div className="absolute top-12 right-[-7rem] size-[28rem] rounded-full bg-terracotta/20 blur-3xl" />
      </div>

      <section
        id="register"
        className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-5 pt-10 sm:px-8 sm:pt-14 lg:px-12"
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-terracotta">
              Registration
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-espresso sm:text-4xl">
              Create your Apply Ink account
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-espresso/60">
              Five short steps give AI the verified answers it needs to complete
              more applications without stopping.
            </p>
          </div>
          <p className="text-sm text-espresso/55">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-sienna hover:text-espresso">
              Log in
            </Link>
          </p>
        </div>

        {profileQuery.isPending ? (
          <div className="flex items-center justify-center gap-3 rounded-3xl border border-sand bg-surface p-10">
            <Spinner />
            <p className="text-sm text-espresso/65">Loading registration...</p>
          </div>
        ) : profileQuery.isError ? (
          <div className="rounded-3xl border border-sienna/30 bg-surface p-8">
            <p className="text-sm text-sienna">{profileQuery.error.message}</p>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-sand bg-surface/75 p-3 backdrop-blur lg:sticky lg:top-24 lg:p-4">
              <p className="px-2 pb-3 text-xs font-bold uppercase tracking-[0.14em] text-sienna lg:px-3">
                Step {step + 1} of {STEPS.length}
              </p>
              <ol className="grid grid-cols-5 gap-1.5 lg:grid-cols-1">
                {STEPS.map((item, index) => (
                  <li key={item.title}>
                    <button
                      type="button"
                      aria-label={`Step ${index + 1}: ${item.title}`}
                      disabled={index > furthestStep || saving}
                      aria-current={index === step ? "step" : undefined}
                      onClick={() => openStep(index)}
                      className={`flex w-full items-start justify-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 lg:justify-start lg:px-3 lg:py-3 ${
                        index === step
                          ? "bg-sienna text-cream"
                          : "text-espresso hover:bg-sand/35"
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          index === step
                            ? "bg-cream text-sienna"
                            : index < step
                              ? "bg-success/15 text-success"
                              : "bg-sand/45 text-espresso/65"
                        }`}
                      >
                        {index < step ? "✓" : index + 1}
                      </span>
                      <span className="hidden lg:block">
                        <span className="block text-sm font-bold">{item.title}</span>
                        <span
                          className={`mt-0.5 block text-xs leading-4 ${
                            index === step ? "text-cream/75" : "text-espresso/50"
                          }`}
                        >
                          {item.description}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-4 hidden border-t border-sand/60 px-3 pt-4 lg:block">
                <div className="flex items-center justify-between text-xs font-semibold text-espresso/60">
                  <span>Automation coverage</span>
                  <span>{coverage}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand/45">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-terracotta to-success transition-[width]"
                    style={{ width: `${coverage}%` }}
                  />
                </div>
              </div>
            </aside>

            <form
              ref={formRef}
              key={`${profile.matchVersion}:${profile.resumeFileName ?? "none"}`}
              onSubmit={register}
              onChange={(event) =>
                setAnswerCount(countFormAnswers(event.currentTarget))
              }
              className="rounded-3xl border border-sand bg-surface/90 shadow-[0_24px_80px_rgba(78,47,36,0.08)]"
            >
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="mb-7">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-terracotta">
                    Step {step + 1}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-espresso">
                    {STEPS[step].title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-espresso/60">
                    {STEPS[step].description}
                  </p>
                </div>

                <section data-registration-step="0" hidden={step !== 0}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-espresso">
                      First name
                      <input name="firstName" autoComplete="given-name" required defaultValue={profile.firstName} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Last name
                      <input name="lastName" autoComplete="family-name" required defaultValue={profile.lastName} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso sm:col-span-2">
                      Email
                      <input name="email" type="email" autoComplete="email" required defaultValue={profile.email} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Password
                      <input name="password" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
                      <span className="mt-1.5 block text-xs font-normal text-espresso/50">
                        At least 10 characters with a letter and a number
                      </span>
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Confirm password
                      <input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
                    </label>
                  </div>
                </section>

                <section data-registration-step="1" hidden={step !== 1}>
                  <p className="mb-5 text-sm leading-6 text-espresso/60">
                    We extract skills and experience from your resume to personalize
                    matches and application answers.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-espresso">
                      Phone
                      <input name="phone" type="tel" autoComplete="tel" required defaultValue={profile.phone} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Current location
                      <input name="location" autoComplete="address-level2" required placeholder="Tbilisi, Georgia" defaultValue={profile.location} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      LinkedIn URL
                      <input name="linkedinUrl" type="url" defaultValue={profile.linkedinUrl} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Portfolio URL
                      <input name="portfolioUrl" type="url" defaultValue={profile.portfolioUrl} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso sm:col-span-2">
                      Resume
                      <input
                        name="resume"
                        type="file"
                        accept=".pdf,.doc,.docx,.rtf,.odt,.txt"
                        required={!profile.resumeFileName}
                        className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-sand/55 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-espresso`}
                      />
                      <span className="mt-1.5 block text-xs font-normal text-espresso/50">
                        {profile.resumeFileName
                          ? `${profile.resumeFileName} is already uploaded. Choose a file only to replace it.`
                          : "PDF, DOC, DOCX, RTF, ODT, or TXT; maximum 10 MB"}
                      </span>
                    </label>
                    <label className="text-sm font-medium text-espresso sm:col-span-2">
                      Default introduction or cover note
                      <textarea
                        name="coverLetter"
                        rows={4}
                        placeholder="A short introduction AI may adapt for each role."
                        defaultValue={profile.coverLetter}
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                  </div>
                </section>

                <section data-registration-step="2" hidden={step !== 2}>
                  <ApplicationQuestionFields profile={profile} sections={["preferences"]} />
                </section>

                <section data-registration-step="3" hidden={step !== 3}>
                  <ApplicationQuestionFields profile={profile} sections={["experience"]} />
                </section>

                <section data-registration-step="4" hidden={step !== 4}>
                  <ApplicationQuestionFields profile={profile} sections={["permissions"]} />
                  <div className="mt-6 rounded-2xl border border-sand bg-cream/65 p-4">
                    <p className="text-sm font-bold text-espresso">
                      {visibleAnswerCount} of {profile.applicationAnswerTotal} common answers ready
                    </p>
                    <p className="mt-1 text-xs leading-5 text-espresso/55">
                      Blank answers stay blank. AI will pause instead of guessing.
                    </p>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-3 border-t border-sand/65 bg-cream/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p aria-live="polite" className="text-xs leading-5 text-sienna">
                  {message ?? `Step ${step + 1} of ${STEPS.length}`}
                </p>
                <div className="flex gap-2 sm:ml-auto">
                  {step > 0 && (
                    <Button type="button" variant="outline" onClick={previousStep} disabled={saving} className="min-w-24 rounded-xl px-5 py-2.5">
                      Back
                    </Button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={(event) => {
                        event.preventDefault();
                        nextStep();
                      }}
                      className="min-w-28 rounded-xl px-5 py-2.5"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" variant="primary" disabled={saving} className="min-w-48 rounded-xl px-6 py-2.5">
                      {saving ? "Creating account..." : "Create account and find jobs"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
