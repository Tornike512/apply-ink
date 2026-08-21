"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApplicationQuestionFields } from "@/components/application-question-fields";
import { Button } from "@/components/button";
import { CountryPhoneInput } from "@/components/country-phone-input";
import { SkillsInput } from "@/components/skills-input";
import { Spinner } from "@/components/spinner";
import {
  CANDIDATE_PROFILE_KEY,
  useCandidateProfile,
} from "@/hooks/use-candidate-profile";
import {
  APPLICATION_ANSWER_KEYS,
  EMPTY_CANDIDATE_PROFILE,
  type ApplicationAnswers,
  type CandidateProfile,
} from "@/lib/candidate-profile";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors placeholder:text-espresso/35 focus:border-terracotta";

const STEPS = [
  {
    title: "Account",
    description: "Your email and secure password",
  },
  {
    title: "Resume",
    description: "Upload your CV and review filled details",
  },
  {
    title: "Preferences",
    description: "Work authorization and availability",
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

type ResumePrefillResponse = {
  answers?: Record<string, string | string[]>;
  filledFields?: string[];
  error?: string;
};

type ResumePrefillStage = "uploading" | "reading" | "complete";

function mergeUniqueSkills(current: string[], detected: string[]): string[] {
  const seen = new Set<string>();
  return [...current, ...detected].reduce<string[]>((result, rawSkill) => {
    const skill = rawSkill.trim().replace(/\s+/g, " ").slice(0, 80);
    const normalized = skill.toLocaleLowerCase();
    if (!skill || seen.has(normalized)) return result;
    seen.add(normalized);
    result.push(skill);
    return result;
  }, []).slice(0, 50);
}

function countFormAnswers(form: HTMLFormElement): number {
  const formData = new FormData(form);
  return APPLICATION_ANSWER_KEYS.filter((key) => {
    const value = formData.get(key);
    if (typeof value !== "string" || !value.trim()) return false;
    if (key !== "workAuthorizationCountries" && key !== "raceEthnicities") {
      return true;
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }).length;
}

type RegistrationWizardProps = {
  googleEnabled: boolean;
  authenticatedUser?: { email: string } | null;
  googleError?: string | null;
  defaultPhoneCountry?: string;
};

export function RegistrationWizard({
  googleEnabled,
  authenticatedUser = null,
  googleError = null,
  defaultPhoneCountry = "us",
}: RegistrationWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useCandidateProfile();
  const profile = profileQuery.data ?? EMPTY_CANDIDATE_PROFILE;
  const formRef = useRef<HTMLFormElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const resumeUploadButtonRef = useRef<HTMLButtonElement>(null);
  const prefillRequestRef = useRef(0);
  const prefillXhrRef = useRef<XMLHttpRequest | null>(null);
  const prefillProgressTimerRef = useRef<number | null>(null);
  const prefillUploadFallbackTimerRef = useRef<number | null>(null);
  const prefillReadingStartedAtRef = useRef<number | null>(null);
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [prefillProgress, setPrefillProgress] = useState(0);
  const [prefillStage, setPrefillStage] =
    useState<ResumePrefillStage>("uploading");
  const [removingResume, setRemovingResume] = useState(false);
  const [resumeReadError, setResumeReadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [answerCount, setAnswerCount] = useState<number | null>(null);
  const [editedPhone, setEditedPhone] = useState<string | null>(null);
  const [editedSkills, setEditedSkills] = useState<string[] | null>(null);
  const [inferredTechnicalAnswers, setInferredTechnicalAnswers] = useState<
    Pick<ApplicationAnswers, "typescriptExperience" | "aiFrameworksExperience"> | null
  >(null);
  const [showAutomationTip, setShowAutomationTip] = useState(true);
  const [selectedResumeName, setSelectedResumeName] = useState<string | null>(
    null
  );
  const [approvedResumeName, setApprovedResumeName] = useState<string | null>(
    null
  );
  const phone = editedPhone ?? profile.phone;
  const skills = editedSkills ?? profile.skills;
  const visibleResumeName = approvedResumeName ?? profile.resumeFileName;
  const visibleAnswerCount = answerCount ?? profile.applicationAnswerCount;
  const coverage = Math.round(
    (visibleAnswerCount / profile.applicationAnswerTotal) * 100
  );

  function clearPrefillProgressTimer() {
    if (prefillProgressTimerRef.current !== null) {
      window.clearInterval(prefillProgressTimerRef.current);
      prefillProgressTimerRef.current = null;
    }
  }

  function beginReadingEstimate(requestId: number) {
    if (prefillRequestRef.current !== requestId) return;
    if (prefillUploadFallbackTimerRef.current !== null) {
      window.clearTimeout(prefillUploadFallbackTimerRef.current);
      prefillUploadFallbackTimerRef.current = null;
    }
    if (prefillReadingStartedAtRef.current === null) {
      prefillReadingStartedAtRef.current = Date.now();
    }
    setPrefillStage("reading");
    setPrefillProgress((current) => Math.max(current, 65));
    clearPrefillProgressTimer();
    prefillProgressTimerRef.current = window.setInterval(() => {
      if (prefillRequestRef.current !== requestId) {
        clearPrefillProgressTimer();
        return;
      }
      setPrefillProgress((current) =>
        current >= 94
          ? 94
          : Math.min(94, current + Math.max(0.75, (94 - current) * 0.1))
      );
    }, 300);
  }

  useEffect(
    () => () => {
      prefillXhrRef.current?.abort();
      if (prefillProgressTimerRef.current !== null) {
        window.clearInterval(prefillProgressTimerRef.current);
      }
      if (prefillUploadFallbackTimerRef.current !== null) {
        window.clearTimeout(prefillUploadFallbackTimerRef.current);
      }
    },
    []
  );

  function scrollToWizard() {
    requestAnimationFrame(() => {
      document.getElementById("register")?.scrollIntoView({ block: "start" });
    });
  }

  function stepIsValid(): boolean {
    if (prefilling) {
      setMessage("Wait while we finish reading your CV.");
      return false;
    }
    if (step === 1 && resumeReadError) {
      setMessage(resumeReadError);
      return false;
    }
    const form = formRef.current;
    const container = form?.querySelector<HTMLElement>(
      `[data-registration-step="${step}"]`
    );
    if (!container) return false;

    if (
      step === 1 &&
      !visibleResumeName
    ) {
      setMessage("Upload your CV so we can fill the supported fields.");
      resumeUploadButtonRef.current?.focus();
      return false;
    }

    const fields = container.querySelectorAll<ValidatableField>(
      "input, select, textarea"
    );
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    if (step === 1 && skills.length === 0) {
      setMessage("Choose at least one skill AI can use to match jobs.");
      form?.querySelector<HTMLButtonElement>('[aria-label="Choose skills"]')?.focus();
      return false;
    }

    if (step === 2 && form) {
      const formData = new FormData(form);
      let workAuthorizationCountries: unknown = [];
      try {
        workAuthorizationCountries = JSON.parse(
          String(formData.get("workAuthorizationCountries") ?? "[]")
        );
      } catch {
        workAuthorizationCountries = [];
      }
      if (
        !Array.isArray(workAuthorizationCountries) ||
        workAuthorizationCountries.length === 0
      ) {
        setMessage("Select at least one country where you can work without sponsorship.");
        form
          .querySelector<HTMLButtonElement>(
            '[aria-label="Countries where you can work without sponsorship"]'
          )
          ?.focus();
        return false;
      }
      if (!String(formData.get("needsSponsorship") ?? "").trim()) {
        setMessage("Choose whether you need sponsorship outside those countries.");
        form
          .querySelector<HTMLButtonElement>(
            '[aria-label="Visa sponsorship outside selected countries"]'
          )
          ?.focus();
        return false;
      }
      if (!String(formData.get("noticePeriod") ?? "").trim()) {
        setMessage("Select your notice period.");
        form
          .querySelector<HTMLButtonElement>('[aria-label="Notice period"]')
          ?.focus();
        return false;
      }
    }

    if (step === 0 && form && !authenticatedUser) {
      const formData = new FormData(form);
      if (formData.get("password") !== formData.get("passwordConfirmation")) {
        setMessage("Passwords do not match.");
        form.querySelector<HTMLInputElement>('[name="passwordConfirmation"]')?.focus();
        return false;
      }
    }
    return true;
  }

  async function prefillFromResume(resume?: File) {
    const form = formRef.current;
    if (!form) return;
    const requestId = prefillRequestRef.current + 1;
    prefillRequestRef.current = requestId;
    prefillXhrRef.current?.abort();
    clearPrefillProgressTimer();
    if (prefillUploadFallbackTimerRef.current !== null) {
      window.clearTimeout(prefillUploadFallbackTimerRef.current);
      prefillUploadFallbackTimerRef.current = null;
    }
    prefillReadingStartedAtRef.current = null;
    setPrefilling(true);
    setPrefillStage(resume ? "uploading" : "reading");
    setPrefillProgress(resume ? 5 : 65);
    setResumeReadError(null);
    setMessage(
      resume
        ? "Uploading your CV and finding reusable answers..."
        : "Reading your saved CV and finding reusable answers..."
    );

    const formData = new FormData();
    if (resume) formData.set("resume", resume);
    try {
      if (resume) {
        const estimatedUploadMs = Math.max(
          400,
          Math.min(2_500, (resume.size / (2 * 1024 * 1024)) * 1_000)
        );
        prefillUploadFallbackTimerRef.current = window.setTimeout(
          () => beginReadingEstimate(requestId),
          estimatedUploadMs
        );
      } else {
        beginReadingEstimate(requestId);
      }
      const xhr = new XMLHttpRequest();
      prefillXhrRef.current = xhr;
      const response = await new Promise<{
        ok: boolean;
        data: ResumePrefillResponse;
      }>((resolve, reject) => {
        xhr.open("POST", "/api/auth/resume-prefill");
        xhr.responseType = "json";
        xhr.setRequestHeader("x-apply-ink", "1");
        xhr.upload.addEventListener("progress", (event) => {
          if (
            prefillRequestRef.current !== requestId ||
            !event.lengthComputable ||
            event.total === 0
          ) {
            return;
          }
          setPrefillProgress(Math.min(65, 5 + (event.loaded / event.total) * 60));
        });
        xhr.upload.addEventListener("loadend", () => {
          if (resume) beginReadingEstimate(requestId);
        });
        xhr.addEventListener("load", () => {
          beginReadingEstimate(requestId);
          const data =
            xhr.response && typeof xhr.response === "object"
              ? (xhr.response as ResumePrefillResponse)
              : ({} as ResumePrefillResponse);
          const readingElapsed = prefillReadingStartedAtRef.current
            ? Date.now() - prefillReadingStartedAtRef.current
            : 0;
          window.setTimeout(
            () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, data }),
            Math.max(0, 300 - readingElapsed)
          );
        });
        xhr.addEventListener("error", () =>
          reject(new Error("Could not connect while reading this CV."))
        );
        xhr.addEventListener("abort", () =>
          reject(new DOMException("CV reading was cancelled.", "AbortError"))
        );
        xhr.send(formData);
      });
      const data = response.data;
      if (!response.ok || !data.answers) {
        throw new Error(data.error ?? "Could not read answers from this CV.");
      }
      if (prefillRequestRef.current !== requestId) return;

      let appliedCount = 0;
      for (const [name, value] of Object.entries(data.answers)) {
        if (name === "skills" && Array.isArray(value)) {
          const merged = mergeUniqueSkills(skills, value);
          setEditedSkills(merged);
          appliedCount += Math.max(0, merged.length - skills.length);
          continue;
        }
        if (typeof value !== "string") continue;
        if (
          (name === "typescriptExperience" || name === "aiFrameworksExperience") &&
          (value === "yes" || value === "no" || value === "")
        ) {
          if (
            value &&
            !(inferredTechnicalAnswers?.[name] ?? profile.applicationAnswers[name])
          ) {
            setInferredTechnicalAnswers((current) => ({
              typescriptExperience:
                current?.typescriptExperience ??
                profile.applicationAnswers.typescriptExperience,
              aiFrameworksExperience:
                current?.aiFrameworksExperience ??
                profile.applicationAnswers.aiFrameworksExperience,
              [name]: value,
            }));
            appliedCount += 1;
          }
          continue;
        }
        if (name === "phone") {
          if (!phone.trim() && value.trim()) {
            setEditedPhone(value);
            appliedCount += 1;
          }
          continue;
        }
        const field = form.elements.namedItem(name);
        if (
          !(field instanceof HTMLInputElement) &&
          !(field instanceof HTMLSelectElement) &&
          !(field instanceof HTMLTextAreaElement)
        ) {
          continue;
        }
        if (!field.value.trim() && value.trim()) {
          field.value = value;
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
          appliedCount += 1;
        }
      }
      setAnswerCount(countFormAnswers(form));
      setApprovedResumeName(resume?.name ?? profile.resumeFileName);
      clearPrefillProgressTimer();
      setPrefillStage("complete");
      setPrefillProgress(100);
      setMessage(
        appliedCount > 0
          ? `${appliedCount} answer${appliedCount === 1 ? "" : "s"} filled from your CV. Review them before continuing.`
          : "CV read successfully. Your existing answers were kept."
      );
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    } catch (error) {
      if (prefillRequestRef.current !== requestId) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      const nextMessage =
        error instanceof Error
          ? error.message
          : "Could not read answers from this CV.";
      setResumeReadError(nextMessage);
      setMessage(nextMessage);
      if (resume) {
        if (resumeInputRef.current) resumeInputRef.current.value = "";
        setSelectedResumeName(null);
        setApprovedResumeName(null);
      }
    } finally {
      if (prefillRequestRef.current === requestId) {
        clearPrefillProgressTimer();
        if (prefillUploadFallbackTimerRef.current !== null) {
          window.clearTimeout(prefillUploadFallbackTimerRef.current);
          prefillUploadFallbackTimerRef.current = null;
        }
        prefillXhrRef.current = null;
        setPrefilling(false);
      }
    }
  }

  async function removeResume() {
    const removingSelectedResume = Boolean(selectedResumeName);
    prefillRequestRef.current += 1;
    prefillXhrRef.current?.abort();
    prefillXhrRef.current = null;
    clearPrefillProgressTimer();
    if (prefillUploadFallbackTimerRef.current !== null) {
      window.clearTimeout(prefillUploadFallbackTimerRef.current);
      prefillUploadFallbackTimerRef.current = null;
    }
    prefillReadingStartedAtRef.current = null;
    if (resumeInputRef.current) resumeInputRef.current.value = "";
    setSelectedResumeName(null);
    setApprovedResumeName(null);
    setResumeReadError(null);

    if (removingSelectedResume || !profile.resumeFileName) {
      setPrefilling(false);
      setMessage(
        profile.resumeFileName
          ? "Replacement removed. Your previously approved CV is still saved."
          : "CV removed. Upload another CV when you are ready."
      );
      return;
    }

    setRemovingResume(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "x-apply-ink": "1" },
      });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: CandidateProfile;
        error?: string;
      };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "Could not remove the CV.");
      }
      queryClient.setQueryData(CANDIDATE_PROFILE_KEY, data.profile);
      setMessage("CV removed. Upload another CV when you are ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the CV.");
    } finally {
      setRemovingResume(false);
    }
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
    if (!authenticatedUser && password !== passwordConfirmation) {
      setStep(0);
      setMessage("Passwords do not match.");
      setSaving(false);
      scrollToWizard();
      return;
    }
    formData.set("finishOnboarding", "1");
    try {
      const accountResponse = await fetch(
        authenticatedUser ? "/api/profile" : "/api/auth/register",
        {
        method: authenticatedUser ? "PUT" : "POST",
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
        className="relative mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 pt-10 sm:px-8 sm:pt-14 lg:px-12"
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
          <div className="grid items-stretch gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside
              data-registration-steps
              className="h-full rounded-3xl border border-sand bg-surface/75 p-3 backdrop-blur lg:p-4"
            >
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
              aria-busy={prefilling}
              data-registration-form
              className="flex h-full min-h-[30rem] flex-col rounded-3xl border border-sand bg-surface/90 shadow-[0_24px_80px_rgba(78,47,36,0.08)]"
            >
              <div className="flex-1 p-6 sm:p-8 lg:p-10">
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
                  {googleError && !authenticatedUser && (
                    <p role="alert" className="mb-4 rounded-xl border border-sienna/25 bg-sienna/8 px-4 py-3 text-sm text-sienna">
                      {googleError}
                    </p>
                  )}
                  {authenticatedUser ? (
                    <div className="rounded-2xl border border-success/30 bg-success/8 p-5">
                      <p className="text-sm font-bold text-success">
                        Google account connected
                      </p>
                      <p className="mt-1 text-sm text-espresso/65">
                        {authenticatedUser.email}
                      </p>
                      <input type="hidden" name="email" value={authenticatedUser.email} readOnly />
                      <p className="mt-3 text-xs leading-5 text-espresso/50">
                        Continue to upload your CV and finish your application profile.
                      </p>
                    </div>
                  ) : (
                  <>
                  <a
                    href="/api/auth/google?intent=register&next=/register"
                    aria-disabled={!googleEnabled}
                    onClick={(event) => {
                      if (!googleEnabled) event.preventDefault();
                    }}
                    className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-sand bg-surface px-5 py-3 text-sm font-bold text-espresso transition-colors ${
                      googleEnabled
                        ? "hover:border-terracotta hover:bg-cream/45"
                        : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
                      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.62A10 10 0 0 0 12 22Z" />
                      <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.55l3.34-2.62Z" />
                      <path fill="#EA4335" d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.34 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
                    </svg>
                    Continue with Google
                  </a>
                  {!googleEnabled && (
                    <p className="mt-2 text-xs text-sienna">
                      Google sign-in will activate after its two deployment keys are added.
                    </p>
                  )}
                  <div className="my-5 flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-sand" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-espresso/35">or use email</span>
                    <span className="h-px flex-1 bg-sand" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-espresso sm:col-span-2">
                      Email<span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                      <input name="email" type="email" autoComplete="email" required defaultValue={profile.email} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Password<span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                      <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
                      <span className="mt-1.5 block text-xs font-normal text-espresso/50">
                        At least 8 characters with a letter and a number
                      </span>
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Confirm password<span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                      <input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
                    </label>
                  </div>
                  <p className="mt-4 text-xs text-espresso/50">
                    <span className="font-bold text-terracotta">*</span> Required to create and protect your account.
                  </p>
                  </>
                  )}
                </section>

                <section data-registration-step="1" hidden={step !== 1}>
                  <div className="mb-6 rounded-2xl border border-sand bg-cream/55 p-5">
                    <p className="text-base font-bold text-espresso">
                      Fill the form from your resume
                      <span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-espresso/60">
                      Upload your CV and Apply Ink will fill supported contact
                      details and common experience answers. You can review and
                      edit every field before creating your account.
                    </p>
                    <input
                      ref={resumeInputRef}
                      name="resume"
                      type="file"
                      accept=".pdf,.doc,.docx,.rtf,.odt,.txt"
                      aria-label="Upload CV to fill the form"
                      onChange={(event) => {
                        const resume = event.currentTarget.files?.[0];
                        if (resume) {
                          setSelectedResumeName(resume.name);
                          setApprovedResumeName(null);
                          void prefillFromResume(resume);
                        }
                      }}
                      className="sr-only"
                    />
                    {prefilling ? (
                      <div
                        data-resume-reading
                        role="status"
                        aria-live="polite"
                        className="mt-4 overflow-hidden rounded-2xl border border-terracotta/30 bg-surface p-5"
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-terracotta/10">
                            <Spinner />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-espresso">
                              {prefillStage === "uploading"
                                ? "Uploading your CV..."
                                : prefillStage === "complete"
                                  ? "CV ready"
                                  : "Reading your CV..."}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-espresso/55">
                              {selectedResumeName ?? visibleResumeName ?? "Saved CV"}
                            </span>
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label="CV upload and reading progress"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(prefillProgress)}
                          className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand/55"
                        >
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-terracotta to-success transition-[width] duration-300 ease-out"
                            style={{ width: `${prefillProgress}%` }}
                          />
                        </div>
                        <div className="mt-3 flex items-start justify-between gap-4 text-xs leading-5 text-espresso/55">
                          <p>
                            {prefillStage === "uploading"
                              ? "Uploading the document. This percentage uses the actual bytes sent."
                              : prefillStage === "complete"
                                ? "Readable details found and applied."
                                : "Checking readability and filling verified details. This part is estimated."}
                          </p>
                          <span className="shrink-0 font-bold text-sienna">
                            {Math.round(prefillProgress)}%
                          </span>
                        </div>
                      </div>
                    ) : visibleResumeName ? (
                      <div
                        data-resume-approved
                        className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-success/35 bg-success/8 p-4"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
                          <svg
                            viewBox="0 0 20 20"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            aria-hidden="true"
                          >
                            <path d="m4.5 10 3.4 3.4 7.6-7.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-success">
                            CV approved
                          </span>
                          <span className="block truncate text-xs text-espresso/60">
                            {visibleResumeName} · readable and ready to use
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <button
                            ref={resumeUploadButtonRef}
                            type="button"
                            onClick={() => resumeInputRef.current?.click()}
                            disabled={removingResume}
                            className="rounded-lg border border-success/35 bg-surface px-3 py-2 text-xs font-bold text-espresso transition-colors hover:border-success disabled:opacity-50"
                          >
                            Replace CV
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeResume()}
                            disabled={removingResume}
                            className="rounded-lg px-3 py-2 text-xs font-bold text-sienna transition-colors hover:bg-sienna/8 disabled:opacity-50"
                          >
                            {removingResume ? "Removing..." : "Remove"}
                          </button>
                        </span>
                      </div>
                    ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        ref={resumeUploadButtonRef}
                        type="button"
                        onClick={() => resumeInputRef.current?.click()}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sienna px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso"
                      >
                        Upload CV and fill my form
                      </button>
                      <span className="text-xs leading-5 text-espresso/55">
                        {selectedResumeName ??
                          "PDF, DOC, DOCX, RTF, ODT, or TXT; maximum 10 MB"}
                      </span>
                    </div>
                    )}
                    {profile.resumeFileName && !selectedResumeName && !prefilling && (
                      <button
                        type="button"
                        onClick={() => void prefillFromResume()}
                        disabled={prefilling}
                        className="mt-3 text-xs font-semibold text-sienna underline underline-offset-2 disabled:opacity-50"
                      >
                        Fill remaining fields from my saved CV
                      </button>
                    )}
                  </div>
                  <fieldset
                    disabled={prefilling}
                    className={`grid gap-4 transition-opacity sm:grid-cols-2 ${
                      prefilling ? "opacity-55" : "opacity-100"
                    }`}
                  >
                    <label className="text-sm font-medium text-espresso">
                      First name<span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                      <input name="firstName" autoComplete="given-name" required defaultValue={profile.firstName} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Last name<span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                      <input name="lastName" autoComplete="family-name" required defaultValue={profile.lastName} className={inputClass} />
                    </label>
                    <div className="text-sm font-medium text-espresso sm:col-span-2">
                      Phone<span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                      <CountryPhoneInput
                        value={phone}
                        onChange={setEditedPhone}
                        defaultCountry={defaultPhoneCountry}
                        required
                      />
                    </div>
                    <label className="text-sm font-medium text-espresso">
                      Current location<span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                      <input name="location" autoComplete="address-level2" required placeholder="Tbilisi, Georgia" defaultValue={profile.location} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      LinkedIn URL <span className="font-normal text-espresso/45">(optional)</span>
                      <input name="linkedinUrl" type="text" inputMode="url" placeholder="linkedin.com/in/your-name" defaultValue={profile.linkedinUrl} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso">
                      Portfolio URL <span className="font-normal text-espresso/45">(optional)</span>
                      <input name="portfolioUrl" type="text" inputMode="url" placeholder="yourportfolio.com" defaultValue={profile.portfolioUrl} className={inputClass} />
                    </label>
                    <label className="text-sm font-medium text-espresso sm:col-span-2">
                      GitHub URL <span className="font-normal text-espresso/45">(optional)</span>
                      <input name="githubUrl" type="text" inputMode="url" placeholder="github.com/your-name" defaultValue={profile.githubUrl} className={inputClass} />
                    </label>
                    <div className="text-sm font-medium text-espresso sm:col-span-2">
                      Skills AI may use in ATS-tailored CVs
                      <span className="ml-1 text-terracotta" aria-hidden="true">*</span>
                      <SkillsInput value={skills} onChange={setEditedSkills} required />
                    </div>
                    <label className="text-sm font-medium text-espresso sm:col-span-2">
                      Default introduction or cover note <span className="font-normal text-espresso/45">(optional)</span>
                      <textarea
                        name="coverLetter"
                        rows={4}
                        placeholder="AI will write a truthful introduction from your CV if you leave this blank."
                        defaultValue={profile.coverLetter}
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                  </fieldset>
                  <p className="mt-4 text-xs text-espresso/50">
                    <span className="font-bold text-terracotta">*</span> Required so AI can identify you, contact employers, match relevant jobs, and create truthful applications. Links and the cover note are optional.
                  </p>
                </section>

                <section data-registration-step="2" hidden={step !== 2}>
                  <ApplicationQuestionFields profile={profile} sections={["preferences"]} />
                </section>

                <section data-registration-step="3" hidden={step !== 3}>
                  <ApplicationQuestionFields
                    profile={profile}
                    sections={["experience"]}
                    inferredTechnicalAnswers={inferredTechnicalAnswers ?? undefined}
                  />
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
                    <Button type="button" variant="outline" onClick={previousStep} disabled={saving || prefilling} className="min-w-24 rounded-xl px-5 py-2.5">
                      Back
                    </Button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={prefilling}
                      onClick={(event) => {
                        event.preventDefault();
                        nextStep();
                      }}
                      className="min-w-28 rounded-xl px-5 py-2.5"
                    >
                      {prefilling ? "Reading CV..." : "Continue"}
                    </Button>
                  ) : (
                    <Button type="submit" variant="primary" disabled={saving} className="min-w-48 rounded-xl px-6 py-2.5">
                      {saving
                        ? authenticatedUser
                          ? "Finishing setup..."
                          : "Creating account..."
                        : authenticatedUser
                          ? "Finish setup and find jobs"
                          : "Create account and find jobs"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </section>
      {showAutomationTip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-espresso/55 p-5 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Why these questions matter"
            className="w-full max-w-md rounded-3xl border border-sand bg-surface p-6 shadow-[0_28px_90px_rgba(39,24,18,0.28)] sm:p-8"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-terracotta/12 text-xl" aria-hidden="true">
              ✦
            </span>
            <h2 className="mt-5 text-2xl font-bold text-espresso">
              More answers mean fewer interruptions
            </h2>
            <p className="mt-3 text-sm leading-6 text-espresso/65">
              The more questions you answer, the more job applications AI can
              submit without asking for your help. Successful automatic submissions
              are recorded in Messages. You only receive a “Needs you” alert when an
              employer asks something missing or requires verification such as a CAPTCHA.
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => setShowAutomationTip(false)}
              className="mt-6 min-h-11 w-full rounded-xl bg-sienna px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso"
            >
              Continue registration
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
