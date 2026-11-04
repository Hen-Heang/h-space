"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ChevronLeft, ChevronDown, List, ArrowUp, Hash, ExternalLink, Clock } from "lucide-react"
import { ReadingProgress } from "@/components/notes/ReadingProgress"
import { CodeCopy } from "@/components/notes/CodeCopy"
import { TechIcon } from "@/components/notes/TechIcon"
import { NoteActions } from "@/components/notes/NoteActions"
import { NOTE_TYPES, type Note } from "@/lib/notes"

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

interface NoteViewProps {
  slug: string
  note: Note
  html: string
  onEdit: () => void
  onTogglePin?: () => Promise<void> | void
  onDelete: () => Promise<void> | void
}

export function NoteView({ slug, note, html, onEdit, onTogglePin, onDelete }: NoteViewProps) {
  const [showMobileToc, setShowMobileToc] = useState(false)
  const [showFloatingNav, setShowFloatingNav] = useState(false)
  const [activeSectionLabel, setActiveSectionLabel] = useState("Contents")

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

  return (
    <>
      <ReadingProgress />
      <CodeCopy />

      {/* Floating nav — appears after scrolling */}
      {showFloatingNav && (
        <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2.5 lg:bottom-6">
          <button
            onClick={() => {
              setShowMobileToc(true)
              requestAnimationFrame(() => {
                document
                  .getElementById("note-toc-mobile")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              })
            }}
            className="flex min-h-11 max-w-[16rem] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-lg active:scale-95"
          >
            <List size={13} className="shrink-0" />
            <span className="truncate">{activeSectionLabel}</span>
          </button>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-lg active:scale-95"
          >
            <ArrowUp size={13} />
            Top
          </button>
        </div>
      )}

      <div className="mx-auto flex min-h-dvh max-w-[1440px] justify-center">
        {/* Main content column */}
        <div className="min-w-0 max-w-4xl flex-1">
          {/* Top action bar */}
          <div className="flex items-center justify-between gap-2 border-b border-border bg-background/95 py-3 md:sticky md:top-[var(--shell-header-h,0px)] md:z-20">
            <Link
              href="/notes"
              className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft size={14} />
              All notes
            </Link>
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

          {/* Page header */}
          <div className="pb-6 pt-6 sm:pt-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card">
              <TechIcon name={note.icon} size={28} />
            </div>

            <h2 className="mb-2 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {note.title}
            </h2>

            {note.description && (
              <p className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {note.description}
              </p>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              <div className="flex min-w-[120px] items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                  Type
                </span>
                <span className="font-medium capitalize text-foreground/80">
                  {NOTE_TYPES.find((t) => t.value === note.noteType)?.label ?? note.noteType}
                </span>
              </div>
              {note.category && (
                <div className="flex min-w-[120px] items-center gap-2">
                  <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                    Category
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                    <Hash size={12} className="text-muted-foreground" />
                    {note.category}
                  </span>
                </div>
              )}
              <div className="flex min-w-[120px] items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                  Module
                </span>
                <span className="rounded border border-border bg-card px-2 py-0.5 font-mono text-xs font-medium text-foreground/80">
                  {slug}
                </span>
              </div>
              {(note.createdAt || note.updatedAt) && (
                <div className="flex min-w-[160px] items-center gap-2">
                  <Clock size={12} className="text-muted-foreground" />
                  <span className="text-xs">
                    Created {formatDate(note.createdAt)} · Updated {formatDate(note.updatedAt)}
                  </span>
                </div>
              )}
              {note.sourceUrl && (
                <a
                  href={note.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  <ExternalLink size={12} />
                  Source
                </a>
              )}
            </div>

            {note.tags && note.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
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

          {/* Mobile TOC */}
          <div id="note-toc-mobile" className="mb-5 scroll-mt-16 xl:hidden">
            <button
              onClick={() => setShowMobileToc((v) => !v)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <span className="flex items-center gap-2">
                <List size={13} /> Table of Contents
              </span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${showMobileToc ? "rotate-180" : ""}`}
              />
            </button>
            {showMobileToc && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
                <TableOfContents html={html} mobile />
              </div>
            )}
          </div>

          {/* Article content */}
          <article
            className="prose prose-base prose-zinc max-w-none break-words pb-12 [overflow-wrap:anywhere] dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary prose-pre:max-w-full prose-pre:overflow-x-auto prose-code:rounded prose-code:bg-accent prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border pb-12 pt-6">
            <Link
              href="/notes"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft size={15} />
              Back to all notes
            </Link>
            <span className="font-mono text-xs text-muted-foreground">{slug}</span>
          </div>
        </div>

        {/* Desktop right TOC panel */}
        <div className="sticky top-[var(--shell-header-h,0px)] hidden h-[calc(100dvh-var(--shell-header-h,0px))] w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border/60 px-5 py-6 xl:flex">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
            <TableOfContents html={html} />
          </div>
        </div>
      </div>
    </>
  )
}
