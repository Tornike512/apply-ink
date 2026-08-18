import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/config";
import type { Job } from "@/lib/jobs";

type JobsResponse = {
  jobs: Job[];
  sources: Record<string, number>;
};

async function getJobs(): Promise<JobsResponse> {
  const res = await fetch(`${API_URL}/api/jobs`);
  if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
  return res.json();
}

export function useGetJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
    staleTime: 5 * 60_000,
  });
}
