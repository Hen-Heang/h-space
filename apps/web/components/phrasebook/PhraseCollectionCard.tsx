"use client"

import Link from "next/link"
import { ChevronRight, Pin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PhraseCollection } from "@/lib/types"

interface PhraseCollectionCardProps {
  collection: PhraseCollection
  cardCount: number
  masteredCount: number
  dueCount: number
  onTogglePin?: () => void
}

export function PhraseCollectionCard({
  collection,
  cardCount,
  masteredCount,
  dueCount,
  onTogglePin,
}: PhraseCollectionCardProps) {
  const progress = cardCount > 0 ? Math.round((masteredCount / cardCount) * 100) : 0

  return (
    // One link covers the card (via the title's ::after); the pin is a
    // sibling button raised above it, so no control is nested in another.
    <div className="app-surface group relative p-5 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/40">
      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={collection.pinned}
          aria-label={
            collection.pinned ? `Unpin ${collection.titleEn}` : `Pin ${collection.titleEn}`
          }
          className={cn(
            "absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full transition-colors hover:bg-muted",
            collection.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {/* Filled when pinned, outline when not — the icon shows the current state. */}
          <Pin aria-hidden="true" size={15} className={cn(collection.pinned && "fill-current")} />
        </button>
      )}
      <Badge variant="outline" className="mb-2 uppercase">
        {collection.category}
      </Badge>
      <h3 className="pr-10 text-lg font-bold leading-snug text-foreground">
        <Link
          href={`/phrasebook/${collection.id}`}
          className="outline-none after:absolute after:inset-0 after:content-['']"
        >
          {collection.titleEn}
        </Link>
      </h3>
      <p lang="ko" className="mt-0.5 text-sm font-medium text-muted-foreground">
        {collection.titleKo}
      </p>
      {collection.description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {collection.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {masteredCount}/{cardCount} mastered
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span className={cn(dueCount > 0 && "text-amber-700 dark:text-amber-300")}>
          {dueCount > 0 ? `${dueCount} due for review` : "All caught up"}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </div>
  )
}
