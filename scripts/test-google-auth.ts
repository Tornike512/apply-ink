import assert from "node:assert/strict";
import type { TokenPayload } from "google-auth-library";
import {
  googleAuthorizationUrl,
  googleCallbackUrl,
  googleIdentityFromPayload,
  safeGoogleNextPath,
  secureValuesMatch,
} from "../src/lib/google-auth";

process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";

const origin = "https://apply-ink.example/register";
const state = "state-value-that-is-long-enough";
const nonce = "nonce-value-that-is-long-enough";
const authorization = new URL(
  googleAuthorizationUrl({ requestUrl: origin, state, nonce })
);

assert.equal(authorization.origin, "https://accounts.google.com");
assert.equal(authorization.searchParams.get("response_type"), "code");
assert.equal(authorization.searchParams.get("state"), state);
assert.equal(authorization.searchParams.get("nonce"), nonce);
assert.match(authorization.searchParams.get("scope") ?? "", /openid/);
assert.equal(
  authorization.searchParams.get("redirect_uri"),
  "https://apply-ink.example/api/auth/google/callback"
);
assert.equal(
  googleCallbackUrl(origin),
  "https://apply-ink.example/api/auth/google/callback"
);

assert.equal(safeGoogleNextPath("/dashboard/messages"), "/dashboard/messages");
assert.equal(safeGoogleNextPath("/register"), "/register");
assert.equal(safeGoogleNextPath("https://attacker.example"), "/dashboard/jobs");
assert.equal(safeGoogleNextPath("//attacker.example"), "/dashboard/jobs");
assert.equal(secureValuesMatch(state, state), true);
assert.equal(secureValuesMatch(state, `${state}x`), false);

const payload = {
  sub: "google-subject-123",
  email: "candidate@example.test",
  email_verified: true,
  nonce,
  given_name: "Jamie",
  family_name: "Candidate",
} as TokenPayload;
assert.deepEqual(googleIdentityFromPayload(payload, nonce), {
  subject: "google-subject-123",
  email: "candidate@example.test",
  firstName: "Jamie",
  lastName: "Candidate",
});
assert.throws(
  () => googleIdentityFromPayload({ ...payload, email_verified: false }, nonce),
  /verified account/
);
assert.throws(
  () => googleIdentityFromPayload(payload, "wrong-nonce"),
  /verified account/
);

console.log(
  JSON.stringify({
    authorizationCodeFlow: true,
    stateAndNonceChecked: true,
    externalRedirectsBlocked: true,
    verifiedGoogleIdentityRequired: true,
  })
);
