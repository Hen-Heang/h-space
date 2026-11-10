"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { NotesCaptureButton } from "@/components/notes/NotesCaptureButton"
import { NotesHome } from "@/components/notes/NotesHome"
import { ProjectFormDialog } from "@/components/notes/ProjectFormDialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useNoteProjectMutations, useNoteProjects } from "@/hooks/useNoteProjects"
import { useNotes } from "@/hooks/useNotes"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import type { ProjectInput } from "@/lib/note-projects"
import { containerVariants, itemVariants } from "@/lib/motion"

export default function NotesPage() {
  useSessionTimer("notes")
  const router = useRouter()
  const { notes, loading, error } = useNotes()
  const {
    projects,
    loading: projectsLoading,
    unavailable: projectsUnavailable,
    error: projectsError,
  } = useNoteProjects()
  const { create } = useNoteProjectMutations()
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)

  const createProject = async (input: ProjectInput) => {
    // Errors propagate to the dialog, which shows them and keeps the form open.
    const project = await create.mutateAsync(input)
    setProjectDialogOpen(false)
    toast.success("Project created")
    router.push(`/notes/projects/${project.id}`)
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-5 pb-12"
    >
      <motion.div variants={itemVariants}>
        <WorkspaceTabs
          sectionId="memory"
          actions={
            <div className="flex gap-2">
              <NotesCaptureButton />
              <Button asChild size="sm" className="h-9 gap-1.5 rounded-md">
                <Link href="/notes/new">
                  <Plus size={16} aria-hidden="true" />
                  New note
                </Link>
              </Button>
            </div>
          }
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading notes">
            <Skeleton className="h-11 w-48 rounded-lg" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2 px-4 py-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-10 text-center"
          >
            <p className="text-sm font-semibold text-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">
              Check your connection and reload the page. Your notes haven&apos;t been changed.
            </p>
          </div>
        ) : (
          <NotesHome
            notes={notes}
            projects={projects}
            projectsLoading={projectsLoading}
            projectsUnavailable={projectsUnavailable}
            projectsError={projectsError}
            onNewProject={() => setProjectDialogOpen(true)}
          />
        )}
      </motion.div>

      <ProjectFormDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={createProject}
      />
    </motion.div>
  )
}
