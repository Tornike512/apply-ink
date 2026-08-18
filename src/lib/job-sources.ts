import type { Job } from "@/lib/jobs";
import boards from "./ats-boards.json";

const PROFILE_SKILLS = [
  "react",
  "typescript",
  "javascript",
  "next.js",
  "node",
  "frontend",
  "full-stack",
  "fullstack",
  "tailwind",
  "graphql",
  "css",
  "engineer",
  "developer",
  "software",
  "product",
  "design",
  "devops",
  "python",
];

const LOGO_COLORS = [
  "#e6602c",
  "#1f2a56",
  "#7c5ce0",
  "#c2452f",
  "#0f766e",
  "#3e8e41",
  "#b45309",
  "#5b21b6",
  "#0e7490",
  "#9d174d",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string, max = 700): string {
  const text = decodeEntities(
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function relativeDate(timestampMs: number | null): string {
  if (!timestampMs || Number.isNaN(timestampMs)) return "recently";
  const days = Math.floor((Date.now() - timestampMs) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function matchScore(id: string, title: string, tags: string[]): number {
  const haystack = `${title} ${tags.join(" ")}`.toLowerCase();
  const hits = PROFILE_SKILLS.filter((skill) => haystack.includes(skill)).length;
  return Math.min(98, 55 + 11 * hits + (hashString(id) % 7));
}

type Normalized = Omit<Job, "match" | "logoColor" | "verified">;

function finalize(job: Normalized): Job {
  return {
    ...job,
    match: matchScore(job.id, job.title, job.tags),
    logoColor: LOGO_COLORS[hashString(job.company) % LOGO_COLORS.length],
    verified: Boolean(job.logoUrl),
  };
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// The store is the cache layer — outbound requests always bypass Next's data cache.
async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

function rssTag(block: string, name: string): string | undefined {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match?.[1];
}

async function pooled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length) {
        const item = queue.shift()!;
        try {
          results.push(...(await fn(item)));
        } catch {
          // dead board — contribute nothing
        }
      }
    })
  );
  return results;
}

// ---------- free feeds ----------

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  tags?: string[];
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
};

async function fetchRemotive(): Promise<Normalized[]> {
  const data = (await getJson(
    "https://remotive.com/api/remote-jobs?limit=100"
  )) as { jobs?: RemotiveJob[] };
  return (data.jobs ?? []).map((j) => ({
    id: `remotive-${j.id}`,
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    salary: j.salary?.trim() || undefined,
    tags: (j.tags ?? []).slice(0, 4),
    posted: relativeDate(
      j.publication_date ? Date.parse(j.publication_date) : null
    ),
    description: stripHtml(j.description ?? ""),
    source: "Remotive",
    url: j.url,
    logoUrl: j.company_logo || undefined,
  }));
}

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description?: string;
  remote?: boolean;
  url: string;
  tags?: string[];
  location?: string;
  created_at?: number;
};

async function fetchArbeitnow(): Promise<Normalized[]> {
  const pages = await Promise.all(
    [1, 2, 3, 4].map((page) =>
      getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`).catch(
        () => ({})
      )
    )
  );
  return pages
    .flatMap((p) => (p as { data?: ArbeitnowJob[] }).data ?? [])
    .filter((j) => j.remote === true)
    .map((j) => ({
      id: `arbeitnow-${j.slug}`,
      title: j.title,
      company: j.company_name,
      location: j.location ? `Remote — ${j.location}` : "Remote",
      salary: undefined,
      tags: (j.tags ?? []).slice(0, 4),
      posted: relativeDate(j.created_at ? j.created_at * 1000 : null),
      description: stripHtml(j.description ?? ""),
      source: "Arbeitnow",
      url: j.url,
      logoUrl: undefined,
    }));
}

type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobIndustry?: string[];
  jobGeo?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
};

async function fetchJobicy(): Promise<Normalized[]> {
  const data = (await getJson(
    "https://jobicy.com/api/v2/remote-jobs?count=50"
  )) as { jobs?: JobicyJob[] };
  return (data.jobs ?? []).map((j) => ({
    id: `jobicy-${j.id}`,
    title: decodeEntities(j.jobTitle),
    company: decodeEntities(j.companyName),
    location: j.jobGeo ? `Remote — ${decodeEntities(j.jobGeo)}` : "Remote",
    salary:
      j.annualSalaryMin && j.annualSalaryMax
        ? `$${Math.round(j.annualSalaryMin / 1000)}k – $${Math.round(j.annualSalaryMax / 1000)}k`
        : undefined,
    tags: (j.jobIndustry ?? []).map(decodeEntities).slice(0, 3),
    posted: relativeDate(j.pubDate ? Date.parse(j.pubDate) : null),
    description: stripHtml(j.jobDescription ?? j.jobExcerpt ?? ""),
    source: "Jobicy",
    url: j.url,
    logoUrl: j.companyLogo || undefined,
  }));
}

type RemoteOkJob = {
  id?: string | number;
  slug?: string;
  date?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  url?: string;
};

async function fetchRemoteOk(): Promise<Normalized[]> {
  const data = (await getJson("https://remoteok.com/api")) as RemoteOkJob[];
  return data
    .slice(1) // first element is a legal notice
    .filter((j) => j.id && j.position && j.company)
    .map((j) => ({
      id: `remoteok-${j.id}`,
      title: j.position as string,
      company: j.company as string,
      location: j.location || "Remote",
      salary:
        j.salary_min && j.salary_max && j.salary_min > 0
          ? `$${Math.round(j.salary_min / 1000)}k – $${Math.round(j.salary_max / 1000)}k`
          : undefined,
      tags: (j.tags ?? []).slice(0, 4),
      posted: relativeDate(j.date ? Date.parse(j.date) : null),
      description: stripHtml(j.description ?? ""),
      source: "Remote OK",
      url: j.url || `https://remoteok.com/remote-jobs/${j.slug ?? ""}`,
      logoUrl: j.company_logo || undefined,
    }));
}

async function fetchWeWorkRemotely(): Promise<Normalized[]> {
  const xml = await getText(
    "https://weworkremotely.com/categories/remote-programming-jobs.rss"
  );
  return xml
    .split("<item>")
    .slice(1)
    .map((block) => block.split("</item>")[0])
    .map((item) => {
      const rawTitle = decodeEntities(rssTag(item, "title") ?? "");
      const [company, ...rest] = rawTitle.split(": ");
      const url = rssTag(item, "link") ?? "https://weworkremotely.com";
      const region = decodeEntities(rssTag(item, "region") ?? "Remote");
      const category = decodeEntities(rssTag(item, "category") ?? "");
      const pub = rssTag(item, "pubDate");
      return {
        id: `wwr-${url.split("/").pop() ?? url}`,
        title: rest.join(": ") || rawTitle,
        company: company || "We Work Remotely",
        location: region.toLowerCase().includes("remote")
          ? region
          : `Remote — ${region}`,
        salary: undefined,
        tags: category ? [category] : [],
        posted: relativeDate(pub ? Date.parse(pub) : null),
        description: stripHtml(rssTag(item, "description") ?? ""),
        source: "We Work Remotely",
        url,
        logoUrl: undefined,
      };
    });
}

type HnHit = {
  objectID: string;
  title?: string;
  comment_text?: string;
  created_at?: string;
  parent_id?: number;
};

async function fetchHackerNews(): Promise<Normalized[]> {
  const search = (await getJson(
    "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=6"
  )) as { hits?: HnHit[] };
  const thread = (search.hits ?? []).find((h) =>
    h.title?.includes("Who is hiring")
  );
  if (!thread) return [];
  const comments = (await getJson(
    `https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_${thread.objectID}&hitsPerPage=200`
  )) as { hits?: HnHit[] };
  return (comments.hits ?? [])
    .filter((h) => String(h.parent_id) === thread.objectID && h.comment_text)
    .filter((h) => /remote/i.test(h.comment_text ?? ""))
    .slice(0, 40)
    .map((h) => {
      const firstLine = stripHtml((h.comment_text ?? "").split(/<p>/i)[0], 200);
      const segs = firstLine
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: `hn-${h.objectID}`,
        title: segs[1] && segs[1].length <= 80 ? segs[1] : "Multiple roles",
        company: (segs[0] ?? "HN poster").slice(0, 40),
        location: "Remote (see post)",
        salary: undefined,
        tags: ["Hacker News"],
        posted: relativeDate(h.created_at ? Date.parse(h.created_at) : null),
        description: stripHtml(h.comment_text ?? "", 800),
        source: "HN Who's Hiring",
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        logoUrl: undefined,
      };
    });
}

// ---------- mass ATS harvesting (boards discovered by scripts/discover-boards.mjs) ----------

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
  company_name?: string;
};

async function fetchGreenhouseBoard(board: {
  slug: string;
}): Promise<Normalized[]> {
  const data = (await getJson(
    `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs`
  )) as { jobs?: GreenhouseJob[] };
  return (data.jobs ?? [])
    .filter((j) => (j.location?.name ?? "").toLowerCase().includes("remote"))
    .map((j) => ({
      id: `greenhouse-${board.slug}-${j.id}`,
      title: j.title,
      company: j.company_name || titleCase(board.slug),
      location: j.location?.name ?? "Remote",
      salary: undefined,
      tags: [],
      posted: relativeDate(
        j.first_published
          ? Date.parse(j.first_published)
          : j.updated_at
            ? Date.parse(j.updated_at)
            : null
      ),
      description: "",
      source: "Greenhouse",
      url: j.absolute_url,
      logoUrl: undefined,
    }));
}

type AshbyJob = {
  id: string;
  title: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean;
  jobUrl?: string;
  descriptionHtml?: string;
};

async function fetchAshbyBoard(board: { slug: string }): Promise<Normalized[]> {
  const data = (await getJson(
    `https://api.ashbyhq.com/posting-api/job-board/${board.slug}`
  )) as { jobs?: AshbyJob[] };
  return (data.jobs ?? [])
    .filter((j) => j.isRemote === true && j.isListed !== false)
    .map((j) => ({
      id: `ashby-${board.slug}-${j.id}`,
      title: j.title,
      company: titleCase(board.slug),
      location: j.location || "Remote",
      salary: undefined,
      tags: [j.department, j.team]
        .filter((t): t is string => Boolean(t))
        .filter((t, i, arr) => arr.indexOf(t) === i)
        .slice(0, 2),
      posted: relativeDate(j.publishedAt ? Date.parse(j.publishedAt) : null),
      description: stripHtml(j.descriptionHtml ?? ""),
      source: "Ashby",
      url: j.jobUrl ?? `https://jobs.ashbyhq.com/${board.slug}`,
      logoUrl: undefined,
    }));
}

type SmartRecruitersJob = {
  id: string;
  name: string;
  releasedDate?: string;
  company?: { identifier?: string; name?: string };
  location?: { fullLocation?: string; remote?: boolean };
  function?: { label?: string };
  experienceLevel?: { label?: string };
};

async function fetchSmartRecruitersBoard(board: {
  slug: string;
}): Promise<Normalized[]> {
  const data = (await getJson(
    `https://api.smartrecruiters.com/v1/companies/${board.slug}/postings?limit=100`
  )) as { content?: SmartRecruitersJob[] };
  return (data.content ?? [])
    .filter((j) => j.location?.remote === true)
    .map((j) => ({
      id: `smart-${board.slug}-${j.id}`,
      title: j.name,
      company: j.company?.name || titleCase(board.slug),
      location: j.location?.fullLocation
        ? `Remote — ${j.location.fullLocation}`
        : "Remote",
      salary: undefined,
      tags: [j.function?.label, j.experienceLevel?.label].filter(
        (t): t is string => Boolean(t)
      ),
      posted: relativeDate(
        j.releasedDate ? Date.parse(j.releasedDate) : null
      ),
      description: "",
      source: "SmartRecruiters",
      url: `https://jobs.smartrecruiters.com/${j.company?.identifier ?? board.slug}/${j.id}`,
      logoUrl: undefined,
    }));
}

// ---------- harvest ----------

export type Harvest = {
  jobs: Job[];
  sources: Record<string, number>;
};

const MAX_JOBS = 8000;

export async function harvestAll(): Promise<Harvest> {
  const feeds = {
    remotive: fetchRemotive,
    arbeitnow: fetchArbeitnow,
    jobicy: fetchJobicy,
    remoteok: fetchRemoteOk,
    weworkremotely: fetchWeWorkRemotely,
    hackernews: fetchHackerNews,
  };
  const feedNames = Object.keys(feeds) as (keyof typeof feeds)[];

  const [feedResults, greenhouse, ashby, smartrecruiters] = await Promise.all([
    Promise.allSettled(feedNames.map((n) => feeds[n]())),
    pooled(boards.greenhouse, 10, fetchGreenhouseBoard),
    pooled(boards.ashby, 10, fetchAshbyBoard),
    pooled(boards.smartrecruiters, 5, fetchSmartRecruitersBoard),
  ]);

  const sources: Record<string, number> = {};
  const all: Normalized[] = [];
  feedResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sources[feedNames[i]] = result.value.length;
      all.push(...result.value);
    } else {
      sources[feedNames[i]] = 0;
    }
  });
  sources.greenhouse = greenhouse.length;
  sources.ashby = ashby.length;
  sources.smartrecruiters = smartrecruiters.length;
  all.push(...greenhouse, ...ashby, ...smartrecruiters);

  const seen = new Set<string>();
  const jobs: Job[] = [];
  for (const job of all) {
    const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push(finalize(job));
  }
  jobs.sort((a, b) => b.match - a.match);

  return { jobs: jobs.slice(0, MAX_JOBS), sources };
}
