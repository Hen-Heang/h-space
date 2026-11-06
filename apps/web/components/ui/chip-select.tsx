"use client"

import { cn } from "@/lib/utils"

export function ChipSelect({
  options,
  value,
  onChange,
  className,
  getLabel,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
  className?: string
  /** Display text for an option; the option value itself is what onChange receives. */
  getLabel?: (option: string) => string
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "min-h-11 rounded-full border px-4 py-2 text-xs font-bold transition-all active:scale-95",
            value === option
              ? "border-blue-500/40 bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {getLabel ? getLabel(option) : option}
        </button>
      ))}
    </div>
  )
}
