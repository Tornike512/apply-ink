"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BellIcon,
  BookmarkIcon,
  BriefcaseIcon,
  ClockIcon,
  TargetIcon,
  ZapIcon,
} from "@/assets";
import { ApplicationsList } from "@/components/applications-list";
import { AutoApplyOverlay } from "@/components/auto-apply-overlay";
import { AutoApplyPanel } from "@/components/auto-apply-panel";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { CvUploadButton } from "@/components/cv-upload-button";
import { JobCard } from "@/components/job-card";
import { JobDetailsPanel } from "@/components/job-details-panel";
import { JobFilters } from "@/components/job-filters";
import { MessagesList } from "@/components/messages-list";
import { ProfilePanel } from "@/components/profile-panel";
import { Sidebar } from "@/components/sidebar";
import { Spinner } from "@/components/spinner";
import { StatCard } from "@/components/stat-card";
import { useApplications } from "@/hooks/use-applications";
import { useAutoApply } from "@/hooks/use-auto-apply";
import { useCandidateProfile } from "@/hooks/use-candidate-profile";
import { useGetJobs } from "@/hooks/use-get-jobs";
import { EMPTY_CANDIDATE_PROFILE } from "@/lib/candidate-profile";
import { JOBS, type Job } from "@/lib/jobs";

export default function DashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const activeNav =
    ({
      "/dashboard/jobs": "Jobs",
      "/dashboard/matches": "Matches",
      "/dashboard/applications": "Applications",
      "/dashboard/messages": "Messages",
      "/dashboard/cv-wall": "CV Wall",
      "/dashboard/settings": "Settings",
    } as Record<string, string>)[pathname] ?? "Jobs";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (pathname === "/dashboard") router.replace("/dashboard/jobs");
  }, [pathname, router]);

  function selectNav(label: string) {
    const path =
      ({
        Jobs: "/dashboard/jobs",
        Matches: "/dashboard/matches",
        Applications: "/dashboard/applications",
        Messages: "/dashboard/messages",
        "CV Wall": "/dashboard/cv-wall",
        Settings: "/dashboard/settings",
      } as Record<string, string>)[label] ?? "/dashboard/jobs";
    router.push(path);
  }

  const profileQuery = useCandidateProfile();
  const profile = profileQuery.data ?? EMPTY_CANDIDATE_PROFILE;
  const jobsQuery = useGetJobs(
    debouncedSearch,
    profile.matchVersion,
    !profileQuery.isPending
  );
  const lastPage = jobsQuery.data?.pages.at(-1);
  const loadedJobs =
    jobsQuery.data?.pages.flatMap((page) => page.jobs) ??
    (jobsQuery.isError ? JOBS : []);
  const loadingJobs = jobsQuery.isPending;
  const apps = useApplications();
  const autoApply = useAutoApply(loadedJobs, (job) =>
    apps.add(job, "auto", false)
  );

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
  const selectedApplication = selectedJob ? apps.get(selectedJob.id) : null;
  const needsUserApplications = apps.applications.filter(
    (application) => application.status === "needs_user"
  );

  async function continueApplication(application: (typeof apps.applications)[number]) {
    setApplicationError(null);
    try {
      await apps.continueApplication(application);
    } catch (error) {
      setApplicationError(
        error instanceof Error ? error.message : "Could not open the application."
      );
    }
  }

  async function applyToSelectedJob() {
    if (!selectedJob) return;
    setApplicationError(null);
    try {
      if (selectedApplication?.status === "needs_user") {
        await apps.continueApplication(selectedApplication);
      } else {
        await apps.add(selectedJob, "manual", true);
      }
    } catch (error) {
      setApplicationError(
        error instanceof Error ? error.message : "Could not start the application."
      );
    }
  }

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <Sidebar
        active={activeNav}
        onSelect={selectNav}
        messageCount={needsUserApplications.length}
        userName={
          [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          profile.email ||
          "Apply Ink user"
        }
      />

      <Container variant="parchment" className="flex min-w-0 flex-1 gap-5 p-5">
        <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          <header className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-espresso">
              {activeNav === "Applications"
                ? "Applications"
                : activeNav === "Messages"
                  ? "Messages"
                : activeNav === "Settings"
                  ? "Settings"
                  : "Work From Anywhere Jobs"}
            </h1>
            <div className="flex items-center gap-4">
              {activeNav === "Jobs" && (
                <CvUploadButton onOpenSettings={() => selectNav("Settings")} />
              )}
              <button
                type="button"
                aria-label="Open messages"
                onClick={() => selectNav("Messages")}
                className="relative cursor-pointer text-espresso/70 hover:text-sienna"
              >
                <BellIcon width={20} height={20} />
                {needsUserApplications.length > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-terracotta"
                  />
                )}
              </button>
              <span className="text-sm font-medium text-terracotta">
                {activeNav === "Applications"
                  ? `${apps.applications.length} ${
                      apps.applications.length === 1 ? "application" : "applications"
                    }`
                  : activeNav === "Messages"
                    ? `${needsUserApplications.length} need${
                        needsUserApplications.length === 1 ? "s" : ""
                      } your help`
                  : activeNav === "Settings"
                    ? "Local application profile"
                    : `${totalMatching} matching jobs`}
              </span>
            </div>
          </header>

          {applicationError && (
            <Container variant="card" className="border border-sienna/30 p-3">
              <p className="text-sm text-sienna">{applicationError}</p>
            </Container>
          )}

          {activeNav === "Applications" ? (
            <ApplicationsList
              applications={apps.applications}
              onRemove={apps.remove}
              onContinue={continueApplication}
              onMarkSubmitted={apps.markSubmitted}
            />
          ) : activeNav === "Messages" ? (
            <MessagesList
              applications={needsUserApplications}
              onContinue={continueApplication}
              onMarkSubmitted={apps.markSubmitted}
            />
          ) : activeNav === "Settings" ? (
            <ProfilePanel />
          ) : (
            <>
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
            onOpenSettings={() => selectNav("Settings")}
            cvUploaded={profile.cvUploaded}
            profileComplete={profile.complete}
            tailoringConfigured={profile.tailoringConfigured}
            applicationAnswerCount={profile.applicationAnswerCount}
            applicationAnswerTotal={profile.applicationAnswerTotal}
            autoSubmitEnabled={profile.autoSubmitEnabled}
            startDisabled={
              loadingJobs || loadedJobs.length === 0 || profileQuery.isPending
            }
          />

          <JobFilters search={search} onSearchChange={setSearch} />

          <p className="px-1 text-xs text-espresso/60">
            {profile.cvUploaded
              ? "Matches are personalized from your uploaded CV and update automatically."
              : "Upload your CV to calculate personal match scores automatically."}
          </p>

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
            </>
          )}
        </section>

        {selectedJob &&
          activeNav !== "Applications" &&
          activeNav !== "Messages" &&
          activeNav !== "Settings" && (
          <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-md p-4 lg:static lg:w-96 lg:shrink-0 lg:p-0">
            <JobDetailsPanel
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
              onApply={() => void applyToSelectedJob()}
              application={selectedApplication}
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
