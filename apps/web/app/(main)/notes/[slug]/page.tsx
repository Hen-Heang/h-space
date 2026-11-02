"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { NoteView } from "@/components/notes/NoteView"
import { NoteEditor, type NoteEditorValues } from "@/components/notes/NoteEditor"
import { renderMarkdown } from "@/lib/notes-markdown"
import { useNote, useNoteMutations } from "@/hooks/useNotes"
import { useSessionTimer } from "@/hooks/useSessionTimer"

export default function NotePage() {
  useSessionTimer("notes")
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const router = useRouter()
  const { note, loading, error } = useNote(slug)
  const { update, remove, togglePinned } = useNoteMutations()
  const [isEditing, setIsEditing] = useState(false)

  const html = useMemo(() => (note ? renderMarkdown(note.content) : ""), [note])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={28} className="mb-4 animate-spin" />
        <p className="text-sm">Loading note…</p>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="text-sm">{error || "Note not found."}</p>
        <Link
          href="/notes"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-500 hover:underline"
        >
          <ChevronLeft size={14} />
          Back to all notes
        </Link>
      </div>
    )
  }

  if (isEditing) {
    const initial: NoteEditorValues = {
      slug: note.slug,
      title: note.title,
      description: note.description,
      icon: note.icon,
      category: note.category ?? "",
      noteType: note.noteType,
      tags: note.tags ?? [],
      sourceUrl: note.sourceUrl ?? "",
      pinned: note.pinned,
      content: note.content,
      projectId: note.projectId ?? "",
    }
    return (
      <div className="mx-auto max-w-4xl py-4 sm:py-8">
        <NoteEditor
          mode="edit"
          initial={initial}
          onCancel={() => setIsEditing(false)}
          onSave={async (values) => {
            await update.mutateAsync({
              slug: note.slug,
              data: {
                title: values.title,
                description: values.description,
                icon: values.icon,
                category: values.category || undefined,
                noteType: values.noteType,
                content: values.content,
                tags: values.tags,
                pinned: values.pinned,
                sourceUrl: values.sourceUrl.trim() || null,
                // Only sent when changed, so editing a note never depends on
                // the projects migration being applied.
                ...(values.projectId !== (note.projectId ?? "")
                  ? { projectId: values.projectId || null }
                  : {}),
              },
            })
            toast.success("Note saved")
            setIsEditing(false)
          }}
        />
      </div>
    )
  }

  return (
    <NoteView
      slug={note.slug}
      note={note}
      html={html}
      onEdit={() => setIsEditing(true)}
      onTogglePin={async () => {
        await togglePinned.mutateAsync({ slug: note.slug, pinned: !note.pinned })
      }}
      onDelete={async () => {
        await remove.mutateAsync(note.slug)
        toast.success("Note deleted")
        router.push("/notes")
      }}
    />
  )
}
