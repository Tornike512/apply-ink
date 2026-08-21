# Job sending manual test guide

These tests use real Apply Ink code, PostgreSQL, auth tokens, CV parsers, and PDF generation. Greenhouse and Workable are mocked, so running the suite cannot send a real application.

## Run the tests

Run every case:

```powershell
npm run job-sending:test
```

List every available case:

```powershell
npm run job-sending:test -- --list
```

Run one case by ID:

```powershell
npm run job-sending:test -- --case cv-readable
```

The command loads local settings from `.env.development.local` and `.env.local` when those files exist. The test creates one temporary user and deletes its profile, applications, usage records, tailored CVs, and user record when it finishes.

## Understand the output

- `PASS` means the current safety rule behaved as expected.
- `KNOWN GAP` means the test confirmed a limitation that is intentionally visible.
- `FAIL` means the behavior changed or broke. The next line explains what that failure means.
- `RESULT` gives the final number of passed, known-gap, and failed cases.

The runner continues after a failure. This makes it possible to see every broken case in one run instead of fixing them one at a time blindly.

## CV upload cases

```powershell
npm run job-sending:test -- --case cv-readable
npm run job-sending:test -- --case cv-too-short
npm run job-sending:test -- --case cv-unsupported-extension
npm run job-sending:test -- --case cv-over-10mb
npm run job-sending:test -- --case cv-image-only-pdf
npm run job-sending:test -- --case cv-mime-mismatch
npm run job-sending:test -- --case profile-bytes-without-text
npm run job-sending:test -- --case profile-ready
```

`cv-image-only-pdf` is a known gap because Apply Ink does not have OCR yet. `cv-mime-mismatch` is a known gap because the current server checks the filename extension but does not verify the real binary file type.

There is no antivirus scanner in the current upload flow. That is documented here rather than simulated as a passing security test.

## Queue and tailored CV cases

```powershell
npm run job-sending:test -- --case queue-low-match
npm run job-sending:test -- --case queue-duplicate
npm run job-sending:test -- --case queue-ready
npm run job-sending:test -- --case tailoring-requires-cv
npm run job-sending:test -- --case tailoring-rejects-employer-invention
npm run job-sending:test -- --case tailoring-rejects-number-invention
npm run job-sending:test -- --case tailored-pdf-readable
```

These prove that the 80% queue rule works, jobs already started in the browser session are skipped, AI cannot start without a readable source CV, unsupported employers and numbers are rejected, and generated PDFs can be read back.

## Application route safety cases

```powershell
npm run job-sending:test -- --case route-rejects-untrusted-request
npm run job-sending:test -- --case route-requires-login
npm run job-sending:test -- --case route-rejects-invalid-job
npm run job-sending:test -- --case route-needs-readable-cv
npm run job-sending:test -- --case route-needs-profile-identity
npm run job-sending:test -- --case route-daily-ai-limit
npm run job-sending:test -- --case route-missing-openai-key
npm run job-sending:test -- --case route-auto-submit-disabled
```

These cases prove that an application needs a trusted signed-in request, valid job data, a readable CV, candidate identity, available AI quota, AI configuration for uncached jobs, and explicit auto-submit permission.

## Greenhouse and Workable cases

```powershell
npm run job-sending:test -- --case route-greenhouse-not-connected
npm run job-sending:test -- --case route-greenhouse-custom-question
npm run job-sending:test -- --case route-greenhouse-success
npm run job-sending:test -- --case route-greenhouse-rejected
npm run job-sending:test -- --case route-greenhouse-network-error
npm run job-sending:test -- --case route-workable-success
npm run job-sending:test -- --case route-workable-rejected
npm run job-sending:test -- --case route-workable-network-error
npm run job-sending:test -- --case route-unsupported-ats
npm run job-sending:test -- --case route-no-duplicate-submission
npm run job-sending:test -- --case route-manual-direct-submit
```

These cases prove that a public ATS link is not treated as permission, unknown required questions stop Greenhouse submission, successful requests contain credentials and candidate data, rejected requests are not marked submitted, connector outages fall back to `Needs you`, unsupported ATS providers do not pretend to submit, and a previously submitted job is not sent twice.

## Optional real employer sandbox check

Do not use a production job or a real candidate for this check.

1. Ask the employer to create a clearly named test job in its Greenhouse or Workable sandbox account.
2. Create a test candidate email and a test CV that contains no real personal data.
3. Add only that sandbox employer's credential to the local environment variable.
4. Submit once and confirm the candidate appears once in the employer's sandbox dashboard.
5. Remove the test candidate, test job, and temporary credential after the check.

The automated suite proves that Apply Ink trusts only a successful HTTP response. Only this sandbox check can prove that the employer dashboard received and displayed the candidate correctly.

## CAPTCHA and assisted-browser check

This remains a human test because the assisted browser deliberately opens a visible Chrome window and never clicks the final submit button.

1. Open a test application form that contains a CAPTCHA or a fake CAPTCHA frame.
2. Click `Open assisted apply`.
3. Confirm ordinary fields and the tailored CV are filled.
4. Confirm the banner tells the user to review, complete CAPTCHA, and submit personally.
5. Confirm Apply Ink does not click the final submit button.
