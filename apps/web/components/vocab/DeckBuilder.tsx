"use client"

import { useState } from "react"
import { Activity, BookOpenCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { id: "Daily Life", label: "Daily Life", emoji: "🌅" },
  { id: "Workplace", label: "Workplace", emoji: "💼" },
  { id: "Developer", label: "Developer", emoji: "💻" },
  { id: "Meeting & Standup", label: "Meeting", emoji: "🗣️" },
  { id: "Greetings", label: "Greetings", emoji: "👋" },
  { id: "Food & Drinks", label: "Food", emoji: "🍱" },
  { id: "Travel & Transport", label: "Travel", emoji: "✈️" },
  { id: "Shopping", label: "Shopping", emoji: "🛍️" },
  { id: "Health & Body", label: "Health", emoji: "🏥" },
  { id: "Numbers & Time", label: "Time", emoji: "🕙" },
]

type DeckBuilderProps = {
  dueCount: number
  totalCount: number
  onGenerate: (category: string) => Promise<void>
  /** Renders without the card chrome/header, for use inside the Add Words dialog. */
  embedded?: boolean
}

export function DeckBuilder({
  dueCount,
  totalCount,
  onGenerate,
  embedded = false,
}: DeckBuilderProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    if (!selectedCategory) return
    setGenerating(true)
    try {
      await onGenerate(selectedCategory)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className={cn(
        !embedded &&
          "rounded-3xl border border-border bg-card p-5 shadow-xl dark:bg-slate-900/40 sm:rounded-3xl sm:p-8",
      )}
    >
      {!embedded && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Card Generator
              </p>
            </div>
            <h3 className="mt-3 text-xl font-bold text-foreground sm:mt-4 sm:text-2xl">
              AI Deck Builder
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
              Select a category to expand your vocabulary with relevant high-frequency terms.
            </p>
          </div>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 sm:flex">
            <BookOpenCheck size={24} strokeWidth={2.5} />
          </div>
        </div>
      )}

      <div className={cn("grid grid-cols-3 gap-2 lg:grid-cols-5", !embedded && "mt-6 sm:mt-8")}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all active:scale-95 sm:gap-2 sm:p-4",
              selectedCategory === cat.id
                ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/20"
                : "border-border bg-background text-muted-foreground hover:border-indigo-500/40 hover:bg-indigo-500/[0.02]",
            )}
          >
            <span className="text-lg sm:text-xl">{cat.emoji}</span>
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-tight sm:text-xs",
                selectedCategory === cat.id
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-muted-foreground",
              )}
            >
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6",
          embedded ? "mt-4" : "mt-6 border-t border-border/60 pt-6 sm:mt-10 sm:pt-8",
        )}
      >
        <Button
          className="h-14 w-full rounded-2xl bg-indigo-600 px-6 text-base font-bold text-white shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95 sm:w-auto sm:px-8"
          onClick={handleGenerate}
          disabled={!selectedCategory || generating}
        >
          {generating ? (
            <>
              <Activity size={20} className="mr-2 shrink-0 animate-pulse" /> Generating...
            </>
          ) : (
            <>
              <Sparkles size={20} strokeWidth={2.5} className="mr-2 shrink-0" />
              <span className="truncate">Build {selectedCategory || "New Deck"}</span>
            </>
          )}
        </Button>
        <div className="flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:justify-end">
          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0">
            <span>{dueCount} REVIEWS DUE</span>
            <span className="sm:mt-0.5">{totalCount} TOTAL CARDS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
