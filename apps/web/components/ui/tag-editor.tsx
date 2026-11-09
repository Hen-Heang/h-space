"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { parseTagsInput } from "@/lib/tags"

/** Chip-based multi-tag editor — add via Enter/comma, remove via the × or Backspace. */
export function TagEditor({
  tags,
  onChange,
  placeholder = "Add tags…",
  id,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  /** Id for the text input, so a visible `<label htmlFor>` can name it. */
  id?: string
}) {
  const [input, setInput] = useState("")

  function commitInput() {
    if (!input.trim()) return
    const next = parseTagsInput([...tags, input].join(","))
    onChange(next)
    setInput("")
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-foreground"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            aria-label={`Remove tag ${tag}`}
            className="-mr-2 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground [@media(pointer:coarse)]:size-11"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        // A visible label (via `id`) names the input; otherwise fall back to this.
        aria-label={id ? undefined : "Add tags"}
        value={input}
        onChange={(e) => {
          if (e.target.value.endsWith(",")) {
            const next = parseTagsInput([...tags, e.target.value].join(","))
            onChange(next)
            setInput("")
          } else {
            setInput(e.target.value)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commitInput()
          } else if (e.key === "Backspace" && !input && tags.length > 0) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={commitInput}
        placeholder={tags.length === 0 ? placeholder : "Add another…"}
        className="min-h-11 min-w-[6rem] flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none sm:text-sm"
      />
    </div>
  )
}
