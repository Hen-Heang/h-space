import Link from "next/link"
import { ArrowRight, BrainCircuit, Code2, Languages, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type Subject = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  /** Where the subject's material lives today; `null` when there's nothing yet. */
  href: string | null
  linkLabel?: string
}

// The Learning workspace's subjects. Korean is the only one with a dedicated
// module (Hengo Learning, below on this page). The other two don't get
// placeholder feature systems: Software Engineering points at the study notes
// that already exist, and AI Engineering says plainly that it isn't set up.
const SUBJECTS: Subject[] = [
  {
    id: "korean",
    title: "Korean",
    description: "Hengo Learning — practice, vocabulary, speaking, and exam prep.",
    icon: Languages,
    href: "#korean",
    linkLabel: "Study below",
  },
  {
    id: "software-engineering",
    title: "Software Engineering",
    description: "Study notes on Java, Spring, SQL, and system design live in Notes.",
    icon: Code2,
    href: "/notes",
    linkLabel: "Open notes",
  },
  {
    id: "ai-engineering",
    title: "AI Engineering",
    description: "No module yet. Keep AI study notes in Notes until this one exists.",
    icon: BrainCircuit,
    href: null,
  },
]

/** Subject row at the top of the Learning Hub — what can be learned here. */
export function LearningSubjects() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {SUBJECTS.map((subject) => {
        const Icon = subject.icon
        const body = (
          <>
            <span className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-foreground">{subject.title}</span>
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">{subject.description}</span>
            {/* Where the other subjects put their link — the card's last line. */}
            {!subject.href && (
              <span className="mt-3 w-fit rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                Not set up
              </span>
            )}
            {subject.href && (
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                {subject.linkLabel}
                <ArrowRight
                  size={14}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            )}
          </>
        )
        const className = cn(
          "group flex h-full flex-col rounded-lg border p-4 outline-none",
          subject.href
            ? "border-border bg-card transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
            : "border-dashed border-border",
        )
        return (
          <li key={subject.id}>
            {subject.href ? (
              <Link href={subject.href} className={className}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
