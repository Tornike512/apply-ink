import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTO_APPLY_RULES,
  decideJob,
  type ActivityEntry,
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
    // storage unavailable (private mode) — limit still enforced in memory
  }
}

function timestamp(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useAutoApply(jobs: Job[]) {
  const [status, setStatus] = useState<AutoApplyStatus>("idle");
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [usedToday, setUsedToday] = useState(0);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);

  const queueRef = useRef<Job[]>([]);
  const indexRef = useRef(0);
  const usedRef = useRef(0);
  const appliedIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const count = readUsedToday();
    usedRef.current = count;
    setUsedToday(count);
  }, []);

  const start = useCallback(() => {
    if (usedRef.current >= AUTO_APPLY_RULES.dailyLimit) return;
    queueRef.current = [...jobs];
    indexRef.current = 0;
    setLog([]);
    setCurrentJob(jobs[0] ?? null);
    setStatus("running");
  }, [jobs]);

  const stop = useCallback(() => {
    setCurrentJob(null);
    setStatus("stopped");
  }, []);

  const resetUsage = useCallback(() => {
    usedRef.current = 0;
    setUsedToday(0);
    writeUsedToday(0);
    appliedIdsRef.current.clear();
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const timer = setInterval(() => {
      if (usedRef.current >= AUTO_APPLY_RULES.dailyLimit) {
        setLog((entries) => [
          {
            id: `limit-${indexRef.current}`,
            time: timestamp(),
            title: "Daily limit reached",
            status: "limit",
            note: `${AUTO_APPLY_RULES.dailyLimit} applications sent today — auto-apply resumes tomorrow`,
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
      setCurrentJob(queueRef.current[indexRef.current] ?? null);

      const decision = decideJob(job, appliedIdsRef.current.has(job.id));
      if (decision.status === "applied") {
        appliedIdsRef.current.add(job.id);
        usedRef.current += 1;
        setUsedToday(usedRef.current);
        writeUsedToday(usedRef.current);
      }

      setLog((entries) => [
        {
          id: `${job.id}-${indexRef.current}`,
          time: timestamp(),
          title: job.title,
          company: job.company,
          status: decision.status,
          note: decision.note,
        },
        ...entries,
      ]);
    }, AUTO_APPLY_RULES.delayMs);

    return () => clearInterval(timer);
  }, [status]);

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
