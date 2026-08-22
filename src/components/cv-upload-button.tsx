import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileTextIcon } from "@/assets";
import { Button } from "@/components/button";
import {
  CANDIDATE_PROFILE_KEY,
  useCandidateProfile,
} from "@/hooks/use-candidate-profile";
import type { CandidateProfile } from "@/lib/candidate-profile";

type CvUploadButtonProps = {
  onOpenSettings: () => void;
};

export function CvUploadButton({ onOpenSettings }: CvUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const profileQuery = useCandidateProfile();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("resume", file);
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
        throw new Error(data.error ?? "Could not upload your resume. Try again.");
      }

      queryClient.setQueryData(CANDIDATE_PROFILE_KEY, data.profile);
      setMessage(
        data.profile.tailoringReady
          ? "Resume uploaded. Your job matches are updating now."
          : data.profile.complete
            ? "Resume uploaded. Matches are updating. Job-specific resumes are unavailable right now."
            : "Resume uploaded. Matches are updating. Add your details in Settings."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload your resume. Try again.");
    } finally {
      setUploading(false);
    }
  }

  const profile = profileQuery.data;
  const needsSetup = Boolean(profile?.resumeFileName && !profile.complete);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.rtf,.odt,.txt"
        className="sr-only"
        onChange={(event) => void upload(event)}
      />
      <Button
        variant="primary"
        disabled={uploading || profileQuery.isPending}
        onClick={() => inputRef.current?.click()}
        className="whitespace-nowrap"
      >
        <FileTextIcon width={17} height={17} />
        {uploading ? "Uploading..." : "Upload your resume"}
      </Button>
      {profile?.resumeFileName && (
        <span className="max-w-48 truncate text-xs text-espresso/60">
          {profile.resumeFileName}
        </span>
      )}
      {needsSetup && (
        <Button
          variant="outline"
          onClick={onOpenSettings}
          className="px-3 py-2 text-xs"
        >
          Finish profile
        </Button>
      )}
      {message && (
        <p aria-live="polite" className="basis-full text-right text-xs text-espresso/65">
          {message}
        </p>
      )}
    </div>
  );
}
