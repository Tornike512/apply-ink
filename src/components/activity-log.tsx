import { Badge } from "@/components/badge";
import { Container } from "@/components/container";
import type { ActivityEntry, ActivityStatus } from "@/lib/auto-apply";

const STATUS_BADGES: Record<
  ActivityStatus,
  { label: string; variant: "sand" | "terracotta" | "sienna" }
> = {
  applied: { label: "Applied", variant: "terracotta" },
  skipped: { label: "Skipped", variant: "sand" },
  error: { label: "Error", variant: "sienna" },
  limit: { label: "Limit", variant: "sienna" },
};

type ActivityLogProps = {
  entries: ActivityEntry[];
};

export function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <Container variant="card" className="flex flex-col p-4">
      <h2 className="mb-1 text-sm font-semibold text-espresso">
        Activity log
      </h2>
      <ul aria-live="polite" className="max-h-64 overflow-y-auto">
        {entries.length === 0 && (
          <li className="py-2 text-sm text-espresso/60">
            Waiting for the first job…
          </li>
        )}
        {entries.map((entry) => {
          const badge = STATUS_BADGES[entry.status];
          return (
            <li
              key={entry.id}
              className="flex items-center gap-3 border-b border-sand/60 py-2 last:border-0"
            >
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-espresso">
                  {entry.title}
                  {entry.company ? ` · ${entry.company}` : ""}
                </p>
                <p className="truncate text-xs text-espresso/60">{entry.note}</p>
              </div>
              <span className="shrink-0 text-xs text-espresso/50">
                {entry.time}
              </span>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
