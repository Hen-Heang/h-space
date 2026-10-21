export type HSpaceProject = {
  id: "hengo-learning" | "money-flow" | "luyra" | "h-phsar" | "portfolio"
  name: string
  area: string
  description: string
  stack: string[]
  links: Array<{
    label: string
    href: string
    kind: "app" | "github" | "demo"
  }>
}

/**
 * Public, interview-ready project facts. Keep this list grounded in each
 * repository's README and only add a demo URL when a live deployment is known.
 */
export const hSpaceProjects: HSpaceProject[] = [
  {
    id: "hengo-learning",
    name: "Hengo Learning",
    area: "Learning & AI",
    description:
      "A Korean-learning workspace for engineers, with spaced repetition, workplace practice, interview preparation, and authenticated AI coaching.",
    stack: ["Next.js 16", "React 19", "Supabase", "Vercel AI SDK", "OpenAI"],
    links: [
      { label: "Open app", href: "/learn", kind: "app" },
      { label: "GitHub", href: "https://github.com/Hen-Heang/h-space", kind: "github" },
    ],
  },
  {
    id: "money-flow",
    name: "Money Flow",
    area: "Personal finance",
    description:
      "A mobile-first finance PWA for cash flow, budgets, savings, recurring transactions, reports, and reviewable AI-assisted insights.",
    stack: ["Next.js 16", "TypeScript", "Supabase", "TanStack Query", "Vercel AI SDK"],
    links: [
      { label: "Live demo", href: "https://money-flow.henheang.site", kind: "demo" },
      { label: "GitHub", href: "https://github.com/Hen-Heang/money-flow", kind: "github" },
    ],
  },
  {
    id: "luyra",
    name: "Luyra",
    area: "Finance & automation",
    description:
      "A personal finance workspace with Supabase authentication, Neon application data, scheduled reviews, AI-assisted money coaching, and notifications.",
    stack: ["Next.js 16", "TypeScript", "Supabase Auth", "Neon Postgres", "Vercel Workflow"],
    links: [{ label: "GitHub", href: "https://github.com/Hen-Heang/luyra-web", kind: "github" }],
  },
  {
    id: "h-phsar",
    name: "H-Phsar Commerce",
    area: "Full-stack commerce",
    description:
      "A B2B marketplace with buyer, supplier, and admin experiences backed by a secured order and inventory API.",
    stack: ["Next.js 16", "Spring Boot", "Spring Security", "MyBatis", "PostgreSQL"],
    links: [
      { label: "Frontend", href: "https://github.com/Hen-Heang/h-phsar-ui", kind: "github" },
      { label: "API", href: "https://github.com/Hen-Heang/h-phsar-api", kind: "github" },
    ],
  },
  {
    id: "portfolio",
    name: "Developer Portfolio",
    area: "Engineering portfolio",
    description:
      "A recruiter-focused portfolio with project case studies, a backend learning lab, resume views, and a retrieval-grounded AI assistant.",
    stack: ["Next.js 16", "React 19", "TypeScript", "Supabase", "OpenAI"],
    links: [
      { label: "Live site", href: "https://henheang.site", kind: "demo" },
      { label: "GitHub", href: "https://github.com/Hen-Heang/henheang", kind: "github" },
    ],
  },
]
