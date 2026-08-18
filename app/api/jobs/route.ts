import type { Job } from "@/lib/jobs";

const REVALIDATE_SECONDS = 21600; // 6h — Remotive asks for max ~4 calls/day
const MAX_JOBS = 400;

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

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      Accept: "application/json",
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

function rssTag(block: string, name: string): string | undefined {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match?.[1];
}

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
    posted: relativeDate(j.publication_date ? Date.parse(j.publication_date) : null),
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
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
};

async function fetchJobicy(): Promise<Normalized[]> {
  const data = (await getJson("https://jobicy.com/api/v2/remote-jobs?count=50")) as {
    jobs?: JobicyJob[];
  };
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

const GREENHOUSE_BOARDS = [
  "gitlab",
  "cloudflare",
  "duckduckgo",
  "figma",
  "stripe",
  "discord",
  "coinbase",
  "reddit",
  "databricks",
  "anthropic",
  "vercel",
  "robinhood",
];

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
  company_name?: string;
  content?: string;
};

async function fetchGreenhouse(): Promise<Normalized[]> {
  const perBoard = await Promise.all(
    GREENHOUSE_BOARDS.map(async (board) => {
      try {
        const data = (await getJson(
          `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`
        )) as { jobs?: GreenhouseJob[] };
        return (data.jobs ?? [])
          .filter((j) =>
            (j.location?.name ?? "").toLowerCase().includes("remote")
          )
          .slice(0, 15)
          .map((j) => ({
            id: `greenhouse-${board}-${j.id}`,
            title: j.title,
            company:
              j.company_name ||
              board.charAt(0).toUpperCase() + board.slice(1),
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
            description: stripHtml(decodeEntities(j.content ?? "")),
            source: "Greenhouse",
            url: j.absolute_url,
            logoUrl: undefined,
          }));
      } catch {
        return [];
      }
    })
  );
  return perBoard.flat();
}

const LEVER_BOARDS = ["palantir", "kraken", "mistral"];

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  workplaceType?: string;
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
};

async function fetchLever(): Promise<Normalized[]> {
  const perBoard = await Promise.all(
    LEVER_BOARDS.map(async (board) => {
      try {
        const data = (await getJson(
          `https://api.lever.co/v0/postings/${board}?mode=json`
        )) as LeverJob[];
        return data
          .filter(
            (j) =>
              j.workplaceType === "remote" ||
              (j.categories?.location ?? "").toLowerCase().includes("remote")
          )
          .slice(0, 15)
          .map((j) => ({
            id: `lever-${board}-${j.id}`,
            title: j.text,
            company: board.charAt(0).toUpperCase() + board.slice(1),
            location: j.categories?.location || "Remote",
            salary: undefined,
            tags: [j.categories?.team, j.categories?.commitment].filter(
              (t): t is string => Boolean(t)
            ),
            posted: relativeDate(j.createdAt ?? null),
            description: stripHtml(j.descriptionPlain ?? ""),
            source: "Lever",
            url: j.hostedUrl,
            logoUrl: undefined,
          }));
      } catch {
        return [];
      }
    })
  );
  return perBoard.flat();
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
    .filter(
      (h) => String(h.parent_id) === thread.objectID && h.comment_text
    )
    .filter((h) => /remote/i.test(h.comment_text ?? ""))
    .slice(0, 40)
    .map((h) => {
      const firstLine = stripHtml(
        (h.comment_text ?? "").split(/<p>/i)[0],
        200
      );
      const segs = firstLine
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: `hn-${h.objectID}`,
        title:
          segs[1] && segs[1].length <= 80 ? segs[1] : "Multiple roles",
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

export async function GET() {
  const fetchers = {
    remotive: fetchRemotive,
    arbeitnow: fetchArbeitnow,
    jobicy: fetchJobicy,
    remoteok: fetchRemoteOk,
    weworkremotely: fetchWeWorkRemotely,
    greenhouse: fetchGreenhouse,
    lever: fetchLever,
    hackernews: fetchHackerNews,
  };

  const names = Object.keys(fetchers) as (keyof typeof fetchers)[];
  const settled = await Promise.allSettled(names.map((n) => fetchers[n]()));

  const sources: Record<string, number> = {};
  const all: Normalized[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sources[names[i]] = result.value.length;
      all.push(...result.value);
    } else {
      sources[names[i]] = 0;
    }
  });

  const seen = new Set<string>();
  const jobs: Job[] = [];
  for (const job of all) {
    const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push(finalize(job));
  }
  jobs.sort((a, b) => b.match - a.match);

  return Response.json({ jobs: jobs.slice(0, MAX_JOBS), sources });
}
