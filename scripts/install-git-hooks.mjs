import { spawnSync } from "node:child_process";

function git(args, stdio = "inherit") {
  return spawnSync("git", args, {
    cwd: process.cwd(),
    stdio,
    windowsHide: true,
  });
}

const repository = git(["rev-parse", "--git-dir"], "ignore");
if (repository.status !== 0) {
  process.stdout.write("[hooks] No Git checkout found; hook installation skipped.\n");
  process.exit(0);
}

const configured = git(["config", "--local", "core.hooksPath", ".githooks"]);
if (configured.error || configured.status !== 0) {
  throw configured.error ?? new Error("Could not configure the Git hooks path.");
}

process.stdout.write("[hooks] Git pre-push tests are enabled from .githooks.\n");
