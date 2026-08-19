import type { Job } from "@/lib/jobs";

const ANYWHERE_LOCATION =
  /\b(?:anywhere|worldwide|global(?:ly)?|work from anywhere|all countries)\b/i;
const ANYWHERE_DESCRIPTION = [
  /\bwork(?:ing)? (?:remotely )?from anywhere\b/i,
  /\banywhere in the world\b/i,
  /\b(?:open to|hiring|accepting) (?:candidates|applicants) (?:from )?(?:anywhere|worldwide|all countries)\b/i,
  /\b(?:candidates|applicants) (?:can be|may be|located) (?:anywhere|worldwide)\b/i,
  /\bno (?:geographic|geographical|location) restrictions?\b/i,
  /\blocation[- ]independent\b/i,
  /\bremote (?:role|position|job) (?:is )?(?:available|open) worldwide\b/i,
];
const ANYWHERE_EXCLUSION =
  /\b(?:anywhere|worldwide|global(?:ly)?|all countries)[^.!?]{0,50}\b(?:except|excluding|excluded)\b|\b(?:except|excluding|excluded)[^.!?]{0,50}\b(?:countries|locations|regions)\b/i;
const RESTRICTED_REGION = String.raw`(?:u\.?s\.?a?|united states|canada|u\.?k\.?|united kingdom|europe|eu|eea|apac|latam|north america|south america|australia|new zealand|india)`;
const RESTRICTED_LOCATION = new RegExp(
  String.raw`^\s*(?:remote\s*[-,:/]\s*)?(?:the\s+)?${RESTRICTED_REGION}(?:\s*[-,:/]?\s*(?:only|remote))?\s*$`,
  "i"
);
const LOCATION_RESTRICTION = new RegExp(
  [
    String.raw`\b(?:must|need to|required to|should) (?:currently )?(?:be )?(?:based|located|live|reside) in\b`,
    String.raw`\b(?:only open to|hiring only|available only to) (?:candidates|applicants|residents) (?:in|from)\b`,
    String.raw`\b(?:open|available) to (?:candidates|applicants) (?:in|from) (?:the )?${RESTRICTED_REGION}\b`,
    String.raw`\b(?:remote|work from home) (?:only )?(?:in|within|from) (?:the )?${RESTRICTED_REGION}\b`,
    String.raw`\bremote\s*[(—–,:/-]+\s*${RESTRICTED_REGION}\b`,
    String.raw`\b${RESTRICTED_REGION}\s*[-,:/]\s*remote\b`,
    String.raw`\b${RESTRICTED_REGION}[ -](?:only|based)\b`,
  ].join("|"),
  "i"
);

export function isWorkFromAnywhere(
  job: Pick<Job, "location" | "description">
): boolean {
  const text = `${job.location}\n${job.description}`;
  if (RESTRICTED_LOCATION.test(job.location)) return false;

  if (ANYWHERE_LOCATION.test(job.location)) {
    return !ANYWHERE_EXCLUSION.test(text);
  }

  const hasPositiveSignal = ANYWHERE_DESCRIPTION.some((pattern) =>
    pattern.test(job.description)
  );

  return (
    hasPositiveSignal &&
    !ANYWHERE_EXCLUSION.test(text) &&
    !LOCATION_RESTRICTION.test(text)
  );
}
