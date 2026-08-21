import assert from "node:assert/strict";
import { GET } from "../app/api/skills/route";

const originalFetch = globalThis.fetch;

async function readSkills(query = ""): Promise<{
  skills: string[];
  source: string;
  response: Response;
}> {
  const response = await GET(
    new Request(`http://localhost/api/skills?q=${encodeURIComponent(query)}`)
  );
  const body = (await response.json()) as { skills: string[]; source: string };
  return { ...body, response };
}

async function main() {
  let externalCalls = 0;
  globalThis.fetch = (async () => {
    externalCalls += 1;
    throw new Error("The default list must not call ESCO.");
  }) as typeof fetch;
  const defaults = await readSkills();
  assert.equal(defaults.source, "catalog");
  assert.ok(defaults.skills.includes("React"));
  assert.ok(defaults.skills.includes("Next.js"));
  assert.equal(externalCalls, 0);

  globalThis.fetch = (async (input) => {
    externalCalls += 1;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://ec.europa.eu");
    assert.equal(url.searchParams.get("type"), "skill");
    assert.equal(url.searchParams.get("text"), "React");
    return Response.json({
      _embedded: {
        results: [
          { searchHit: "React" },
          { preferredLabel: { en: "Reactive programming" } },
        ],
      },
    });
  }) as typeof fetch;
  const searched = await readSkills("React");
  assert.equal(searched.source, "catalog+esco");
  assert.equal(searched.skills[0], "React");
  assert.equal(
    searched.skills.filter((skill) => skill.toLowerCase() === "react").length,
    1
  );
  assert.ok(searched.skills.includes("Reactive programming"));
  assert.match(searched.response.headers.get("cache-control") ?? "", /s-maxage/);

  globalThis.fetch = (async () => {
    throw new Error("ESCO unavailable");
  }) as typeof fetch;
  const fallback = await readSkills("Next");
  assert.equal(fallback.source, "catalog");
  assert.ok(fallback.skills.includes("Next.js"));

  console.log(
    "PASS skill suggestions - defaults, ESCO enrichment, deduplication, caching, and offline fallback work."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
  });
