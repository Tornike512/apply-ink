"use client";

import { useState } from "react";
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
import { Container } from "@/components/container";
import { JobCard } from "@/components/job-card";
import { JobDetailsPanel } from "@/components/job-details-panel";
import { JobFilters } from "@/components/job-filters";
import { Sidebar } from "@/components/sidebar";
import { StatCard } from "@/components/stat-card";
import { useAutoApply } from "@/hooks/use-auto-apply";
import { JOBS, type Job } from "@/lib/jobs";

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState("Jobs");
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const autoApply = useAutoApply(JOBS);

  const appliedCount = autoApply.log.filter(
    (entry) => entry.status === "applied"
  ).length;
  const processedCount = autoApply.log.filter(
    (entry) => entry.status !== "limit"
  ).length;

  const query = search.trim().toLowerCase();
  const jobs = JOBS.filter(
    (job) =>
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query)
  );
  const highMatches = JOBS.filter(
    (job) => job.match >= autoApply.minMatch
  ).length;

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
                {jobs.length} matching jobs
              </span>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={<BriefcaseIcon width={20} height={20} />}
              value="128"
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
            totalCount={JOBS.length}
            onStart={autoApply.start}
            onStop={autoApply.stop}
            onResetUsage={autoApply.resetUsage}
          />

          <JobFilters search={search} onSearchChange={setSearch} />

          <div className="flex flex-col gap-3 pb-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onSelect={() => setSelectedJob(job)}
              />
            ))}
            {jobs.length === 0 && (
              <Container variant="card" className="p-6 text-center">
                <p className="text-sm text-espresso/70">
                  No jobs match “{search}”. Try a different search.
                </p>
              </Container>
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
        totalCount={JOBS.length}
        usedToday={autoApply.usedToday}
        dailyLimit={autoApply.dailyLimit}
        onStop={autoApply.stop}
      />
    </div>
  );
}
