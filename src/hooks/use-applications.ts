import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Application, ApplicationAttempt } from "@/lib/applications";
import type { Job } from "@/lib/jobs";

const APPLICATIONS_KEY = ["applications"] as const;
const LOCAL_HEADERS = { "x-apply-ink": "1" };
type MessageStatus = Extract<Application["status"], "needs_user" | "submitted">;

async function responseError(response: Response): Promise<Error> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return new Error(data.error ?? `Could not update this application (${response.status}). Try again.`);
}
async function loadApplications(): Promise<Application[]> {
  const response = await fetch("/api/applications", { cache: "no-store" });
  if (!response.ok) throw await responseError(response);
  const data = (await response.json()) as { applications: Application[] };
  return data.applications;
}

async function startApplication(
  job: Job,
  via: Application["via"],
  openBrowser: boolean,
  autoSubmit?: boolean
): Promise<ApplicationAttempt> {
  const response = await fetch("/api/applications", {
    method: "POST",
    headers: { ...LOCAL_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ job, via, openBrowser, autoSubmit }),
  });
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<ApplicationAttempt>;
}

export function useApplications() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: APPLICATIONS_KEY,
    queryFn: loadApplications,
    retry: false,
  });
  const applications = useMemo(() => query.data ?? [], [query.data]);

  const replaceApplication = useCallback(
    (application: Application) => {
      queryClient.setQueryData<Application[]>(APPLICATIONS_KEY, (current = []) => [
        application,
        ...current.filter((item) => item.id !== application.id),
      ]);
    },
    [queryClient]
  );

  const add = useCallback(
    async (
      job: Job,
      via: Application["via"],
      openBrowser = false,
      autoSubmit?: boolean
    ) => {
      console.log('[Applications] add() called - job:', job.title, 'via:', via, 'openBrowser:', openBrowser, 'autoSubmit:', autoSubmit);
      const attempt = await startApplication(job, via, openBrowser, autoSubmit);
      console.log('[Applications] add() result - status:', attempt.application.status, 'browserOpened:', attempt.browserOpened, 'note:', attempt.note);
      replaceApplication(attempt.application);
      return attempt;
    },
    [replaceApplication]
  );

  const continueApplication = useCallback(
    (application: Application) => add(application.job, application.via, true),
    [add]
  );

  const markSubmitted = useCallback(
    async (id: string) => {
      const response = await fetch("/api/applications", {
        method: "PATCH",
        headers: { ...LOCAL_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "submitted" }),
      });
      if (!response.ok) throw await responseError(response);
      const data = (await response.json()) as { application: Application };
      replaceApplication(data.application);
      return data.application;
    },
    [replaceApplication]
  );

  const remove = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/applications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: LOCAL_HEADERS,
      });
      if (!response.ok) throw await responseError(response);
      queryClient.setQueryData<Application[]>(APPLICATIONS_KEY, (current = []) =>
        current.filter((application) => application.id !== id)
      );
    },
    [queryClient]
  );

  const clearMessages = useCallback(
    async (status: MessageStatus) => {
      const response = await fetch("/api/applications", {
        method: "PATCH",
        headers: { ...LOCAL_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ messageStatus: status }),
      });
      if (!response.ok) throw await responseError(response);
      const data = (await response.json()) as {
        dismissedAt: number;
        dismissedIds: string[];
      };
      const dismissedIds = new Set(data.dismissedIds);
      queryClient.setQueryData<Application[]>(APPLICATIONS_KEY, (current = []) =>
        current.map((application) =>
          dismissedIds.has(application.id)
            ? { ...application, messageDismissedAt: data.dismissedAt }
            : application
        )
      );
      await queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
      return data.dismissedIds.length;
    },
    [queryClient]
  );

  const get = useCallback(
    (jobId: string) => applications.find((item) => item.job.id === jobId) ?? null,
    [applications]
  );
  const has = useCallback((jobId: string) => Boolean(get(jobId)), [get]);

  return {
    applications,
    add,
    continueApplication,
    markSubmitted,
    remove,
    clearMessages,
    get,
    has,
    isLoading: query.isPending,
    error: query.error,
  };
}
