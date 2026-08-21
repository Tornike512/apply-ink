import {
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js/max";
import mobileExamples from "libphonenumber-js/mobile/examples";

export const FALLBACK_PHONE_COUNTRY = "us";

export function normalizePhoneCountry(
  value: string | null | undefined,
  fallback = FALLBACK_PHONE_COUNTRY
): string {
  const country = value?.trim().toUpperCase() ?? "";
  return isSupportedCountry(country) ? country.toLocaleLowerCase() : fallback;
}

export function phoneCountryFromHeaders(requestHeaders: Headers): string {
  const platformCountry =
    requestHeaders.get("x-vercel-ip-country") ??
    requestHeaders.get("cf-ipcountry");
  if (platformCountry) return normalizePhoneCountry(platformCountry);

  const locale = requestHeaders
    .get("accept-language")
    ?.split(",", 1)[0]
    ?.split(";", 1)[0]
    ?.trim();
  const localeCountry = locale?.match(/[-_]([a-z]{2})$/i)?.[1];
  return normalizePhoneCountry(localeCountry);
}

function countryCode(iso2: string): CountryCode {
  const normalized = iso2.trim().toUpperCase();
  return isSupportedCountry(normalized) ? normalized : "US";
}

export function phonePlaceholder(iso2: string): string {
  const example = getExampleNumber(countryCode(iso2), mobileExamples);
  if (!example) return "Local number";
  const international = example.formatInternational();
  const withoutDialCode = international.replace(/^\+\d+\s*/, "").trim();
  return withoutDialCode || example.nationalNumber;
}

export function maximumNationalPhoneDigits(iso2: string): number {
  const country = countryCode(iso2);
  for (let length = 20; length >= 4; length -= 1) {
    const result = validatePhoneNumberLength("2".repeat(length), country);
    if (result !== "TOO_LONG") return length;
  }
  return 15;
}

export function limitNationalPhoneDigits(rawValue: string, iso2: string): string {
  return rawValue
    .replace(/\D/g, "")
    .slice(0, maximumNationalPhoneDigits(iso2));
}

export function phoneValidationMessage(
  value: string,
  countryName: string
): string {
  if (!/\d/.test(value)) return "";
  const phoneNumber = parsePhoneNumberFromString(value);
  if (!phoneNumber?.isPossible()) {
    return `Enter a complete phone number for ${countryName}.`;
  }
  if (!phoneNumber.isValid()) {
    return `Enter a valid phone number for ${countryName}.`;
  }
  return "";
}
