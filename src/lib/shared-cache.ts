import "server-only";

import { postgresQuery } from "@/lib/postgres";

type CacheRow = {
  version: number;
  payload: unknown;
  fetched_at: string | number;
};

export async function getSharedCache<T>(
  cacheKey: string,
  version: number,
  ttlMs: number
): Promise<T | null> {
  const result = await postgresQuery<CacheRow>(
    `SELECT version, payload, fetched_at
     FROM shared_cache WHERE cache_key = $1`,
    [cacheKey]
  );
  const row = result.rows[0];
  if (
    !row ||
    row.version !== version ||
    Date.now() - Number(row.fetched_at) >= ttlMs
  ) {
    return null;
  }
  return row.payload as T;
}

export async function setSharedCache(
  cacheKey: string,
  version: number,
  payload: unknown
): Promise<void> {
  await postgresQuery(
    `INSERT INTO shared_cache (cache_key, version, payload, fetched_at)
     VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (cache_key) DO UPDATE SET
       version = EXCLUDED.version,
       payload = EXCLUDED.payload,
       fetched_at = EXCLUDED.fetched_at`,
    [cacheKey, version, JSON.stringify(payload), Date.now()]
  );
}
