"use client";

import {
  defaultCountries,
  FlagImage,
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

const COUNTRY_OPTIONS: readonly DropdownOption[] = defaultCountries.map(
  (country) => {
    const parsed = parseCountry(country);
    return {
      value: parsed.iso2,
      label: `${parsed.name} (+${parsed.dialCode})`,
      buttonLabel: `+${parsed.dialCode}`,
      searchText: `${parsed.name} ${parsed.iso2} +${parsed.dialCode} ${parsed.dialCode}`,
      prefix: (
        <FlagImage
          iso2={parsed.iso2}
          size={20}
          aria-label={`${parsed.name} flag`}
          className="shrink-0 rounded-[2px]"
        />
      ),
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
    disableDialCodeAndPrefix: true,
    allowMaskOverflow: true,
    onChange: ({ phone, inputValue }) =>
      onChange(/\d/.test(inputValue) ? phone : ""),
  });

  return (
    <div className="mt-1.5 grid grid-cols-[9.25rem_minmax(0,1fr)] gap-2">
      <Dropdown
        ariaLabel="Phone country"
        options={COUNTRY_OPTIONS}
        value={country.iso2}
        searchable
        searchPlaceholder="Country or +code"
        onValueChange={(nextCountry) =>
          setCountry(nextCountry as CountryIso2, { focusOnInput: true })
        }
        buttonClassName="min-h-11 font-normal"
        menuClassName="w-[min(22rem,calc(100vw-2.5rem))]"
      />
      <input
        ref={inputRef}
        type="tel"
        aria-label="Phone number"
        autoComplete="tel"
        required={required}
        value={inputValue}
        onChange={handlePhoneValueChange}
        pattern="[0-9\s().-]{6,}"
        title="Choose a country and enter a complete phone number."
        placeholder="Local number"
        className="min-h-11 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors placeholder:text-espresso/35 focus:border-terracotta"
      />
      <input type="hidden" name="phone" value={value} readOnly />
    </div>
  );
}
