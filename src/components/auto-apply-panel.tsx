import { useState } from "react";
import {
  CalendarIcon,
  FileTextIcon,
  PlaneIcon,
  PlayIcon,
  TargetIcon,
} from "@/assets";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Container } from "@/components/container";
import type { AutoApplyStatus } from "@/lib/auto-apply";

type AutoApplyPanelProps = {
  status: AutoApplyStatus;
  usedToday: number;
  dailyLimit: number;
  minMatch: number;
  appliedCount: number;
  processedCount: number;
  totalCount: number;
  onStart: () => void;
  onStop: () => void;
  onResetUsage: () => void;
};

export function AutoApplyPanel({
  status,
  usedToday,
  dailyLimit,
  minMatch,
  appliedCount,
  processedCount,
  totalCount,
  onStart,
  onStop,
  onResetUsage,
}: AutoApplyPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const running = status === "running";
  const atLimit = usedToday >= dailyLimit;

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
      className="flex w-full max-w-md flex-col gap-4 self-center p-6"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sand/50 text-espresso">
          <FileTextIcon width={24} height={24} />
        </span>
        <svg
          viewBox="0 0 240 44"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="mt-2 h-11 min-w-0 flex-1 text-terracotta/70"
        >
          <path
            d="M6 34 C 70 -8, 170 46, 234 10"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="1 7"
          />
        </svg>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sand text-sienna">
          <PlaneIcon width={22} height={22} />
        </span>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-espresso">Auto-apply</h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-espresso/70">
          Applies to matching jobs in the background using your saved rules.
        </p>
      </div>

      <hr className="border-sand/70" />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-espresso">
        <span className="flex items-center gap-2">
          <TargetIcon width={18} height={18} className="text-sienna" />
          ≥{minMatch}% match
        </span>
        <span aria-hidden="true" className="h-5 w-px bg-sand" />
        <span className="flex items-center gap-2">
          <CalendarIcon width={18} height={18} className="text-sienna" />
          max {dailyLimit} per day
        </span>
      </div>

      {running ? (
        <Button
          variant="primary"
          onClick={onStop}
          className="w-full rounded-xl py-3.5 text-base"
        >
          Stop auto-apply
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={() => setConfirming(true)}
          disabled={atLimit}
          className="w-full rounded-xl py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlayIcon width={20} height={20} />
          Auto-apply to matching jobs
        </Button>
      )}

      <p
        aria-live="polite"
        className="flex items-center gap-2 text-sm text-espresso/60"
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-terracotta"
        />
        {statusLine}
      </p>

      {atLimit && !running && (
        <Button
          variant="secondary"
          onClick={onResetUsage}
          className="self-start px-3 py-1.5 text-xs"
        >
          Reset daily limit (testing)
        </Button>
      )}

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
