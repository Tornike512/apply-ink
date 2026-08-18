import { useInfiniteQuery } from "@tanstack/react-query";
import { API_URL } from "@/config";
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
};

async function getJobs(page: number, q: string): Promise<JobsPage> {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  const res = await fetch(`${API_URL}/api/jobs?${params}`);
  if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
  return res.json();
}

export function useGetJobs(search: string) {
  return useInfiniteQuery({
    queryKey: ["jobs", search],
    queryFn: ({ pageParam }) => getJobs(pageParam, search),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    staleTime: 5 * 60_000,
  });
}
