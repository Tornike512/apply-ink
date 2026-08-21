This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to a PostgreSQL database.
3. Set a random `AUTH_SECRET` with at least 32 characters for production. In
   development, Apply Ink can create and persist one in PostgreSQL automatically.
4. Create/check the schema, then run the development server:

```bash
npm run db:check
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Assisted applications

Accounts, profiles, applications, usage limits, job caches, uploaded CV bytes, and
generated PDFs are stored in PostgreSQL. Passwords use scrypt hashes. Logged-in
sessions use signed JWTs in HTTP-only, SameSite cookies; production cookies are
also marked Secure.

1. Open [http://localhost:3000/register](http://localhost:3000/register), upload
   your resume, answer the reusable application questions, and create an account.
2. Add a newly-created `OPENAI_API_KEY` to the server environment or `.env.local`,
   then restart the development server. Never use a key pasted into chat or commit it.
3. Upload your master CV and answer as many reusable employer questions as you
   can. PDF, DOC, DOCX, RTF, ODT, and TXT are parsed with document libraries
   before the CV is accepted.
4. Optionally upload a master skills inventory JSON. Entries needing confirmation
   or context are excluded from CV tailoring.
5. Choose **Apply with AI** on a job. Apply Ink rewrites and validates a selectable,
   one-page PDF in the layout of the reference CV before routing the application.
6. Apply Ink opens a separate Chrome profile and fills the fields it recognizes.
7. Review the form, complete CAPTCHA or custom questions, and submit it yourself.
8. Return to **Messages** and choose **I submitted it**.

Registration stores 15 common answers covering compensation, location, work
authorization, availability, and experience. The landing page shows answer
coverage: more verified answers let assisted applications fill more fields without
guessing. Automatic final submission, required privacy notices, and optional
talent-pool consent are separate opt-ins and can be changed later in **Settings**.

Auto-apply stays disabled until a readable CV is uploaded, the session profile is
complete, and CV tailoring is configured. The server repeats these checks, so a
client-side bypass cannot apply with a missing or untailored CV.

Job matching itself does not spend API tokens. Uploading a readable CV immediately
recalculates and sorts worldwide-remote jobs for that browser session using resume
and approved skills evidence. Before a CV is uploaded, match scores remain at zero.

CV text, eligible skills, and the job description are sent through the OpenAI
Responses API with storage disabled. Generated PDFs are cached in PostgreSQL and
use the job's exact title in the heading and filename.

The dashboard and application APIs require an authenticated account. Candidate
data is owned by the user ID from the verified JWT, so accounts cannot read one
another's profiles, applications, or tailored resumes. Password-reset tokens are
hashed, expire after one hour, work once, and invalidate existing JWTs. Development
shows the reset URL directly on the forgot-password page; production must connect
that URL to an email delivery service and never return it to the browser.

## PostgreSQL migration

The migration copies the existing SQLite rows and cached files into PostgreSQL.
It is idempotent and does not modify or delete the old `data/` directory.

```bash
# Set DATABASE_URL first.
npm run db:migrate:sqlite
npm run db:check
npm run db:test
npm run auth:test
npm run auth:api-test
npm run auth:registration-test
```

For production, set `DATABASE_URL` only in the hosting provider's server-side
environment. Managed providers commonly require `sslmode=require` in the URL.

## Local pre-push tests

`npm install` configures the tracked `.githooks/pre-push` hook. Before every push,
it runs the static checks, focused tests, PostgreSQL integration tests, production
build, and browser/API tests that previously ran in GitHub Actions. A failure
blocks the push.

Run the same gate without pushing:

```bash
npm run pre-push:test
```

See [PRE_PUSH_TESTS.md](./PRE_PUSH_TESTS.md) for the individual checks and setup.

## Official ATS connections

Copy `.env.example` values into `.env.local` to configure employer-authorized
Greenhouse or Workable credentials. Each value is a JSON map from the employer's
board slug to the credential that employer provided. Public job-feed access alone
does not grant permission to submit applications through an ATS API.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
