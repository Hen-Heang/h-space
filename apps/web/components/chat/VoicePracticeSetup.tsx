"use client"

import { useEffect, useState } from "react"
import { Mic } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  CAPTION_OPTIONS,
  CORRECTION_POLICY_OPTIONS,
  PACE_OPTIONS,
  PRACTICE_MODE_OPTIONS,
  type Option,
  type VoicePracticeOptions,
} from "@/lib/realtime/voice-practice"
import { cn } from "@/lib/utils"

type VoicePracticeSetupProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenarioTitle?: string | null
  defaults: VoicePracticeOptions
  onStart: (options: VoicePracticeOptions) => void
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string
  options: Option<T>[]
  value: T
  onSelect: (value: T) => void
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</h4>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]",
                active
                  ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/30"
                  : "border-border/60 bg-muted/20 hover:border-blue-500/30",
              )}
            >
              <span
                className={cn(
                  "text-xs font-bold",
                  active ? "text-blue-700 dark:text-blue-300" : "text-foreground",
                )}
              >
                {option.label}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                {option.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function VoicePracticeSetup({
  open,
  onOpenChange,
  scenarioTitle,
  defaults,
  onStart,
}: VoicePracticeSetupProps) {
  const [options, setOptions] = useState<VoicePracticeOptions>(defaults)

  // Re-sync when the sheet is reopened with new defaults (e.g. after a session).
  useEffect(() => {
    if (open) setOptions(defaults)
    // Only reset on open; changing defaults mid-open shouldn't clobber choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="dark max-h-[92dvh] gap-0 overflow-hidden rounded-t-3xl border-white/10 bg-slate-950 p-0 text-white shadow-2xl shadow-black/50"
      >
        <SheetHeader className="border-b border-white/10 px-5 pt-5 pb-4 text-left">
          <SheetTitle className="text-lg font-bold tracking-tight">
            Set up your speaking practice
          </SheetTitle>
          <SheetDescription className="text-xs">
            {scenarioTitle
              ? `Roleplay: ${scenarioTitle}`
              : "Choose how you want to practice today."}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <OptionGroup
            label="Practice mode"
            options={PRACTICE_MODE_OPTIONS}
            value={options.mode}
            onSelect={(mode) => setOptions((o) => ({ ...o, mode }))}
          />
          <OptionGroup
            label="Correction style"
            options={CORRECTION_POLICY_OPTIONS}
            value={options.correctionPolicy}
            onSelect={(correctionPolicy) => setOptions((o) => ({ ...o, correctionPolicy }))}
          />
          <OptionGroup
            label="Speaking pace"
            options={PACE_OPTIONS}
            value={options.pace}
            onSelect={(pace) => setOptions((o) => ({ ...o, pace }))}
          />
          <OptionGroup
            label="Captions"
            options={CAPTION_OPTIONS}
            value={options.captionMode}
            onSelect={(captionMode) => setOptions((o) => ({ ...o, captionMode }))}
          />
        </div>

        <div className="shrink-0 border-t border-white/10 bg-slate-950/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={() => onStart(options)}
            className="h-12 w-full gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500"
          >
            <Mic size={17} />
            {options.mode === "shadow" ? "Start shadowing" : "Start speaking"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
