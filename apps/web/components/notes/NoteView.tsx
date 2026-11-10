"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ArrowUp, ChevronLeft, ExternalLink, List } from "lucide-react"

import { CodeCopy } from "@/components/notes/CodeCopy"
import { NoteActions } from "@/components/notes/NoteActions"
import { noteTypeLabel } from "@/components/notes/project-ui"
import { ReadingProgress } from "@/components/notes/ReadingProgress"
import { TechIcon } from "@/components/notes/TechIcon"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useNoteProjects } from "@/hooks/useNoteProjects"
import { readingMinutes, type Note } from "@/lib/notes"

const TableOfContents = dynamic(
  () => import("@/components/notes/TableOfContents").then((mod) => mod.TableOfContents),
  { ssr: false },
)

function formatDate(iso?: string): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** renderMarkdown gives every h2/h3 an id; the contents list links to those. */
function hasContents(html: string): boolean {
  return /<h[23][^>]*\sid="/i.test(html)
}

interface NoteViewProps {
  slug: string
  note: Note
  html: string
  onEdit: () => void
  onTogglePin?: () => Promise<void> | void
  onDelete: () => Promise<void> | void
}

export function NoteView({ slug, note, html, onEdit, onTogglePin, onDelete }: NoteViewProps) {
  const [contentsOpen, setContentsOpen] = useState(false)
  const [showFloatingNav, setShowFloatingNav] = useState(false)
  const [activeSectionLabel, setActiveSectionLabel] = useState("Contents")
  const { projects } = useNoteProjects()
  const project = note.projectId ? projects.find((p) => p.id === note.projectId) : undefined
  const contents = hasContents(html)

  useEffect(() => {
    const onScroll = () => setShowFloatingNav(window.scrollY > 400)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const headingElements = Array.from(document.querySelectorAll("article h2, article h3"))
    // No headings → leave the label at its initial "Contents" value.
    if (headingElements.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((e) => e.isIntersecting)
        if (!visibleEntry) return
        const text = visibleEntry.target.textContent?.trim()
        if (!text) return
        setActiveSectionLabel(text.length > 28 ? `${text.slice(0, 28)}…` : text)
      },
      { rootMargin: "-15% 0% -75% 0%" },
    )
    headingElements.forEach((el) => observer.observe(el))
    return () => headingElements.forEach((el) => observer.unobserve(el))
  }, [html])

  const meta = [
    noteTypeLabel(note.noteType),
    note.category ? `#${note.category}` : "",
    note.updatedAt ? `Updated ${formatDate(note.updatedAt)}` : "",
    `${readingMinutes(note.content)} min read`,
  ].filter(Boolean)

  return (
    <>
      <ReadingProgress />
      <CodeCopy />

      {/* Floating nav — appears after scrolling, in the bottom-right corner
          just above the bottom nav (or the home indicator when it's hidden). */}
      {showFloatingNav && (
        <div className="fixed right-4 bottom-[calc(var(--shell-bottom-nav-h,0px)+max(0.75rem,calc(env(safe-area-inset-bottom)-var(--shell-bottom-nav-h,0px))))] z-40 flex flex-col items-end gap-2.5">
          {contents && (
            <button
              type="button"
              onClick={() => setContentsOpen(true)}
              aria-label={`Contents: ${activeSectionLabel}`}
              className="flex min-h-11 max-w-[16rem] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 xl:hidden"
            >
              <List size={14} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{activeSectionLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          >
            <ArrowUp size={14} aria-hidden="true" />
            Top
          </button>
        </div>
      )}

      <div className="mx-auto flex min-h-dvh max-w-[1440px] justify-center">
        {/* Main content column */}
        <div className="min-w-0 max-w-4xl flex-1">
          {/* Reader toolbar */}
          {/* Phones and tablets: the mobile header already has Back, so the
              toolbar is just the actions, right-aligned, and fits at 320px. */}
          <div className="flex items-center justify-end gap-2 border-b border-border bg-background/95 py-1.5 md:sticky md:top-[var(--shell-header-h,0px)] md:z-20 lg:justify-between">
            <Link
              href={project ? `/notes/projects/${project.id}` : "/notes"}
              className="hidden min-h-11 min-w-0 items-center gap-1 rounded-md pr-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:flex"
            >
              <ChevronLeft size={16} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{project ? project.name : "Notes"}</span>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              {contents && (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Contents"
                  className="h-11 min-w-11 gap-1.5 px-3 text-muted-foreground hover:text-foreground xl:hidden"
                  onClick={() => setContentsOpen(true)}
                >
                  <List aria-hidden="true" />
                  <span aria-hidden="true" className="hidden sm:inline">
                    Contents
                  </span>
                </Button>
              )}
              <NoteActions
                pinned={note.pinned}
                onEdit={onEdit}
                onTogglePin={onTogglePin}
                onDelete={onDelete}
                noteId={note.id}
                noteSlug={note.slug}
                noteTitle={note.title}
              />
            </div>
          </div>

          {/* Page header */}
          <div className="pt-4 pb-5 sm:pt-8 sm:pb-6">
            <div className="mb-4 hidden size-11 items-center justify-center rounded-lg border border-border bg-card sm:flex">
              <TechIcon name={note.icon} size={24} />
            </div>

            <h2 className="mb-2 text-2xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] text-foreground sm:text-3xl">
              {note.title}
            </h2>

            {note.description && (
              <p className="mb-3 max-w-2xl text-sm leading-6 [overflow-wrap:anywhere] text-muted-foreground sm:text-base">
                {note.description}
              </p>
            )}

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span
                title={
                  note.createdAt
                    ? `Created ${formatDate(note.createdAt)} · Updated ${formatDate(note.updatedAt)}`
                    : undefined
                }
              >
                {meta.join(" · ")}
              </span>
              {project && (
                <>
                  <span aria-hidden="true">·</span>
                  <Link
                    href={`/notes/projects/${project.id}`}
                    className="max-w-full truncate font-medium text-foreground/80 hover:underline"
                  >
                    {project.name}
                  </Link>
                </>
              )}
              {note.sourceUrl && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={note.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Source
                    <ExternalLink size={12} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </>
              )}
            </p>

            {note.tags && note.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Article content */}
          <article
            className="note-prose prose prose-base prose-zinc max-w-none break-words pb-12 [overflow-wrap:anywhere] dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-pre:max-w-full prose-code:before:content-none prose-code:after:content-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4 pb-12">
            <Link
              href="/notes"
              className="flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft size={15} aria-hidden="true" />
              All notes
            </Link>
            <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
              /notes/{slug}
            </span>
          </div>
        </div>

        {/* Desktop right contents panel */}
        <div className="sticky top-[var(--shell-header-h,0px)] hidden h-[calc(100dvh-var(--shell-header-h,0px))] w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border/60 px-5 py-6 xl:flex">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
            <TableOfContents html={html} />
          </div>
        </div>
      </div>

      {/* Phones and tablets: contents in a bottom sheet. */}
      {contents && (
        <Sheet open={contentsOpen} onOpenChange={setContentsOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[75dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] xl:hidden"
          >
            <SheetHeader className="pr-14">
              <SheetTitle className="font-semibold">Contents</SheetTitle>
            </SheetHeader>
            <TableOfContents html={html} mobile onNavigate={() => setContentsOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
