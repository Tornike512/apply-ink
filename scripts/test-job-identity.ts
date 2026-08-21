import { ensureUniqueJobIds } from "../src/lib/job-identity";
import type { Job } from "../src/lib/jobs";

function job(overrides: Partial<Job>): Job {
  return {
    id: "himalayas-senior-software-engineer",
    title: "Senior Software Engineer",
    company: "Example",
    location: "Remote - Worldwide",
    match: 90,
    tags: ["TypeScript"],
    posted: "today",
    postedAt: 1_780_000_000_000,
    description: "Build software.",
    logoColor: "#000000",
    verified: false,
    source: "Himalayas",
    url: "https://example.test/jobs/senior-software-engineer",
    ...overrides,
  };
}

const input = [
  job({ company: "Alpha", url: "https://alpha.test/senior-software-engineer" }),
  job({ company: "Beta", url: "https://beta.test/senior-software-engineer" }),
  job({ company: "Beta", url: "https://beta.test/senior-software-engineer" }),
];
const first = ensureUniqueJobIds(input);
const second = ensureUniqueJobIds(input);

if (first.length !== 2) throw new Error("Exact duplicate jobs were not removed.");
if (new Set(first.map((item) => item.id)).size !== first.length) {
  throw new Error("Colliding job IDs were not repaired.");
}
if (first.map((item) => item.id).join("|") !== second.map((item) => item.id).join("|")) {
  throw new Error("Repaired job IDs are not deterministic.");
}
if (!first.some((item) => item.id === "himalayas-senior-software-engineer")) {
  throw new Error("A deterministic listing did not retain the legacy job ID.");
}

console.log(
  JSON.stringify({
    exactDuplicatesRemoved: true,
    collidingIdsRepaired: true,
    repairedIdsDeterministic: true,
    legacyIdPreserved: true,
  })
);
