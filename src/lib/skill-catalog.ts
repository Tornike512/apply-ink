export const POPULAR_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "SQL",
  "PostgreSQL",
  "AWS",
  "Figma",
  "Product management",
  "Project management",
] as const;

const SKILL_CATALOG = [
  ...POPULAR_SKILLS,
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Vue.js",
  "Angular",
  "Svelte",
  "React Native",
  "Redux",
  "GraphQL",
  "REST APIs",
  "Express.js",
  "NestJS",
  "Django",
  "Flask",
  "FastAPI",
  "Java",
  "Spring Boot",
  "C#",
  ".NET",
  "C++",
  "C",
  "Go",
  "Rust",
  "Ruby",
  "Ruby on Rails",
  "PHP",
  "Laravel",
  "Swift",
  "Kotlin",
  "Git",
  "GitHub",
  "GitLab",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Linux",
  "Azure",
  "Google Cloud Platform",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",
  "Microservices",
  "System design",
  "Software architecture",
  "Unit testing",
  "Integration testing",
  "End-to-end testing",
  "Playwright",
  "Cypress",
  "Jest",
  "Vitest",
  "Selenium",
  "Quality assurance",
  "MySQL",
  "SQLite",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Supabase",
  "Firebase",
  "Prisma",
  "Drizzle ORM",
  "Data analysis",
  "Data engineering",
  "Data science",
  "Machine learning",
  "Deep learning",
  "Artificial intelligence",
  "Generative AI",
  "Large language models",
  "Prompt engineering",
  "Retrieval-augmented generation",
  "LangChain",
  "OpenAI API",
  "TensorFlow",
  "PyTorch",
  "scikit-learn",
  "Pandas",
  "NumPy",
  "Apache Spark",
  "Databricks",
  "Snowflake",
  "Power BI",
  "Tableau",
  "Excel",
  "Looker",
  "Data visualization",
  "UX design",
  "UI design",
  "Product design",
  "User research",
  "Design systems",
  "Prototyping",
  "Wireframing",
  "Adobe Creative Suite",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Sketch",
  "Product strategy",
  "Product discovery",
  "Roadmapping",
  "Agile",
  "Scrum",
  "Kanban",
  "Jira",
  "Confluence",
  "Notion",
  "Stakeholder management",
  "Business analysis",
  "Requirements gathering",
  "Market research",
  "A/B testing",
  "Google Analytics",
  "SEO",
  "Content marketing",
  "Email marketing",
  "Social media marketing",
  "Performance marketing",
  "Copywriting",
  "Sales",
  "Business development",
  "Account management",
  "Customer success",
  "Customer support",
  "CRM",
  "Salesforce",
  "HubSpot",
  "Financial analysis",
  "Financial modeling",
  "Accounting",
  "Recruiting",
  "Human resources",
  "Operations management",
  "Supply chain management",
  "Healthcare",
  "Cybersecurity",
  "Information security",
  "Penetration testing",
  "Communication",
  "Leadership",
  "Problem solving",
  "Critical thinking",
  "Teamwork",
  "Time management",
  "English",
  "German",
  "French",
  "Spanish",
] as const;

function normalizeSkill(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9+#.]+/g, " ");
}

export function searchLocalSkills(query: string, limit = 20): string[] {
  const normalizedQuery = normalizeSkill(query);
  if (!normalizedQuery) return [...POPULAR_SKILLS].slice(0, limit);

  return SKILL_CATALOG.map((skill, index) => {
    const normalizedSkill = normalizeSkill(skill);
    const score =
      normalizedSkill === normalizedQuery
        ? 0
        : normalizedSkill.startsWith(normalizedQuery)
          ? 1
          : normalizedSkill.includes(normalizedQuery)
            ? 2
            : 3;
    return { skill, index, score };
  })
    .filter(({ score }) => score < 3)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .slice(0, limit)
    .map(({ skill }) => skill);
}

export function uniqueSkills(skills: string[], limit = 20): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawSkill of skills) {
    const skill = rawSkill.trim().replace(/\s+/g, " ").slice(0, 80);
    const normalized = normalizeSkill(skill);
    if (!skill || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(skill);
    if (result.length >= limit) break;
  }
  return result;
}
