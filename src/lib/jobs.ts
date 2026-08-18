export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  match: number;
  tags: string[];
  posted: string;
  description: string;
  logoColor: string;
  verified: boolean;
};

export const JOBS: Job[] = [
  {
    id: "1",
    logoColor: "#e6602c",
    verified: true,
    title: "Senior Frontend Engineer",
    company: "Driftwood Labs",
    location: "Remote — Worldwide",
    salary: "$120k – $150k",
    match: 94,
    tags: ["React", "TypeScript", "Next.js"],
    posted: "2d ago",
    description:
      "Own the web experience of a design-tool used by 40k teams. You will build editor surfaces in React 19, drive performance work, and pair with design on a small product-minded team.",
  },
  {
    id: "2",
    logoColor: "#1f2a56",
    verified: true,
    title: "Full-Stack Developer",
    company: "Terracotta AI",
    location: "Remote — Europe",
    salary: "$95k – $125k",
    match: 89,
    tags: ["Node.js", "PostgreSQL", "React"],
    posted: "3d ago",
    description:
      "Ship features end-to-end for an AI hiring platform: API design, data modeling, and polished UI. Small team, weekly releases, strong ownership culture.",
  },
  {
    id: "3",
    logoColor: "#7c5ce0",
    verified: true,
    title: "Product Engineer",
    company: "Inkwell",
    location: "Remote — US timezones",
    salary: "$130k – $165k",
    match: 86,
    tags: ["Next.js", "Tailwind", "tRPC"],
    posted: "5d ago",
    description:
      "Join the founding team building collaborative writing software. You will prototype fast, talk to users, and turn feedback into shipped product every week.",
  },
  {
    id: "4",
    logoColor: "#c2452f",
    verified: true,
    title: "React Native Engineer",
    company: "Sienna Health",
    location: "Remote — Worldwide",
    salary: "$110k – $140k",
    match: 81,
    tags: ["React Native", "TypeScript", "GraphQL"],
    posted: "1w ago",
    description:
      "Build the patient-facing mobile app for a telehealth provider serving 200k users. Focus on offline-first flows, accessibility, and release quality.",
  },
  {
    id: "5",
    logoColor: "#0f766e",
    verified: true,
    title: "Design Systems Engineer",
    company: "Parchment Co.",
    location: "Remote — Europe",
    salary: "$100k – $130k",
    match: 78,
    tags: ["React", "Storybook", "CSS"],
    posted: "1w ago",
    description:
      "Own the component library used by 12 product teams: tokens, theming, docs, and migration tooling. Deep CSS knowledge and API taste required.",
  },
  {
    id: "6",
    logoColor: "#3e8e41",
    verified: true,
    title: "Backend Engineer, Platform",
    company: "Emberline",
    location: "Remote — Worldwide",
    salary: "$125k – $160k",
    match: 72,
    tags: ["Go", "Kubernetes", "PostgreSQL"],
    posted: "2w ago",
    description:
      "Scale the job-matching pipeline that processes 3M postings a day. You will own ingestion services, queues, and the internal platform APIs.",
  },
];
