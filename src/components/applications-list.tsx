import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CompanyAvatar } from "@/components/company-avatar";
import { Container } from "@/components/container";
import type { Application } from "@/lib/applications";

type ApplicationsListProps = {
  applications: Application[];
  onRemove: (id: string) => void | Promise<void>;
  onContinue: (application: Application) => void | Promise<unknown>;
  onMarkSubmitted: (id: string) => void | Promise<unknown>;
};

export function ApplicationsList({
  applications,
  onRemove,
  onContinue,
  onMarkSubmitted,
}: ApplicationsListProps) {
  if (applications.length === 0) {
    return (
      <Container variant="card" className="p-8 text-center">
        <p className="text-sm text-espresso/70">
          No applications yet. Choose a job, then select Start application.
        </p>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map((application) => {
        const { job } = application;
        const needsUser = application.status === "needs_user";
        const date = new Date(
          application.submittedAt ?? application.updatedAt
        ).toLocaleDateString();
        return (
          <Container
            key={application.id}
            variant="card"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4"
          >
            <CompanyAvatar
              name={job.company}
              color={job.logoColor}
              logoUrl={job.logoUrl}
            />
            <div className="min-w-0 flex-1 basis-64">
              <h3 className="truncate text-base font-semibold text-espresso">
                {job.title}
              </h3>
              <p className="truncate text-sm text-espresso/70">
                {job.company} · {needsUser ? "updated" : "submitted"} {date}
              </p>
              {application.needsUserReason && (
                <p className="mt-1 line-clamp-2 text-xs text-sienna">
                  {application.needsUserReason}
                </p>
              )}
            </div>
            <Badge variant={needsUser ? "sienna" : "success"}>
              {needsUser ? "Needs you" : "Submitted"}
            </Badge>
            <Badge variant="sand">
              {application.method === "ats_api" ? "ATS API" : "Assisted"}
            </Badge>
            {application.tailoredResumeFileName && (
              <>
                <Badge variant="success">Job-specific resume</Badge>
                <a
                  href={`/api/applications?resume=${encodeURIComponent(
                    application.id
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-sand bg-surface px-3 py-1.5 text-xs font-medium text-terracotta transition-colors hover:bg-sand/30"
                >
                  View resume
                </a>
              </>
            )}
            {needsUser && (
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
            <Button
              variant="outline"
              onClick={() => void onRemove(application.id)}
              className="px-3 py-1.5 text-xs"
            >
              Remove application
            </Button>
          </Container>
        );
      })}
    </div>
  );
}
