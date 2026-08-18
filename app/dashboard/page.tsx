"use client";

import { useEffect, useState } from "react";
import {
  BellIcon,
  BookmarkIcon,
  BriefcaseIcon,
  ClockIcon,
  TargetIcon,
  ZapIcon,
} from "@/assets";
import { AutoApplyOverlay } from "@/components/auto-apply-overlay";
import { AutoApplyPanel } from "@/components/auto-apply-panel";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { JobCard } from "@/components/job-card";
import { JobDetailsPanel } from "@/components/job-details-panel";
import { JobFilters } from "@/components/job-filters";
import { Sidebar } from "@/components/sidebar";
import { Spinner } from "@/components/spinner";
import { StatCard } from "@/components/stat-card";
import { useAutoApply } from "@/hooks/use-auto-apply";
import { useGetJobs } from "@/hooks/use-get-jobs";
import { JOBS, type Job } from "@/lib/jobs";

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState("Jobs");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const jobsQuery = useGetJobs(debouncedSearch);
  const lastPage = jobsQuery.data?.pages.at(-1);
  const loadedJobs =
    jobsQuery.data?.pages.flatMap((page) => page.jobs) ??
    (jobsQuery.isError ? JOBS : []);
  const loadingJobs = jobsQuery.isPending;
  const autoApply = useAutoApply(loadedJobs);

  const appliedCount = autoApply.log.filter(
    (entry) => entry.status === "applied"
  ).length;
  const processedCount = autoApply.log.filter(
    (entry) => entry.status !== "limit"
  ).length;

  const jobs = loadedJobs;
  const totalMatching = lastPage?.total ?? jobs.length;
  const grandTotal = lastPage?.grandTotal ?? jobs.length;
  const highMatches = lastPage?.highMatches ?? 0;

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <Sidebar active={activeNav} onSelect={setActiveNav} />

      <Container variant="parchment" className="flex min-w-0 flex-1 gap-5 p-5">
        <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          <header className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-espresso">Remote Jobs</h1>
            <div className="flex items-center gap-4">
              <span className="relative text-espresso/70">
                <BellIcon width={20} height={20} />
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-terracotta"
                />
              </span>
              <span className="text-sm font-medium text-terracotta">
                {totalMatching} matching jobs
              </span>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={<BriefcaseIcon width={20} height={20} />}
              value={loadingJobs ? "…" : grandTotal}
              label="Jobs found"
            />
            <StatCard
              icon={<TargetIcon width={20} height={20} />}
              value={highMatches}
              label="High matches"
            />
            <StatCard
              icon={<ZapIcon width={20} height={20} />}
              value={
                <>
                  Auto-apply
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${
                      autoApply.status === "running"
                        ? "bg-success"
                        : "bg-espresso/25"
                    }`}
                  />
                </>
              }
              label={autoApply.status === "running" ? "Active" : "Inactive"}
            />
            <StatCard
              icon={<ClockIcon width={20} height={20} />}
              value={`${autoApply.dailyLimit} / day`}
              label="Max auto-applies"
            />
            <StatCard
              icon={<BookmarkIcon width={20} height={20} />}
              value="24"
              label="Rules saved"
            />
          </div>

          <AutoApplyPanel
            status={autoApply.status}
            usedToday={autoApply.usedToday}
            dailyLimit={autoApply.dailyLimit}
            minMatch={autoApply.minMatch}
            appliedCount={appliedCount}
            processedCount={processedCount}
            totalCount={loadedJobs.length}
            onStart={autoApply.start}
            onStop={autoApply.stop}
            onResetUsage={autoApply.resetUsage}
            startDisabled={loadingJobs || loadedJobs.length === 0}
          />

          <JobFilters search={search} onSearchChange={setSearch} />

          <div className="flex flex-col gap-3 pb-2">
            {loadingJobs && (
              <Container
                variant="card"
                className="flex items-center justify-center gap-3 p-6"
              >
                <Spinner />
                <p className="text-sm text-espresso/70">
                  Loading jobs — first visit builds the index from 100+ boards
                  and can take a minute…
                </p>
              </Container>
            )}
            {jobsQuery.isError && (
              <p className="text-xs text-espresso/60">
                Live sources unavailable — showing sample jobs.
              </p>
            )}
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onSelect={() => setSelectedJob(job)}
              />
            ))}
            {!loadingJobs && jobs.length === 0 && (
              <Container variant="card" className="p-6 text-center">
                <p className="text-sm text-espresso/70">
                  No jobs match “{search}”. Try a different search.
                </p>
              </Container>
            )}
            {jobsQuery.hasNextPage && (
              <Button
                variant="outline"
                onClick={() => jobsQuery.fetchNextPage()}
                disabled={jobsQuery.isFetchingNextPage}
                className="self-center rounded-xl px-6 py-2.5"
              >
                {jobsQuery.isFetchingNextPage
                  ? "Loading…"
                  : `Load more (${jobs.length} of ${totalMatching})`}
              </Button>
            )}
          </div>
        </section>

        {selectedJob && (
          <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-md p-4 lg:static lg:w-96 lg:shrink-0 lg:p-0">
            <JobDetailsPanel
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
            />
          </aside>
        )}
      </Container>

      <AutoApplyOverlay
        open={autoApply.status === "running"}
        currentJob={autoApply.currentJob}
        appliedCount={appliedCount}
        processedCount={processedCount}
        totalCount={loadedJobs.length}
        usedToday={autoApply.usedToday}
        dailyLimit={autoApply.dailyLimit}
        onStop={autoApply.stop}
      />
    </div>
  );
}
