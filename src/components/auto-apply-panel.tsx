import { useState } from "react";
import {
  CalendarIcon,
  FileTextIcon,
  PlaneIcon,
  PlayIcon,
  TargetIcon,
} from "@/assets";
import { Badge } from "@/components/badge";
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
  onOpenSettings: () => void;
  cvUploaded: boolean;
  profileComplete: boolean;
  tailoringConfigured: boolean;
  applicationAnswerCount: number;
  applicationAnswerTotal: number;
  autoSubmitEnabled: boolean;
  startDisabled?: boolean;
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
  onOpenSettings,
  cvUploaded,
  profileComplete,
  tailoringConfigured,
  applicationAnswerCount,
  applicationAnswerTotal,
  autoSubmitEnabled,
  startDisabled = false,
}: AutoApplyPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const running = status === "running";
  const atLimit = usedToday >= dailyLimit;
  const setupBlocked =
    !cvUploaded || !profileComplete || !tailoringConfigured;
  const hasRun = status === "done" || status === "stopped" || status === "limit-reached";

  const pill = running
    ? { label: "Active", variant: "success" as const, dot: "bg-success" }
    : status === "stopped"
      ? { label: "Paused", variant: "sand" as const, dot: "bg-terracotta" }
      : { label: "Idle", variant: "sand" as const, dot: "bg-espresso/40" };

  const lastRunLine = !cvUploaded
    ? "Upload a CV to unlock auto-apply"
    : !profileComplete
      ? "Add your name and email in Settings"
      : !tailoringConfigured
        ? "Add OPENAI_API_KEY to enable CV rewriting"
        : running
          ? `${processedCount} of ${totalCount} checked · ${usedToday}/${dailyLimit} today`
          : hasRun
            ? "Last run: just now"
            : atLimit
              ? `${usedToday}/${dailyLimit} used today — resets tomorrow`
              : "No runs yet";

  return (
    <Container
      variant="card"
      className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center"
    >
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sand/50 text-espresso">
          <FileTextIcon width={24} height={24} />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-espresso">Auto-apply</h2>
          <svg
            viewBox="0 0 180 20"
            aria-hidden="true"
            className="mt-1 h-5 w-45 text-terracotta/70"
          >
            <path
              d="M4 6 C 50 22, 130 -2, 176 12"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="1 7"
            />
          </svg>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sand text-sienna">
          <PlaneIcon width={20} height={20} />
        </span>
      </div>

      <div className="min-w-0 flex-1 lg:border-l lg:border-sand/70 lg:pl-6">
        <p className="max-w-md text-sm leading-6 text-espresso/70">
          Rewrites your uploaded CV for each job, validates a one-page PDF, then
          answers employer forms from your saved profile. The more common questions
          you answer, the more applications can run without interrupting you.
        </p>
        <hr className="my-3 max-w-md border-sand/60" />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-espresso">
          <span className="flex items-center gap-2">
            <TargetIcon width={18} height={18} className="text-sienna" />
            ≥{minMatch}% match
          </span>
          <span className="flex items-center gap-2">
            <CalendarIcon width={18} height={18} className="text-sienna" />
            Max {dailyLimit} per day
          </span>
          <span className="flex items-center gap-2">
            <FileTextIcon width={18} height={18} className="text-sienna" />
            {applicationAnswerCount}/{applicationAnswerTotal} answers
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-2.5 lg:w-64 lg:border-l lg:border-sand/70 lg:pl-6">
        <Badge variant={pill.variant} className="self-center">
          <span
            aria-hidden="true"
            className={`mr-1.5 h-1.5 w-1.5 rounded-full ${pill.dot}`}
          />
          {pill.label}
        </Badge>
        {running ? (
          <Button variant="primary" onClick={onStop} className="rounded-xl py-3">
            Pause auto-apply
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => setConfirming(true)}
            disabled={atLimit || startDisabled || setupBlocked}
            className="rounded-xl py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayIcon width={18} height={18} />
            {!cvUploaded ? "Upload CV first" : "Route matching jobs"}
          </Button>
        )}
        <p aria-live="polite" className="text-center text-xs text-espresso/60">
          {lastRunLine}
          {hasRun && (
            <>
              {" · "}
              <span className="font-medium text-success">
                {appliedCount} applied
              </span>
            </>
          )}
        </p>
        {setupBlocked && !running && (
          <Button
            variant="outline"
            onClick={onOpenSettings}
            className="self-center px-3 py-1.5 text-xs"
          >
            Open Settings
          </Button>
        )}
        {atLimit && !running && (
          <Button
            variant="secondary"
            onClick={onResetUsage}
            className="self-center px-3 py-1.5 text-xs"
          >
            Reset daily limit (testing)
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Start auto-apply?"
        description={`This will rewrite and validate a one-page CV for jobs with a ≥${minMatch}% match, up to ${dailyLimit} per day. ${autoSubmitEnabled ? "Complete connected applications may submit automatically." : "Automatic final submission is currently off in Settings."} CAPTCHA and unknown-answer jobs will be saved in Messages.`}
        confirmLabel="Yes, start routing"
        onConfirm={() => {
          setConfirming(false);
          onStart();
        }}
        onCancel={() => setConfirming(false)}
      />
    </Container>
  );
}
