"use client"

import { useState } from "react"
import { Check, Search, SlidersHorizontal, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChipSelect } from "@/components/ui/chip-select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/useMobile"
import {
  activeFilterChips,
  clearAllFilters,
  hasAnyFilter,
  panelFilterCount,
  removeFilter,
  searchOptions,
} from "@/lib/korean-phrasebook/filters"
import { categoryLabel, difficultyLabel, situationLabel } from "@/lib/korean-phrasebook/labels"
import type { PhraseFilters as PhraseFiltersValue } from "@/lib/korean-phrasebook/mastery"
import { cn } from "@/lib/utils"

interface PhraseFiltersProps {
  value: PhraseFiltersValue
  onChange: (next: PhraseFiltersValue) => void
  categories: string[]
  situations: string[]
  difficulties: string[]
}

const ALL = "All"

// Search stays visible; the few broad categories are chips; the long
// Situation and Difficulty lists live in a searchable panel (a popover on
// desktop, a bottom sheet on phones) so practice content isn't pushed down
// by a wall of chips. Values are always the stored keys — only labels map.
export function PhraseFilters({
  value,
  onChange,
  categories,
  situations,
  difficulties,
}: PhraseFiltersProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const chips = activeFilterChips(value)
  const panelCount = panelFilterCount(value)
  const hasPanel = situations.length > 1 || difficulties.length > 1

  const panel = (
    <FilterPanel
      value={value}
      onChange={onChange}
      situations={situations}
      difficulties={difficulties}
    />
  )

  const trigger = (
    <Button
      type="button"
      variant="outline"
      className="h-11 shrink-0 gap-2 rounded-2xl"
      aria-label={panelCount > 0 ? `Filters, ${panelCount} selected` : "Filters"}
      onClick={isMobile ? () => setOpen(true) : undefined}
    >
      <SlidersHorizontal aria-hidden="true" className="size-4" />
      Filters
      {panelCount > 0 && (
        <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]">
          {panelCount}
        </Badge>
      )}
    </Button>
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={value.query ?? ""}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Search questions, answers, vocabulary..."
            aria-label="Search Phrasebook"
            className="h-11 rounded-2xl pl-10 text-base sm:text-sm"
          />
        </div>
        {hasPanel &&
          (isMobile ? (
            trigger
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>{trigger}</PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                {panel}
              </PopoverContent>
            </Popover>
          ))}
      </div>

      {categories.length > 1 && (
        <div role="group" aria-label="Category" className="-mx-1 overflow-x-auto px-1 pb-1">
          <ChipSelect
            className="flex-nowrap sm:flex-wrap"
            options={[ALL, ...categories]}
            value={value.category ?? ALL}
            getLabel={(option) => (option === ALL ? ALL : categoryLabel(option))}
            onChange={(v) => onChange({ ...value, category: v === ALL ? undefined : v })}
          />
        </div>
      )}

      {(chips.some((c) => c.dimension !== "category") || hasAnyFilter(value)) && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips
            .filter((chip) => chip.dimension !== "category")
            .map((chip) => (
              <button
                key={chip.dimension}
                type="button"
                onClick={() => onChange(removeFilter(value, chip.dimension))}
                aria-label={`Remove filter: ${chip.label}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {chip.label}
                <X aria-hidden="true" className="size-3.5" />
              </button>
            ))}
          {hasAnyFilter(value) && (
            <button
              type="button"
              onClick={() => onChange(clearAllFilters())}
              className="min-h-9 rounded-full px-3 py-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {isMobile && hasPanel && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] gap-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <SheetHeader className="pb-2">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow cards by situation and difficulty.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 overflow-y-auto">{panel}</div>
            <div className="border-t border-border p-4">
              <Button className="h-11 w-full" onClick={() => setOpen(false)}>
                Show cards
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

function FilterPanel({
  value,
  onChange,
  situations,
  difficulties,
}: {
  value: PhraseFiltersValue
  onChange: (next: PhraseFiltersValue) => void
  situations: string[]
  difficulties: string[]
}) {
  const [situationQuery, setSituationQuery] = useState("")
  const visibleSituations = searchOptions(situations, situationQuery, "situation")

  return (
    <div className="space-y-4 p-4">
      {difficulties.length > 1 && (
        <div role="group" aria-labelledby="filter-difficulty-label">
          <p
            id="filter-difficulty-label"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Difficulty
          </p>
          <ChipSelect
            options={[ALL, ...difficulties]}
            value={value.difficulty ?? ALL}
            getLabel={(option) => (option === ALL ? ALL : difficultyLabel(option))}
            onChange={(v) => onChange({ ...value, difficulty: v === ALL ? undefined : v })}
          />
        </div>
      )}

      {situations.length > 1 && (
        <div role="group" aria-labelledby="filter-situation-label">
          <p
            id="filter-situation-label"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Situation
          </p>
          <Input
            type="search"
            value={situationQuery}
            onChange={(e) => setSituationQuery(e.target.value)}
            placeholder="Find a situation"
            aria-label="Find a situation"
            className="h-10 text-base sm:text-sm"
          />
          <ul className="mt-2 max-h-64 overflow-y-auto pr-1" aria-label="Situations">
            {value.situation && (
              <li>
                <SituationOption
                  label="Any situation"
                  selected={false}
                  onSelect={() => onChange(removeFilter(value, "situation"))}
                />
              </li>
            )}
            {visibleSituations.map((situation) => (
              <li key={situation}>
                <SituationOption
                  label={situationLabel(situation)}
                  selected={value.situation === situation}
                  onSelect={() =>
                    onChange(
                      value.situation === situation
                        ? removeFilter(value, "situation")
                        : { ...value, situation },
                    )
                  }
                />
              </li>
            ))}
            {visibleSituations.length === 0 && (
              <li className="px-2 py-3 text-sm text-muted-foreground">No situation matches.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function SituationOption({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "font-semibold text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      {selected && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
    </button>
  )
}
