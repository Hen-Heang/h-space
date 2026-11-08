"use client"

import { useState } from "react"
import { Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface RevealTextProps {
  label: string
  value?: string | null
  initiallyVisible: boolean
  className?: string
  textClassName?: string
}

/** Hide/reveal control shared by Learn and Listening mode for English, romanization, and answers. */
export function RevealText({
  label,
  value,
  initiallyVisible,
  className,
  textClassName,
}: RevealTextProps) {
  const [visible, setVisible] = useState(initiallyVisible)
  if (!value) return null

  if (visible) {
    return <p className={cn(textClassName, className)}>{value}</p>
  }

  return (
    <button
      type="button"
      onClick={() => setVisible(true)}
      aria-label={`Reveal ${label}`}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <Eye size={13} />
      Show {label}
    </button>
  )
}
