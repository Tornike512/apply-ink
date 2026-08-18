import { Container } from "@/components/container";

const FILTERS = [
  { name: "Role", options: ["All roles", "Frontend", "Full-stack", "Backend", "Mobile"] },
  { name: "Region", options: ["Anywhere", "Europe", "US timezones", "Worldwide"] },
  { name: "Salary", options: ["Any salary", "$100k+", "$120k+", "$150k+"] },
];

type JobFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

export function JobFilters({ search, onSearchChange }: JobFiltersProps) {
  return (
    <Container
      variant="card"
      className="flex flex-wrap items-center gap-3 p-3"
    >
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search title or company…"
        className="min-w-0 flex-1 basis-52 rounded-lg border border-sand bg-cream px-3 py-2 text-sm text-espresso placeholder:text-espresso/45 focus:border-terracotta focus:outline-none"
      />
      {FILTERS.map((filter) => (
        <select
          key={filter.name}
          aria-label={filter.name}
          className="cursor-pointer rounded-lg border border-sand bg-cream px-3 py-2 text-sm text-espresso focus:border-terracotta focus:outline-none"
        >
          {filter.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ))}
    </Container>
  );
}
