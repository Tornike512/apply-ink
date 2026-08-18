import type { ReactNode } from "react";
import { Container } from "@/components/container";

type StatCardProps = {
  icon: ReactNode;
  value: ReactNode;
  label: string;
};

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <Container variant="card" className="flex items-center gap-3 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand/50 text-sienna">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-lg font-bold text-espresso">
          {value}
        </p>
        <p className="truncate text-xs text-espresso/60">{label}</p>
      </div>
    </Container>
  );
}
