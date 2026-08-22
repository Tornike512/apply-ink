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
import { Dropdown } from "@/components/dropdown";
import { MINIMUM_MATCH_OPTIONS } from "@/lib/job-filtering";
import type { AutoApplySettings, AutoApplyStatus } from "@/lib/auto-apply";

const RUN_LIMIT_OPTIONS = [1, 3, 5];
const DEFAULT_AUTO_APPLY_MATCH = 80;

type AutoApplyPanelProps = {
  status: AutoApplyStatus;
  usedToday: number;
  dailyLimit: number;
  minMatch: number;
  appliedCount: number;
  processedCount: number;
  totalCount: number;
  onStart: (settings: AutoApplySettings) => void;
  onStop: () => void;
  onResetUsage: () => void;
  onOpenSettings: () => void;
  cvUploaded: boolean;
  profileComplete: boolean;
  tailoringConfigured: boolean;
  applicationAnswerCount: number;
  applicationAnswerTotal: number;
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
  startDisabled = false,
}: AutoApplyPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(minMatch);
  const [selectedRunLimit, setSelectedRunLimit] = useState(dailyLimit);
  const running = status === "running";
  const atLimit = usedToday >= dailyLimit;
  const setupBlocked =
    !cvUploaded || !profileComplete || !tailoringConfigured;
  const hasRun = status === "done" || status === "stopped" || status === "limit-reached";

  function openConfirmation() {
    setSelectedMatch(minMatch || DEFAULT_AUTO_APPLY_MATCH);
    setSelectedRunLimit(dailyLimit);
    setConfirming(true);
  }

  const pill = running
    ? { label: "Active", variant: "success" as const, dot: "bg-success" }
    : status === "stopped"
      ? { label: "Paused", variant: "sand" as const, dot: "bg-terracotta" }
      : { label: "Idle", variant: "sand" as const, dot: "bg-espresso/40" };

  const lastRunLine = !cvUploaded
    ? "Upload a resume to start automatic applications"
    : !profileComplete
      ? "Add your name and email in Settings"
      : !tailoringConfigured
        ? "Job-specific resumes are not available right now"
        : running
          ? `${processedCount} of ${totalCount} checked · ${usedToday}/${dailyLimit} today`
          : hasRun
            ? "Last run: just now"
            : atLimit
              ? `${usedToday}/${dailyLimit} used today. You can start again tomorrow.`
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
          <h2 className="text-2xl font-bold text-espresso">Automatic applications</h2>
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
          For each job, Apply Ink creates a one-page resume from your approved
          facts, checks it, and fills employer forms from your saved answers.
          More saved answers mean fewer pauses.
        </p>
        <hr className="my-3 max-w-md border-sand/60" />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-espresso">
          <span className="flex items-center gap-2">
            <TargetIcon width={18} height={18} className="text-sienna" />
            {minMatch}% match or higher
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
            Pause applications
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={openConfirmation}
            disabled={atLimit || startDisabled || setupBlocked}
            className="rounded-xl py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayIcon width={18} height={18} />
            {!cvUploaded ? "Upload resume first" : "Start applying"}
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
        title="Start applying?"
        description="Choose how selective this run should be. Applications that need your attention will appear in Messages."
        confirmLabel="Start applications"
        onConfirm={() => {
          setConfirming(false);
          onStart({
            minMatch: selectedMatch,
            runLimit: selectedRunLimit,
            autoSubmit: true,
          });
        }}
        onCancel={() => setConfirming(false)}
      >
        <Dropdown
          ariaLabel="Minimum match"
          value={String(selectedMatch)}
          onValueChange={(value) => setSelectedMatch(Number(value))}
          options={MINIMUM_MATCH_OPTIONS.filter((option) => option.value > 0).map(
            (option) => ({ value: String(option.value), label: option.label })
          )}
          prefix={<span className="text-xs text-espresso/55">Match</span>}
          menuClassName="w-full"
        />
        <Dropdown
          ariaLabel="Applications this run"
          value={String(selectedRunLimit)}
          onValueChange={(value) => setSelectedRunLimit(Number(value))}
          options={RUN_LIMIT_OPTIONS.map((value) => ({
            value: String(value),
            label: `Up to ${value} application${value === 1 ? "" : "s"}`,
          }))}
          prefix={<span className="text-xs text-espresso/55">Run limit</span>}
          menuClassName="w-full"
        />
      </ConfirmDialog>
    </Container>
  );
}
