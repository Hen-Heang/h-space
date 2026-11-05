// Finance is no longer a card here: it lives inside H-Space at /finance and is
// reached from the nav's Finance item (`apps-luyra` in lib/navigation.ts).
export type HSpaceProject = {
  id: "hengo-learning" | "h-vault" | "h-phsar" | "portfolio"
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
  // Generic product card only — this list also renders on the public landing
  // page, so it must never carry account counts or any user's account data.
  {
    id: "h-vault",
    name: "H-Vault",
    area: "Personal accounts",
    description:
      "A private directory of which email or username belongs to each service, with categories, favorites, and search. Passwords stay in Bitwarden — H-Vault stores account information only.",
    stack: ["Next.js 16", "Supabase RLS", "TanStack Query", "Zod"],
    links: [{ label: "Open app", href: "/vault", kind: "app" }],
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
