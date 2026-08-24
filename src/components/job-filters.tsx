"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/assets";
import { Dropdown } from "@/components/dropdown";
import {
  DEFAULT_JOB_FILTERS,
  MINIMUM_MATCH_OPTIONS,
  POSTED_WITHIN_OPTIONS,
  annualizeSalary,
  salaryFromAnnual,
  type JobFilterState,
  type SalaryPeriod,
} from "@/lib/job-filtering";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-sand bg-surface px-3 py-2.5 text-sm text-espresso outline-none focus:border-terracotta";

type JobFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: JobFilterState;
  onFiltersChange: (filters: JobFilterState) => void;
  showSearch?: boolean;
  onClearAll?: () => void;
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

export function JobFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  showSearch = true,
  onClearAll,
}: JobFiltersProps) {
  const salaryRef = useRef<HTMLDivElement>(null);
  const [salaryDrafts, setSalaryDrafts] = useState<SalaryDrafts>(() =>
    salaryDraftsFromAnnual(filters.minSalary, filters.maxSalary)
  );
  const [salaryError, setSalaryError] = useState<string | null>(null);

  const update = useCallback(
    (patch: Partial<JobFilterState>) => {
      onFiltersChange({ ...filters, ...patch });
    },
    [filters, onFiltersChange]
  );

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

  useEffect(() => {
    const yearlyDrafts = salaryDrafts.yearly;
    const min =
      yearlyDrafts.min === "" ? null : Math.round(Number(yearlyDrafts.min));
    const max =
      yearlyDrafts.max === "" ? null : Math.round(Number(yearlyDrafts.max));

    if (
      (min !== null && (!Number.isFinite(min) || min < 0)) ||
      (max !== null && (!Number.isFinite(max) || max < 0))
    ) {
      return;
    }

    let errorMsg: string | null = null;
    if (min !== null && max !== null && min > max) {
      errorMsg = "Minimum salary must be below maximum salary.";
    }

    const timer = setTimeout(() => {
      if (errorMsg) {
        setSalaryError(errorMsg);
      } else if (min !== filters.minSalary || max !== filters.maxSalary) {
        update({ minSalary: min, maxSalary: max });
        setSalaryError(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [salaryDrafts, filters.minSalary, filters.maxSalary, update]);

  const anyFilterActive =
    filters.minSalary !== null ||
    filters.maxSalary !== null ||
    filters.postedWithinDays > 0 ||
    filters.minMatch > 0;

  return (
    <div className="flex flex-col gap-4">
      {showSearch && (
        <label className="flex min-w-0 items-center gap-2.5 rounded-xl border border-sand bg-surface px-3.5 py-2.5">
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
      )}

      <div ref={salaryRef} className="rounded-2xl border border-sand/70 bg-surface/65 p-4">
        <p className="text-sm font-bold text-espresso">Salary</p>
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
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand/70 bg-surface/65 p-3">
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
        {anyFilterActive && (
          <button
            type="button"
            onClick={() => {
              onFiltersChange(DEFAULT_JOB_FILTERS);
              setSalaryDrafts(salaryDraftsFromAnnual(null, null));
              setSalaryError(null);
              if (onClearAll) onClearAll();
            }}
            className="ml-auto px-1 text-xs font-semibold text-sienna underline underline-offset-2"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
