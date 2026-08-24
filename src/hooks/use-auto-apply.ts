import { useCallback, useEffect, useRef, useState } from "react";
import type { ApplicationAttempt } from "@/lib/applications";
import {
  AUTO_APPLY_RULES,
  decideJob,
  type ActivityEntry,
  type ActivityStatus,
  type AutoApplySettings,
  type AutoApplyStatus,
} from "@/lib/auto-apply";
import type { Job } from "@/lib/jobs";

const STORAGE_KEY = "apply-ink:auto-apply-usage";

function readUsedToday(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; count: number };
    return parsed.date === new Date().toDateString() ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function writeUsedToday(count: number) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: new Date().toDateString(), count })
    );
  } catch {
    // The in-memory limit still works when browser storage is unavailable.
  }
}

function timestamp(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useAutoApply(
  jobs: Job[],
  onApply?: (job: Job, autoSubmit: boolean) => Promise<ApplicationAttempt>
) {
  const [status, setStatus] = useState<AutoApplyStatus>("idle");
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [usedToday, setUsedToday] = useState(0);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [tick, setTick] = useState(0);
  const onApplyRef = useRef(onApply);

  const queueRef = useRef<Job[]>([]);
  const indexRef = useRef(0);
  const runCountRef = useRef(0);
  const settingsRef = useRef<AutoApplySettings>({
    minMatch: AUTO_APPLY_RULES.minMatch,
    runLimit: AUTO_APPLY_RULES.dailyLimit,
    autoSubmit: false,
  });
  const usedRef = useRef(0);
  const startedIdsRef = useRef(new Set<string>());

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const count = readUsedToday();
      usedRef.current = count;
      setUsedToday(count);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const start = useCallback((settings: AutoApplySettings, jobsToProcess = jobs) => {
    if (jobsToProcess.length === 0) return;
    if (usedRef.current >= AUTO_APPLY_RULES.dailyLimit) return;
    settingsRef.current = settings;
    runCountRef.current = 0;
    queueRef.current = [...jobsToProcess];
    indexRef.current = 0;
    setLog([]);
    setCurrentJob(jobsToProcess[0] ?? null);
    setStatus("running");
    setTick((value) => value + 1);
  }, [jobs]);

  const stop = useCallback(() => {
    setCurrentJob(null);
    setStatus("stopped");
  }, []);

  const resetUsage = useCallback(() => {
    usedRef.current = 0;
    setUsedToday(0);
    writeUsedToday(0);
    startedIdsRef.current.clear();
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      if (
        usedRef.current >= AUTO_APPLY_RULES.dailyLimit ||
        runCountRef.current >= settingsRef.current.runLimit
      ) {
        setLog((entries) => [
          {
            id: `limit-${indexRef.current}`,
            time: timestamp(),
            title: "Daily limit reached",
            status: "limit",
            note: `${AUTO_APPLY_RULES.dailyLimit} applications processed today`,
          },
          ...entries,
        ]);
        setCurrentJob(null);
        setStatus("limit-reached");
        return;
      }

      const job = queueRef.current[indexRef.current];
      if (!job) {
        setCurrentJob(null);
        setStatus("done");
        return;
      }
      indexRef.current += 1;

      const decision = decideJob(
        job,
        startedIdsRef.current.has(job.id),
        settingsRef.current.minMatch
      );
      let activityStatus: ActivityStatus =
        decision.status === "skipped" ? "skipped" : "error";
      let note = decision.note;

      if (decision.status === "ready") {
        runCountRef.current += 1;
        try {
          if (!onApplyRef.current) throw new Error("Could not start this application. Try again.");
          const attempt = await onApplyRef.current(job, settingsRef.current.autoSubmit);
          activityStatus =
            attempt.application.status === "submitted"
              ? "applied"
              : attempt.application.status === "needs_user"
                ? "needs_user"
                : "error";
          note = attempt.note;
          startedIdsRef.current.add(job.id);
          usedRef.current += 1;
          setUsedToday(usedRef.current);
          writeUsedToday(usedRef.current);
        } catch (error) {
          activityStatus = "error";
          note = error instanceof Error ? error.message : "Could not start this application.";
        }
      }

      if (cancelled) return;
      setLog((entries) => [
        {
          id: `${job.id}-${indexRef.current}`,
          time: timestamp(),
          title: job.title,
          company: job.company,
          status: activityStatus,
          note,
        },
        ...entries,
      ]);

      const nextJob = queueRef.current[indexRef.current] ?? null;
      setCurrentJob(nextJob);
      if (nextJob) setTick((value) => value + 1);
      else setStatus("done");
    }, AUTO_APPLY_RULES.delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [status, tick]);

  return {
    status,
    log,
    usedToday,
    currentJob,
    start,
    stop,
    resetUsage,
    minMatch: AUTO_APPLY_RULES.minMatch,
    dailyLimit: AUTO_APPLY_RULES.dailyLimit,
  };
}
