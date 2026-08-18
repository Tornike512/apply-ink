import { Badge } from "@/components/badge";
import { CompanyAvatar } from "@/components/company-avatar";
import { Container } from "@/components/container";
import type { Job } from "@/lib/jobs";

type JobCardProps = {
  job: Job;
  selected?: boolean;
  onSelect: () => void;
};

export function JobCard({ job, selected = false, onSelect }: JobCardProps) {
  return (
    <Container
      variant="card"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex cursor-pointer flex-wrap items-start gap-4 p-4 transition-colors hover:border-terracotta ${
        selected ? "border-terracotta ring-1 ring-terracotta" : ""
      }`}
    >
      <CompanyAvatar name={job.company} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-espresso">
          {job.title}
        </h3>
        <p className="mt-0.5 truncate text-sm text-espresso/70">
          {job.company} · {job.location}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {job.tags.map((tag) => (
            <Badge key={tag} variant="sand">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant="terracotta">{job.match}% match</Badge>
        <span className="text-sm font-semibold text-espresso">
          {job.salary}
        </span>
        <span className="text-xs text-espresso/55">{job.posted}</span>
      </div>
    </Container>
  );
}
