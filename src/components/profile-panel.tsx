import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApplicationQuestionFields } from "@/components/application-question-fields";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { CountryPhoneInput } from "@/components/country-phone-input";
import { SkillsInput } from "@/components/skills-input";
import { Spinner } from "@/components/spinner";
import {
  CANDIDATE_PROFILE_KEY,
  useCandidateProfile,
} from "@/hooks/use-candidate-profile";
import {
  EMPTY_CANDIDATE_PROFILE,
  type CandidateProfile,
} from "@/lib/candidate-profile";

const inputClass =
  "w-full rounded-lg border border-sand bg-surface px-3 py-2 text-sm text-espresso outline-none focus:border-terracotta";

export function ProfilePanel() {
  const queryClient = useQueryClient();
  const profileQuery = useCandidateProfile();
  const profile = profileQuery.data ?? EMPTY_CANDIDATE_PROFILE;
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [resumeSaving, setResumeSaving] = useState(false);
  const [editedPhone, setEditedPhone] = useState<string | null>(null);
  const [editedSkills, setEditedSkills] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const phone = editedPhone ?? profile.phone;
  const skills = editedSkills ?? profile.skills;

  async function uploadResume(resume: File) {
    setResumeSaving(true);
    setMessage("Reading and checking your CV...");
    const formData = new FormData();
    formData.set("resume", resume);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "x-apply-ink": "1" },
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: CandidateProfile;
        error?: string;
      };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "Could not upload the CV.");
      }
      queryClient.setQueryData(CANDIDATE_PROFILE_KEY, data.profile);
      setMessage("CV approved. It is readable and ready for applications.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload the CV.");
    } finally {
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      setResumeSaving(false);
    }
  }

  async function removeResume() {
    setResumeSaving(true);
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
      setMessage("CV removed. Upload a replacement when you are ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove the CV.");
    } finally {
      setResumeSaving(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "x-apply-ink": "1" },
        body: new FormData(event.currentTarget),
      });
      const data = (await response.json().catch(() => ({}))) as {
        profile?: CandidateProfile;
        error?: string;
      };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "Could not save your profile.");
      }
      queryClient.setQueryData(CANDIDATE_PROFILE_KEY, data.profile);
      setEditedPhone(null);
      setEditedSkills(null);
      setMessage(
        data.profile.tailoringReady
          ? "Saved. Job matches are updating; CV tailoring is ready."
          : data.profile.complete
            ? "Saved. Job matches are updating. Add OPENAI_API_KEY for CV tailoring."
            : "Saved. Add your name, email, and CV to finish setup."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (profileQuery.isPending) {
    return (
      <Container variant="card" className="flex items-center gap-3 p-6">
        <Spinner />
        <p className="text-sm text-espresso/70">Loading your local profile...</p>
      </Container>
    );
  }

  if (profileQuery.isError) {
    return (
      <Container variant="card" className="p-6">
        <p className="text-sm text-sienna">{profileQuery.error.message}</p>
      </Container>
    );
  }

  const formKey = `${profile.matchVersion}:${profile.resumeFileName ?? "none"}:${
    profile.skillsInventoryFileName ?? "none"
  }`;
  const profileStatus = !profile.complete
    ? { label: "Setup needed", variant: "sand" as const }
    : !profile.tailoringConfigured
      ? { label: "AI key needed", variant: "sienna" as const }
      : { label: "Ready", variant: "success" as const };
  return (
    <Container variant="card" className="p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-espresso">Application profile</h2>
          <p className="mt-1 max-w-2xl text-sm text-espresso/65">
            Your profile is saved to your account. Job matches update automatically
            from your CV; AI tailoring runs only when you start an application.
          </p>
          <p className="mt-2 text-xs font-medium text-sienna">
            {profile.applicationAnswerCount} of {profile.applicationAnswerTotal}{" "}
            common employer answers saved. More answers unlock more hands-off
            applications.
          </p>
        </div>
        <Badge variant={profileStatus.variant}>{profileStatus.label}</Badge>
      </div>

      <form key={formKey} onSubmit={save} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-espresso">
          First name
          <input
            name="firstName"
            autoComplete="given-name"
            required
            defaultValue={profile.firstName}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium text-espresso">
          Last name
          <input
            name="lastName"
            autoComplete="family-name"
            required
            defaultValue={profile.lastName}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium text-espresso">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={profile.email}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <div className="text-sm font-medium text-espresso">
          Phone
          <CountryPhoneInput
            value={phone}
            onChange={setEditedPhone}
          />
        </div>
        <label className="text-sm font-medium text-espresso">
          Location
          <input
            name="location"
            autoComplete="address-level2"
            defaultValue={profile.location}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium text-espresso">
          LinkedIn URL
          <input
            name="linkedinUrl"
            type="text"
            inputMode="url"
            placeholder="linkedin.com/in/your-name"
            defaultValue={profile.linkedinUrl}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium text-espresso">
          Portfolio URL
          <input
            name="portfolioUrl"
            type="text"
            inputMode="url"
            placeholder="yourportfolio.com"
            defaultValue={profile.portfolioUrl}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium text-espresso">
          GitHub URL
          <input
            name="githubUrl"
            type="text"
            inputMode="url"
            placeholder="github.com/your-name"
            defaultValue={profile.githubUrl}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <div className="text-sm font-medium text-espresso">
          Resume
          <input
            ref={resumeInputRef}
            name="resume"
            type="file"
            accept=".pdf,.doc,.docx,.rtf,.odt,.txt"
            aria-label="Choose replacement CV"
            disabled={resumeSaving}
            onChange={(event) => {
              const resume = event.currentTarget.files?.[0];
              if (resume) void uploadResume(resume);
            }}
            className="sr-only"
          />
          {profile.resumeFileName ? (
            <div
              data-resume-approved
              className="mt-1 flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-success/35 bg-success/8 px-3 py-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.3" aria-hidden="true">
                  <path d="m4.5 10 3.4 3.4 7.6-7.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-success">
                {profile.resumeFileName} · approved
              </span>
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                disabled={resumeSaving}
                className="rounded-md border border-success/30 bg-surface px-2.5 py-1.5 text-xs font-bold text-espresso disabled:opacity-50"
              >
                {resumeSaving ? "Checking..." : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => void removeResume()}
                disabled={resumeSaving}
                className="rounded-md px-2.5 py-1.5 text-xs font-bold text-sienna disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={resumeSaving}
              className={`mt-1 min-h-11 text-left ${inputClass} disabled:opacity-50`}
            >
              {resumeSaving
                ? "Reading and checking your CV..."
                : "Upload CV · PDF, DOC, DOCX, RTF, ODT, or TXT"}
            </button>
          )}
          <span className="mt-1 block text-xs font-normal text-espresso/55">
            Maximum 10 MB. A green check means text was extracted successfully.
          </span>
        </div>
        <div className="text-sm font-medium text-espresso md:col-span-2">
          Skills AI may use in ATS-tailored CVs
          <SkillsInput value={skills} onChange={setEditedSkills} />
        </div>
        <label className="text-sm font-medium text-espresso md:col-span-2">
          Default introduction or cover note
          <textarea
            name="coverLetter"
            rows={6}
            defaultValue={profile.coverLetter}
            className={`mt-1 resize-y ${inputClass}`}
          />
          <span className="mt-1 block text-xs font-normal text-espresso/55">
            If this is blank, AI creates a truthful introduction from your CV.
          </span>
        </label>
        <div className="my-2 h-px bg-sand/65 md:col-span-2" />
        <div className="md:col-span-2">
          <ApplicationQuestionFields profile={profile} />
        </div>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button type="submit" variant="primary" disabled={saving || resumeSaving}>
            {saving ? "Saving..." : "Save application profile"}
          </Button>
          {message && (
            <p aria-live="polite" className="text-sm text-espresso/65">
              {message}
            </p>
          )}
        </div>
      </form>
    </Container>
  );
}
