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
 * Lives in Project settings. Hidden while loading and when AI access isn't
 * set up on this database, so it never shows a control that can't save. Before the
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
    <section aria-labelledby="project-ai-access-label" className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Bot size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        <h3 id="project-ai-access-label" className="text-sm font-semibold text-foreground">
          AI access
        </h3>
        <span className="ml-auto text-xs font-medium text-muted-foreground">{current.label}</span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="project-ai-access-label"
        aria-describedby="project-ai-access-hint"
        className="flex rounded-lg border border-border bg-muted/40 p-0.5"
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
                "min-h-11 flex-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed sm:text-sm",
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
      <p id="project-ai-access-hint" className="text-xs text-muted-foreground">
        {current.hint}
        {access.level !== "off" &&
          " Don't keep confidential work material here while AI access is on."}
      </p>
    </section>
  )
}
