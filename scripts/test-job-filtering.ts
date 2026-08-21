import {
  DEFAULT_JOB_FILTERS,
  annualizeSalary,
  filterJobs,
  jobFiltersFromSearchParams,
  parseAnnualSalaryRange,
  salaryFromAnnual,
  type JobFilterState,
} from "../src/lib/job-filtering";
import type { Job } from "../src/lib/jobs";

const NOW = 1_780_000_000_000;

function job(overrides: Partial<Job>): Job {
  return {
    id: "job",
    title: "Role",
    company: "Company",
    location: "Remote - Worldwide",
    salary: undefined,
    match: 80,
    tags: [],
    posted: "today",
    postedAt: NOW,
    description: "",
    logoColor: "#000000",
    verified: false,
    source: "Test",
    url: "#",
    ...overrides,
  };
}

const jobs = [
  job({
    id: "frontend",
    title: "Senior Frontend Engineer",
    company: "Global UI",
    salary: "$120k - $150k",
    match: 92,
    tags: ["React", "TypeScript"],
  }),
  job({
    id: "front-end",
    title: "Front-end Accessibility Engineer",
    company: "Inclusive UI",
    tags: ["CSS"],
  }),
  job({
    id: "backend",
    title: "Backend Developer",
    company: "Euro API",
    location: "Remote - Europe",
    salary: "$80,000 - $100,000",
    match: 76,
    tags: ["Node.js"],
    postedAt: NOW - 10 * 86_400_000,
  }),
  job({
    id: "product",
    title: "Product Manager",
    company: "North Product",
    location: "Remote - United States and Canada",
    match: 85,
    postedAt: NOW - 2 * 86_400_000,
  }),
  job({
    id: "support",
    title: "Customer Support Specialist",
    company: "LATAM Help",
    location: "Remote - Latin America",
    salary: "$40 - $50 hourly",
    match: 70,
  }),
];

function withFilters(patch: Partial<JobFilterState>) {
  return { ...DEFAULT_JOB_FILTERS, ...patch };
}

function ids(filters: JobFilterState, search = "") {
  return filterJobs(jobs, search, filters, NOW).map((item) => item.id);
}

if (ids(DEFAULT_JOB_FILTERS, "react").join() !== "frontend") {
  throw new Error("Search did not include skills.");
}
if (ids(DEFAULT_JOB_FILTERS, "frontend").join() !== "frontend,front-end") {
  throw new Error("Frontend search did not include front-end titles.");
}
if (ids(DEFAULT_JOB_FILTERS, "front-end").join() !== "frontend,front-end") {
  throw new Error("Front-end search did not include frontend titles.");
}
if (ids(withFilters({ role: "frontend" })).join() !== "frontend,front-end") {
  throw new Error("Role filtering failed.");
}
if (
  ids(withFilters({ location: "europe" })).join() !==
  "frontend,front-end,backend"
) {
  throw new Error("Regional filtering did not include worldwide jobs.");
}
if (ids(withFilters({ location: "worldwide" })).length !== jobs.length) {
  throw new Error("Worldwide default did not include the full dataset.");
}
if (
  ids(withFilters({ minSalary: 110_000, maxSalary: 130_000 })).join() !==
  "frontend"
) {
  throw new Error("Salary range filtering failed.");
}
const hourly = parseAnnualSalaryRange("$40 - $50 hourly");
if (hourly?.min !== 83_200 || hourly.max !== 104_000) {
  throw new Error("Hourly salary conversion failed.");
}
const monthly = parseAnnualSalaryRange("$7,000 - $9,000 monthly");
if (monthly?.min !== 84_000 || monthly.max !== 108_000) {
  throw new Error("Monthly salary conversion failed.");
}
if (
  annualizeSalary(50, "hourly") !== 104_000 ||
  annualizeSalary(8_000, "monthly") !== 96_000 ||
  salaryFromAnnual(104_000, "hourly") !== 50
) {
  throw new Error("Salary input conversion failed.");
}
if (
  ids(withFilters({ postedWithinDays: 7 })).join() !==
  "frontend,front-end,product,support"
) {
  throw new Error("Posted-date filtering failed.");
}
if (ids(withFilters({ minMatch: 90 })).join() !== "frontend") {
  throw new Error("Match filtering failed.");
}
const params = jobFiltersFromSearchParams(
  new URLSearchParams(
    "role=backend&location=europe&minSalary=90000&maxSalary=120000&postedWithinDays=7&minMatch=80"
  )
);
if (
  params.role !== "backend" ||
  params.location !== "europe" ||
  params.minSalary !== 90_000 ||
  params.maxSalary !== 120_000 ||
  params.postedWithinDays !== 7 ||
  params.minMatch !== 80
) {
  throw new Error("Filter query parsing failed.");
}

console.log(
  JSON.stringify({
    search: true,
    hyphenatedSearch: true,
    role: true,
    location: true,
    salaryRange: true,
    salaryPeriodConversion: true,
    postedDate: true,
    matchScore: true,
    queryParams: true,
  })
);
