"use client"

import { useCallback, useMemo } from "react"
import { Eye, EyeOff } from "lucide-react"

import { useBrowserStorage } from "@/hooks/useBrowserStorage"
import { useRomanizationPreference } from "@/hooks/useRomanizationPreference"
import { cn } from "@/lib/utils"

// Romanization / English toggles for a Korean reader (a Foundations lesson, a
// Reading unit). The account's romanization preference (set on Korean Coach
// preferences) decides whether the romanization toggle exists at all: "never"
// hides it. Each surface keeps its own on/off choice per viewer in
// localStorage — a convenience only, never learning data.

export type LanguageAids = { romanization: boolean; english: boolean }

function parseStored(raw: string | null): Partial<LanguageAids> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Partial<LanguageAids>
    return typeof parsed === "object" && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * `defaults` are what the surface showed before these toggles existed, so a
 * viewer who never touches them sees no change.
 */
export function useLanguageAids(scope: string, defaults: LanguageAids) {
  const preference = useRomanizationPreference()
  const romanizationAllowed = preference !== "never"
  const [raw, write] = useBrowserStorage("local", `koriai-learn-aids:${scope}`)
  const { romanization, english } = defaults
  const aids = useMemo<LanguageAids>(
    () => ({ romanization, english, ...parseStored(raw) }),
    [raw, romanization, english],
  )

  const toggle = useCallback(
    (key: keyof LanguageAids) => write(JSON.stringify({ ...aids, [key]: !aids[key] })),
    [aids, write],
  )

  return {
    showRomanization: romanizationAllowed && aids.romanization,
    showEnglish: aids.english,
    romanizationAllowed,
    aids,
    toggle,
  }
}

export function LanguageAidsBar({
  aids,
  romanizationAllowed,
  onToggle,
  className,
}: {
  aids: LanguageAids
  romanizationAllowed: boolean
  onToggle: (key: keyof LanguageAids) => void
  className?: string
}) {
  const options: Array<{ key: keyof LanguageAids; label: string }> = [
    ...(romanizationAllowed ? [{ key: "romanization" as const, label: "Romanization" }] : []),
    { key: "english", label: "English" },
  ]
  return (
    <div role="group" aria-label="Language aids" className={cn("flex flex-wrap gap-2", className)}>
      {options.map(({ key, label }) => {
        const on = aids[key]
        const Icon = on ? Eye : EyeOff
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(key)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors [@media(pointer:coarse)]:min-h-11",
              on
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
