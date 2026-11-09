// Project "Start here" view: groups a project's notes into sections by their
// existing `category` field, so a project reads like a structured knowledge
// hub (Architecture · Guides · How-to · Reference …) instead of one flat list.
// Pure and framework-free; no new columns — a note's section is its category.

import { sortNotesMeta, type NoteMeta } from "@/lib/notes"

/**
 * Suggested sections, in display order. Offered in the note editor's category
 * field; any other category still works and is listed after these.
 */
export const PROJECT_SECTIONS = [
  "Start here",
  "Architecture",
  "Guides",
  "How-to",
  "Reference",
  "Open questions",
] as const

/** Heading for notes with no category. Always listed last. */
export const UNSORTED_SECTION = "Unsorted"

export interface NoteSection {
  /** Stable key (lowercased, trimmed category; "" for unsorted). */
  key: string
  label: string
  notes: NoteMeta[]
}

function sectionKey(category: string | undefined): string {
  return (category ?? "").trim().replace(/\s+/g, " ").toLowerCase()
}

const SUGGESTED_ORDER = new Map<string, number>(
  PROJECT_SECTIONS.map((label, index) => [label.toLowerCase(), index]),
)

/**
 * Group notes by category. Categories match case- and whitespace-insensitively
 * ("how-to" and " How-to " are one section). Order: suggested sections in
 * PROJECT_SECTIONS order, then other categories A→Z, then Unsorted. Within a
 * section: pinned first, then most recently updated. Empty sections are omitted.
 */
export function groupNotesBySection(notes: NoteMeta[]): NoteSection[] {
  const groups = new Map<string, NoteSection>()
  for (const note of notes) {
    const key = sectionKey(note.category)
    let group = groups.get(key)
    if (!group) {
      const suggested = PROJECT_SECTIONS.find((label) => label.toLowerCase() === key)
      const label =
        key === "" ? UNSORTED_SECTION : (suggested ?? note.category!.trim().replace(/\s+/g, " "))
      group = { key, label, notes: [] }
      groups.set(key, group)
    }
    group.notes.push(note)
  }

  const rank = (section: NoteSection): [number, string] => {
    if (section.key === "") return [2, ""]
    const suggested = SUGGESTED_ORDER.get(section.key)
    return suggested !== undefined ? [0, String(suggested).padStart(3, "0")] : [1, section.key]
  }

  return [...groups.values()]
    .map((section) => ({ ...section, notes: sortNotesMeta(section.notes) }))
    .sort((a, b) => {
      const [ra, ka] = rank(a)
      const [rb, kb] = rank(b)
      return ra !== rb ? ra - rb : ka.localeCompare(kb)
    })
}

/**
 * "Key notes" for the Start here view: pinned notes, most recently updated
 * first. Pinning is how a note becomes a core page of the project.
 */
export function selectKeyNotes(notes: NoteMeta[], limit = 6): NoteMeta[] {
  return sortNotesMeta(notes.filter((note) => note.pinned)).slice(0, limit)
}
