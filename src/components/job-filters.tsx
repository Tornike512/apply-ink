"use client";

import { useEffect, useRef, useState } from "react";
import { DollarSignIcon, FunnelIcon, MapPinIcon, SearchIcon } from "@/assets";
import { Button } from "@/components/button";
import { Dropdown } from "@/components/dropdown";
import {
  DEFAULT_JOB_FILTERS,
  JOB_LOCATION_OPTIONS,
  JOB_ROLE_OPTIONS,
  MINIMUM_MATCH_OPTIONS,
  POSTED_WITHIN_OPTIONS,
  annualizeSalary,
  salaryFromAnnual,
  type JobFilterState,
  type JobLocation,
  type JobRole,
  type SalaryPeriod,
} from "@/lib/job-filtering";

const controlClass =
  "flex cursor-pointer items-center gap-2 rounded-xl border border-sand bg-surface px-3.5 py-2.5";
const inputClass =
  "mt-1.5 w-full rounded-xl border border-sand bg-surface px-3 py-2.5 text-sm text-espresso outline-none focus:border-terracotta";

type JobFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: JobFilterState;
  onFiltersChange: (filters: JobFilterState) => void;
};

type SalaryBoundary = "min" | "max";
type SalaryDrafts = Record<SalaryPeriod, Record<SalaryBoundary, string>>;

const SALARY_PERIODS: readonly {
  value: SalaryPeriod;
  label: string;
  step: number;
  minPlaceholder: string;
  maxPlaceholder: string;
}[] = [
  {
    value: "hourly",
    label: "Hourly",
    step: 1,
    minPlaceholder: "40",
    maxPlaceholder: "85",
  },
  {
    value: "monthly",
    label: "Monthly",
    step: 100,
    minPlaceholder: "7000",
    maxPlaceholder: "15000",
  },
  {
    value: "yearly",
    label: "Yearly",
    step: 1_000,
    minPlaceholder: "80000",
    maxPlaceholder: "180000",
  },
];

function displaySalaryValue(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function salaryDraftsFromAnnual(
  minSalary: number | null,
  maxSalary: number | null
): SalaryDrafts {
  return Object.fromEntries(
    SALARY_PERIODS.map(({ value: period }) => [
      period,
      {
        min:
          minSalary === null
            ? ""
            : displaySalaryValue(salaryFromAnnual(minSalary, period)),
        max:
          maxSalary === null
            ? ""
            : displaySalaryValue(salaryFromAnnual(maxSalary, period)),
      },
    ])
  ) as SalaryDrafts;
}

function salaryLabel(filters: JobFilterState): string {
  const amount = (value: number) =>
    value >= 1_000 && value % 1_000 === 0
      ? `$${value / 1_000}k`
      : `$${value.toLocaleString()}`;
  if (filters.minSalary !== null && filters.maxSalary !== null) {
    return `${amount(filters.minSalary)} - ${amount(filters.maxSalary)}`;
  }
  if (filters.minSalary !== null) return `${amount(filters.minSalary)}+`;
  if (filters.maxSalary !== null) return `Up to ${amount(filters.maxSalary)}`;
  return "Any salary";
}

export function JobFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
}: JobFiltersProps) {
  const salaryRef = useRef<HTMLDivElement>(null);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryDrafts, setSalaryDrafts] = useState<SalaryDrafts>(() =>
    salaryDraftsFromAnnual(filters.minSalary, filters.maxSalary)
  );
  const [salaryError, setSalaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!salaryOpen) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!salaryRef.current?.contains(event.target as Node)) {
        setSalaryOpen(false);
        setSalaryError(null);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSalaryOpen(false);
        setSalaryError(null);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [salaryOpen]);

  function update(patch: Partial<JobFilterState>) {
    onFiltersChange({ ...filters, ...patch });
  }

  function openSalary() {
    setSalaryDrafts(
      salaryDraftsFromAnnual(filters.minSalary, filters.maxSalary)
    );
    setSalaryError(null);
    setSalaryOpen((current) => !current);
  }

  function cancelSalary() {
    setSalaryDrafts(
      salaryDraftsFromAnnual(filters.minSalary, filters.maxSalary)
    );
    setSalaryError(null);
    setSalaryOpen(false);
  }

  function updateSalaryDraft(
    period: SalaryPeriod,
    boundary: SalaryBoundary,
    value: string
  ) {
    if (value === "") {
      setSalaryDrafts((current) =>
        Object.fromEntries(
          SALARY_PERIODS.map(({ value: currentPeriod }) => [
            currentPeriod,
            { ...current[currentPeriod], [boundary]: "" },
          ])
        ) as SalaryDrafts
      );
      setSalaryError(null);
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setSalaryDrafts((current) => ({
        ...current,
        [period]: { ...current[period], [boundary]: value },
      }));
      return;
    }

    const annualValue = annualizeSalary(numericValue, period);
    setSalaryDrafts((current) =>
      Object.fromEntries(
        SALARY_PERIODS.map(({ value: currentPeriod }) => [
          currentPeriod,
          {
            ...current[currentPeriod],
            [boundary]:
              currentPeriod === period
                ? value
                : displaySalaryValue(
                    salaryFromAnnual(annualValue, currentPeriod)
                  ),
          },
        ])
      ) as SalaryDrafts
    );
    setSalaryError(null);
  }

  function selectSalary() {
    const yearlyDrafts = salaryDrafts.yearly;
    const min =
      yearlyDrafts.min === "" ? null : Math.round(Number(yearlyDrafts.min));
    const max =
      yearlyDrafts.max === "" ? null : Math.round(Number(yearlyDrafts.max));
    if (
      (min !== null && (!Number.isFinite(min) || min < 0)) ||
      (max !== null && (!Number.isFinite(max) || max < 0))
    ) {
      setSalaryError("Enter valid salary amounts.");
      return;
    }
    if (min !== null && max !== null && min > max) {
      setSalaryError("Minimum salary must be below maximum salary.");
      return;
    }
    update({ minSalary: min, maxSalary: max });
    setSalaryError(null);
    setSalaryOpen(false);
  }

  const moreFilterCount =
    Number(filters.postedWithinDays > 0) + Number(filters.minMatch > 0);
  const anyFilterActive =
    filters.role !== DEFAULT_JOB_FILTERS.role ||
    filters.location !== DEFAULT_JOB_FILTERS.location ||
    filters.minSalary !== null ||
    filters.maxSalary !== null ||
    moreFilterCount > 0;

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <label className="flex min-w-0 flex-1 basis-64 items-center gap-2.5 rounded-xl border border-sand bg-surface px-3.5 py-2.5">
        <SearchIcon width={18} height={18} className="shrink-0 text-espresso/50" />
        <input
          type="search"
          aria-label="Search jobs"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by title, company, or skill"
          className="min-w-0 flex-1 bg-transparent text-sm text-espresso outline-none placeholder:text-espresso/45"
        />
      </label>

      <Dropdown
        ariaLabel="Role"
        value={filters.role}
        onValueChange={(value) => update({ role: value as JobRole })}
        options={JOB_ROLE_OPTIONS}
        menuClassName="w-64"
      />

      <Dropdown
        ariaLabel="Location"
        value={filters.location}
        onValueChange={(value) => update({ location: value as JobLocation })}
        options={JOB_LOCATION_OPTIONS}
        prefix={
          <MapPinIcon
            width={16}
            height={16}
            className="shrink-0 text-espresso/60"
          />
        }
        menuClassName="w-64"
      />

      <div ref={salaryRef} className="relative">
        <button
          type="button"
          aria-label="Salary"
          aria-haspopup="dialog"
          aria-expanded={salaryOpen}
          onClick={openSalary}
          className={`${controlClass} h-full text-sm font-medium text-espresso`}
        >
          <DollarSignIcon width={16} height={16} className="text-espresso/60" />
          {salaryLabel(filters)}
        </button>
        {salaryOpen && (
          <div
            role="dialog"
            aria-label="Salary range"
            className="absolute top-full right-0 z-30 mt-2 w-[min(42rem,calc(100vw-2rem))] rounded-2xl border border-sand bg-surface p-4 shadow-[0_18px_50px_rgba(78,47,36,0.18)]"
          >
            <p className="text-sm font-bold text-espresso">Salary range</p>
            <p className="mt-1 text-xs leading-5 text-espresso/55">
              Enter an amount in USD. Hourly, monthly, and yearly values update together.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {SALARY_PERIODS.map((period) => (
                <fieldset
                  key={period.value}
                  className="rounded-xl border border-sand/80 p-3"
                >
                  <legend className="px-1 text-xs font-bold text-espresso">
                    {period.label}
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["min", "max"] as const).map((boundary) => (
                      <label
                        key={boundary}
                        className="text-[11px] font-semibold text-espresso/70"
                      >
                        {boundary === "min" ? "Minimum" : "Maximum"}
                        <input
                          type="number"
                          min={0}
                          step={period.step}
                          inputMode="decimal"
                          aria-label={`${
                            boundary === "min" ? "Minimum" : "Maximum"
                          } ${period.value} salary`}
                          placeholder={
                            boundary === "min"
                              ? period.minPlaceholder
                              : period.maxPlaceholder
                          }
                          value={salaryDrafts[period.value][boundary]}
                          onChange={(event) =>
                            updateSalaryDraft(
                              period.value,
                              boundary,
                              event.target.value
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            {salaryError && (
              <p role="alert" className="mt-2 text-xs text-sienna">
                {salaryError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelSalary}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={selectSalary}>
                Use salary range
              </Button>
            </div>
          </div>
        )}
      </div>

      {anyFilterActive && (
        <button
          type="button"
          onClick={() => onFiltersChange(DEFAULT_JOB_FILTERS)}
          className="px-1 text-xs font-semibold text-sienna underline underline-offset-2"
        >
          Clear filters
        </button>
      )}

      <div className="flex basis-full flex-wrap items-center gap-3 rounded-2xl border border-sand/70 bg-surface/65 p-3">
          <span className="flex items-center gap-2 text-xs font-bold text-espresso/65">
            <FunnelIcon width={16} height={16} />
            More filters
            {moreFilterCount > 0 && (
              <span className="rounded-full bg-sienna px-1.5 py-0.5 text-[10px] text-cream">
                {moreFilterCount}
              </span>
            )}
          </span>
          <Dropdown
            ariaLabel="Posted within"
            value={String(filters.postedWithinDays)}
            onValueChange={(value) => update({ postedWithinDays: Number(value) })}
            options={POSTED_WITHIN_OPTIONS.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
            prefix={<span className="text-xs text-espresso/55">Posted</span>}
            menuClassName="w-48"
          />
          <Dropdown
            ariaLabel="Minimum match"
            value={String(filters.minMatch)}
            onValueChange={(value) => update({ minMatch: Number(value) })}
            options={MINIMUM_MATCH_OPTIONS.map((option) => ({
              value: String(option.value),
              label: option.label,
            }))}
            prefix={<span className="text-xs text-espresso/55">Match</span>}
            menuClassName="w-48"
          />
      </div>
    </div>
  );
}
