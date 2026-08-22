"use client";

import { useState } from "react";
import { CountryMultiSelect } from "@/components/country-multi-select";
import { Dropdown } from "@/components/dropdown";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import type {
  ApplicationAnswers,
  CandidateProfile,
  YesNoAnswer,
} from "@/lib/candidate-profile";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors placeholder:text-espresso/35 focus:border-terracotta";

const YES_NO_OPTIONS = [
  { value: "", label: "Not answered" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const SPONSORSHIP_OPTIONS = [
  { value: "", label: "Select an answer" },
  { value: "no", label: "No, only in selected countries" },
  { value: "yes", label: "Yes, outside selected countries" },
] as const;

const NOTICE_PERIOD_OPTIONS = [
  { value: "", label: "Select notice period" },
  { value: "Immediately", label: "Immediately" },
  { value: "1 week", label: "1 week" },
  { value: "2 weeks", label: "2 weeks" },
  { value: "1 month", label: "1 month" },
  { value: "2 months", label: "2 months" },
  { value: "3 months", label: "3 months" },
  { value: "More than 3 months", label: "More than 3 months" },
] as const;

const GENDER_OPTIONS = [
  { value: "", label: "Not answered" },
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "self_describe", label: "Self-describe when asked" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const VETERAN_OPTIONS = [
  { value: "", label: "Not answered" },
  { value: "not_veteran", label: "I am not a protected veteran" },
  { value: "protected_veteran", label: "I identify as a protected veteran" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const DISABILITY_OPTIONS = [
  { value: "", label: "Not answered" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const RACE_OPTIONS = [
  { value: "asian", label: "Asian" },
  { value: "black", label: "Black or African descent" },
  { value: "hispanic_latino", label: "Hispanic or Latino/a/x" },
  { value: "indigenous", label: "Indigenous or Native" },
  { value: "middle_eastern_north_african", label: "Middle Eastern or North African" },
  { value: "pacific_islander", label: "Native Hawaiian or Pacific Islander" },
  { value: "white", label: "White" },
  { value: "multiracial", label: "Two or more races" },
  { value: "self_describe", label: "Self-describe when asked" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

function YesNoDropdown({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: YesNoAnswer;
}) {
  return (
    <div className="grid content-start text-sm font-medium text-espresso sm:grid-rows-[2.75rem_auto]">
      <p className="self-end pb-1">
        {label} <span className="font-normal text-espresso/45">(optional)</span>
      </p>
      <Dropdown
        name={name}
        ariaLabel={label}
        defaultValue={value}
        options={YES_NO_OPTIONS}
        className="mt-1.5 sm:mt-0"
      />
    </div>
  );
}

export function ApplicationQuestionFields({
  profile,
  showPermissions = true,
  sections,
  inferredTechnicalAnswers,
}: {
  profile: CandidateProfile;
  showPermissions?: boolean;
  sections?: Array<"preferences" | "experience" | "permissions">;
  inferredTechnicalAnswers?: Pick<
    ApplicationAnswers,
    "typescriptExperience" | "aiFrameworksExperience"
  >;
}) {
  const answers = profile.applicationAnswers;
  const [workCountries, setWorkCountries] = useState(
    answers.workAuthorizationCountries
  );
  const [raceEthnicities, setRaceEthnicities] = useState(
    answers.raceEthnicities
  );
  const visibleSections = new Set(
    sections ?? ["preferences", "experience", "permissions"]
  );
  const knownNoticePeriod = NOTICE_PERIOD_OPTIONS.some(
    (option) => option.value === answers.noticePeriod
  );
  const noticePeriodOptions =
    knownNoticePeriod || !answers.noticePeriod
      ? NOTICE_PERIOD_OPTIONS
      : [
          ...NOTICE_PERIOD_OPTIONS,
          { value: answers.noticePeriod, label: answers.noticePeriod },
        ];
  return (
    <div className="grid gap-7">
      {visibleSections.has("preferences") && <fieldset>
        <legend className="text-lg font-bold text-espresso">
          Work authorization and timing
        </legend>
        <p className="mt-1 text-sm leading-6 text-espresso/60">
          Worldwide remote jobs may still ask where you can legally work. Select
          only countries where you have citizenship, residency, or work permission.
        </p>
        <p className="mt-2 text-xs text-espresso/50">
          <span className="font-bold text-terracotta">*</span> Required to continue.
        </p>
        <div className="mt-4 grid items-start gap-4 sm:grid-cols-2">
          <div className="text-sm font-medium text-espresso sm:col-span-2">
            Countries where you can work without employer sponsorship
            <span className="ml-1 text-terracotta" aria-hidden="true">*</span>
            <CountryMultiSelect
              values={workCountries}
              onChange={setWorkCountries}
            />
          </div>
          <div className="grid content-start text-sm font-medium text-espresso sm:grid-rows-[2.75rem_auto_auto]">
            <p className="self-end pb-1">
              Will you need employer visa sponsorship outside those countries?
              <span className="ml-1 text-terracotta" aria-hidden="true">*</span>
            </p>
            <Dropdown
              name="needsSponsorship"
              ariaLabel="Visa sponsorship outside selected countries"
              defaultValue={answers.needsSponsorship}
              options={SPONSORSHIP_OPTIONS}
              className="mt-1.5 sm:mt-0"
            />
            <p className="mt-1.5 text-xs font-normal leading-5 text-espresso/50">
              Choose Yes if you need sponsorship outside the countries above.
              Apply Ink will not claim that you can work everywhere.
            </p>
          </div>
          <div className="grid content-start text-sm font-medium text-espresso sm:grid-rows-[2.75rem_auto_auto]">
            <p className="self-end pb-1">
              Notice period
              <span className="ml-1 text-terracotta" aria-hidden="true">*</span>
            </p>
            <Dropdown
              name="noticePeriod"
              ariaLabel="Notice period"
              defaultValue={answers.noticePeriod}
              options={noticePeriodOptions}
              className="sm:mt-0"
            />
            <p className="mt-1.5 text-xs font-normal leading-5 text-espresso/50">
              Choose when you could start a new role.
            </p>
          </div>
        </div>
      </fieldset>}

      {visibleSections.has("experience") && <fieldset>
        <legend className="text-lg font-bold text-espresso">
          Questions employers often ask
        </legend>
        <p className="mt-1 text-sm leading-6 text-espresso/60">
          These answers stop Apply Ink from guessing and let more applications
          continue without you.
        </p>
        <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid content-start text-sm font-medium text-espresso sm:grid-rows-[2.75rem_auto]">
            <span className="self-end pb-1">
              Years in product roles <span className="font-normal text-espresso/45">(optional)</span>
            </span>
            <input
              name="yearsProductExperience"
              type="number"
              min={0}
              max={60}
              placeholder="5"
              defaultValue={answers.yearsProductExperience}
              className={`${inputClass} sm:mt-0`}
            />
          </label>
          <label className="grid content-start text-sm font-medium text-espresso sm:grid-rows-[2.75rem_auto]">
            <span className="self-end pb-1">
              Years building AI products <span className="font-normal text-espresso/45">(optional)</span>
            </span>
            <input
              name="yearsAiExperience"
              type="number"
              min={0}
              max={60}
              placeholder="3"
              defaultValue={answers.yearsAiExperience}
              className={`${inputClass} sm:mt-0`}
            />
          </label>
          <YesNoDropdown
            name="medicalExperience"
            label="Medical or healthcare experience?"
            value={answers.medicalExperience}
          />
          <YesNoDropdown
            name="startupExperience"
            label="Startup or high-growth experience?"
            value={answers.startupExperience}
          />
          <YesNoDropdown
            name="aiProductionExperience"
            label="Shipped AI into production?"
            value={answers.aiProductionExperience}
          />
        </div>
        <input
          type="hidden"
          name="typescriptExperience"
          value={inferredTechnicalAnswers?.typescriptExperience ?? answers.typescriptExperience}
          readOnly
        />
        <input
          type="hidden"
          name="aiFrameworksExperience"
          value={inferredTechnicalAnswers?.aiFrameworksExperience ?? answers.aiFrameworksExperience}
          readOnly
        />

        <div className="mt-7 border-t border-sand/70 pt-6">
          <h3 className="text-base font-bold text-espresso">
            Voluntary employer demographics
          </h3>
          <p className="mt-1 text-sm leading-6 text-espresso/60">
            Some employers ask these equal-opportunity questions. They are optional,
            never taken from your resume, and never used to match or rank jobs.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="text-sm font-medium text-espresso">
              <p>Gender <span className="font-normal text-espresso/45">(optional)</span></p>
              <Dropdown
                name="gender"
                ariaLabel="Gender"
                defaultValue={answers.gender}
                options={GENDER_OPTIONS}
                className="mt-1.5"
              />
            </div>
            <div className="text-sm font-medium text-espresso">
              <p>Race or ethnicity <span className="font-normal text-espresso/45">(optional)</span></p>
              <MultiSelectDropdown
                name="raceEthnicities"
                ariaLabel="Race or ethnicity"
                options={RACE_OPTIONS}
                values={raceEthnicities}
                onValuesChange={setRaceEthnicities}
                placeholder="Optional, choose any that apply"
              />
            </div>
            <div className="text-sm font-medium text-espresso">
              <p>Veteran status <span className="font-normal text-espresso/45">(optional)</span></p>
              <Dropdown
                name="veteranStatus"
                ariaLabel="Veteran status"
                defaultValue={answers.veteranStatus}
                options={VETERAN_OPTIONS}
                className="mt-1.5"
              />
            </div>
            <div className="text-sm font-medium text-espresso">
              <p>Disability status <span className="font-normal text-espresso/45">(optional)</span></p>
              <Dropdown
                name="disabilityStatus"
                ariaLabel="Disability status"
                defaultValue={answers.disabilityStatus}
                options={DISABILITY_OPTIONS}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      </fieldset>}

      {showPermissions && visibleSections.has("permissions") && (
        <fieldset>
          <input type="hidden" name="permissionsPresent" value="1" />
          <legend className="text-lg font-bold text-espresso">
            Automatic application rules
          </legend>
          <p className="mt-1 text-sm leading-6 text-espresso/60">
            You stay in control of what Apply Ink may accept or submit for you.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand/80 bg-surface p-4">
              <input
                type="checkbox"
                name="autoSubmitEnabled"
                defaultChecked={profile.autoSubmitEnabled}
                className="mt-0.5 size-4 accent-sienna"
              />
              <span>
                <span className="block text-sm font-semibold text-espresso">
                  Submit complete applications for me <span className="font-normal text-espresso/45">(optional)</span>
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-espresso/55">
                  Only when every required answer comes from your profile or resume.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand/80 bg-surface p-4">
              <input
                type="checkbox"
                name="privacyConsentAllowed"
                defaultChecked={profile.privacyConsentAllowed}
                className="mt-0.5 size-4 accent-sienna"
              />
              <span>
                <span className="block text-sm font-semibold text-espresso">
                  Accept required privacy notices <span className="font-normal text-espresso/45">(optional)</span>
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-espresso/55">
                  Marketing and talent-pool options stay off.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand/80 bg-surface p-4">
              <input
                type="checkbox"
                name="talentPoolOptIn"
                defaultChecked={profile.talentPoolOptIn}
                className="mt-0.5 size-4 accent-sienna"
              />
              <span>
                <span className="block text-sm font-semibold text-espresso">
                  Join employer talent pools <span className="font-normal text-espresso/45">(optional)</span>
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-espresso/55">
                  Off by default because some employers retain and share profiles.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      )}
    </div>
  );
}
