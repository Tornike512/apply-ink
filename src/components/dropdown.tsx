"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DropdownProps = {
  ariaLabel: string;
  options: readonly DropdownOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  prefix?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
};

const ANIMATION_MS = 160;

export function Dropdown({
  ariaLabel,
  options,
  value,
  defaultValue = "",
  onValueChange,
  name,
  prefix,
  placeholder = "Choose an option",
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
}: DropdownProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = controlled ? value : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const listboxId = `dropdown-${useId().replace(/:/g, "")}`;

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeDropdown = useCallback(
    (returnFocus = false) => {
      clearTimers();
      setOpen(false);
      closeTimerRef.current = window.setTimeout(() => {
        setMounted(false);
        setActiveIndex(-1);
        closeTimerRef.current = null;
        if (returnFocus) buttonRef.current?.focus();
      }, ANIMATION_MS);
    },
    [clearTimers]
  );

  const openDropdown = useCallback(
    (initialIndex?: number) => {
      if (disabled) return;
      clearTimers();
      const selectedIndex = options.findIndex(
        (option) => option.value === selectedValue && !option.disabled
      );
      setActiveIndex(
        initialIndex ?? (selectedIndex >= 0 ? selectedIndex : options.findIndex((option) => !option.disabled))
      );
      setMounted(true);
      setOpen(false);
      openTimerRef.current = window.setTimeout(() => {
        setOpen(true);
        openTimerRef.current = null;
      }, 20);
    },
    [clearTimers, disabled, options, selectedValue]
  );

  useEffect(() => {
    if (!mounted) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeDropdown();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeDropdown(true);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeDropdown, mounted]);

  useEffect(
    () => () => {
      clearTimers();
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current);
      }
    },
    [clearTimers]
  );

  useEffect(() => {
    if (controlled || !inputRef.current) return;
    const input = inputRef.current;
    function syncExternalValue() {
      setInternalValue(input.value);
    }
    input.addEventListener("input", syncExternalValue);
    input.addEventListener("change", syncExternalValue);
    return () => {
      input.removeEventListener("input", syncExternalValue);
      input.removeEventListener("change", syncExternalValue);
    };
  }, [controlled]);

  function choose(nextValue: string) {
    closeDropdown(true);
    if (!controlled) {
      setInternalValue(nextValue);
      if (inputRef.current) inputRef.current.value = nextValue;
    }
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
    }
    commitTimerRef.current = window.setTimeout(() => {
      if (!controlled && inputRef.current) {
        inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
        inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
      onValueChange?.(nextValue);
      commitTimerRef.current = null;
    }, ANIMATION_MS);
  }

  function moveActive(direction: 1 | -1) {
    if (!mounted) {
      openDropdown(direction === 1 ? 0 : options.length - 1);
      return;
    }
    let next = activeIndex;
    for (let count = 0; count < options.length; count++) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) {
        setActiveIndex(next);
        document.getElementById(`${listboxId}-option-${next}`)?.focus();
        break;
      }
    }
  }

  function handleButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && (
        <input
          ref={inputRef}
          type="hidden"
          name={name}
          value={selectedValue}
          readOnly
        />
      )}
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (mounted ? closeDropdown() : openDropdown())}
        onKeyDown={handleButtonKeyDown}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-espresso outline-none transition-colors hover:border-terracotta focus:border-terracotta disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {prefix}
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        </span>
        <svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          className={`shrink-0 text-espresso/50 transition-transform duration-[160ms] motion-reduce:transition-none ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {mounted && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute top-full left-0 z-40 mt-2 max-h-72 min-w-full transform-gpu overflow-y-auto rounded-2xl border border-sand bg-surface p-1.5 shadow-[0_18px_50px_rgba(78,47,36,0.18)] transition-[opacity,transform] duration-[160ms] ease-out will-change-[transform,opacity] [backface-visibility:hidden] motion-reduce:transition-none ${
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0"
          } ${menuClassName}`}
        >
          {options.map((option, index) => {
            const selected = option.value === selectedValue;
            return (
              <button
                key={option.value}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    moveActive(event.key === "ArrowDown" ? 1 : -1);
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    choose(option.value);
                  }
                }}
                onClick={() => choose(option.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                  selected
                    ? "bg-sand/55 font-semibold text-espresso"
                    : "text-espresso/75 hover:bg-sand/30"
                }`}
              >
                <span>{option.label}</span>
                {selected && (
                  <span aria-hidden="true" className="text-sienna">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
