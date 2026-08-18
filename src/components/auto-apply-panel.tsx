import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Container } from "@/components/container";
import { Spinner } from "@/components/spinner";
import type { AutoApplyStatus } from "@/lib/auto-apply";
import type { Job } from "@/lib/jobs";

const PHASE_INTERVAL_MS = 550;

function jobPhases(company: string): string[] {
  return [
    "Checking match against your rules…",
    "Reading your resume…",
    "Rewriting your resume to match the ATS…",
    `Submitting application to ${company}…`,
  ];
}

type AutoApplyPanelProps = {
  status: AutoApplyStatus;
  usedToday: number;
  dailyLimit: number;
  minMatch: number;
  appliedCount: number;
  processedCount: number;
  totalCount: number;
  currentJob: Job | null;
  onStart: () => void;
  onStop: () => void;
};

export function AutoApplyPanel({
  status,
  usedToday,
  dailyLimit,
  minMatch,
  appliedCount,
  processedCount,
  totalCount,
  currentJob,
  onStart,
  onStop,
}: AutoApplyPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const running = status === "running";
  const atLimit = usedToday >= dailyLimit;

  const phases = jobPhases(currentJob?.company ?? "…");

  useEffect(() => {
    if (!running) return;
    setPhaseIndex(0);
    const timer = setInterval(
      () => setPhaseIndex((i) => Math.min(i + 1, phases.length - 1)),
      PHASE_INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [running, currentJob?.id, phases.length]);

  const statusLine = running
    ? `${processedCount} of ${totalCount} checked · ${appliedCount} sent · ${usedToday}/${dailyLimit} today`
    : status === "limit-reached" || atLimit
      ? `${usedToday}/${dailyLimit} used today — resets tomorrow`
      : status === "done"
        ? `Run finished — ${appliedCount} application${appliedCount === 1 ? "" : "s"} sent`
        : status === "stopped"
          ? "Stopped. Nothing else was sent."
          : `${usedToday}/${dailyLimit} applications used today`;

  return (
    <Container
      variant="card"
      className="flex flex-col items-center gap-3 p-6 text-center"
    >
      <h2 className="text-xl font-semibold text-espresso">Auto-apply</h2>
      <p className="max-w-md text-sm text-espresso/70">
        Applies to matching jobs in the background using your saved rules:
        ≥{minMatch}% match · max {dailyLimit} per day.
      </p>

      {running ? (
        <Button
          variant="primary"
          onClick={onStop}
          className="w-full max-w-xs px-10 py-4 text-lg"
        >
          Stop auto-apply
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={() => setConfirming(true)}
          disabled={atLimit}
          className="w-full max-w-xs px-10 py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          Auto-apply to matching jobs
        </Button>
      )}

      {running && (
        <p
          aria-live="polite"
          className="flex items-center gap-3 text-base font-medium text-espresso"
        >
          <Spinner />
          {phases[phaseIndex]}
        </p>
      )}

      <p
        aria-live="polite"
        className="text-sm text-espresso/60"
      >
        {statusLine}
      </p>

      <ConfirmDialog
        open={confirming}
        title="Start auto-apply?"
        description={`This will apply on your behalf to jobs with a ≥${minMatch}% match, up to ${dailyLimit} per day. Every action shows in the activity log, and you can stop it any time with the Stop button.`}
        confirmLabel="Yes, start applying"
        onConfirm={() => {
          setConfirming(false);
          onStart();
        }}
        onCancel={() => setConfirming(false)}
      />
    </Container>
  );
}
