"use client"

import { Search } from "lucide-react"
import { ChipSelect } from "@/components/ui/chip-select"
import { Input } from "@/components/ui/input"
import type { PhraseFilters as PhraseFiltersValue } from "@/lib/korean-phrasebook/mastery"

interface PhraseFiltersProps {
  value: PhraseFiltersValue
  onChange: (next: PhraseFiltersValue) => void
  categories: string[]
  situations: string[]
  difficulties: string[]
}

const ALL = "All"

export function PhraseFilters({
  value,
  onChange,
  categories,
  situations,
  difficulties,
}: PhraseFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={value.query ?? ""}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder="Search questions, answers, vocabulary..."
          aria-label="Search Phrasebook"
          className="h-11 rounded-2xl pl-10"
        />
      </div>

      {categories.length > 1 && (
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
            Category
          </p>
          <ChipSelect
            options={[ALL, ...categories]}
            value={value.category ?? ALL}
            onChange={(v) => onChange({ ...value, category: v === ALL ? undefined : v })}
          />
        </div>
      )}

      {situations.length > 1 && (
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
            Situation
          </p>
          <ChipSelect
            options={[ALL, ...situations]}
            value={value.situation ?? ALL}
            onChange={(v) => onChange({ ...value, situation: v === ALL ? undefined : v })}
          />
        </div>
      )}

      {difficulties.length > 1 && (
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground/70">
            Difficulty
          </p>
          <ChipSelect
            options={[ALL, ...difficulties]}
            value={value.difficulty ?? ALL}
            onChange={(v) => onChange({ ...value, difficulty: v === ALL ? undefined : v })}
          />
        </div>
      )}
    </div>
  )
}
