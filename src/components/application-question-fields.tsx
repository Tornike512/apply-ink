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
  { value: "", label: "Not answered" },
  { value: "no", label: "No — selected countries only" },
  { value: "yes", label: "Yes — outside selected countries" },
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
    <div className="text-sm font-medium text-espresso">
      <p>{label}</p>
      <Dropdown
        name={name}
        ariaLabel={label}
        defaultValue={value}
        options={YES_NO_OPTIONS}
        className="mt-1.5"
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
  return (
    <div className="grid gap-7">
      {visibleSections.has("preferences") && <fieldset>
        <legend className="text-lg font-bold text-espresso">
          Work authorization and timing
        </legend>
        <p className="mt-1 text-sm leading-6 text-espresso/60">
          This does not mean you can work in every country. Select only countries
          where you already have citizenship, residency, or valid work permission.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="text-sm font-medium text-espresso sm:col-span-2">
            Countries where you can work without employer sponsorship
            <CountryMultiSelect
              values={workCountries}
              onChange={setWorkCountries}
            />
          </div>
          <div className="text-sm font-medium text-espresso">
            <p>Will you need employer visa sponsorship outside those countries?</p>
            <Dropdown
              name="needsSponsorship"
              ariaLabel="Visa sponsorship outside selected countries"
              defaultValue={answers.needsSponsorship}
              options={SPONSORSHIP_OPTIONS}
              className="mt-1.5"
            />
            <p className="mt-1.5 text-xs font-normal leading-5 text-espresso/50">
              “Yes” means AI will not claim you can work everywhere; it will keep
              applications within your selected countries unless sponsorship is offered.
            </p>
          </div>
          <label className="text-sm font-medium text-espresso">
            Notice period
            <input
              name="noticePeriod"
              placeholder="2 weeks"
              defaultValue={answers.noticePeriod}
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>}

      {visibleSections.has("experience") && <fieldset>
        <legend className="text-lg font-bold text-espresso">
          Questions employers often ask
        </legend>
        <p className="mt-1 text-sm leading-6 text-espresso/60">
          These quick facts stop AI from guessing and unlock more automatic
          submissions.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-espresso">
            Years in product roles
            <input
              name="yearsProductExperience"
              type="number"
              min={0}
              max={60}
              placeholder="5"
              defaultValue={answers.yearsProductExperience}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-espresso">
            Years building AI products
            <input
              name="yearsAiExperience"
              type="number"
              min={0}
              max={60}
              placeholder="3"
              defaultValue={answers.yearsAiExperience}
              className={inputClass}
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
            never inferred from your CV, and never used to match or rank jobs.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="text-sm font-medium text-espresso">
              <p>Gender</p>
              <Dropdown
                name="gender"
                ariaLabel="Gender"
                defaultValue={answers.gender}
                options={GENDER_OPTIONS}
                className="mt-1.5"
              />
            </div>
            <div className="text-sm font-medium text-espresso">
              <p>Race or ethnicity</p>
              <MultiSelectDropdown
                name="raceEthnicities"
                ariaLabel="Race or ethnicity"
                options={RACE_OPTIONS}
                values={raceEthnicities}
                onValuesChange={setRaceEthnicities}
                placeholder="Optional — choose any that apply"
              />
            </div>
            <div className="text-sm font-medium text-espresso">
              <p>Veteran status</p>
              <Dropdown
                name="veteranStatus"
                ariaLabel="Veteran status"
                defaultValue={answers.veteranStatus}
                options={VETERAN_OPTIONS}
                className="mt-1.5"
              />
            </div>
            <div className="text-sm font-medium text-espresso">
              <p>Disability status</p>
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
            Hands-off application rules
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
                  Submit complete applications automatically
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-espresso/55">
                  Only when every required answer comes from this profile or your CV.
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
                  Accept privacy notices required to apply
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-espresso/55">
                  Optional marketing and talent-pool agreements remain off.
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
                  Join optional employer talent pools
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
