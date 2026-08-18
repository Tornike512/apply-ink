import { promises as fs } from "node:fs";
import path from "node:path";
import { harvestAll, type Harvest } from "@/lib/job-sources";

const STORE_PATH = path.join(process.cwd(), "data", "jobs-store.json");
const MAX_AGE_MS = 6 * 3_600_000;

export type JobsStore = Harvest & { refreshedAt: number };

let refreshing = false;

export function isRefreshing(): boolean {
  return refreshing;
}

export function isStale(store: JobsStore): boolean {
  return Date.now() - store.refreshedAt > MAX_AGE_MS;
}

export async function readStore(): Promise<JobsStore | null> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as JobsStore;
  } catch {
    return null;
  }
}

export async function refreshStore(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const harvest = await harvestAll();
    const store: JobsStore = { ...harvest, refreshedAt: Date.now() };
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store));
  } catch (error) {
    console.error("[jobs-store] refresh failed:", error);
  } finally {
    refreshing = false;
  }
}
