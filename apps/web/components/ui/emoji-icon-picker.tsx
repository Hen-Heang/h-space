"use client"

import * as React from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Compact replacement for Orbit's 377-line emoji-icon-picker. Preserves the
// function (pick an emoji icon, or clear it) with a curated grid instead of the
// full searchable set. Same API: { value, onChange, align, children-as-trigger }.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Goals", emojis: ["🎯", "🚀", "⭐", "🏆", "🔥", "💎", "📈", "✅"] },
  { label: "Work", emojis: ["💼", "💻", "📊", "📝", "📅", "⏰", "📌", "🗂️"] },
  { label: "Learn", emojis: ["📚", "🎓", "🧠", "✍️", "🔬", "🌏", "🗣️", "💡"] },
  { label: "Life", emojis: ["🏃", "🧘", "💪", "🥗", "💰", "✈️", "🏠", "❤️"] },
  { label: "Fun", emojis: ["🎨", "🎵", "🎸", "📷", "🎮", "🌱", "☕", "🎉"] },
]

interface EmojiIconPickerProps {
  value: string | null
  onChange: (emoji: string | null) => void
  align?: "start" | "center" | "end"
  children: React.ReactNode
}

export default function EmojiIconPicker({
  value,
  onChange,
  align = "start",
  children,
}: EmojiIconPickerProps) {
  const [open, setOpen] = React.useState(false)

  const pick = (emoji: string | null) => {
    onChange(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pick an icon
            </span>
            {value && (
              <Button variant="ghost" size="xs" onClick={() => pick(null)}>
                Clear
              </Button>
            )}
          </div>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => pick(emoji)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-accent",
                        value === emoji && "bg-primary/15 ring-1 ring-primary/40",
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
