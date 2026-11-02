"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { ProjectWorkspace } from "@/components/notes/ProjectWorkspace"
import { Skeleton } from "@/components/ui/skeleton"
import { useNoteProject } from "@/hooks/useNoteProjects"
import { useNotes } from "@/hooks/useNotes"
import { useSessionTimer } from "@/hooks/useSessionTimer"

function BackToNotes() {
  return (
    <Link
      href="/notes"
      className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary hover:underline"
    >
      <ChevronLeft size={14} aria-hidden="true" />
      Back to Notes
    </Link>
  )
}

export default function ProjectWorkspacePage() {
  useSessionTimer("notes")
  const params = useParams<{ id: string }>()
  const id = params.id
  const { project, loading, unavailable, error } = useNoteProject(id)
  const { notes, loading: notesLoading, error: notesError } = useNotes()

  if (loading || (project && notesLoading)) {
    return (
      <div className="space-y-6 pb-12" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-4">
          <Skeleton className="size-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (unavailable) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <p className="text-sm font-semibold text-foreground">Projects aren&apos;t set up yet.</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The database update for projects hasn&apos;t been applied. Your notes are unaffected.
        </p>
        <BackToNotes />
      </div>
    )
  }

  // RLS returns no row for someone else's project, so this also covers "not yours".
  if (error || !project) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <p className="text-sm font-semibold text-foreground">Project not found.</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          It may have been deleted, or the link is wrong.
        </p>
        <BackToNotes />
      </div>
    )
  }

  return (
    <div className="pb-12">
      {notesError && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {notesError} The project&apos;s notes may be missing below.
        </p>
      )}
      <ProjectWorkspace project={project} notes={notes} />
    </div>
  )
}
