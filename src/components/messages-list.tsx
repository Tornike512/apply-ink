"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CompanyAvatar } from "@/components/company-avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Container } from "@/components/container";
import { Tabs } from "@/components/tabs";
import type { Application } from "@/lib/applications";

type MessagesListProps = {
  applications: Application[];
  onContinue: (application: Application) => void | Promise<unknown>;
  onMarkSubmitted: (id: string) => void | Promise<unknown>;
  onClearMessages: (
    status: Extract<Application["status"], "needs_user" | "submitted">
  ) => void | Promise<unknown>;
};

export function MessagesList({
  applications,
  onContinue,
  onMarkSubmitted,
  onClearMessages,
}: MessagesListProps) {
  const [activeTab, setActiveTab] = useState<"needs-action" | "sent">("needs-action");
  const [clearTarget, setClearTarget] = useState<
    Extract<Application["status"], "needs_user" | "submitted"> | null
  >(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const needsActionApps = applications.filter(
    (app) => app.status === "needs_user" && app.messageDismissedAt === null
  );
  const sentApps = applications.filter(
    (app) => app.status === "submitted" && app.messageDismissedAt === null
  );

  const displayedApps = activeTab === "needs-action" ? needsActionApps : sentApps;
  const activeStatus = activeTab === "needs-action" ? "needs_user" : "submitted";
  const activeLabel = activeTab === "needs-action" ? "Needs Action" : "Sent";
  const clearTargetApps = applications.filter(
    (application) =>
      application.status === clearTarget && application.messageDismissedAt === null
  );
  const clearTargetLabel = clearTarget === "needs_user" ? "Needs Action" : "Sent";

  async function clearMessages() {
    if (!clearTarget || isClearing) return;

    setIsClearing(true);
    setClearError(null);
    try {
      await onClearMessages(clearTarget);
      setClearTarget(null);
    } catch (error) {
      setClearError(
        error instanceof Error ? error.message : "Could not clear these messages. Try again."
      );
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { label: `Needs Action (${needsActionApps.length})`, value: "needs-action" },
            { label: `Sent (${sentApps.length})`, value: "sent" },
          ]}
          activeTab={activeTab}
          onTabChange={(value) => setActiveTab(value as "needs-action" | "sent")}
        />
        {displayedApps.length > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              setClearError(null);
              setClearTarget(activeStatus);
            }}
            className="px-3 py-1.5 text-xs"
          >
            Clear {activeLabel}
          </Button>
        )}
      </div>

      {clearError && (
        <Container variant="card" className="border border-sienna/30 p-3">
          <p role="alert" className="text-sm text-sienna">
            {clearError}
          </p>
        </Container>
      )}

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

      <ConfirmDialog
        open={clearTarget !== null}
        title={`Clear ${clearTargetLabel}?`}
        description={`This clears ${clearTargetApps.length} ${clearTargetLabel.toLowerCase()} application${clearTargetApps.length === 1 ? "" : "s"} from Messages. Your application history stays saved.`}
        confirmLabel={isClearing ? "Clearing..." : `Clear ${clearTargetLabel}`}
        onConfirm={() => void clearMessages()}
        onCancel={() => {
          if (!isClearing) setClearTarget(null);
        }}
      />
    </div>
  );
}
