"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CompanyAvatar } from "@/components/company-avatar";
import { Container } from "@/components/container";
import { Tabs } from "@/components/tabs";
import type { Application } from "@/lib/applications";

type MessagesListProps = {
  applications: Application[];
  onContinue: (application: Application) => void | Promise<unknown>;
  onMarkSubmitted: (id: string) => void | Promise<unknown>;
};

export function MessagesList({
  applications,
  onContinue,
  onMarkSubmitted,
}: MessagesListProps) {
  const [activeTab, setActiveTab] = useState<"needs-action" | "sent">("needs-action");

  const needsActionApps = applications.filter(
    (app) => app.status === "needs_user"
  );
  const sentApps = applications.filter((app) => app.status === "submitted");

  const displayedApps = activeTab === "needs-action" ? needsActionApps : sentApps;

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        tabs={[
          { label: `Needs Action (${needsActionApps.length})`, value: "needs-action" },
          { label: `Sent (${sentApps.length})`, value: "sent" },
        ]}
        activeTab={activeTab}
        onTabChange={(value) => setActiveTab(value as "needs-action" | "sent")}
      />

      {displayedApps.length === 0 ? (
        <Container variant="card" className="p-8 text-center">
          <h2 className="text-base font-semibold text-espresso">
            {activeTab === "needs-action" ? "You are all caught up" : "No sent applications"}
          </h2>
          <p className="mt-1 text-sm text-espresso/65">
            {activeTab === "needs-action"
              ? "Applications that need a new answer, CAPTCHA, or final review will appear here."
              : "Applications that were automatically submitted will appear here."}
          </p>
        </Container>
      ) : (
        <div className="flex flex-col gap-3">
          {activeTab === "needs-action" && (
            <Container variant="card" className="border border-sienna/20 p-4">
              <p className="text-sm text-espresso/70">
                These applications need you. Open one, complete any missing answer or
                CAPTCHA, review the form, and submit it.
              </p>
            </Container>
          )}

          {displayedApps.map((application) => {
            const { job } = application;
            const isNeedsAction = activeTab === "needs-action";

            return (
              <Container
                key={application.id}
                variant="card"
                className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4"
              >
                <CompanyAvatar
                  name={job.company}
                  color={job.logoColor}
                  logoUrl={job.logoUrl}
                />
                <div className="min-w-0 flex-1 basis-64">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-espresso">
                      {job.title}
                    </h3>
                    {isNeedsAction ? (
                      <Badge variant="sienna">Needs you</Badge>
                    ) : (
                      <Badge variant="success">Submitted</Badge>
                    )}
                    {application.tailoredResumeFileName && (
                      <>
                        <Badge variant="success">
                          {isNeedsAction ? "Job-specific resume ready" : "Job-specific resume"}
                        </Badge>
                        <a
                          href={`/api/applications?resume=${encodeURIComponent(
                            application.id
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-terracotta underline decoration-terracotta/40 underline-offset-2"
                        >
                          View resume
                        </a>
                      </>
                    )}
                    {!isNeedsAction && (
                      <Badge variant="sand">
                        {application.method === "ats_api" ? "ATS API" : "Auto-submitted"}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-espresso/70">
                    {job.company}
                    {!isNeedsAction &&
                      ` · submitted ${new Date(
                        application.submittedAt ?? application.updatedAt
                      ).toLocaleDateString()}`}
                  </p>
                  {isNeedsAction && (
                    <p className="mt-1 text-xs text-sienna">
                      {application.needsUserReason ??
                        "Review the application and submit it on the employer website."}
                    </p>
                  )}
                </div>
                {isNeedsAction && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => void onContinue(application)}
                      className="px-3 py-1.5 text-xs"
                    >
                      Continue application
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void onMarkSubmitted(application.id)}
                      className="px-3 py-1.5 text-xs"
                    >
                      I submitted it
                    </Button>
                  </>
                )}
              </Container>
            );
          })}
        </div>
      )}
    </div>
  );
}
