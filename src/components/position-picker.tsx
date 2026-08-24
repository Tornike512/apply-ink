"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/assets";

const POSITION_OPTIONS = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full-stack Engineer",
  "Mobile Engineer",
  "DevOps Engineer",
  "Data Engineer",
  "Machine Learning Engineer",
  "QA Engineer",
  "Product Manager",
  "Product Designer",
  "UX Designer",
  "Security Engineer",
  "Cloud Engineer",
  "Solutions Architect",
] as const;

const POSITION_ALIASES: Record<string, readonly string[]> = {
  "Software Engineer": ["Software Engineer", "Software Developer", "SDE", "SWE"],
  "Frontend Engineer": ["Frontend Engineer", "Front-end Engineer", "Frontend Developer", "Front-end Developer"],
  "Backend Engineer": ["Backend Engineer", "Back-end Engineer", "Backend Developer", "Back-end Developer"],
  "Full-stack Engineer": ["Full-stack Engineer", "Full Stack Engineer", "Full-stack Developer", "Full Stack Developer"],
  "Mobile Engineer": ["Mobile Engineer", "Mobile Developer", "iOS Engineer", "Android Engineer"],
  "DevOps Engineer": ["DevOps Engineer", "DevOps Developer", "Site Reliability Engineer", "SRE"],
  "Data Engineer": ["Data Engineer", "Data Developer"],
  "Machine Learning Engineer": ["Machine Learning Engineer", "ML Engineer", "AI Engineer"],
  "QA Engineer": ["QA Engineer", "Quality Assurance Engineer", "Test Engineer", "Automation Engineer"],
  "Product Manager": ["Product Manager", "Product Owner"],
  "Product Designer": ["Product Designer", "UX Designer", "UI Designer"],
  "UX Designer": ["UX Designer", "User Experience Designer", "Product Designer"],
  "Security Engineer": ["Security Engineer", "Cybersecurity Engineer", "Information Security Engineer"],
  "Cloud Engineer": ["Cloud Engineer", "Cloud Developer", "Cloud Architect"],
  "Solutions Architect": ["Solutions Architect", "Solution Architect"],
};

const ANIMATION_MS = 160;

type PositionPickerProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function positionSearchTerms(positions: string[]): string[] {
  return positions.flatMap((position) => POSITION_ALIASES[position] ?? [position]);
}

export function PositionPicker({ value, onChange }: PositionPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const options = POSITION_OPTIONS.filter(
    (position) =>
      !normalizedQuery || position.toLocaleLowerCase().includes(normalizedQuery)
  );

  useEffect(() => {
    if (!mounted) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closePicker();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closePicker(true);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mounted]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  function closePicker(returnFocus = false) {
    setOpen(false);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      setQuery("");
      closeTimerRef.current = null;
      if (returnFocus) rootRef.current?.querySelector("button")?.focus();
    }, ANIMATION_MS);
  }

  function togglePicker() {
    if (mounted) {
      closePicker();
      return;
    }
    setMounted(true);
    setOpen(false);
    window.setTimeout(() => setOpen(true), 20);
  }

  function togglePosition(position: string) {
    onChange(
      value.includes(position)
        ? value.filter((item) => item !== position)
        : [...value, position]
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <p className="mb-1.5 text-sm font-semibold text-espresso">Search jobs by position</p>
      <button
        type="button"
        role="combobox"
        aria-label="Select positions"
        aria-controls="position-options"
        aria-expanded={open}
        onClick={togglePicker}
        className="flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-left text-sm text-espresso outline-none transition-colors hover:border-terracotta focus:border-terracotta"
      >
        <SearchIcon width={18} height={18} className="shrink-0 text-espresso/50" />
        <span className="grid min-w-0 flex-1 grid-cols-2 items-center gap-1.5">
          {value.length === 0 ? (
            <span className="col-span-2 text-espresso/45">Select positions</span>
          ) : (
            value.map((position) => (
              <span
                key={position}
                className="inline-flex w-fit max-w-full min-w-0 justify-self-start items-center gap-1 rounded-full bg-terracotta/20 px-2.5 py-1 text-xs font-semibold text-sienna"
              >
                <span className="min-w-0 whitespace-nowrap">{position}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${position}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePosition(position);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      togglePosition(position);
                    }
                  }}
                  className="cursor-pointer rounded-full p-0.5 transition-colors hover:bg-sienna/20"
                >
                  <CloseIcon width={12} height={12} />
                </span>
              </span>
            ))
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          className={`shrink-0 text-espresso/50 transition-transform duration-[160ms] ${open ? "rotate-180" : "rotate-0"}`}
        >
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {mounted && (
        <div
          className={`absolute top-full left-0 z-40 mt-2 w-full overflow-hidden rounded-2xl border border-sand bg-surface p-1.5 shadow-[0_18px_50px_rgba(78,47,36,0.18)] transition-[opacity,transform] duration-[160ms] ${open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
        >
          <label className="flex items-center gap-2 border-b border-sand/60 p-1.5">
            <SearchIcon width={16} height={16} className="text-espresso/50" />
            <input
              autoFocus
              type="search"
              aria-label="Search positions"
              placeholder="Search positions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-espresso outline-none placeholder:text-espresso/40"
            />
          </label>
          <div id="position-options" role="listbox" aria-label="Positions" className="max-h-32 overflow-y-auto p-1">
            {options.map((position) => {
              const selected = value.includes(position);
              return (
                <button
                  key={position}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => togglePosition(position)}
                  className={`mb-0.5 flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-1 text-left text-sm font-medium transition-colors ${selected ? "bg-sand/70 text-espresso" : "bg-transparent text-espresso/75 hover:bg-sand/30"}`}
                >
                  {position}
                  {selected && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
            {options.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-espresso/55">No matching positions</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
