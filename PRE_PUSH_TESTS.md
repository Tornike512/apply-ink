# Local pre-push test gate

GitHub Actions is intentionally disabled while the GitHub account cannot start paid workflow minutes. The same checks now run locally before `git push`.

## Enable the hook

`npm install` enables the tracked hook automatically. Enable it manually at any time with:

```powershell
npm run hooks:install
```

Confirm the active Git hook directory:

```powershell
git config --get core.hooksPath
```

The expected output is `.githooks`.

## Run without pushing

```powershell
npm run pre-push:test
```

The command loads local variables from `.env.development.local` and `.env.local`. `DATABASE_URL` is required, PostgreSQL must be running, and Google Chrome must be installed for browser tests.

## Checks run before every push

1. ESLint and TypeScript
2. Resume prefill, job identity, and job filtering tests
3. PostgreSQL schema, integration, authentication, and job-sending tests
4. Next.js production build and temporary server on `127.0.0.1:3100`
5. Authentication API, registration, and browser tests

Every check runs sequentially. A failed command returns a non-zero status, which makes Git stop the push. The temporary Next.js server is stopped whether the tests pass or fail.

## What remains local

Git hooks are local Git configuration. The hook and installer are tracked in the repository, and `npm install` activates them for each clone. A person can still bypass a local hook using Git's `--no-verify` option, so this is not a server-enforced replacement for CI.
