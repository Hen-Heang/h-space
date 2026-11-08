"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, ClipboardPaste, Pencil, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { prepareVocabImport } from "@/lib/vocab-import"

type TextbookImportProps = {
  /** Terms already saved in the dictionary, used to skip duplicates. */
  existingTerms: string[]
  /** Imports the cleaned word list and returns how many words were created. */
  onImport: (deckName: string, text: string) => Promise<number>
  /** Renders without the card chrome/header, for use inside the Add Words dialog. */
  embedded?: boolean
}

export function TextbookImport({ existingTerms, onImport, embedded = false }: TextbookImportProps) {
  const [deckName, setDeckName] = useState("")
  const [text, setText] = useState("")
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState("")

  // Entries the user can fine-tune (edit/remove) before importing — re-parsed
  // from the pasted text whenever it changes, so manual edits to the textarea
  // win, but a removed/edited entry survives until the next paste.
  const [entries, setEntries] = useState<string[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState("")

  const prepared = useMemo(() => prepareVocabImport(text, existingTerms), [text, existingTerms])

  useEffect(() => {
    setEntries(prepared.entries)
    setEditingIndex(null)
  }, [prepared.entries])

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  function startEditing(index: number) {
    setEditingIndex(index)
    setEditingValue(entries[index])
  }

  function saveEditing() {
    if (editingIndex === null) return
    const value = editingValue.trim()
    setEntries((prev) =>
      value
        ? prev.map((entry, i) => (i === editingIndex ? value : entry))
        : prev.filter((_, i) => i !== editingIndex),
    )
    setEditingIndex(null)
  }

  async function handleImport() {
    if (!deckName.trim() || !entries.length) return
    setImporting(true)
    setMessage("")
    try {
      const count = await onImport(deckName.trim(), entries.join("\n"))
      setMessage(
        count > 0
          ? `Imported ${count} words into "${deckName.trim()}".`
          : "No vocabulary entries found in that text.",
      )
      if (count > 0) {
        setText("")
      }
    } catch {
      setMessage("Import failed. Please try again.")
    } finally {
      setImporting(false)
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
              <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
              <p className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Textbook Import
              </p>
            </div>
            <h3 className="mt-3 text-xl font-bold text-foreground sm:mt-4 sm:text-2xl">
              Paste Your Lesson
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
              Copy a word list from your textbook (사회통합프로그램, TOPIK, class notes) and paste
              it here. AI turns it into flashcards — your translations are kept exactly as written.
            </p>
          </div>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 sm:flex">
            <ClipboardPaste size={24} />
          </div>
        </div>
      )}

      <div className={cn("space-y-3", !embedded && "mt-6")}>
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder='Deck name, e.g. "사회통합 1과 — 대인 관계"'
          maxLength={100}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground placeholder:text-sm placeholder:text-muted-foreground/40 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition-colors sm:text-sm"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Paste the lesson word list…\n\n1. 공감 (empathy)\n2. 관계 (relationship)\n..."
          }
          rows={6}
          maxLength={8000}
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base font-medium text-foreground placeholder:text-sm placeholder:text-muted-foreground/40 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition-colors sm:resize-y sm:text-sm"
        />
        {text.trim() && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs font-bold">
            <span
              className={
                entries.length ? "text-violet-600 dark:text-violet-400" : "text-destructive"
              }
            >
              {entries.length
                ? `${entries.length} word${entries.length === 1 ? "" : "s"} ready to import`
                : "No vocabulary entries detected"}
            </span>
            {prepared.duplicatesRemoved > 0 && (
              <span className="text-muted-foreground">
                {prepared.duplicatesRemoved} duplicate{prepared.duplicatesRemoved === 1 ? "" : "s"}{" "}
                merged
              </span>
            )}
            {prepared.alreadySaved > 0 && (
              <span className="text-muted-foreground">
                {prepared.alreadySaved} already in your dictionary
              </span>
            )}
            {entries.length > 100 && (
              <span className="text-muted-foreground">Large list — import may take a moment</span>
            )}
          </div>
        )}
        {entries.length > 0 && (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-background/60 p-2">
            {entries.map((entry, index) => (
              <li
                key={index}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent/5"
              >
                {editingIndex === index ? (
                  <input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditing()
                      if (e.key === "Escape") setEditingIndex(null)
                    }}
                    className="flex-1 rounded-lg border border-violet-500/40 bg-card px-2 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(index)}
                    className="flex-1 truncate text-left transition-colors hover:text-violet-600 dark:hover:text-violet-400"
                  >
                    {entry}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEditing(index)}
                  aria-label="Edit entry"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => removeEntry(index)}
                  aria-label="Remove entry"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Button
            className="h-12 w-full rounded-2xl bg-violet-600 px-7 text-sm font-bold text-white shadow-xl shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95 sm:w-auto"
            onClick={handleImport}
            disabled={!deckName.trim() || !entries.length || importing}
          >
            {importing ? (
              <>
                <Activity size={18} className="mr-2 animate-pulse" /> Importing...
              </>
            ) : (
              <>
                <ClipboardPaste size={18} className="mr-2" /> Import Words
              </>
            )}
          </Button>
          {message && (
            <span className="text-center text-xs font-bold text-violet-600 dark:text-violet-400 sm:text-left">
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
