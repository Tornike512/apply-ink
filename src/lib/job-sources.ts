import { isWorkFromAnywhere } from "@/lib/job-eligibility";
import { ensureUniqueJobIds } from "@/lib/job-identity";
import type { Job } from "@/lib/jobs";
import { getSharedCache, setSharedCache } from "@/lib/shared-cache";
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
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    );
}

function stripHtml(html: string, max = 2000): string {
  const decoded = decodeEntities(decodeEntities(html));
  const text = decoded
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function relativeDate(timestampMs: number | null): string {
  if (!timestampMs || Number.isNaN(timestampMs)) return "recently";
  const days = Math.floor((Date.now() - timestampMs) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function datePair(timestampMs: number | null): {
  posted: string;
  postedAt: number | null;
} {
  const valid =
    timestampMs && !Number.isNaN(timestampMs) ? timestampMs : null;
  return { posted: relativeDate(valid), postedAt: valid };
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
  const match = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")
  );
  return match?.[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
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
  const data = (await getJson("https://remotive.com/api/remote-jobs")) as {
    jobs?: RemotiveJob[];
  };
  return (data.jobs ?? []).map((j) => ({
    id: `remotive-${j.id}`,
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    salary: j.salary?.trim() || undefined,
    tags: (j.tags ?? []).slice(0, 4),
    ...datePair(
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
    Array.from({ length: 20 }, (_, index) => index + 1).map((page) =>
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
      ...datePair(j.created_at ? j.created_at * 1000 : null),
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
    "https://jobicy.com/api/v2/remote-jobs?count=100"
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
    ...datePair(j.pubDate ? Date.parse(j.pubDate) : null),
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
      ...datePair(j.date ? Date.parse(j.date) : null),
      description: stripHtml(j.description ?? ""),
      source: "Remote OK",
      url: j.url || `https://remoteok.com/remote-jobs/${j.slug ?? ""}`,
      logoUrl: j.company_logo || undefined,
    }));
}

const WWR_CATEGORIES = [
  "remote-programming-jobs",
  "remote-design-jobs",
  "remote-devops-sysadmin-jobs",
  "remote-management-and-finance-jobs",
  "remote-product-jobs",
  "remote-sales-and-marketing-jobs",
  "remote-customer-support-jobs",
  "remote-full-stack-programming-jobs",
  "remote-front-end-programming-jobs",
  "remote-back-end-programming-jobs",
  "all-other-remote-jobs",
];

async function fetchWeWorkRemotely(): Promise<Normalized[]> {
  const feeds = await Promise.all(
    WWR_CATEGORIES.map((category) =>
      getText(`https://weworkremotely.com/categories/${category}.rss`).catch(
        () => ""
      )
    )
  );
  return feeds
    .flatMap((xml) => xml.split("<item>").slice(1))
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
        ...datePair(pub ? Date.parse(pub) : null),
        description: stripHtml(rssTag(item, "description") ?? ""),
        source: "We Work Remotely",
        url,
        logoUrl: undefined,
      };
    });
}

type PublicRssFeed = {
  url: string;
  source: string;
  idPrefix: string;
  category?: string;
  worldwide?: boolean;
};

const REMOTE_FIRST_RSS_CATEGORIES = [
  "software-development",
  "python",
  "react",
  "golang",
  "ai",
  "cybersecurity",
  "customer-service",
  "design",
  "marketing",
  "sales",
  "product",
  "data-science",
  "devops",
  "qa",
  "writing",
  "business",
  "data",
  "finance-legal",
  "hr",
  "project-management",
  "contract",
  "full-time",
  "part-time",
  "entry-level",
  "senior",
];

const REAL_WORK_FROM_ANYWHERE_RSS_CATEGORIES = [
  "remote-fullstack-jobs",
  "remote-frontend-jobs",
  "remote-backend-jobs",
  "remote-software-developer-jobs",
  "remote-design-jobs",
  "remote-devops-and-sysadmin-jobs",
  "remote-management-and-finance-jobs",
  "remote-product-jobs",
  "remote-customer-support-jobs",
  "remote-sales-and-marketing-jobs",
];

const PUBLIC_RSS_FEEDS: PublicRssFeed[] = [
  {
    url: "https://www.realworkfromanywhere.com/rss.xml",
    source: "Real Work From Anywhere",
    idPrefix: "rwfa",
    worldwide: true,
  },
  ...REAL_WORK_FROM_ANYWHERE_RSS_CATEGORIES.map((category) => ({
    url: `https://www.realworkfromanywhere.com/${category}/rss.xml`,
    source: "Real Work From Anywhere",
    idPrefix: "rwfa",
    category,
    worldwide: true,
  })),
  {
    url: "https://jobscollider.com/remote-jobs.rss",
    source: "JobsCollider",
    idPrefix: "jobscollider",
  },
  ...REMOTE_FIRST_RSS_CATEGORIES.map((category) => ({
    url: `https://remotefirstjobs.com/rss/jobs/${category}.rss`,
    source: "Remote First Jobs",
    idPrefix: "remotefirst",
    category,
  })),
];

async function fetchPublicRssFeeds(): Promise<Normalized[]> {
  return pooled(PUBLIC_RSS_FEEDS, 4, async (feed) => {
    const xml = await getText(feed.url);
    return xml
      .split(/<item(?:\s[^>]*)?>/i)
      .slice(1)
      .map((block) => block.split(/<\/item>/i)[0])
      .map((item) => {
        const rawTitle = stripHtml(rssTag(item, "title") ?? "", 200);
        const author = stripHtml(rssTag(item, "author") ?? "", 100);
        const atIndex = rawTitle.lastIndexOf(" at ");
        const company =
          author || (atIndex > 0 ? rawTitle.slice(atIndex + 4) : feed.source);
        const title = atIndex > 0 ? rawTitle.slice(0, atIndex) : rawTitle;
        const url = decodeEntities(
          rssTag(item, "link") ?? rssTag(item, "guid") ?? feed.url
        );
        const guid = decodeEntities(rssTag(item, "guid") ?? url);
        const pub = rssTag(item, "pubDate");

        return {
          id: `${feed.idPrefix}-${hashString(guid)}`,
          title: title || "Untitled role",
          company,
          location: feed.worldwide ? "Remote — Worldwide" : "Remote",
          salary: undefined,
          tags: feed.category ? [titleCase(feed.category)] : [],
          ...datePair(pub ? Date.parse(pub) : null),
          description: stripHtml(rssTag(item, "description") ?? ""),
          source: feed.source,
          url,
          logoUrl: undefined,
        };
      });
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
    `https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_${thread.objectID}&hitsPerPage=1000`
  )) as { hits?: HnHit[] };
  return (comments.hits ?? [])
    .filter((h) => String(h.parent_id) === thread.objectID && h.comment_text)
    .filter((h) => /remote/i.test(h.comment_text ?? ""))
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
        ...datePair(h.created_at ? Date.parse(h.created_at) : null),
        description: stripHtml(h.comment_text ?? "", 800),
        source: "HN Who's Hiring",
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        logoUrl: undefined,
      };
    });
}

const FRESH_CUTOFF_MS = 31 * 86_400_000;

type HimalayasJob = {
  title: string;
  excerpt?: string;
  description?: string;
  companyName: string;
  companyLogo?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  locationRestrictions?: string[];
  parentCategories?: string[];
  categories?: string[];
  pubDate?: number;
  applicationLink?: string;
};

const HIMALAYAS_MAX = 5000;

async function fetchHimalayas(): Promise<Normalized[]> {
  const cutoff = Date.now() - FRESH_CUTOFF_MS;
  const out: Normalized[] = [];
  let offset = 0;
  // Paced pagination: the API soft-throttles rapid requests down to 20/response
  for (let request = 0; request < 150 && out.length < HIMALAYAS_MAX; request++) {
    const data = (await getJson(
      `https://himalayas.app/jobs/api?limit=100&offset=${offset}`
    )) as { jobs?: HimalayasJob[] };
    const jobs = data.jobs ?? [];
    if (jobs.length === 0) break;
    offset += jobs.length;
    for (const j of jobs) {
      const ms = j.pubDate ? j.pubDate * 1000 : null;
      out.push({
        id: `himalayas-${j.applicationLink?.split("/").pop() ?? `${offset}-${out.length}`}`,
        title: j.title,
        company: j.companyName,
        location: j.locationRestrictions?.length
          ? `Remote — ${j.locationRestrictions.slice(0, 2).join(", ")}`
          : "Remote — Worldwide",
        salary:
          j.minSalary && j.maxSalary && j.currency === "USD"
            ? `$${Math.round(j.minSalary / 1000)}k – $${Math.round(j.maxSalary / 1000)}k`
            : undefined,
        tags: (j.parentCategories?.length
          ? j.parentCategories
          : (j.categories ?? [])
        ).slice(0, 3),
        ...datePair(ms),
        description: stripHtml(j.description ?? j.excerpt ?? ""),
        source: "Himalayas",
        url: j.applicationLink ?? "https://himalayas.app/jobs",
        logoUrl: j.companyLogo || undefined,
      });
    }
    const last = jobs[jobs.length - 1];
    if (last.pubDate && last.pubDate * 1000 < cutoff) break;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  return out;
}

type WorkingNomadsJob = {
  url: string;
  title: string;
  description?: string;
  company_name?: string;
  category_name?: string;
  tags?: string | string[];
  location?: string;
  pub_date?: string;
};

async function fetchWorkingNomads(): Promise<Normalized[]> {
  const data = (await getJson(
    "https://www.workingnomads.com/api/exposed_jobs/"
  )) as WorkingNomadsJob[];
  return data.map((j, i) => ({
    id: `workingnomads-${j.url.split("/").filter(Boolean).pop() ?? i}`,
    title: j.title,
    company: j.company_name ?? "Working Nomads",
    location: j.location ? `Remote — ${j.location}` : "Remote",
    salary: undefined,
    tags: (typeof j.tags === "string"
      ? j.tags.split(",").map((t) => t.trim())
      : (j.tags ?? [])
    )
      .filter(Boolean)
      .slice(0, 4),
    ...datePair(j.pub_date ? Date.parse(j.pub_date) : null),
    description: stripHtml(j.description ?? ""),
    source: "Working Nomads",
    url: j.url,
    logoUrl: undefined,
  }));
}

type MuseJob = {
  id: number;
  name: string;
  publication_date?: string;
  contents?: string;
  categories?: { name?: string }[];
  levels?: { name?: string }[];
  refs?: { landing_page?: string };
  company?: { name?: string };
};

async function fetchTheMuse(): Promise<Normalized[]> {
  const pages = await Promise.all(
    Array.from({ length: 50 }, (_, page) =>
      getJson(
        `https://www.themuse.com/api/public/jobs?location=Flexible%20%2F%20Remote&page=${page}`
      ).catch(() => ({}))
    )
  );
  return pages
    .flatMap((p) => (p as { results?: MuseJob[] }).results ?? [])
    .map((j) => ({
      id: `muse-${j.id}`,
      title: j.name,
      company: j.company?.name ?? "The Muse",
      location: "Remote — Flexible",
      salary: undefined,
      tags: (j.categories ?? [])
        .map((c) => c.name)
        .filter((n): n is string => Boolean(n))
        .slice(0, 3),
      ...datePair(
        j.publication_date ? Date.parse(j.publication_date) : null
      ),
      description: stripHtml(j.contents ?? ""),
      source: "The Muse",
      url: j.refs?.landing_page ?? "https://www.themuse.com/search",
      logoUrl: undefined,
    }));
}

// JSearch (RapidAPI, keyed): free tier is 200 requests/month, so results are
// cached in PostgreSQL and refetched at most every 48h.
const JSEARCH_CACHE_KEY = "jsearch-jobs";
const JSEARCH_TTL_MS = 48 * 3_600_000;
const JSEARCH_CACHE_VERSION = 2;
const JSEARCH_QUERIES = [
  "work from anywhere software developer",
  "worldwide remote frontend engineer",
];
const JSEARCH_PAGES_PER_QUERY = 6;

type JSearchJob = {
  job_id: string;
  job_title?: string;
  employer_name?: string;
  employer_logo?: string;
  job_publisher?: string;
  job_employment_type?: string;
  job_apply_link?: string;
  job_description?: string;
  job_is_remote?: boolean;
  job_posted_at_timestamp?: number;
  job_location?: string;
  job_country?: string;
  job_salary_string?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_period?: string;
};

async function fetchJSearch(): Promise<Normalized[]> {
  const key = process.env.JSEARCH_RAPIDAPI_KEY;
  if (!key) return [];

  const cached = await getSharedCache<Normalized[]>(
    JSEARCH_CACHE_KEY,
    JSEARCH_CACHE_VERSION,
    JSEARCH_TTL_MS
  );
  if (cached) return cached;

  const out: Normalized[] = [];
  for (const query of JSEARCH_QUERIES) {
    let cursor: string | undefined;
    for (let page = 0; page < JSEARCH_PAGES_PER_QUERY; page++) {
      const params = new URLSearchParams({
        query,
        date_posted: "month",
        work_from_home: "true",
      });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search-v2?${params}`,
        {
          headers: {
            "x-rapidapi-host": "jsearch.p.rapidapi.com",
            "x-rapidapi-key": key,
          },
          cache: "no-store",
        }
      );
      if (!res.ok) break;
      const data = (await res.json()) as {
        data?: { jobs?: JSearchJob[]; cursor?: string };
      };
      const jobs = data.data?.jobs ?? [];
      for (const j of jobs) {
        if (j.job_is_remote === false) continue;
        out.push({
          id: `jsearch-${j.job_id.slice(0, 28)}`,
          title: j.job_title ?? "Untitled role",
          company: j.employer_name ?? "Unknown company",
          // JSearch sometimes labels region-limited roles as "Anywhere".
          // Require a strong worldwide phrase in the description instead.
          location:
            j.job_location &&
            !/\b(?:anywhere|worldwide|global(?:ly)?)\b/i.test(j.job_location)
              ? `Remote — ${j.job_location}`
              : "Remote",
          salary:
            j.job_salary_string ??
            (j.job_min_salary && j.job_max_salary
              ? `$${Math.round(j.job_min_salary / 1000)}k – $${Math.round(j.job_max_salary / 1000)}k`
              : undefined),
          tags: [j.job_publisher, j.job_employment_type].filter(
            (t): t is string => Boolean(t)
          ),
          ...datePair(
            j.job_posted_at_timestamp ? j.job_posted_at_timestamp * 1000 : null
          ),
          description: stripHtml(j.job_description ?? ""),
          source: "JSearch",
          url: j.job_apply_link ?? "https://www.google.com/search?q=jobs",
          logoUrl: j.employer_logo || undefined,
        });
      }
      cursor = data.data?.cursor;
      if (!cursor || jobs.length === 0) break;
    }
  }

  await setSharedCache(JSEARCH_CACHE_KEY, JSEARCH_CACHE_VERSION, out);
  return out;
}

// ---------- mass ATS harvesting (boards discovered by scripts/discover-boards.mjs) ----------

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
  company_name?: string;
};

async function fetchGreenhouseBoard(board: {
  slug: string;
}): Promise<Normalized[]> {
  const data = (await getJson(
    `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`
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
      ...datePair(
        j.first_published
          ? Date.parse(j.first_published)
          : j.updated_at
            ? Date.parse(j.updated_at)
            : null
      ),
      description: stripHtml(j.content ?? ""),
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
      ...datePair(j.publishedAt ? Date.parse(j.publishedAt) : null),
      description: stripHtml(j.descriptionHtml ?? ""),
      source: "Ashby",
      url: j.jobUrl ?? `https://jobs.ashbyhq.com/${board.slug}`,
      logoUrl: undefined,
    }));
}

type WorkableJob = {
  shortcode: string;
  title: string;
  telecommuting?: boolean;
  published_on?: string;
  department?: string;
  country?: string;
  locations?: { country?: string }[];
  description?: string;
  url?: string;
};

async function fetchWorkableBoard(board: {
  slug: string;
}): Promise<Normalized[]> {
  const data = (await getJson(
    `https://apply.workable.com/api/v1/widget/accounts/${board.slug}?details=true`
  )) as { jobs?: WorkableJob[] };
  return (data.jobs ?? [])
    .filter((j) => j.telecommuting === true)
    .map((j) => {
      const countries = [
        ...new Set(
          [j.country, ...(j.locations ?? []).map((location) => location.country)]
            .filter((country): country is string => Boolean(country))
        ),
      ];
      return {
        id: `workable-${board.slug}-${j.shortcode}`,
        title: j.title,
        company: titleCase(board.slug),
        location: countries.length
          ? `Remote — ${countries.slice(0, 3).join(", ")}`
          : "Remote",
        salary: undefined,
        tags: j.department ? [j.department] : [],
        ...datePair(j.published_on ? Date.parse(j.published_on) : null),
        description: stripHtml(j.description ?? ""),
        source: "Workable",
        url:
          j.url ??
          `https://apply.workable.com/${board.slug}/j/${j.shortcode}`,
        logoUrl: undefined,
      };
    });
}

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  workplaceType?: string;
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
};

async function fetchLeverBoard(board: { slug: string }): Promise<Normalized[]> {
  const data = (await getJson(
    `https://api.lever.co/v0/postings/${board.slug}?mode=json`
  )) as LeverJob[];
  return data
    .filter(
      (j) =>
        j.workplaceType === "remote" ||
        (j.categories?.location ?? "").toLowerCase().includes("remote")
    )
    .map((j) => ({
      id: `lever-${board.slug}-${j.id}`,
      title: j.text,
      company: titleCase(board.slug),
      location: j.categories?.location || "Remote",
      salary: undefined,
      tags: [j.categories?.team, j.categories?.commitment].filter(
        (t): t is string => Boolean(t)
      ),
      ...datePair(j.createdAt ?? null),
      description: stripHtml(j.descriptionPlain ?? ""),
      source: "Lever",
      url: j.applyUrl ?? j.hostedUrl,
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

type SmartRecruitersJobDetail = SmartRecruitersJob & {
  postingUrl?: string;
  jobAd?: {
    sections?: Record<string, { text?: string }>;
  };
};

async function fetchSmartRecruitersBoard(board: {
  slug: string;
}): Promise<Normalized[]> {
  type Page = {
    content?: SmartRecruitersJob[];
    totalFound?: number;
  };
  const first = (await getJson(
    `https://api.smartrecruiters.com/v1/companies/${board.slug}/postings?limit=100&offset=0`
  )) as Page;
  const pageCount = Math.min(10, Math.ceil((first.totalFound ?? 0) / 100));
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      getJson(
        `https://api.smartrecruiters.com/v1/companies/${board.slug}/postings?limit=100&offset=${(index + 1) * 100}`
      ).catch(() => ({}))
    )
  );
  const remoteJobs = [
    ...(first.content ?? []),
    ...remaining.flatMap((page) => (page as Page).content ?? []),
  ].filter((job) => job.location?.remote === true);

  return pooled(remoteJobs, 6, async (job) => {
    let detail: SmartRecruitersJobDetail = job;
    try {
      detail = (await getJson(
        `https://api.smartrecruiters.com/v1/companies/${board.slug}/postings/${job.id}`
      )) as SmartRecruitersJobDetail;
    } catch {
      // Keep the list result when a details request is unavailable.
    }
    const description = Object.values(detail.jobAd?.sections ?? {})
      .map((section) => section.text ?? "")
      .join(" ");
    return [
      {
        id: `smart-${board.slug}-${job.id}`,
        title: job.name,
        company: job.company?.name || titleCase(board.slug),
        location: job.location?.fullLocation
          ? `Remote — ${job.location.fullLocation}`
          : "Remote",
        salary: undefined,
        tags: [job.function?.label, job.experienceLevel?.label].filter(
          (tag): tag is string => Boolean(tag)
        ),
        ...datePair(job.releasedDate ? Date.parse(job.releasedDate) : null),
        description: stripHtml(description),
        source: "SmartRecruiters",
        url:
          detail.postingUrl ??
          `https://jobs.smartrecruiters.com/${job.company?.identifier ?? board.slug}/${job.id}`,
        logoUrl: undefined,
      },
    ];
  });
}

// ---------- harvest ----------

export type Harvest = {
  jobs: Job[];
  sources: Record<string, number>;
};

const MAX_JOBS = 12000;

export async function harvestAll(): Promise<Harvest> {
  const feeds = {
    remotive: fetchRemotive,
    arbeitnow: fetchArbeitnow,
    jobicy: fetchJobicy,
    remoteok: fetchRemoteOk,
    weworkremotely: fetchWeWorkRemotely,
    publicrss: fetchPublicRssFeeds,
    hackernews: fetchHackerNews,
    himalayas: fetchHimalayas,
    workingnomads: fetchWorkingNomads,
    themuse: fetchTheMuse,
    jsearch: fetchJSearch,
  };
  const feedNames = Object.keys(feeds) as (keyof typeof feeds)[];

  const [feedResults, greenhouse, ashby, smartrecruiters, workable, lever] =
    await Promise.all([
      Promise.allSettled(feedNames.map((n) => feeds[n]())),
      pooled(boards.greenhouse, 10, fetchGreenhouseBoard),
      pooled(boards.ashby, 10, fetchAshbyBoard),
      pooled(boards.smartrecruiters, 5, fetchSmartRecruitersBoard),
      pooled(boards.workable ?? [], 10, fetchWorkableBoard),
      pooled(boards.lever ?? [], 10, fetchLeverBoard),
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
  sources.workable = workable.length;
  sources.lever = lever.length;
  all.push(...greenhouse, ...ashby, ...smartrecruiters, ...workable, ...lever);

  const freshCutoff = Date.now() - FRESH_CUTOFF_MS;
  const seen = new Set<string>();
  const jobs: Job[] = [];
  for (const job of all) {
    // A plain "Remote" label can still hide a country or timezone limit.
    // Keep only roles that clearly say they can be done from anywhere.
    if (!isWorkFromAnywhere(job)) continue;
    // Max 31 days old; keep the rare job with no parseable date.
    if (job.postedAt !== null && job.postedAt < freshCutoff) continue;
    const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push(finalize(job));
  }
  jobs.sort((a, b) => b.match - a.match);

  return { jobs: ensureUniqueJobIds(jobs).slice(0, MAX_JOBS), sources };
}
