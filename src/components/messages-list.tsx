import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CompanyAvatar } from "@/components/company-avatar";
import { Container } from "@/components/container";
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
  if (applications.length === 0) {
    return (
      <Container variant="card" className="p-8 text-center">
        <h2 className="text-base font-semibold text-espresso">You are all caught up</h2>
        <p className="mt-1 text-sm text-espresso/65">
          Jobs that need your review, CAPTCHA, or final submit will appear here.
        </p>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Container variant="card" className="border border-sienna/20 p-4">
        <p className="text-sm text-espresso/70">
          These applications need you. Open one, review the employer form, complete
          any CAPTCHA, and click the final submit button.
        </p>
      </Container>
      {applications.map((application) => {
        const { job } = application;
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
                <Badge variant="sienna">Needs you</Badge>
                {application.tailoredResumeFileName && (
                  <>
                    <Badge variant="success">Tailored CV ready</Badge>
                    <a
                      href={`/api/applications?resume=${encodeURIComponent(
                        application.id
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-terracotta underline decoration-terracotta/40 underline-offset-2"
                    >
                      View CV
                    </a>
                  </>
                )}
              </div>
              <p className="truncate text-sm text-espresso/70">{job.company}</p>
              <p className="mt-1 text-xs text-sienna">
                {application.needsUserReason ??
                  "Review the application and submit it on the employer website."}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => void onContinue(application)}
              className="px-3 py-1.5 text-xs"
            >
              Open assisted apply
            </Button>
            <Button
              variant="secondary"
              onClick={() => void onMarkSubmitted(application.id)}
              className="px-3 py-1.5 text-xs"
            >
              I submitted it
            </Button>
          </Container>
        );
      })}
    </div>
  );
}
