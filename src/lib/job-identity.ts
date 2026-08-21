import { createHash } from "node:crypto";
import type { Job } from "@/lib/jobs";

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

function fingerprint(job: Job): string {
  return [
    job.source,
    job.url,
    job.company,
    job.title,
    job.postedAt ?? "",
  ]
    .map((value) => String(value).trim().toLowerCase())
    .join("\u001f");
}

/**
 * Removes exact repeated listings and repairs colliding source IDs
 * deterministically. The lexicographically first listing keeps the legacy ID
 * so existing applications remain linked whenever possible.
 */
export function ensureUniqueJobIds(jobs: Job[]): Job[] {
  const uniqueListings: Array<{ job: Job; fingerprint: string }> = [];
  const seenListings = new Set<string>();

  for (const job of jobs) {
    const listingFingerprint = fingerprint(job);
    if (seenListings.has(listingFingerprint)) continue;
    seenListings.add(listingFingerprint);
    uniqueListings.push({ job, fingerprint: listingFingerprint });
  }

  const fingerprintsById = new Map<string, string[]>();
  for (const item of uniqueListings) {
    const values = fingerprintsById.get(item.job.id) ?? [];
    values.push(item.fingerprint);
    fingerprintsById.set(item.job.id, values);
  }
  for (const values of fingerprintsById.values()) values.sort();

  const usedIds = new Set<string>();
  return uniqueListings.map(({ job, fingerprint: listingFingerprint }) => {
    const group = fingerprintsById.get(job.id) ?? [];
    let id = job.id.trim();
    if (!id || (group.length > 1 && group[0] !== listingFingerprint)) {
      id = `${job.id || "job"}-${digest(listingFingerprint)}`;
    }
    let uniqueId = id;
    let suffix = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${id}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(uniqueId);
    return uniqueId === job.id ? job : { ...job, id: uniqueId };
  });
}
