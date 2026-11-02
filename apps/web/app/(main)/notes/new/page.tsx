"use client"

import { Suspense, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { NoteEditor, type NoteEditorValues } from "@/components/notes/NoteEditor"
import { useNoteMutations } from "@/hooks/useNotes"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { NOTE_TYPES, type NoteType } from "@/lib/notes"

const EMPTY: NoteEditorValues = {
  slug: "",
  title: "",
  description: "",
  icon: "common",
  category: "",
  noteType: "technical",
  tags: [],
  sourceUrl: "",
  pinned: false,
  content: "# New note\n\nStart writing in **markdown**.\n",
  projectId: "",
}

function isNoteType(value: string | null): value is NoteType {
  return NOTE_TYPES.some((t) => t.value === value)
}

function NewNoteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { create } = useNoteMutations()

  // `?project=<id>&type=decision` come from the Project Workspace. The project
  // id is only a preselection: the database rejects a project that isn't yours.
  const projectParam = searchParams.get("project") ?? ""
  const typeParam = searchParams.get("type")
  const initial = useMemo<NoteEditorValues>(
    () => ({
      ...EMPTY,
      projectId: projectParam,
      noteType: isNoteType(typeParam) ? typeParam : EMPTY.noteType,
    }),
    [projectParam, typeParam],
  )
  const backHref = projectParam ? `/notes/projects/${encodeURIComponent(projectParam)}` : "/notes"

  const handleSave = async (values: NoteEditorValues) => {
    await create.mutateAsync({
      slug: values.slug,
      title: values.title,
      description: values.description,
      icon: values.icon,
      category: values.category || undefined,
      noteType: values.noteType,
      content: values.content,
      tags: values.tags,
      pinned: values.pinned,
      sourceUrl: values.sourceUrl.trim() || null,
      projectId: values.projectId || null,
    })
    toast.success("Note created")
    router.push(`/notes/${values.slug}`)
  }

  return (
    <div className="mx-auto max-w-4xl pb-6 sm:pb-8">
      <Link
        href={backHref}
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft size={14} />
        {projectParam ? "Back to project" : "All notes"}
      </Link>
      <NoteEditor
        mode="create"
        initial={initial}
        onSave={handleSave}
        onCancel={() => router.push(backHref)}
      />
    </div>
  )
}

export default function NewNotePage() {
  useSessionTimer("notes")
  return (
    <Suspense fallback={null}>
      <NewNoteForm />
    </Suspense>
  )
}
