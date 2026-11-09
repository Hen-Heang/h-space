"use client"

import { useRef } from "react"
import { Bot } from "lucide-react"
import { toast } from "sonner"

import { useProjectAiAccess } from "@/hooks/useNoteProjects"
import { getApiErrorMessage } from "@/lib/api"
import { PROJECT_AI_LEVELS, type ProjectAiLevel } from "@/lib/note-projects"
import { cn } from "@/lib/utils"

const SAVED: Record<ProjectAiLevel, string> = {
  off: "AI access turned off",
  read: "AI apps can now read this project",
  edit: "AI apps can now read and edit this project",
}

/**
 * AI permission for one Notes project — what AI apps the owner connected to
 * H-Space over MCP (Claude, ChatGPT) may do here: Off (default), Read only,
 * or Read & edit. They can never delete notes. The database enforces the
 * edit level too (migration 20261109170000_note_projects_ai_edit_level.sql).
 *
 * Hidden while loading and when AI access isn't set up on this database, so
 * the workspace never shows a control that can't save. Before the
 * ai_can_edit migration, Read only is shown but disabled.
 */
export function ProjectAiAccess({ projectId }: { projectId: string }) {
  const { access, setLevel } = useProjectAiAccess(projectId)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  if (access === null) return null

  const options = PROJECT_AI_LEVELS.map((option) => ({
    ...option,
    disabled: option.value === "read" && !access.readOnlyAvailable,
  }))
  const current = options.find((option) => option.value === access.level) ?? options[0]

  const choose = async (level: ProjectAiLevel) => {
    if (level === access.level || setLevel.isPending) return
    try {
      await setLevel.mutateAsync(level)
      toast.success(SAVED[level])
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't change AI access. Try again."))
    }
  }

  // Radio-group keyboard pattern: arrows move between enabled options and select.
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0
    if (!step) return
    event.preventDefault()
    let next = index
    do next = (next + step + options.length) % options.length
    while (options[next].disabled && next !== index)
    buttons.current[next]?.focus()
    void choose(options[next].value)
  }

  return (
    <section
      aria-labelledby="project-ai-access-label"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Bot size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p id="project-ai-access-label" className="text-sm font-semibold text-foreground">
            AI access
          </p>
          <p id="project-ai-access-hint" className="mt-0.5 text-xs text-muted-foreground">
            {current.hint}
            {access.level !== "off" &&
              " Don't keep confidential work material here while AI access is on."}
          </p>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="project-ai-access-label"
        aria-describedby="project-ai-access-hint"
        className="flex shrink-0 rounded-lg border border-border bg-muted/40 p-0.5"
      >
        {options.map((option, index) => {
          const checked = option.value === access.level
          return (
            <button
              key={option.value}
              ref={(node) => {
                buttons.current[index] = node
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              disabled={option.disabled || setLevel.isPending}
              title={option.disabled ? "Available after the next database update" : undefined}
              onClick={() => void choose(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "min-h-10 flex-1 rounded-md px-3 text-xs font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed sm:flex-none",
                checked
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                option.disabled && "opacity-50",
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
