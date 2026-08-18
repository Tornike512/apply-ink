import { Badge } from "@/components/badge";
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
      className={`flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-terracotta ${
        selected ? "border-terracotta ring-1 ring-terracotta" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-espresso">
            {job.title}
          </h3>
          <p className="truncate text-sm text-espresso/70">
            {job.company} · {job.location}
          </p>
        </div>
        <Badge variant="terracotta">{job.match}% match</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {job.tags.map((tag) => (
          <Badge key={tag} variant="sand">
            {tag}
          </Badge>
        ))}
        <span className="ml-auto text-sm font-medium text-espresso">
          {job.salary}
        </span>
        <span className="text-xs text-espresso/55">{job.posted}</span>
      </div>
    </Container>
  );
}
