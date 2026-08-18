import { BookmarkIcon, MoreVerticalIcon, ShieldCheckIcon } from "@/assets";
import { Badge } from "@/components/badge";
import { CompanyAvatar } from "@/components/company-avatar";
import { Container } from "@/components/container";
import { MatchRing } from "@/components/match-ring";
import type { Job } from "@/lib/jobs";

type JobCardProps = {
  job: Job;
  selected?: boolean;
  onSelect?: () => void;
};

export function JobCard({ job, selected = false, onSelect }: JobCardProps) {
  const interactive = Boolean(onSelect);
  const metaParts = [job.company, ...job.location.split(" — ")];
  return (
    <Container
      variant="card"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={`flex flex-wrap items-center gap-x-5 gap-y-3 p-4 transition-colors ${
        interactive ? "cursor-pointer hover:border-terracotta" : ""
      } ${selected ? "border-terracotta ring-1 ring-terracotta" : ""}`}
    >
      <CompanyAvatar
        name={job.company}
        color={job.logoColor}
        logoUrl={job.logoUrl}
      />
      <div className="min-w-0 flex-1 basis-56">
        <h3 className="flex items-center gap-1.5 text-base font-semibold text-espresso">
          <span className="truncate">{job.title}</span>
          {job.verified && (
            <ShieldCheckIcon
              width={16}
              height={16}
              className="shrink-0 text-terracotta"
            />
          )}
        </h3>
        <p className="mt-0.5 truncate text-sm text-espresso/70">
          {metaParts.join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {job.tags.map((tag) => (
            <Badge key={tag} variant="sand">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <MatchRing percent={job.match} className="shrink-0" />
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {job.salary && (
          <span className="text-base font-bold text-espresso">
            {job.salary}
          </span>
        )}
        <span className="text-xs text-espresso/55">{job.posted}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-espresso/60">
        <span className="rounded-lg p-2 transition-colors hover:bg-sand/40 hover:text-espresso">
          <BookmarkIcon width={18} height={18} />
        </span>
        <span className="rounded-lg p-2 transition-colors hover:bg-sand/40 hover:text-espresso">
          <MoreVerticalIcon width={18} height={18} />
        </span>
      </div>
    </Container>
  );
}
