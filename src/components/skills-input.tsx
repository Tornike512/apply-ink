"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Spinner } from "@/components/spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { POPULAR_SKILLS } from "@/lib/skill-catalog";

type SkillsInputProps = {
  value: string[];
  onChange: (skills: string[]) => void;
  required?: boolean;
};

type MenuPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

const ANIMATION_MS = 160;
const MAX_SKILLS = 50;

function hasSkill(skills: string[], candidate: string): boolean {
  return skills.some(
    (skill) => skill.toLocaleLowerCase() === candidate.toLocaleLowerCase()
  );
}

function normalizedSkill(skill: string): string {
  return skill.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function deduplicateSkills(skills: readonly string[]): string[] {
  const seen = new Set<string>();
  return skills.reduce<string[]>((result, rawSkill) => {
    const skill = rawSkill.trim().replace(/\s+/g, " ").slice(0, 80);
    const normalized = normalizedSkill(skill);
    if (!skill || seen.has(normalized)) return result;
    seen.add(normalized);
    result.push(skill);
    return result;
  }, []);
}

export function SkillsInput({
  value,
  onChange,
  required = false,
}: SkillsInputProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingSkills, setPendingSkills] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([...POPULAR_SKILLS]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    left: 12,
    width: 288,
    maxHeight: 520,
    top: 12,
  });
  const debouncedQuery = useDebounce(query, 300);
  const listboxId = `skill-picker-${useId().replace(/:/g, "")}`;
  const selectedSkills = useMemo(() => deduplicateSkills(value), [value]);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    openTimerRef.current = null;
    closeTimerRef.current = null;
  }, []);

  const closePicker = useCallback(
    (returnFocus = false, keepPending = false) => {
      clearTimers();
      setOpen(false);
      setQuery("");
      if (!keepPending) setPendingSkills(selectedSkills);
      closeTimerRef.current = window.setTimeout(() => {
        setMounted(false);
        closeTimerRef.current = null;
        if (returnFocus) triggerRef.current?.focus();
      }, ANIMATION_MS);
    },
    [clearTimers, selectedSkills]
  );

  function openPicker() {
    clearTimers();
    const triggerBounds = triggerRef.current?.getBoundingClientRect();
    if (triggerBounds) {
      const viewportPadding = 12;
      const menuGap = 8;
      const anchorTop = Math.min(
        Math.max(triggerBounds.top, viewportPadding),
        window.innerHeight - viewportPadding
      );
      const anchorBottom = Math.min(
        Math.max(triggerBounds.bottom, viewportPadding),
        window.innerHeight - viewportPadding
      );
      const below = window.innerHeight - anchorBottom - menuGap - viewportPadding;
      const above = anchorTop - menuGap - viewportPadding;
      const shouldOpenAbove = below < 360 && above > below;
      setOpenAbove(shouldOpenAbove);
      const width = Math.min(
        triggerBounds.width,
        window.innerWidth - viewportPadding * 2
      );
      const left = Math.min(
        Math.max(triggerBounds.left, viewportPadding),
        window.innerWidth - width - viewportPadding
      );
      setMenuPosition({
        left,
        width,
        maxHeight: Math.max(160, Math.min(520, shouldOpenAbove ? above : below)),
        ...(shouldOpenAbove
          ? { bottom: window.innerHeight - anchorTop + menuGap }
          : { top: anchorBottom + menuGap }),
      });
    }
    setPendingSkills(selectedSkills);
    setSuggestions([...POPULAR_SKILLS]);
    setQuery("");
    setLoadingSuggestions(false);
    setMounted(true);
    setOpen(false);
    openTimerRef.current = window.setTimeout(() => {
      setOpen(true);
      openTimerRef.current = null;
    }, 20);
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    function onOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closePicker();
    }
    function onEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") closePicker(true);
    }
    document.addEventListener("pointerdown", onOutsidePointer);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutsidePointer);
      window.removeEventListener("keydown", onEscape);
    };
  }, [closePicker, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const normalizedQuery = debouncedQuery.trim();
    if (normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    void fetch(`/api/skills?q=${encodeURIComponent(normalizedQuery)}`, {
      headers: { "x-apply-ink": "1" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load skill suggestions.");
        return (await response.json()) as { skills?: unknown };
      })
      .then((data) => {
        if (!Array.isArray(data.skills)) return;
        setSuggestions(
          data.skills.filter(
            (skill): skill is string => typeof skill === "string" && Boolean(skill)
          )
        );
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, mounted]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  function toggleSkill(skill: string) {
    setPendingSkills((current) => {
      if (hasSkill(current, skill)) {
        return current.filter(
          (currentSkill) =>
            currentSkill.toLocaleLowerCase() !== skill.toLocaleLowerCase()
        );
      }
      return current.length >= MAX_SKILLS ? current : [...current, skill];
    });
  }

  function addTypedSkill() {
    const skill = query.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!skill) return;
    if (!hasSkill(pendingSkills, skill)) toggleSkill(skill);
    setQuery("");
    setLoadingSuggestions(false);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const exactSuggestion = displayedSuggestions.find(
        (skill) => skill.toLocaleLowerCase() === query.trim().toLocaleLowerCase()
      );
      if (exactSuggestion) toggleSkill(exactSuggestion);
      else addTypedSkill();
    }
  }

  const displayedSuggestions =
    debouncedQuery.trim().length < 2 ? [...POPULAR_SKILLS] : suggestions;
  const typedSkill = query.trim().replace(/\s+/g, " ").slice(0, 80);
  const canAddTypedSkill =
    typedSkill.length > 1 &&
    !displayedSuggestions.some(
      (skill) => skill.toLocaleLowerCase() === typedSkill.toLocaleLowerCase()
    );

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <input
        type="hidden"
        name="skills"
        value={JSON.stringify(selectedSkills)}
        readOnly
      />
      {selectedSkills.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2" aria-label="Selected skills">
          {selectedSkills.map((skill, index) => (
            <span
              key={`${normalizedSkill(skill)}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-sand/55 px-2.5 py-1 text-xs font-semibold text-espresso"
            >
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                onClick={() =>
                  onChange(
                    selectedSkills.filter(
                      (current) => normalizedSkill(current) !== normalizedSkill(skill)
                    )
                  )
                }
                className="cursor-pointer text-espresso/45 hover:text-sienna"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label="Choose skills"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-required={required}
        onClick={() => (mounted ? closePicker() : openPicker())}
        className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-espresso outline-none transition-colors hover:border-terracotta focus:border-terracotta"
      >
        <span className={selectedSkills.length ? "text-espresso" : "text-espresso/40"}>
          {selectedSkills.length
            ? `Edit skills (${selectedSkills.length} selected)`
            : "Search and choose your skills"}
        </span>
        <svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-[160ms] ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {mounted && (
        <div
          data-skill-menu
          style={menuPosition}
          className={`fixed z-50 flex min-w-[18rem] transform-gpu flex-col overflow-hidden rounded-2xl border border-sand bg-surface shadow-[0_18px_50px_rgba(78,47,36,0.18)] transition-[opacity,transform] duration-[160ms] ease-out will-change-[transform,opacity] motion-reduce:transition-none ${
            open
              ? "translate-y-0 opacity-100"
              : `pointer-events-none opacity-0 ${openAbove ? "translate-y-1" : "-translate-y-1"}`
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-sand/65 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-espresso">Choose skills</p>
              <p className="text-xs font-normal text-espresso/50">
                {pendingSkills.length} of {MAX_SKILLS} selected
              </p>
            </div>
            <button
              type="button"
              aria-label="Close skill picker"
              onClick={() => closePicker(true)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-xl text-espresso/50 hover:bg-sand/40 hover:text-sienna"
            >
              ×
            </button>
          </div>
          <div className="shrink-0 p-3">
            <div className="relative">
              <input
                ref={searchRef}
                type="search"
                role="searchbox"
                aria-label="Search skills"
                value={query}
                onChange={(event) => {
                  const nextQuery = event.currentTarget.value;
                  setQuery(nextQuery);
                  setLoadingSuggestions(nextQuery.trim().length >= 2);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="Search React, Next.js, Figma..."
                className="w-full rounded-xl border border-sand bg-cream/45 py-2.5 pr-10 pl-3.5 text-sm font-normal text-espresso outline-none placeholder:text-espresso/40 focus:border-terracotta"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear skill search"
                  onClick={() => {
                    setQuery("");
                    setLoadingSuggestions(false);
                    searchRef.current?.focus();
                  }}
                  className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-lg text-espresso/45 hover:bg-sand/45 hover:text-sienna"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div
            id={listboxId}
            role="listbox"
            aria-label="Skill suggestions"
            aria-multiselectable="true"
            className="min-h-0 flex-1 overflow-y-auto border-y border-sand/55 p-1.5"
          >
            {loadingSuggestions && (
              <div className="flex items-center justify-center gap-2 px-3 py-3 text-xs font-normal text-espresso/55">
                <Spinner size="sm" /> Searching skills...
              </div>
            )}
            {canAddTypedSkill && !loadingSuggestions && (
              <button
                type="button"
                role="option"
                aria-selected={hasSkill(pendingSkills, typedSkill)}
                onClick={addTypedSkill}
                className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-sienna hover:bg-sand/35"
              >
                Add “{typedSkill}”
              </button>
            )}
            {!loadingSuggestions &&
              deduplicateSkills(displayedSuggestions).map((skill, index) => {
                const selected = hasSkill(pendingSkills, skill);
                return (
                  <button
                    key={`${normalizedSkill(skill)}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggleSkill(skill)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                      selected
                        ? "bg-sand/55 font-semibold text-espresso"
                        : "font-normal text-espresso/75 hover:bg-sand/30"
                    }`}
                  >
                    <span>{skill}</span>
                    <span
                      aria-hidden="true"
                      className={`flex size-5 items-center justify-center rounded border text-xs ${
                        selected
                          ? "border-sienna bg-sienna text-cream"
                          : "border-sand text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            {!loadingSuggestions && displayedSuggestions.length === 0 && !canAddTypedSkill && (
              <p className="px-3 py-5 text-center text-sm font-normal text-espresso/55">
                No matching skills found
              </p>
            )}
          </div>
          <div
            data-skill-actions
            className="flex shrink-0 items-center justify-between gap-3 bg-surface p-3"
          >
            <button
              type="button"
              onClick={() => setPendingSkills([])}
              disabled={pendingSkills.length === 0}
              className="cursor-pointer rounded-lg px-2 py-2 text-xs font-bold text-sienna hover:bg-sienna/8 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear all ({pendingSkills.length})
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(pendingSkills);
                closePicker(true, true);
              }}
              className="min-w-28 cursor-pointer rounded-xl bg-sienna px-4 py-2.5 text-sm font-bold text-cream hover:bg-espresso"
            >
              Select skills
            </button>
          </div>
        </div>
      )}
      <p className="mt-1.5 text-xs font-normal leading-5 text-espresso/50">
        Choose the skills Apply Ink can use to match jobs and prepare job-specific
        resumes. Skills found in your resume are selected automatically, and you
        can remove any.
      </p>
    </div>
  );
}
