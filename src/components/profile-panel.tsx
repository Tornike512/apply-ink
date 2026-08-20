import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApplicationQuestionFields } from "@/components/application-question-fields";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
            Your profile is isolated to this browser session. Job matches update
            automatically from your CV; AI tailoring runs only when you start an
            application.
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
        <label className="text-sm font-medium text-espresso">
          Phone
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={profile.phone}
            className={`mt-1 ${inputClass}`}
          />
        </label>
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
            type="url"
            defaultValue={profile.linkedinUrl}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium text-espresso">
          Portfolio URL
          <input
            name="portfolioUrl"
            type="url"
            defaultValue={profile.portfolioUrl}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium text-espresso">
          Resume
          <input
            name="resume"
            type="file"
            accept=".pdf,.doc,.docx,.rtf,.odt,.txt"
            required={!profile.resumeFileName}
            className={`mt-1 ${inputClass}`}
          />
          <span className="mt-1 block text-xs font-normal text-espresso/55">
            {profile.resumeFileName
              ? `${profile.resumeFileName} - text extracted`
              : "PDF, DOC, DOCX, RTF, ODT, or TXT; maximum 10 MB"}
          </span>
        </label>
        <label className="text-sm font-medium text-espresso">
          Master skills inventory (optional)
          <input
            name="skillsInventory"
            type="file"
            accept=".json,application/json"
            className={`mt-1 ${inputClass}`}
          />
          <span className="mt-1 block text-xs font-normal text-espresso/55">
            {profile.skillsInventoryFileName
              ? `${profile.skillsInventoryFileName} - ${profile.skillsInventoryCount} skills`
              : "JSON skills are filtered by confidence before tailoring"}
          </span>
        </label>
        <label className="text-sm font-medium text-espresso md:col-span-2">
          Default cover letter
          <textarea
            name="coverLetter"
            rows={6}
            defaultValue={profile.coverLetter}
            className={`mt-1 resize-y ${inputClass}`}
          />
        </label>
        <div className="my-2 h-px bg-sand/65 md:col-span-2" />
        <div className="md:col-span-2">
          <ApplicationQuestionFields profile={profile} />
        </div>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button type="submit" variant="primary" disabled={saving}>
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
