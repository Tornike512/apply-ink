import type { Job } from "@/lib/jobs";

export const JOB_ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "engineering", label: "Software engineering" },
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "fullstack", label: "Full-stack" },
  { value: "mobile", label: "Mobile" },
  { value: "ai-ml", label: "AI & machine learning" },
  { value: "data", label: "Data & analytics" },
  { value: "devops", label: "DevOps & cloud" },
  { value: "qa", label: "QA & testing" },
  { value: "product", label: "Product" },
  { value: "design", label: "Design" },
  { value: "security", label: "Security" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "customer-success", label: "Customer success" },
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "HR & recruiting" },
] as const;

export const JOB_LOCATION_OPTIONS = [
  { value: "worldwide", label: "Worldwide jobs" },
  { value: "north-america", label: "North America" },
  { value: "united-states", label: "United States" },
  { value: "canada", label: "Canada" },
  { value: "latin-america", label: "Latin America" },
  { value: "europe", label: "Europe" },
  { value: "uk-ireland", label: "UK & Ireland" },
  { value: "emea", label: "EMEA" },
  { value: "asia-pacific", label: "Asia-Pacific" },
  { value: "middle-east", label: "Middle East" },
  { value: "africa", label: "Africa" },
] as const;

export const POSTED_WITHIN_OPTIONS = [
  { value: 0, label: "Any time" },
  { value: 1, label: "Past 24 hours" },
  { value: 3, label: "Past 3 days" },
  { value: 7, label: "Past week" },
  { value: 14, label: "Past 2 weeks" },
  { value: 30, label: "Past month" },
] as const;

export const MINIMUM_MATCH_OPTIONS = [
  { value: 0, label: "Any match" },
  { value: 50, label: "50%+ match" },
  { value: 60, label: "60%+ match" },
  { value: 70, label: "70%+ match" },
  { value: 80, label: "80%+ match" },
  { value: 90, label: "90%+ match" },
] as const;

export type JobRole = (typeof JOB_ROLE_OPTIONS)[number]["value"];
export type JobLocation = (typeof JOB_LOCATION_OPTIONS)[number]["value"];
export type SalaryPeriod = "hourly" | "monthly" | "yearly";

const SALARY_PERIOD_MULTIPLIERS: Record<SalaryPeriod, number> = {
  hourly: 2_080,
  monthly: 12,
  yearly: 1,
};

export function annualizeSalary(value: number, period: SalaryPeriod): number {
  return value * SALARY_PERIOD_MULTIPLIERS[period];
}

export function salaryFromAnnual(value: number, period: SalaryPeriod): number {
  return value / SALARY_PERIOD_MULTIPLIERS[period];
}

export type JobFilterState = {
  role: JobRole;
  location: JobLocation;
  minSalary: number | null;
  maxSalary: number | null;
  postedWithinDays: number;
  minMatch: number;
};

export const DEFAULT_JOB_FILTERS: JobFilterState = {
  role: "all",
  location: "worldwide",
  minSalary: null,
  maxSalary: null,
  postedWithinDays: 0,
  minMatch: 0,
};

const ROLE_PATTERNS: Record<Exclude<JobRole, "all">, RegExp> = {
  engineering: /engineer|developer|software|programmer|architect/i,
  frontend: /front[ -]?end|react|next\.js|javascript|typescript|ui engineer/i,
  backend: /back[ -]?end|server|api engineer|platform engineer|node\.js|java|golang|\bgo\b/i,
  fullstack: /full[ -]?stack/i,
  mobile: /mobile|ios|android|react native|flutter/i,
  "ai-ml": /artificial intelligence|machine learning|\bai\b|\bml\b|llm|generative/i,
  data: /data|analytics|business intelligence|\bbi\b/i,
  devops: /devops|site reliability|\bsre\b|cloud|infrastructure|kubernetes/i,
  qa: /quality assurance|\bqa\b|test engineer|testing|automation engineer/i,
  product: /product manager|product owner|product lead|product operations/i,
  design: /designer|design|ux|user experience|user research/i,
  security: /security|cyber|infosec/i,
  sales: /sales|account executive|business development|revenue/i,
  marketing: /marketing|growth|content|seo|brand/i,
  "customer-success": /customer success|customer support|client success|support specialist/i,
  operations: /operations|chief of staff|program manager|project manager/i,
  finance: /finance|financial|accounting|accountant|controller/i,
  hr: /human resources|people operations|recruit|talent acquisition|\bhr\b/i,
};

const LOCATION_PATTERNS: Record<Exclude<JobLocation, "worldwide">, RegExp> = {
  "north-america": /north america|united states|\busa\b|\bu\.s\.|canada|mexico/i,
  "united-states": /united states|\busa\b|\bu\.s\./i,
  canada: /canada/i,
  "latin-america": /latin america|south america|central america|latam|brazil|argentina|chile|colombia|peru|mexico/i,
  europe: /europe|\beu\b|germany|france|spain|portugal|italy|netherlands|belgium|poland|romania|georgia|uk|united kingdom|ireland/i,
  "uk-ireland": /united kingdom|\buk\b|ireland|england|scotland|wales/i,
  emea: /emea|europe|middle east|africa|united kingdom|\buk\b|\beu\b/i,
  "asia-pacific": /asia|asia-pacific|apac|australia|new zealand|india|singapore|japan|korea|philippines/i,
  "middle-east": /middle east|uae|united arab emirates|saudi|israel|qatar|jordan/i,
  africa: /africa|south africa|nigeria|kenya|egypt|morocco|ghana/i,
};

function roleMatches(job: Job, role: JobRole): boolean {
  if (role === "all") return true;
  return ROLE_PATTERNS[role].test(`${job.title} ${job.tags.join(" ")}`);
}

function locationMatches(job: Job, location: JobLocation): boolean {
  if (location === "worldwide") return true;
  const worldwide = /worldwide|anywhere|global|no location restriction/i.test(
    job.location
  );
  return worldwide || LOCATION_PATTERNS[location].test(job.location);
}

export function parseAnnualSalaryRange(
  salary: string | undefined
): { min: number; max: number } | null {
  if (!salary) return null;
  const matches = [...salary.matchAll(/(\d+(?:[,.]\d+)?)\s*(k)?/gi)];
  if (matches.length === 0) return null;
  const hasThousandsSuffix = matches.some((match) => Boolean(match[2]));
  let values = matches
    .map((match) => {
      const parsed = Number(match[1].replace(/,/g, ""));
      if (!Number.isFinite(parsed)) return null;
      return match[2] || (hasThousandsSuffix && parsed < 1_000)
        ? parsed * 1_000
        : parsed;
    })
    .filter((value): value is number => value !== null && value > 0);
  if (values.length === 0) return null;
  if (/\b(hour|hourly|hr)\b/i.test(salary)) {
    values = values.map((value) => annualizeSalary(value, "hourly"));
  } else if (/\b(month|monthly|mo)\b/i.test(salary)) {
    values = values.map((value) => annualizeSalary(value, "monthly"));
  }
  return { min: Math.min(...values), max: Math.max(...values) };
}

function salaryMatches(job: Job, minSalary: number | null, maxSalary: number | null) {
  if (minSalary === null && maxSalary === null) return true;
  const salary = parseAnnualSalaryRange(job.salary);
  if (!salary) return false;
  if (minSalary !== null && salary.max < minSalary) return false;
  if (maxSalary !== null && salary.min > maxSalary) return false;
  return true;
}

export function filterJobs(
  jobs: Job[],
  search: string,
  filters: JobFilterState,
  now = Date.now()
): Job[] {
  const query = normalizeSearchText(search);
  const postedCutoff = filters.postedWithinDays
    ? now - filters.postedWithinDays * 86_400_000
    : null;
  return jobs.filter((job) => {
    const searchable = normalizeSearchText(
      `${job.title} ${job.company} ${job.tags.join(" ")}`
    );
    if (query && !searchable.includes(query)) return false;
    if (!roleMatches(job, filters.role)) return false;
    if (!locationMatches(job, filters.location)) return false;
    if (!salaryMatches(job, filters.minSalary, filters.maxSalary)) return false;
    if (filters.minMatch && job.match < filters.minMatch) return false;
    if (postedCutoff !== null && (!job.postedAt || job.postedAt < postedCutoff)) {
      return false;
    }
    return true;
  });
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\bfront[ -]end\b/g, "frontend")
    .replace(/\bback[ -]end\b/g, "backend")
    .replace(/\bfull[ -]stack\b/g, "fullstack");
}

function optionValue<T extends string>(
  value: string | null,
  options: readonly { value: T }[],
  fallback: T
): T {
  return options.some((option) => option.value === value) ? (value as T) : fallback;
}

function positiveNumber(value: string | null, allowed: readonly number[]): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && allowed.includes(parsed)
    ? parsed
    : 0;
}

function nullableSalary(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export function jobFiltersFromSearchParams(params: URLSearchParams): JobFilterState {
  const minSalary = nullableSalary(params.get("minSalary"));
  const maxSalary = nullableSalary(params.get("maxSalary"));
  return {
    role: optionValue(params.get("role"), JOB_ROLE_OPTIONS, "all"),
    location: optionValue(
      params.get("location"),
      JOB_LOCATION_OPTIONS,
      "worldwide"
    ),
    minSalary,
    maxSalary:
      minSalary !== null && maxSalary !== null && maxSalary < minSalary
        ? null
        : maxSalary,
    postedWithinDays: positiveNumber(
      params.get("postedWithinDays"),
      POSTED_WITHIN_OPTIONS.map((option) => option.value)
    ),
    minMatch: positiveNumber(
      params.get("minMatch"),
      MINIMUM_MATCH_OPTIONS.map((option) => option.value)
    ),
  };
}
