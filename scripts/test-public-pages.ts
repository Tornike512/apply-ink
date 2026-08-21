import assert from "node:assert/strict";

const origin = process.env.APPLY_INK_TEST_ORIGIN ?? "http://127.0.0.1:3100";

async function page(path: string): Promise<string> {
  const response = await fetch(`${origin}${path}`, { redirect: "manual" });
  assert.equal(response.status, 200, `${path} should be publicly available.`);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html/i,
    `${path} should return HTML.`
  );
  return response.text();
}

async function main() {
  const home = await page("/");
  assert.match(home, /href="\/privacy"/);
  assert.match(home, /href="\/terms"/);

  const privacy = await page("/privacy");
  assert.match(privacy, /Privacy Policy/);
  assert.match(privacy, /How Google user data is handled/);
  assert.match(privacy, /OpenAI/);
  assert.match(privacy, /torniketsagareishvili64@gmail\.com/);

  const terms = await page("/terms");
  assert.match(terms, /Terms of Service/);
  assert.match(terms, /Authorization for application actions/);
  assert.match(terms, /href="\/privacy"/);

  process.stdout.write(
    `${JSON.stringify(
      { publicRoutes: ["/", "/privacy", "/terms"], legalLinks: true },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
