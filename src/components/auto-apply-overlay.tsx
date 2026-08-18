import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import type { Job } from "@/lib/jobs";

const PHASE_INTERVAL_MS = 550;

const PHASE_IMAGES = [
  "/loader/checking.png",
  "/loader/reading.png",
  "/loader/rewriting.png",
  "/loader/submitting.png",
];

function jobPhases(company: string): string[] {
  return [
    "Checking match against your rules…",
    "Reading your resume…",
    "Rewriting your resume to match the ATS…",
    `Submitting application to ${company}…`,
  ];
}

type AutoApplyOverlayProps = {
  open: boolean;
  currentJob: Job | null;
  appliedCount: number;
  processedCount: number;
  totalCount: number;
  usedToday: number;
  dailyLimit: number;
  onStop: () => void;
};

export function AutoApplyOverlay({
  open,
  currentJob,
  appliedCount,
  processedCount,
  totalCount,
  usedToday,
  dailyLimit,
  onStop,
}: AutoApplyOverlayProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phases = jobPhases(currentJob?.company ?? "…");

  useEffect(() => {
    if (!open) return;
    setPhaseIndex(0);
    const timer = setInterval(
      () => setPhaseIndex((i) => Math.min(i + 1, phases.length - 1)),
      PHASE_INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [open, currentJob?.id, phases.length]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Auto-apply in progress"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-cream/95 p-6 backdrop-blur-sm"
    >
      <div className="relative h-44 w-44 overflow-hidden rounded-2xl">
        {PHASE_IMAGES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes="176px"
            className={`object-cover mix-blend-multiply transition-opacity duration-300 ${
              i === phaseIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p
          aria-live="polite"
          className="flex items-center gap-3 text-xl font-semibold text-espresso"
        >
          <Spinner />
          {phases[phaseIndex]}
        </p>
        {currentJob && (
          <p className="text-sm text-espresso/70">
            {currentJob.title} · {currentJob.company}
          </p>
        )}
      </div>
      <p className="text-sm text-espresso/60">
        {processedCount} of {totalCount} checked · {appliedCount} sent ·{" "}
        {usedToday}/{dailyLimit} today
      </p>
      <Button variant="secondary" onClick={onStop}>
        Stop auto-apply
      </Button>
    </div>
  );
}
