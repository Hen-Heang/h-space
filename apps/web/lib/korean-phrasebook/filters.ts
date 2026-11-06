import type { PhraseFilters } from "./mastery"
import { categoryLabel, difficultyLabel, situationLabel } from "./labels"

// Pure helpers behind the compact Phrasebook filter bar. Filter values stay
// the stored keys (what filterPhraseCards compares against); only the labels
// shown to the learner are mapped.

export type FilterDimension = "category" | "situation" | "difficulty"

export interface ActiveFilterChip {
  dimension: FilterDimension
  value: string
  label: string
}

const LABEL_FOR: Record<FilterDimension, (key: string) => string> = {
  category: categoryLabel,
  situation: situationLabel,
  difficulty: difficultyLabel,
}

/** Selected filters as removable chips, in a stable order. Search isn't a chip. */
export function activeFilterChips(filters: PhraseFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = []
  for (const dimension of ["category", "situation", "difficulty"] as const) {
    const value = filters[dimension]
    if (value) chips.push({ dimension, value, label: LABEL_FOR[dimension](value) })
  }
  return chips
}

/** Count shown on the "Filters" button — only what lives inside the panel. */
export function panelFilterCount(filters: PhraseFilters): number {
  return (filters.situation ? 1 : 0) + (filters.difficulty ? 1 : 0)
}

export function removeFilter(filters: PhraseFilters, dimension: FilterDimension): PhraseFilters {
  const next = { ...filters }
  delete next[dimension]
  return next
}

/** Clears every filter and the search text. */
export function clearAllFilters(): PhraseFilters {
  return {}
}

export function hasAnyFilter(filters: PhraseFilters): boolean {
  return Boolean(
    filters.query?.trim() || filters.category || filters.situation || filters.difficulty,
  )
}

/** Options matching a search box, by readable label or by stored key. */
export function searchOptions(
  options: string[],
  query: string,
  dimension: FilterDimension,
): string[] {
  const q = query.trim().toLowerCase()
  const label = LABEL_FOR[dimension]
  const matches = q
    ? options.filter((o) => o.toLowerCase().includes(q) || label(o).toLowerCase().includes(q))
    : options
  return [...matches].sort((a, b) => label(a).localeCompare(label(b)))
}
