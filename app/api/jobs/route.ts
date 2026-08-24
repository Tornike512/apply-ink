import { after } from "next/server";
import { getCandidateProfile } from "@/lib/application-store";
import { AUTO_APPLY_RULES } from "@/lib/auto-apply";
import {
  filterJobs,
  jobFiltersFromSearchParams,
} from "@/lib/job-filtering";
import { isWorkFromAnywhere } from "@/lib/job-eligibility";
import { personalizeJobs } from "@/lib/job-matching";
import {
  isRefreshing,
  isStale,
  readStore,
  refreshStore,
} from "@/lib/jobs-store";
import {
  getAuthenticatedSessionId,
  unauthenticatedResponse,
} from "@/lib/user-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = await getAuthenticatedSessionId(request);
  if (!sessionId) return unauthenticatedResponse();
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize")) || 30)
  );
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const titleTerms = url.searchParams.getAll("title");
  const filters = jobFiltersFromSearchParams(url.searchParams);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  let store = await readStore();

  if (forceRefresh || !store) {
    await refreshStore();
    store = await readStore();
  } else if (isStale(store)) {
    after(() => refreshStore());
  }

  // Also filter older cache files created before worldwide-only harvesting.
  const worldwide = (store?.jobs ?? []).filter(isWorkFromAnywhere);
  const { jobs: all, personalized } = personalizeJobs(
    worldwide,
    await getCandidateProfile(sessionId)
  );
  const filtered = filterJobs(all, q, filters, Date.now(), titleTerms);
  const start = (page - 1) * pageSize;

  return Response.json({
    jobs: filtered.slice(start, start + pageSize),
    total: filtered.length,
    grandTotal: filtered.length,
    highMatches: filtered.filter((job) => job.match >= AUTO_APPLY_RULES.minMatch)
      .length,
    page,
    pageSize,
    sources: store?.sources ?? {},
    refreshedAt: store?.refreshedAt ?? null,
    refreshing: isRefreshing(),
    personalized,
  });
}
