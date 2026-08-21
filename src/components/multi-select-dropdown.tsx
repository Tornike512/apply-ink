"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DropdownOption } from "@/components/dropdown";

type MultiSelectDropdownProps = {
  ariaLabel: string;
  options: readonly DropdownOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  name: string;
  placeholder: string;
  searchPlaceholder?: string;
};

type MenuPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

const ANIMATION_MS = 160;

export function MultiSelectDropdown({
  ariaLabel,
  options,
  values,
  onValuesChange,
  name,
  placeholder,
  searchPlaceholder = "Search options",
}: MultiSelectDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [openAbove, setOpenAbove] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    left: 12,
    width: 288,
    maxHeight: 448,
    top: 12,
  });
  const listboxId = `multi-select-${useId().replace(/:/g, "")}`;
  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      (option.searchText ?? option.label).toLocaleLowerCase().includes(normalized)
    );
  }, [options, query]);
  const selected = options.filter((option) => values.includes(option.value));

  const close = useCallback(() => {
    setOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      setQuery("");
      closeTimerRef.current = null;
    }, ANIMATION_MS);
  }, []);

  function show() {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
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
      const shouldOpenAbove = below < 320 && above > below;
      setOpenAbove(shouldOpenAbove);
      const width = Math.min(400, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(triggerBounds.left, viewportPadding),
        window.innerWidth - width - viewportPadding
      );
      setMenuPosition({
        left,
        width,
        maxHeight: Math.max(144, Math.min(448, shouldOpenAbove ? above : below)),
        ...(shouldOpenAbove
          ? { bottom: window.innerHeight - anchorTop + menuGap }
          : { top: anchorBottom + menuGap }),
      });
    }
    setMounted(true);
    requestAnimationFrame(() => setOpen(true));
  }

  useEffect(() => {
    if (!mounted) return;
    function outside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [close, mounted]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  function toggle(value: string) {
    onValuesChange(
      values.includes(value)
        ? values.filter((current) => current !== value)
        : [...values, value]
    );
  }

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <input type="hidden" name={name} value={JSON.stringify(values)} readOnly />
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => (mounted ? close() : show())}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-left text-sm text-espresso outline-none transition-colors hover:border-terracotta focus:border-terracotta"
      >
        <span className={selected.length ? "font-medium" : "text-espresso/40"}>
          {selected.length === 0
            ? placeholder
            : selected.length <= 2
              ? selected.map((option) => option.label).join(", ")
              : `${selected.length} selected`}
        </span>
        <svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-[160ms] ${open ? "rotate-180" : ""}`}
        >
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {mounted && (
        <div
          data-multi-select-menu
          style={menuPosition}
          className={`fixed z-50 flex transform-gpu flex-col overflow-hidden rounded-2xl border border-sand bg-surface p-1.5 shadow-[0_18px_50px_rgba(78,47,36,0.18)] transition-[opacity,transform] duration-[160ms] ${
            open
              ? "translate-y-0 opacity-100"
              : `pointer-events-none opacity-0 ${openAbove ? "translate-y-1" : "-translate-y-1"}`
          }`}
        >
          <div className="shrink-0 border-b border-sand/60 p-1.5">
            <input
              ref={searchRef}
              type="search"
              aria-label={`${ariaLabel} search`}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-sand bg-cream/45 px-3 py-2 text-sm text-espresso outline-none placeholder:text-espresso/40 focus:border-terracotta"
            />
          </div>
          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            aria-multiselectable="true"
            className="min-h-0 flex-1 overflow-y-auto py-1"
          >
            {visibleOptions.map((option) => {
              const checked = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(option.value)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    checked ? "bg-sand/55 font-semibold" : "hover:bg-sand/30"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      checked
                        ? "border-success bg-success text-white"
                        : "border-sand bg-surface"
                    }`}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  {option.prefix}
                  <span>{option.label}</span>
                </button>
              );
            })}
            {visibleOptions.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-espresso/55">
                No matching options
              </p>
            )}
          </div>
          <div
            data-multi-select-actions
            className="flex shrink-0 items-center justify-between border-t border-sand/60 bg-surface px-2 py-1.5"
          >
            <button
              type="button"
              onClick={() => onValuesChange([])}
              className="px-2 py-1.5 text-xs font-semibold text-sienna"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-sienna px-3 py-1.5 text-xs font-bold text-cream"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
