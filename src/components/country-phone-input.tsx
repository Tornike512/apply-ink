"use client";

import {
  defaultCountries,
  parseCountry,
  usePhoneInput,
  type CountryIso2,
} from "react-international-phone";
import { Dropdown, type DropdownOption } from "@/components/dropdown";

type CountryPhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function countryFlag(iso2: string): string {
  return iso2
    .toUpperCase()
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

const COUNTRY_OPTIONS: readonly DropdownOption[] = defaultCountries.map(
  (country) => {
    const parsed = parseCountry(country);
    return {
      value: parsed.iso2,
      label: `${countryFlag(parsed.iso2)} ${parsed.name} (+${parsed.dialCode})`,
    };
  }
);

export function CountryPhoneInput({
  value,
  onChange,
  required = false,
}: CountryPhoneInputProps) {
  const {
    inputValue,
    country,
    setCountry,
    handlePhoneValueChange,
    inputRef,
  } = usePhoneInput({
    defaultCountry: "us",
    value,
    disableDialCodePrefill: true,
    allowMaskOverflow: true,
    onChange: ({ phone }) => onChange(phone),
  });

  return (
    <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(12rem,0.85fr)_minmax(0,1.15fr)]">
      <Dropdown
        ariaLabel="Phone country"
        options={COUNTRY_OPTIONS}
        value={country.iso2}
        onValueChange={(nextCountry) =>
          setCountry(nextCountry as CountryIso2, { focusOnInput: true })
        }
        buttonClassName="min-h-11 font-normal"
        menuClassName="w-full sm:min-w-80"
      />
      <input
        ref={inputRef}
        type="tel"
        aria-label="Phone number"
        autoComplete="tel"
        required={required}
        value={inputValue}
        onChange={handlePhoneValueChange}
        pattern="\+[0-9\s().-]{7,}"
        title="Choose a country and enter a complete phone number."
        placeholder="Phone number"
        className="min-h-11 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors placeholder:text-espresso/35 focus:border-terracotta"
      />
      <input type="hidden" name="phone" value={value} readOnly />
    </div>
  );
}
