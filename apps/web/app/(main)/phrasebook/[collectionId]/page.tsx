"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { BookOpen, Headphones, Mic, RotateCcw } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { BackLink } from "@/components/ui/back-link"
import { Badge } from "@/components/ui/badge"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { PhraseCardListItem } from "@/components/phrasebook/PhraseCardListItem"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import { useRomanizationPreference } from "@/hooks/useRomanizationPreference"
import { containerVariants, itemVariants } from "@/lib/motion"
import type { PhraseCardWithProgress, PhraseCollection } from "@/lib/types"

// One primary action per collection: reviewing what's due, or learning when
// nothing is. The other study modes are neutral secondary buttons.
const MODE_ACTIONS = [
  { mode: "review", label: "Review due", icon: RotateCcw },
  { mode: "learn", label: "Learn", icon: BookOpen },
  { mode: "listen", label: "Listen", icon: Headphones },
  { mode: "speak", label: "Speak", icon: Mic },
] as const

export default function PhraseCollectionPage() {
  const router = useRouter()
  const params = useParams<{ collectionId: string }>()
  const collectionId = params.collectionId
  const romanizationPreference = useRomanizationPreference()

  const [collection, setCollection] = useState<PhraseCollection | null>(null)
  const [cards, setCards] = useState<PhraseCardWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<PhraseCardWithProgress | null>(null)

  async function load() {
    setLoading(true)
    setError("")
    try {
      const [collectionRes, cardsRes] = await Promise.all([
        phrasebookApi.getCollection(collectionId),
        phrasebookApi.getCardsForCollection(collectionId),
      ])
      setCollection(collectionRes)
      setCards(cardsRes)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load this collection."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId])

  const masteredCount = useMemo(
    () => cards.filter((c) => c.progress?.state === "mastered").length,
    [cards],
  )
  const dueCount = useMemo(
    () =>
      cards.filter((c) => c.progress && c.progress.nextReviewAt <= new Date().toISOString()).length,
    [cards],
  )
  const progress = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0

  async function handleArchive(card: PhraseCardWithProgress) {
    setCards((prev) => prev.filter((c) => c.id !== card.id))
    try {
      await phrasebookApi.setActive(card.id, false)
    } catch (err) {
      toast.error("Could not archive this card", {
        description: getApiErrorMessage(err, "Please try again."),
      })
      load()
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    setCards((prev) => prev.filter((c) => c.id !== target.id))
    try {
      await phrasebookApi.deleteCard(target.id)
    } catch (err) {
      toast.error("Could not delete this card", {
        description: getApiErrorMessage(err, "Please try again."),
      })
      load()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="space-y-4 pb-12">
        <BackLink href="/phrasebook" label="Phrasebook" />
        <ErrorBanner>{error || "Collection not found."}</ErrorBanner>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-12"
    >
      <motion.div variants={itemVariants}>
        <BackLink href="/phrasebook" label="Phrasebook" />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-3xl border border-border bg-card p-5 shadow-sm dark:bg-slate-900/40 sm:p-6"
      >
        <Badge variant="outline" className="mb-2 uppercase">
          {collection.category}
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{collection.titleEn}</h2>
        <p lang="ko" className="mt-0.5 text-base font-medium text-muted-foreground">
          {collection.titleKo}
        </p>
        {collection.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {collection.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-accent/40">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-bold text-muted-foreground">
            {masteredCount}/{cards.length} mastered · {dueCount} due
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODE_ACTIONS.filter(({ mode }) => mode !== "review" || dueCount > 0).map(
            ({ mode, label, icon: Icon }, index) => (
              <Button
                key={mode}
                variant={index === 0 ? "default" : "outline"}
                disabled={cards.length === 0}
                onClick={() =>
                  router.push(`/phrasebook/practice?mode=${mode}&collectionId=${collectionId}`)
                }
              >
                <Icon aria-hidden="true" /> {label}
                {mode === "review" && ` (${dueCount})`}
              </Button>
            ),
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        {cards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No cards in this collection yet.
          </p>
        ) : (
          cards.map((card) => (
            <PhraseCardListItem
              key={card.id}
              card={card}
              romanizationPreference={romanizationPreference}
              editHref={`/phrasebook/new?cardId=${card.id}`}
              onArchive={() => handleArchive(card)}
              onDelete={() => setDeleteTarget(card)}
            />
          ))
        )}
      </motion.div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.question.korean} — this removes its progress and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
