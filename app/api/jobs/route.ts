import { after } from "next/server";
import { AUTO_APPLY_RULES } from "@/lib/auto-apply";
import {
  isRefreshing,
  isStale,
  readStore,
  refreshStore,
} from "@/lib/jobs-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize")) || 30)
  );
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const forceRefresh = url.searchParams.get("refresh") === "1";

  let store = await readStore();

  if (forceRefresh || !store) {
    await refreshStore();
    store = await readStore();
  } else if (isStale(store)) {
    after(() => refreshStore());
  }

  const all = store?.jobs ?? [];
  const filtered = q
    ? all.filter(
        (job) =>
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q)
      )
    : all;
  const start = (page - 1) * pageSize;

  return Response.json({
    jobs: filtered.slice(start, start + pageSize),
    total: filtered.length,
    grandTotal: all.length,
    highMatches: all.filter((job) => job.match >= AUTO_APPLY_RULES.minMatch)
      .length,
    page,
    pageSize,
    sources: store?.sources ?? {},
    refreshedAt: store?.refreshedAt ?? null,
    refreshing: isRefreshing(),
  });
}
