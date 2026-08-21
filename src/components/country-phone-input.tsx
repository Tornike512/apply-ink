"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  defaultCountries,
  FlagImage,
  parseCountry,
  usePhoneInput,
  type CountryIso2,
} from "react-international-phone";
import { Dropdown, type DropdownOption } from "@/components/dropdown";
import {
  limitNationalPhoneDigits,
  maximumNationalPhoneDigits,
  normalizePhoneCountry,
  phonePlaceholder,
  phoneValidationMessage,
} from "@/lib/phone-number";

type CountryPhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  defaultCountry?: string;
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
  defaultCountry = "us",
}: CountryPhoneInputProps) {
  const [phoneTouched, setPhoneTouched] = useState(false);
  const {
    inputValue,
    country,
    setCountry,
    handlePhoneValueChange,
    inputRef,
  } = usePhoneInput({
    defaultCountry: normalizePhoneCountry(defaultCountry) as CountryIso2,
    value,
    disableDialCodePrefill: true,
    disableDialCodeAndPrefix: true,
    allowMaskOverflow: true,
    onChange: ({ phone, inputValue }) =>
      onChange(/\d/.test(inputValue) ? phone : ""),
  });
  const validationMessage = phoneValidationMessage(value, country.name);
  const placeholder = phonePlaceholder(country.iso2);
  const maximumDigits = maximumNationalPhoneDigits(country.iso2);

  useEffect(() => {
    inputRef.current?.setCustomValidity(validationMessage);
  }, [inputRef, validationMessage]);

  function handleLimitedPhoneChange(event: ChangeEvent<HTMLInputElement>) {
    const rawDigits = event.currentTarget.value.replace(/\D/g, "");
    const limitedDigits = limitNationalPhoneDigits(
      event.currentTarget.value,
      country.iso2
    );
    if (limitedDigits !== rawDigits) {
      event.currentTarget.value = limitedDigits;
    }
    handlePhoneValueChange(event);
  }

  return (
    <div className="mt-1.5 grid grid-cols-[9.25rem_minmax(0,1fr)] gap-2">
      <Dropdown
        ariaLabel="Phone country"
        options={COUNTRY_OPTIONS}
        value={country.iso2}
        searchable
        searchPlaceholder="Country or +code"
        onValueChange={(nextCountry) => {
          setPhoneTouched(false);
          setCountry(nextCountry as CountryIso2, { focusOnInput: true });
        }}
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
        onChange={handleLimitedPhoneChange}
        onBlur={() => setPhoneTouched(true)}
        aria-invalid={phoneTouched && Boolean(validationMessage)}
        maxLength={maximumDigits + 8}
        title={validationMessage || `Enter a phone number for ${country.name}.`}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors placeholder:text-espresso/35 focus:border-terracotta"
      />
      <input type="hidden" name="phone" value={value} readOnly />
      {phoneTouched && validationMessage && (
        <p role="alert" className="col-start-2 text-xs font-normal text-sienna">
          {validationMessage}
        </p>
      )}
    </div>
  );
}
