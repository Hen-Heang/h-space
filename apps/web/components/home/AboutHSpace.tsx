import { Bot, Database, Layers3 } from "lucide-react"

import { cn } from "@/lib/utils"

const architecture = [
  {
    title: "Product workspace",
    description:
      "H-Space connects learning, finance, AI engineering, productivity, and development projects in one portfolio-ready home.",
    icon: Layers3,
  },
  {
    title: "Application architecture",
    description:
      "The app uses Next.js 16, React 19, and TypeScript, with Supabase authentication, Postgres data protected by RLS, and a domain-based API layer.",
    icon: Database,
  },
  {
    title: "AI engineering",
    description:
      "Authenticated Next.js route handlers use the Vercel AI SDK and OpenAI for coaching, structured feedback, speech, and retrieval-backed experiences.",
    icon: Bot,
  },
]

export function AboutHSpace({ className }: { className?: string }) {
  return (
    <section
      id="about-h-space"
      aria-labelledby="about-h-space-title"
      className={cn("rounded-3xl border border-border bg-muted/25 p-6 sm:p-8", className)}
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
          Purpose and architecture
        </p>
        <h2
          id="about-h-space-title"
          className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          About H-Space
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          H-Space is my personal software ecosystem: a place to use the products I build, connect
          the work behind them, and present concrete engineering decisions during portfolio reviews
          and job interviews.
        </p>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {architecture.map((item) => (
          <div key={item.title}>
            <item.icon className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
