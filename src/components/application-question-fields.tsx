import { Dropdown } from "@/components/dropdown";
import type { CandidateProfile, YesNoAnswer } from "@/lib/candidate-profile";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors placeholder:text-espresso/35 focus:border-terracotta";

const YES_NO_OPTIONS = [
  { value: "", label: "Not answered" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
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
}: {
  profile: CandidateProfile;
  showPermissions?: boolean;
  sections?: Array<"preferences" | "experience" | "permissions">;
}) {
  const answers = profile.applicationAnswers;
  const visibleSections = new Set(
    sections ?? ["preferences", "experience", "permissions"]
  );
  return (
    <div className="grid gap-7">
      {visibleSections.has("preferences") && <fieldset>
        <legend className="text-lg font-bold text-espresso">
          Compensation and availability
        </legend>
        <p className="mt-1 text-sm leading-6 text-espresso/60">
          Used only when an employer requires these answers. Leave anything blank
          that you have not decided yet.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-espresso">
            Expected annual salary
            <input
              name="expectedAnnualSalary"
              inputMode="decimal"
              placeholder="70000"
              defaultValue={answers.expectedAnnualSalary}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-espresso">
            Expected hourly rate
            <input
              name="expectedHourlyRate"
              inputMode="decimal"
              placeholder="45"
              defaultValue={answers.expectedHourlyRate}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-espresso">
            Currency
            <input
              name="salaryCurrency"
              maxLength={3}
              placeholder="EUR"
              defaultValue={answers.salaryCurrency}
              className={`${inputClass} uppercase`}
            />
          </label>
          <label className="text-sm font-medium text-espresso sm:col-span-2">
            Preferred work location
            <input
              name="preferredLocation"
              placeholder="Remote, Tbilisi, or anywhere in Europe"
              defaultValue={answers.preferredLocation}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-espresso">
            Notice period
            <input
              name="noticePeriod"
              placeholder="2 weeks"
              defaultValue={answers.noticePeriod}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-espresso sm:col-span-3">
            Countries or regions where you can legally work
            <input
              name="authorizedWorkRegions"
              placeholder="Georgia; EU with sponsorship"
              defaultValue={answers.authorizedWorkRegions}
              className={inputClass}
            />
          </label>
          <YesNoDropdown
            name="needsSponsorship"
            label="Do you need visa sponsorship?"
            value={answers.needsSponsorship}
          />
          <YesNoDropdown
            name="willingToRelocate"
            label="Are you willing to relocate?"
            value={answers.willingToRelocate}
          />
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
          <YesNoDropdown
            name="typescriptExperience"
            label="Professional TypeScript experience?"
            value={answers.typescriptExperience}
          />
          <YesNoDropdown
            name="aiFrameworksExperience"
            label="Used LangChain or similar frameworks?"
            value={answers.aiFrameworksExperience}
          />
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
