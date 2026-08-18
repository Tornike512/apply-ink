import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CompanyAvatar } from "@/components/company-avatar";
import { Container } from "@/components/container";
import type { Application } from "@/lib/applications";

type ApplicationsListProps = {
  applications: Application[];
  onRemove: (jobId: string) => void;
};

export function ApplicationsList({
  applications,
  onRemove,
}: ApplicationsListProps) {
  if (applications.length === 0) {
    return (
      <Container variant="card" className="p-8 text-center">
        <p className="text-sm text-espresso/70">
          No applications yet. Run Auto-apply, or open a job and hit “Apply
          with AI”.
        </p>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map(({ job, appliedAt, via }) => (
        <Container
          key={job.id}
          variant="card"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4"
        >
          <CompanyAvatar
            name={job.company}
            color={job.logoColor}
            logoUrl={job.logoUrl}
          />
          <div className="min-w-0 flex-1 basis-52">
            <h3 className="truncate text-base font-semibold text-espresso">
              {job.title}
            </h3>
            <p className="truncate text-sm text-espresso/70">
              {job.company} · applied {new Date(appliedAt).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="success">Applied</Badge>
          <Badge variant="sand">{via === "auto" ? "Auto" : "Manual"}</Badge>
          {job.url !== "#" && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-terracotta underline underline-offset-2 hover:text-sienna"
            >
              View posting
            </a>
          )}
          <Button
            variant="secondary"
            onClick={() => onRemove(job.id)}
            className="px-3 py-1.5 text-xs"
          >
            Withdraw
          </Button>
        </Container>
      ))}
    </div>
  );
}
