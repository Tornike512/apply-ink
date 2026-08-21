import assert from "node:assert/strict";
import {
  getCountries,
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js/max";
import mobileExamples from "libphonenumber-js/mobile/examples";
import {
  limitNationalPhoneDigits,
  maximumNationalPhoneDigits,
  phoneCountryFromHeaders,
  phonePlaceholder,
  phoneValidationMessage,
} from "../src/lib/phone-number";

function main() {
  assert.equal(
    phoneCountryFromHeaders(new Headers({ "x-vercel-ip-country": "GE" })),
    "ge"
  );
  assert.equal(
    phoneCountryFromHeaders(new Headers({ "accept-language": "en-GB,en;q=0.9" })),
    "gb"
  );
  assert.equal(phoneCountryFromHeaders(new Headers()), "us");

  assert.equal(maximumNationalPhoneDigits("ge"), 9);
  assert.equal(limitNationalPhoneDigits("599 312203 466", "ge"), "599312203");
  assert.match(phonePlaceholder("ge"), /^555\s/);

  const missingPlaceholders: CountryCode[] = [];
  for (const country of getCountries()) {
    const placeholder = phonePlaceholder(country);
    if (placeholder === "Local number") missingPlaceholders.push(country);
    const maximumDigits = maximumNationalPhoneDigits(country);
    assert.ok(maximumDigits >= 4 && maximumDigits <= 20, `${country} digit limit`);
    assert.equal(
      limitNationalPhoneDigits("1".repeat(30), country).length,
      maximumDigits,
      `${country} blocks overflow`
    );
  }
  assert.deepEqual(missingPlaceholders, []);

  const georgiaExample = getExampleNumber("GE", mobileExamples);
  assert.ok(georgiaExample);
  assert.equal(
    phoneValidationMessage(georgiaExample.number, "Georgia"),
    ""
  );
  assert.match(
    phoneValidationMessage("+995123", "Georgia"),
    /complete phone number/i
  );

  console.log(
    JSON.stringify({
      vercelCountryHeader: true,
      localeFallback: true,
      everyCountryHasPlaceholder: true,
      everyCountryBlocksOverflow: true,
      phoneValidation: true,
    })
  );
}

main();
