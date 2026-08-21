import { useInfiniteQuery } from "@tanstack/react-query";
import { API_URL } from "@/config";
import type { JobFilterState } from "@/lib/job-filtering";
import type { Job } from "@/lib/jobs";

export type JobsPage = {
  jobs: Job[];
  total: number;
  grandTotal: number;
  highMatches: number;
  page: number;
  pageSize: number;
  sources: Record<string, number>;
  refreshedAt: number | null;
  refreshing: boolean;
  personalized: boolean;
};

async function getJobs(
  page: number,
  q: string,
  filters: JobFilterState
): Promise<JobsPage> {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.location !== "worldwide") {
    params.set("location", filters.location);
  }
  if (filters.minSalary !== null) {
    params.set("minSalary", String(filters.minSalary));
  }
  if (filters.maxSalary !== null) {
    params.set("maxSalary", String(filters.maxSalary));
  }
  if (filters.postedWithinDays) {
    params.set("postedWithinDays", String(filters.postedWithinDays));
  }
  if (filters.minMatch) params.set("minMatch", String(filters.minMatch));
  const res = await fetch(`${API_URL}/api/jobs?${params}`);
  if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
  return res.json();
}

export function useGetJobs(
  search: string,
  filters: JobFilterState,
  matchVersion: number,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: ["jobs", search, filters, matchVersion],
    queryFn: ({ pageParam }) => getJobs(pageParam, search, filters),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    staleTime: 5 * 60_000,
    enabled,
  });
}
