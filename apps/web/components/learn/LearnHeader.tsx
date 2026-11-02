import type { ReactNode } from "react"

// A learning section's header: one line saying what it is, plus its actions.
// No title — the shell header renders the page's only h1 — and no stat tiles.
export function LearnHeader({
  description,
  actions,
}: {
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
