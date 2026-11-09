// Local, unsaved-draft protection for the note editor — pure helpers, tested
// in note-drafts.test.ts. The editor (components/notes/NoteEditor.tsx) owns
// the localStorage reads and writes; this decides keys, the stored shape and
// whether a stored draft may be applied.
//
// A draft only exists while the editor holds changes that aren't saved yet.
// An edit draft remembers which version of the note it started from
// (`baseUpdatedAt`), so a draft can never silently replace a newer version of
// the note (edited on another device or through the MCP connector).

const KEY_PREFIX = "hengo-note-draft:"
const VERSION = 2

export type NoteEditorMode = "create" | "edit"

export interface StoredNoteDraft<V> {
  values: V
  /** The note's updated_at when the draft started; null for a new note. */
  baseUpdatedAt: string | null
  /** Written before drafts were versioned: no base version is known. */
  legacy: boolean
}

/**
 * localStorage key for a draft. A new note started inside a project gets its
 * own key, so its draft (and project) only comes back in that project.
 * The plain keys are unchanged from before, so older drafts are still found.
 */
export function noteDraftKey(mode: NoteEditorMode, slug: string, projectId = ""): string {
  if (mode === "edit") return `${KEY_PREFIX}${slug}`
  return projectId ? `${KEY_PREFIX}new:${projectId}` : `${KEY_PREFIX}new`
}

export function serializeNoteDraft<V>(values: V, baseUpdatedAt: string | null): string {
  return JSON.stringify({ v: VERSION, values, baseUpdatedAt })
}

/** Parses a stored draft; null when missing, corrupt or not an object. */
export function parseNoteDraft<V extends object>(raw: string | null): StoredNoteDraft<V> | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  if (record.v === VERSION) {
    const values = record.values
    if (!values || typeof values !== "object" || Array.isArray(values)) return null
    const base = record.baseUpdatedAt
    return {
      values: values as V,
      baseUpdatedAt: typeof base === "string" ? base : null,
      legacy: false,
    }
  }
  // Pre-versioning drafts stored the editor values directly.
  return { values: record as V, baseUpdatedAt: null, legacy: true }
}

/** Field-by-field equality, independent of key order. */
export function sameDraftValues(a: object, b: object): boolean {
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) return false
  }
  return true
}

export type DraftRestoreAction =
  /** Nothing worth restoring: the draft matches what the editor opens with. */
  | "discard"
  /** Safe to put back into the editor straight away. */
  | "apply"
  /** The note may have changed since the draft: let the user decide. */
  | "ask"

export function draftRestoreAction<V extends object>({
  mode,
  draft,
  initial,
  baseUpdatedAt,
}: {
  mode: NoteEditorMode
  draft: StoredNoteDraft<V>
  initial: V
  /** The note's updated_at when the editor opened; ignored for a new note. */
  baseUpdatedAt: string | null
}): DraftRestoreAction {
  if (sameDraftValues({ ...initial, ...draft.values }, initial)) return "discard"
  if (mode === "create") return "apply"
  const unchangedSince =
    !draft.legacy && baseUpdatedAt != null && draft.baseUpdatedAt === baseUpdatedAt
  return unchangedSince ? "apply" : "ask"
}
