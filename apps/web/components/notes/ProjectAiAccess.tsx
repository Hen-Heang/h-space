"use client"

import { Bot } from "lucide-react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import { useProjectAiAccess } from "@/hooks/useNoteProjects"
import { getApiErrorMessage } from "@/lib/api"

/**
 * "Allow AI access" for one Notes project. When on, AI apps the owner has
 * connected to H-Space over MCP (e.g. Claude) can list, read, create and edit
 * this project's notes; they can never delete them. Off by default.
 *
 * Hidden while loading and when the ai_access migration isn't applied yet, so
 * the workspace never shows a switch that can't save.
 */
export function ProjectAiAccess({ projectId }: { projectId: string }) {
  const { enabled, setEnabled } = useProjectAiAccess(projectId)
  if (enabled === null) return null

  const toggle = async (next: boolean) => {
    try {
      await setEnabled.mutateAsync(next)
      toast.success(next ? "AI access turned on" : "AI access turned off")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't change AI access. Try again."))
    }
  }

  return (
    <section
      aria-labelledby="project-ai-access-label"
      className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
    >
      <Bot size={18} aria-hidden="true" className="mt-3 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 py-2">
        <p id="project-ai-access-label" className="text-sm font-semibold text-foreground">
          Allow AI access
        </p>
        <p id="project-ai-access-hint" className="mt-0.5 text-xs text-muted-foreground">
          {enabled
            ? "AI apps you've connected (like Claude) can read, add and edit notes in this project. They can't delete notes."
            : "Off: AI apps you've connected can't see this project or its notes."}{" "}
          Don&apos;t keep confidential work material here while this is on.
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={toggle}
        disabled={setEnabled.isPending}
        aria-labelledby="project-ai-access-label"
        aria-describedby="project-ai-access-hint"
      />
    </section>
  )
}
