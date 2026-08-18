// Probes candidate ATS board slugs and writes the live ones (with >=1 remote job)
// to src/lib/ats-boards.json. Run: node scripts/discover-boards.mjs
import { writeFileSync } from "node:fs";

const GREENHOUSE = [
  "gitlab", "cloudflare", "duckduckgo", "figma", "stripe", "discord", "coinbase",
  "reddit", "databricks", "anthropic", "vercel", "robinhood", "airbnb", "pinterest",
  "dropbox", "asana", "flexport", "gusto", "checkr", "benchling", "samsara",
  "sourcegraph", "webflow", "calendly", "loom", "airtable", "amplitude", "intercom",
  "elastic", "mongodb", "hashicorp", "digitalocean", "twilio", "okta", "pagerduty",
  "sentry", "grammarly", "duolingo", "instacart", "doordash", "lyft", "affirm",
  "brex", "chime", "marqeta", "carta", "navan", "remotecom", "andela", "canonical",
  "wikimedia", "mozilla", "khanacademy", "coursera", "udemy", "skillshare",
  "roblox", "unity3d", "epicgames", "twitch", "soundcloud", "vimeo", "patreon",
  "medium", "nytimes", "monzo", "n26", "adyen", "gocardless", "octopusenergy",
  "zapier", "toggl", "hotjar", "typeform", "contentful", "algolia", "fastly",
  "netlify", "cockroachlabs", "timescale", "influxdata", "confluent", "redis",
  "clickhouse", "dbtlabsinc", "fivetran", "airbyte", "prefect",
  "temporaltechnologies", "grafanalabs", "chronosphere", "honeycombio", "honeycomb",
  "launchdarkly", "harness", "circleci", "scaleai", "huggingface", "weaviate",
  "togetherai", "perplexityai", "openai", "retool", "nuro", "waymo", "gleanwork",
  "newrelic", "snapchat", "nerdwallet", "redfin", "opendoor", "compass",
  "betterment", "wealthfront", "sofi", "thoughtworks", "buzzfeed", "voxmedia",
  "condenast", "squarespace", "wise", "transferwise", "klarna", "checkout",
  "starlingbank", "gitpod", "planetscale", "snowflake", "datadog", "atlassian",
  "shopify", "spotify", "block", "squareup", "cashapp", "tidal", "afterpay",
  "etsy", "ebay", "wayfair", "chewy", "peloton", "warbymarker", "warbyparker",
  "glossier", "allbirds", "away", "casper", "hims", "ro", "cityblock",
  "oscarhealth", "clover", "devotedhealth", "headway", "lyrahealth", "talkiatry",
  "alma", "growtherapy", "zocdoc", "onemedical", "carbonhealth", "forwardhealth",
  "tempus", "flatiron", "guardanthealth", "23andme", "color", "invitae",
  "ginkgobioworks", "zymergen", "modernatx", "10xgenomics", "illumina",
  "recursionpharma", "insitro", "verily", "calicolabs", "altoslabs",
  "arcadia", "aurorasolar", "palmetto", "sunrun", "tesla", "rivian", "lucidmotors",
  "chargepoint", "evgo", "spanio", "runwayml", "jasper", "writer", "copyai",
  "synthesia", "descript", "captions", "veedio", "invideo", "kapwing",
  "photoroom", "canva", "figstack", "framer", "spline", "rive", "lottiefiles",
  "abstract", "zeplin", "sketch", "invision", "marvelapp", "principle",
  "protopie", "uxpin", "balsamiq", "axure", "mockflow", "wireframecc",
];

const LEVER = [
  "palantir", "kraken", "mistral", "voleon", "zoox", "attentivemobile", "outreach",
  "highspot", "lucid", "upgrade", "aurora-innovation", "veeva", "matchgroup",
  "tinder", "hinge", "grindr", "bumble", "spothero", "getaround", "turo",
  "clearcover", "root", "hippo", "lemonade", "nextinsurance", "pieinsurance",
  "coalition", "corvus", "cowbell", "atbay", "eqtpartners", "goodwater",
  "dragoneer", "iconiq", "generalcatalyst", "foundersfund", "khoslaventures",
  "lightspeed", "greylock", "benchmark", "sequoia", "accel", "indexventures",
  "bessemer", "battery", "insightpartners", "tigerglobal", "coatue", "d1capital",
  "durable", "whoop", "oura", "eightsleep", "levels", "noom", "calm",
  "headspace", "betterhelp", "cerebral", "spring", "modernhealth", "gympass",
];

const ASHBY = [
  "linear", "posthog", "notion", "ramp", "deel", "mercury", "supabase", "replit",
  "cohere", "elevenlabs", "modal-labs", "langchain", "dagster", "render",
  "zed-industries", "warp", "railway", "clerk", "resend", "neon-tech",
  "neondatabase", "prisma", "browserbase", "e2b", "lovable", "sierra", "decagon",
  "harvey", "cognition", "anysphere", "cursor", "perplexity-ai", "pinecone",
  "vanta", "drata", "secureframe", "wander", "openai", "anduril", "shield-ai",
  "saronic", "castelion", "mach-industries", "hadrian", "varda", "stoke-space",
  "astranis", "kbr", "vast", "impulse-space", "relativityspace", "abl-space",
  "firefly", "rocketlab", "planet", "spire", "iceye", "capella-space",
  "umbra", "albedo", "muon-space", "k2-space", "true-anomaly", "turion-space",
  "orbit-fab", "starfish-space", "benchling", "watershed", "patch", "pachama",
  "sylvera", "isometric", "charm-industrial", "heirloom", "living-carbon",
  "twelve", "prometheus-fuels", "terraform-industries", "casium", "jump",
  "gamma", "tome", "beautiful-ai", "pitch", "mmhmm", "luma", "runway",
  "ideogram", "playground", "leonardo-ai", "civitai", "fal", "replicate",
  "baseten", "octoai", "anyscale", "predibase", "lamini", "contextual-ai",
  "adept", "imbue", "magic", "poolside", "augment", "codeium", "sourcegraph",
  "continue", "sweep", "factory", "cognition-labs", "devin",
];

const SMARTRECRUITERS = [
  "visa", "bosch", "boschgroup", "ikea", "deloitte", "servicenow", "ubisoft",
  "skechers", "gap", "abercrombie", "underarmour", "adidas", "puma", "newbalance",
  "linkedin", "microsoft", "salesforce", "oracle", "sap", "siemens", "philips",
  "nielsen", "equinox", "wework", "sonos", "logitech", "garmin", "gopro",
];

const results = { greenhouse: [], lever: [], ashby: [], smartrecruiters: [] };

async function probe(url, extract) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return 0;
    return extract(await res.json());
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

const TASKS = [
  ...GREENHOUSE.map((slug) => ({
    kind: "greenhouse",
    slug,
    run: () =>
      probe(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, (d) =>
        (d.jobs ?? []).filter((j) =>
          (j.location?.name ?? "").toLowerCase().includes("remote")
        ).length
      ),
  })),
  ...LEVER.map((slug) => ({
    kind: "lever",
    slug,
    run: () =>
      probe(`https://api.lever.co/v0/postings/${slug}?mode=json`, (d) =>
        Array.isArray(d)
          ? d.filter(
              (j) =>
                j.workplaceType === "remote" ||
                (j.categories?.location ?? "").toLowerCase().includes("remote")
            ).length
          : 0
      ),
  })),
  ...ASHBY.map((slug) => ({
    kind: "ashby",
    slug,
    run: () =>
      probe(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, (d) =>
        (d.jobs ?? []).filter((j) => j.isRemote && j.isListed !== false).length
      ),
  })),
  ...SMARTRECRUITERS.map((slug) => ({
    kind: "smartrecruiters",
    slug,
    run: () =>
      probe(
        `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`,
        (d) => (d.content ?? []).filter((j) => j.location?.remote === true).length
      ),
  })),
];

let done = 0;
const CONCURRENCY = 10;
const queue = [...TASKS];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const task = queue.shift();
      const count = await task.run();
      done++;
      if (count > 0) {
        results[task.kind].push({ slug: task.slug, remoteJobs: count });
        console.log(`live  ${task.kind}/${task.slug}: ${count} remote`);
      }
      if (done % 50 === 0) console.log(`...probed ${done}/${TASKS.length}`);
    }
  })
);

for (const kind of Object.keys(results)) {
  results[kind].sort((a, b) => b.remoteJobs - a.remoteJobs);
}
const totals = Object.fromEntries(
  Object.entries(results).map(([k, v]) => [
    k,
    { boards: v.length, remoteJobs: v.reduce((s, b) => s + b.remoteJobs, 0) },
  ])
);
writeFileSync(
  new URL("../src/lib/ats-boards.json", import.meta.url),
  JSON.stringify(results, null, 2)
);
console.log("\nTotals:", JSON.stringify(totals, null, 2));
