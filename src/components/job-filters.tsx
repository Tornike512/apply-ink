import { DollarSignIcon, FunnelIcon, MapPinIcon, SearchIcon } from "@/assets";
import { Button } from "@/components/button";

const FILTERS = [
  { name: "Role", icon: null, options: ["All roles", "Frontend", "Full-stack", "Backend", "Mobile"] },
  { name: "Region", icon: MapPinIcon, options: ["Anywhere", "Europe", "US timezones", "Worldwide"] },
  { name: "Salary", icon: DollarSignIcon, options: ["Any salary", "$100k+", "$120k+", "$150k+"] },
];

type JobFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

export function JobFilters({ search, onSearchChange }: JobFiltersProps) {
  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <label className="flex min-w-0 flex-1 basis-64 items-center gap-2.5 rounded-xl border border-sand bg-surface px-3.5 py-2.5">
        <SearchIcon width={18} height={18} className="shrink-0 text-espresso/50" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search title or company…"
          className="min-w-0 flex-1 bg-transparent text-sm text-espresso outline-none placeholder:text-espresso/45"
        />
      </label>
      {FILTERS.map(({ name, icon: Icon, options }) => (
        <label
          key={name}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-sand bg-surface px-3.5 py-2.5"
        >
          {Icon && (
            <Icon width={16} height={16} className="shrink-0 text-espresso/60" />
          )}
          <select
            aria-label={name}
            className="cursor-pointer bg-transparent text-sm font-medium text-espresso outline-none"
          >
            {options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      ))}
      <Button variant="outline" className="rounded-xl px-4 py-2.5">
        <FunnelIcon width={16} height={16} />
        More filters
      </Button>
    </div>
  );
}
