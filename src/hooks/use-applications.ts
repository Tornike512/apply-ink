import { useCallback, useEffect, useState } from "react";
import {
  readApplications,
  saveApplications,
  type Application,
} from "@/lib/applications";
import type { Job } from "@/lib/jobs";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    setApplications(readApplications());
  }, []);

  const add = useCallback((job: Job, via: Application["via"]) => {
    setApplications((prev) => {
      if (prev.some((a) => a.job.id === job.id)) return prev;
      const next = [{ job, appliedAt: Date.now(), via }, ...prev];
      saveApplications(next);
      return next;
    });
  }, []);

  const remove = useCallback((jobId: string) => {
    setApplications((prev) => {
      const next = prev.filter((a) => a.job.id !== jobId);
      saveApplications(next);
      return next;
    });
  }, []);

  const has = useCallback(
    (jobId: string) => applications.some((a) => a.job.id === jobId),
    [applications]
  );

  return { applications, add, remove, has };
}
