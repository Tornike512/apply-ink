import { useState } from "react";
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
}: AutoApplyPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const running = status === "running";
  const atLimit = usedToday >= dailyLimit;

  const statusLine = running
    ? `Applying… ${processedCount} of ${totalCount} checked · ${appliedCount} sent · ${usedToday}/${dailyLimit} today`
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

      <p
        aria-live="polite"
        className="flex items-center gap-2 text-sm text-espresso/70"
      >
        {running && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-terracotta" />
        )}
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
