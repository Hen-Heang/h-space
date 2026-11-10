import Link from "next/link"
import { ArrowRight, BrainCircuit, Code2, Languages, type LucideIcon } from "lucide-react"

import { isNotesEnabled } from "@/lib/feature-flags"

type Subject = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  /** Where the subject's material lives today; `null` when there's nothing yet. */
  href: string | null
  linkLabel?: string
  /** The subject this page is about. */
  current?: boolean
}

// The Learning workspace's subjects. Korean is the only one with a dedicated
// module — the rest of this page. The other two don't get placeholder feature
// systems: Software Engineering points at the study notes that already exist,
// and AI Engineering says plainly that it isn't set up. While Notes is retired
// (isNotesEnabled() false) those notes live outside H-Space, so neither card
// links to /notes.
const NOTES_ENABLED = isNotesEnabled()

const SUBJECTS: Subject[] = [
  {
    id: "korean",
    title: "Korean",
    description: "Hengo Learning — practice, vocabulary, speaking, and exam prep.",
    icon: Languages,
    href: null,
    current: true,
  },
  {
    id: "software-engineering",
    title: "Software Engineering",
    description: NOTES_ENABLED
      ? "Study notes on Java, Spring, SQL, and system design live in Notes."
      : "Study notes on Java, Spring, SQL, and system design are kept outside H-Space.",
    icon: Code2,
    href: NOTES_ENABLED ? "/notes" : null,
    linkLabel: "Open notes",
  },
  {
    id: "ai-engineering",
    title: "AI Engineering",
    description: NOTES_ENABLED
      ? "No module yet. Keep AI study notes in Notes until this one exists."
      : "No module yet.",
    icon: BrainCircuit,
    href: null,
  },
]

/** Compact subject list at the foot of the Learning Hub — what can be learned here. */
export function LearningSubjects() {
  return (
    <section aria-labelledby="learn-subjects" className="space-y-3">
      <h2 id="learn-subjects" className="text-sm font-semibold text-foreground">
        Subjects
      </h2>
      <ul className="grid gap-2 sm:grid-cols-3">
        {SUBJECTS.map((subject) => {
          const Icon = subject.icon
          const status = subject.current ? "This page" : subject.href ? null : "Not set up"
          const body = (
            <>
              <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{subject.title}</span>
                  {status && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {status}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {subject.description}
                </span>
                {subject.href && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    {subject.linkLabel}
                    <ArrowRight aria-hidden="true" className="size-3" />
                  </span>
                )}
              </span>
            </>
          )
          const className =
            "flex h-full gap-3 rounded-lg border border-dashed border-border p-3 outline-none"
          return (
            <li key={subject.id}>
              {subject.href ? (
                <Link
                  href={subject.href}
                  className={`${className} transition-colors hover:border-foreground/20 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {body}
                </Link>
              ) : (
                <div className={className}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
