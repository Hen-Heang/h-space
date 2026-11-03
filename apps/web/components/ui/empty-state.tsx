import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * What a view shows when it has nothing yet: an optional neutral icon, one
 * short title, one helpful sentence and one next action. No border by
 * default — pass `surface` when it replaces a whole list that sat on a card.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  surface = false,
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  surface?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 py-10 text-center",
        surface && "app-surface",
        className,
      )}
    >
      {Icon && <Icon size={24} strokeWidth={1.75} aria-hidden className="text-muted-foreground" />}
      <p className={cn("text-base font-medium text-foreground", Icon && "mt-3")}>{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
