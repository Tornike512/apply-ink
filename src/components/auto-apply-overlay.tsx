import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { JobCard } from "@/components/job-card";
import { Spinner } from "@/components/spinner";
import type { Job } from "@/lib/jobs";

const PHASE_INTERVAL_MS = 1500;
const PHASE_IMAGES = [
  "/loader/checking.png",
  "/loader/reading.png",
  "/loader/rewriting.png",
  "/loader/submitting.png",
];

function jobPhases(company: string): string[] {
  return [
    "Reading your uploaded CV...",
    `Rewriting the CV for ${company}...`,
    "Validating the one-page PDF...",
    `Routing the ${company} application...`,
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

type ProgressProps = Omit<AutoApplyOverlayProps, "open">;

function AutoApplyProgress({
  currentJob,
  appliedCount,
  processedCount,
  totalCount,
  usedToday,
  dailyLimit,
  onStop,
}: ProgressProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phases = jobPhases(currentJob?.company ?? "this company");

  useEffect(() => {
    const timer = window.setInterval(
      () => setPhaseIndex((index) => Math.min(index + 1, phases.length - 1)),
      PHASE_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [phases.length]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Auto-apply in progress"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-cream/95 p-6 backdrop-blur-sm"
    >
      <div className="relative h-44 w-44 overflow-hidden rounded-2xl">
        {PHASE_IMAGES.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes="176px"
            unoptimized
            className={`object-cover transition-opacity duration-300 ${
              index === phaseIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      {currentJob && (
        <div className="w-full max-w-xl animate-card-in">
          <JobCard job={currentJob} />
        </div>
      )}
      <p
        aria-live="polite"
        className="flex items-center gap-3 text-center text-xl font-semibold text-espresso"
      >
        <Spinner />
        {phases[phaseIndex]}
      </p>
      <p className="text-sm text-espresso/60">
        {processedCount} of {totalCount} checked - {appliedCount} submitted -{" "}
        {usedToday}/{dailyLimit} today
      </p>
      <Button variant="secondary" onClick={onStop}>
        Stop auto-apply
      </Button>
    </div>
  );
}

export function AutoApplyOverlay(props: AutoApplyOverlayProps) {
  if (!props.open) return null;
  return (
    <AutoApplyProgress
      key={props.currentJob?.id ?? "empty"}
      currentJob={props.currentJob}
      appliedCount={props.appliedCount}
      processedCount={props.processedCount}
      totalCount={props.totalCount}
      usedToday={props.usedToday}
      dailyLimit={props.dailyLimit}
      onStop={props.onStop}
    />
  );
}
