import Link from "next/link"

import { quickAccessModules } from "@/lib/learning-modules"

// The four everyday skills as equal tiles. Vocabulary shows its live due
// count; the others show no number rather than a placeholder.
export function QuickAccessGrid({ vocabDue }: { vocabDue: number | null }) {
  return (
    <section aria-labelledby="quick-access-heading" className="space-y-3">
      <h2 id="quick-access-heading" className="text-sm font-semibold text-foreground">
        Practice a skill
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {quickAccessModules.map((module) => {
          const Icon = module.icon
          const badge =
            module.id === "vocab" && vocabDue != null && vocabDue > 0
              ? `${vocabDue.toLocaleString()} due`
              : null
          return (
            <li key={module.id}>
              <Link
                href={module.href}
                className="app-surface group flex h-full min-h-24 flex-col p-4 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  {badge && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="mt-3 text-sm font-semibold text-foreground">{module.title}</span>
                <span className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {module.description}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
