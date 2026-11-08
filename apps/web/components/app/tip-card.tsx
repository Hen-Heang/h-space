import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export function TipCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-border bg-card/50 p-6 backdrop-blur-sm dark:bg-slate-900/20">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={20} />
        </div>
        <div>
          <h4 className="text-base font-bold text-foreground">{title}</h4>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground">
            {children}
          </p>
        </div>
      </div>
    </div>
  )
}
