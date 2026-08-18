"use client";

import { useState } from "react";
import { AutoApplyOverlay } from "@/components/auto-apply-overlay";
import { AutoApplyPanel } from "@/components/auto-apply-panel";
import { Container } from "@/components/container";
import { JobCard } from "@/components/job-card";
import { JobDetailsPanel } from "@/components/job-details-panel";
import { JobFilters } from "@/components/job-filters";
import { Sidebar } from "@/components/sidebar";
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

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <Sidebar active={activeNav} onSelect={setActiveNav} />

      <Container
        variant="parchment"
        className="flex min-w-0 flex-1 gap-5 p-5"
      >
        <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          <header className="flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-semibold text-espresso">
              Remote Jobs
            </h1>
            <span className="text-sm text-espresso/60">
              {jobs.length} matching
            </span>
          </header>

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
