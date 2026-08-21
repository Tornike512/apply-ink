import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const TEST_PORT = 3100;
const TEST_ORIGIN = `http://127.0.0.1:${TEST_PORT}`;
const npmCli = process.env.npm_execpath;
const childEnvironment = {
  ...process.env,
  APPLY_INK_TEST_ORIGIN: TEST_ORIGIN,
  APPLY_INK_NEXT_DIST_DIR: ".next-pgtest",
  NEXT_TELEMETRY_DISABLED: "1",
};

let applicationServer = null;
let applicationServerOutput = "";

function elapsed(startedAt) {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: childEnvironment,
      stdio: "inherit",
      windowsHide: true,
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          signal
            ? `${command} stopped with ${signal}.`
            : `${command} exited with code ${code ?? "unknown"}.`
        )
      );
    });
  });
}

function runNpmScript(script) {
  if (!npmCli) {
    throw new Error(
      "Run the test gate with `npm run pre-push:test` so npm can execute its scripts."
    );
  }
  return run(process.execPath, [npmCli, "run", script]);
}

async function runCheck(index, total, name, operation) {
  const startedAt = Date.now();
  process.stdout.write(`\n[pre-push ${index}/${total}] ${name}\n`);
  await operation();
  process.stdout.write(`[pre-push] PASS ${name} (${elapsed(startedAt)})\n`);
}

async function waitForApplication() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (applicationServer?.exitCode !== null) {
      throw new Error("The temporary Next.js server stopped before tests began.");
    }
    try {
      const response = await fetch(`${TEST_ORIGIN}/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(1_500),
      });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The temporary application did not start at ${TEST_ORIGIN}.`);
}

async function startApplication() {
  const nextCli = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  applicationServerOutput = "";
  applicationServer = spawn(
    process.execPath,
    [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(TEST_PORT)],
    {
      cwd: ROOT,
      env: childEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );
  const rememberOutput = (chunk) => {
    applicationServerOutput = `${applicationServerOutput}${chunk.toString()}`.slice(
      -20_000
    );
  };
  applicationServer.stdout.on("data", rememberOutput);
  applicationServer.stderr.on("data", rememberOutput);
  await waitForApplication();
}

async function waitForExit(child, timeoutMs) {
  if (!child || child.exitCode !== null) return true;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
}

async function stopApplication() {
  const child = applicationServer;
  applicationServer = null;
  if (!child || child.exitCode !== null) return;

  child.kill("SIGTERM");
  if (await waitForExit(child, 5_000)) return;

  if (process.platform === "win32" && child.pid) {
    await run("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    }).catch(() => undefined);
  } else {
    child.kill("SIGKILL");
  }
  await waitForExit(child, 2_000);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL is missing. Add it to .env.development.local or .env.local."
    );
  }

  const checks = [
    ["ESLint", () => runNpmScript("lint")],
    [
      "TypeScript",
      () =>
        run(process.execPath, [
          path.join(ROOT, "node_modules", "typescript", "bin", "tsc"),
          "--noEmit",
        ]),
    ],
    ["Resume prefill tests", () => runNpmScript("resume-prefill:test")],
    ["Resume format tests", () => runNpmScript("resume-formats:test")],
    ["Skill suggestion tests", () => runNpmScript("skills:test")],
    ["Job identity tests", () => runNpmScript("job-identity:test")],
    ["Job filtering tests", () => runNpmScript("job-filtering:test")],
    ["PostgreSQL schema check", () => runNpmScript("db:check")],
    ["PostgreSQL integration tests", () => runNpmScript("db:test")],
    ["Authentication tests", () => runNpmScript("auth:test")],
    ["Google authentication tests", () => runNpmScript("google-auth:test")],
    ["Onboarding field tests", () => runNpmScript("onboarding-fields:test")],
    ["Phone country and validation tests", () => runNpmScript("phone-number:test")],
    ["Job sending tests", () => runNpmScript("job-sending:test")],
    ["Production build", () => runNpmScript("build")],
    ["Temporary application server", () => startApplication()],
    ["Public legal page tests", () => runNpmScript("public-pages:test")],
    ["Authentication API tests", () => runNpmScript("auth:api-test")],
    ["Registration and browser tests", () => runNpmScript("auth:registration-test")],
  ];

  const startedAt = Date.now();
  process.stdout.write(
    `[pre-push] Starting ${checks.length} checks. A failure blocks the push.\n`
  );
  try {
    for (let index = 0; index < checks.length; index += 1) {
      const [name, operation] = checks[index];
      await runCheck(index + 1, checks.length, name, operation);
    }
  } catch (error) {
    if (applicationServerOutput) {
      process.stderr.write(
        `\n[pre-push] Temporary server output:\n${applicationServerOutput}\n`
      );
    }
    throw error;
  } finally {
    await stopApplication();
  }

  process.stdout.write(
    `\n[pre-push] ALL CHECKS PASSED (${elapsed(startedAt)}). Push allowed.\n`
  );
}

main().catch(async (error) => {
  await stopApplication();
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\n[pre-push] FAILED: ${message}\n`);
  process.stderr.write("[pre-push] Push blocked. Fix the failure and try again.\n");
  process.exitCode = 1;
});
