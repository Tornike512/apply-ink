import { CloseIcon } from "@/assets";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import type { Application } from "@/lib/applications";
import type { Job } from "@/lib/jobs";

type JobDetailsPanelProps = {
  job: Job;
  onClose: () => void;
  onApply?: () => void;
  application?: Application | null;
};

export function JobDetailsPanel({
  job,
  onClose,
  onApply,
  application = null,
}: JobDetailsPanelProps) {
  const submitted = application?.status === "submitted";
  const needsUser = application?.status === "needs_user";

  return (
    <Container variant="card" className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-espresso">{job.title}</h2>
          <p className="text-sm text-espresso/70">
            {job.company} - {job.location}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={onClose}
          aria-label="Close details"
          className="shrink-0 px-2 py-2"
        >
          <CloseIcon width={16} height={16} />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="terracotta">{job.match}% match</Badge>
        {job.tags.map((tag) => (
          <Badge key={tag} variant="sand">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-xl bg-sand/40 px-4 py-3">
        <span className="text-sm font-semibold text-espresso">
          {job.salary ?? "Salary not listed"}
        </span>
        <span className="text-xs text-espresso/60">Posted {job.posted}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <h3 className="mb-1.5 text-sm font-semibold text-espresso">
          About the role
        </h3>
        <p className="text-sm leading-6 text-espresso/80">
          {job.description || "Open the posting for the full description."}
        </p>
        {job.url !== "#" && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-terracotta underline underline-offset-2 hover:text-sienna"
          >
            View posting on {job.source}
          </a>
        )}
      </div>

      <div>
        {needsUser && (
          <p className="mb-2 text-xs leading-5 text-sienna">
            Needs you: {application.needsUserReason}
          </p>
        )}
        <Button
          variant="primary"
          onClick={onApply}
          disabled={submitted}
          className="w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitted
            ? "Submitted"
            : needsUser
              ? "Continue application"
              : "Apply with AI"}
        </Button>
      </div>
    </Container>
  );
}
