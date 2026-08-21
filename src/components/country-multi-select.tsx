"use client";

import {
  defaultCountries,
  FlagImage,
  parseCountry,
} from "react-international-phone";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import type { DropdownOption } from "@/components/dropdown";

const COUNTRY_OPTIONS: readonly DropdownOption[] = defaultCountries.map(
  (country) => {
    const parsed = parseCountry(country);
    return {
      value: parsed.iso2,
      label: parsed.name,
      searchText: `${parsed.name} ${parsed.iso2} +${parsed.dialCode}`,
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

export function CountryMultiSelect({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <MultiSelectDropdown
      name="workAuthorizationCountries"
      ariaLabel="Countries where you can work without sponsorship"
      options={COUNTRY_OPTIONS}
      values={values}
      onValuesChange={onChange}
      placeholder="Select one or more countries"
      searchPlaceholder="Type a country name"
    />
  );
}
