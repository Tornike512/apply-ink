"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/assets";
import styles from "./registration-validation-toast.module.css";

const AUTO_CLOSE_MS = 7_000;
const EXIT_MS = 300;

type RegistrationValidationToastProps = {
  id: number;
  fields: string[];
  onClose: (id: number) => void;
};

export function RegistrationValidationToast({
  id,
  fields,
  onClose,
}: RegistrationValidationToastProps) {
  const [visible, setVisible] = useState(false);
  const autoCloseTimerRef = useRef<number | null>(null);
  const removeTimerRef = useRef<number | null>(null);

  const close = useCallback(() => {
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setVisible(false);
    if (removeTimerRef.current === null) {
      removeTimerRef.current = window.setTimeout(() => onClose(id), EXIT_MS);
    }
  }, [id, onClose]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(true));
    autoCloseTimerRef.current = window.setTimeout(close, AUTO_CLOSE_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      if (autoCloseTimerRef.current !== null) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
      if (removeTimerRef.current !== null) {
        window.clearTimeout(removeTimerRef.current);
      }
    };
  }, [close]);

  return (
    <div className="pointer-events-none fixed inset-x-4 top-20 z-[130] flex justify-end sm:top-24 sm:right-6 sm:left-auto">
      <section
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-terracotta/35 bg-surface shadow-[0_22px_65px_rgba(39,24,18,0.24)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
          visible ? "translate-x-0 opacity-100" : "translate-x-5 opacity-0"
        }`}
      >
        <div className="flex items-start gap-3.5 p-5 pr-12">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-terracotta/40 text-sm font-bold text-sienna">
            !
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-espresso">
              Complete required fields
            </h2>
            <p className="mt-1 text-xs leading-5 text-espresso/60">
              {fields.length === 1
                ? "Check this field to continue:"
                : `Check these ${fields.length} fields to continue:`}
            </p>
            <ul className="mt-2.5 space-y-1.5 text-sm font-semibold text-espresso/85">
              {fields.map((field) => (
                <li key={field} className="flex items-start gap-2">
                  <span className="mt-[0.58rem] size-1 shrink-0 rounded-full bg-terracotta" />
                  <span>{field}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close required fields message"
          onClick={close}
          className="absolute top-3.5 right-3.5 flex size-8 items-center justify-center rounded-full text-espresso/45 transition-colors hover:bg-sand/45 hover:text-espresso focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sienna"
        >
          <CloseIcon width={15} height={15} />
        </button>
        <div className="h-1 bg-sand/45" aria-hidden="true">
          <span className={`${styles.progress} block h-full bg-terracotta`} />
        </div>
      </section>
    </div>
  );
}
