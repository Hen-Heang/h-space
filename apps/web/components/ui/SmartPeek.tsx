"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { motion, AnimatePresence } from "motion/react"
import { BookmarkPlus, Loader2, CheckCircle2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AiGenerating } from "@/components/ui/ai-loading"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { vocabApi } from "@/lib/api"

type PeekData = {
  word: string
  definition: string
  example?: string
  hanja?: string
}

// Lookups are pure word→definition queries, so cache them for the whole
// session — re-tapping a word (or meeting it again in another text) is free.
const lookupCache = new Map<string, PeekData>()

export function SmartPeek({ word, children }: { word: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<PeekData | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    if (data || loading) return
    const cached = lookupCache.get(word)
    if (cached) {
      setData(cached)
      return
    }
    setLoading(true)
    try {
      const res = await vocabApi.lookup(word)
      const peek: PeekData = {
        word,
        definition: res.definition || "No definition found.",
        example: res.example ?? undefined,
        hanja: res.hanja ?? undefined,
      }
      lookupCache.set(word, peek)
      setData(peek)
    } catch {
      setData({ word, definition: "Could not fetch definition." })
    } finally {
      setLoading(false)
    }
  }, [word, data, loading])

  const handleSave = async () => {
    if (!data || saving || saved) return
    setSaving(true)
    try {
      await vocabApi.save({
        term: data.word,
        meaning: data.definition,
        example: data.example,
        category: "Peek Lookup",
      })
      setSaved(true)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const isKorean = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]/.test(word)
  if (!isKorean) return <>{children}</>

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (val) fetchData()
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button className="inline-block rounded-sm px-0.5 font-bold text-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-400">
          {children}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="center"
          side="top"
          sideOffset={8}
          className="z-50 w-72 outline-none"
        >
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="overflow-hidden rounded-[1.5rem] border border-border bg-card/90 p-4 shadow-2xl backdrop-blur-xl dark:bg-slate-900/90"
              >
                {loading ? (
                  <div className="space-y-3 py-1">
                    <AiGenerating
                      stages={["Looking up the word…", "Writing an example…"]}
                      stageDuration={1600}
                    />
                    <div className="space-y-2 pt-1">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  </div>
                ) : data ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate text-xl font-bold tracking-tight text-foreground">
                            {data.word}
                          </h4>
                          {data.hanja && (
                            <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-muted-foreground">
                              {data.hanja}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {data.definition}
                        </p>
                      </div>
                      <button
                        onClick={() => setOpen(false)}
                        aria-label="Close"
                        className="-mr-2 -mt-2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {data.example && (
                      <div className="rounded-xl bg-accent/50 p-2.5 text-xs font-medium leading-relaxed text-muted-foreground">
                        {data.example}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className={cn(
                          "h-9 flex-1 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                          saved
                            ? "bg-emerald-500 hover:bg-emerald-500"
                            : "bg-emerald-600 hover:bg-emerald-500",
                        )}
                        onClick={handleSave}
                        disabled={saving || saved}
                      >
                        {saving ? (
                          <Loader2 size={14} className="mr-2 animate-spin" />
                        ) : saved ? (
                          <CheckCircle2 size={14} className="mr-2" />
                        ) : (
                          <BookmarkPlus size={14} className="mr-2" />
                        )}
                        {saved ? "Saved" : "Save to Vocab"}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <PopoverPrimitive.Arrow className="fill-border" />
              </motion.div>
            )}
          </AnimatePresence>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
