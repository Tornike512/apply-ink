"use client";

import { useQuery } from "@tanstack/react-query";
import {
  EMPTY_CANDIDATE_PROFILE,
  type CandidateProfile,
} from "@/lib/candidate-profile";

export const CANDIDATE_PROFILE_KEY = ["candidate-profile"] as const;

export async function loadCandidateProfile(): Promise<CandidateProfile> {
  const response = await fetch("/api/profile", { cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as {
    profile?: CandidateProfile;
    error?: string;
  };
  if (!response.ok) throw new Error(data.error ?? "Could not load your profile. Refresh and try again.");
  return data.profile ?? EMPTY_CANDIDATE_PROFILE;
}

export function useCandidateProfile() {
  return useQuery({
    queryKey: CANDIDATE_PROFILE_KEY,
    queryFn: loadCandidateProfile,
    retry: false,
  });
}
