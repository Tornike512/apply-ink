import { harvestAll, type Harvest } from "@/lib/job-sources";
import { ensureUniqueJobIds } from "@/lib/job-identity";
import { postgresQuery } from "@/lib/postgres";

const MAX_AGE_MS = 6 * 3_600_000;

export type JobsStore = Harvest & { refreshedAt: number };

type JobsStoreRow = {
  jobs: Harvest["jobs"] | string;
  sources: Harvest["sources"] | string;
  refreshed_at: string | number;
};

let refreshing = false;

function jsonValue<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

export function isRefreshing(): boolean {
  return refreshing;
}

export function isStale(store: JobsStore): boolean {
  return Date.now() - store.refreshedAt > MAX_AGE_MS;
}

export async function readStore(): Promise<JobsStore | null> {
  const result = await postgresQuery<JobsStoreRow>(
    "SELECT jobs, sources, refreshed_at FROM job_store WHERE id = 1"
  );
  const row = result.rows[0];
  return row
    ? {
        jobs: ensureUniqueJobIds(jsonValue(row.jobs)),
        sources: jsonValue(row.sources),
        refreshedAt: Number(row.refreshed_at),
      }
    : null;
}

export async function refreshStore(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const harvest = await harvestAll();
    await postgresQuery(
      `INSERT INTO job_store (id, jobs, sources, refreshed_at)
       VALUES (1, $1::jsonb, $2::jsonb, $3)
       ON CONFLICT (id) DO UPDATE SET
         jobs = EXCLUDED.jobs,
         sources = EXCLUDED.sources,
         refreshed_at = EXCLUDED.refreshed_at`,
      [JSON.stringify(harvest.jobs), JSON.stringify(harvest.sources), Date.now()]
    );
  } catch (error) {
    console.error("[jobs-store] refresh failed:", error);
  } finally {
    refreshing = false;
  }
}
