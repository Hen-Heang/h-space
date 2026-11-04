"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Plus, RotateCw, Upload } from "lucide-react"
import { motion } from "motion/react"

import { LearnHeader } from "@/components/learn/LearnHeader"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { PhraseCollectionCard } from "@/components/phrasebook/PhraseCollectionCard"
import { PhraseCardListItem } from "@/components/phrasebook/PhraseCardListItem"
import { PhraseFilters } from "@/components/phrasebook/PhraseFilters"
import { ImportPhrasesDialog } from "@/components/phrasebook/ImportPhrasesDialog"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import { useRomanizationPreference } from "@/hooks/useRomanizationPreference"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import {
  countPhraseStates,
  filterPhraseCards,
  type PhraseFilters as PhraseFiltersValue,
} from "@/lib/korean-phrasebook/mastery"
import { containerVariants, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { PhraseCardWithProgress, PhraseCollection } from "@/lib/types"

export function PhrasebookHome() {
  useSessionTimer("phrasebook")
  const router = useRouter()
  const romanizationPreference = useRomanizationPreference()

  const [collections, setCollections] = useState<PhraseCollection[]>([])
  const [cards, setCards] = useState<PhraseCardWithProgress[]>([])
  const [recentlyPracticed, setRecentlyPracticed] = useState<PhraseCardWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState<PhraseFiltersValue>({})
  const [importOpen, setImportOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError("")
    try {
      const [collectionsRes, cardsRes, recentRes] = await Promise.all([
        phrasebookApi.getCollections(),
        phrasebookApi.getAllCards(),
        phrasebookApi.getRecentlyPracticed(5),
      ])
      setCollections(collectionsRes)
      setCards(cardsRes)
      setRecentlyPracticed(recentRes)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load the Phrasebook."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => countPhraseStates(cards), [cards])
  const categories = useMemo(() => [...new Set(cards.map((c) => c.category))].sort(), [cards])
  const situations = useMemo(() => [...new Set(cards.map((c) => c.situation))].sort(), [cards])
  const difficulties = useMemo(() => [...new Set(cards.map((c) => c.difficulty))].sort(), [cards])
  const isFiltering = Boolean(
    filters.query || filters.category || filters.situation || filters.difficulty,
  )
  const filteredCards = useMemo(() => filterPhraseCards(cards, filters), [cards, filters])

  const myCollections = collections.filter((c) => !c.sourceKey)
  const seededCollections = collections.filter((c) => c.sourceKey)

  function statsFor(collectionId: string) {
    const collectionCards = cards.filter((c) => c.collectionId === collectionId)
    const cardCount = collectionCards.length
    const masteredCount = collectionCards.filter((c) => c.progress?.state === "mastered").length
    const dueCount = collectionCards.filter(
      (c) => c.progress && c.progress.nextReviewAt <= new Date().toISOString(),
    ).length
    return { cardCount, masteredCount, dueCount }
  }

  async function togglePin(collection: PhraseCollection) {
    setCollections((prev) =>
      prev.map((c) => (c.id === collection.id ? { ...c, pinned: !c.pinned } : c)),
    )
    try {
      await phrasebookApi.setPinned(collection.id, !collection.pinned)
    } catch {
      setCollections((prev) =>
        prev.map((c) => (c.id === collection.id ? { ...c, pinned: collection.pinned } : c)),
      )
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  // A failed load shows the error and a retry — not empty sections that read
  // as "you have no phrases".
  if (error) {
    return (
      <div className="space-y-3 pb-12">
        <ErrorBanner>{error}</ErrorBanner>
        <Button variant="outline" onClick={() => void load()}>
          <RotateCw aria-hidden="true" /> Try again
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 pb-12"
    >
      <motion.div variants={itemVariants}>
        <LearnHeader
          description="Common Korean questions and answers for work and daily life — listen, answer aloud, and review with spaced repetition."
          actions={
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload aria-hidden="true" /> Import
              </Button>
              <Button variant="outline" onClick={() => router.push("/phrasebook/new")}>
                <Plus aria-hidden="true" /> New Q&A
              </Button>
            </>
          }
        />
      </motion.div>

      {/* The one primary action: review what's due (or learn, when nothing
          is). Counts appear once, here. */}
      <motion.section
        variants={itemVariants}
        aria-labelledby="phrase-review-heading"
        className={cn(
          "app-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
          counts.due > 0 && "border-primary/30 bg-linear-to-br from-primary/[0.06] to-card",
        )}
      >
        <div className="min-w-0">
          <h2 id="phrase-review-heading" className="text-xl font-semibold text-foreground">
            {counts.due > 0
              ? `${counts.due} ${counts.due === 1 ? "phrase" : "phrases"} due for review`
              : "All caught up"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.new} new · {counts.learning} learning · {counts.mastered} mastered
            {counts.overdue > 0 && ` · ${counts.overdue} overdue`}
          </p>
        </div>
        <Button size="lg" asChild className="shrink-0">
          <Link
            href={
              counts.due > 0
                ? "/phrasebook/practice?mode=review"
                : "/phrasebook/practice?mode=learn"
            }
          >
            {counts.due > 0 ? "Start review" : "Learn phrases"}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </motion.section>

      <motion.div variants={itemVariants}>
        <PhraseFilters
          value={filters}
          onChange={setFilters}
          categories={categories}
          situations={situations}
          difficulties={difficulties}
        />
      </motion.div>

      {isFiltering ? (
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            {filteredCards.length} {filteredCards.length === 1 ? "result" : "results"}
          </h2>
          {filteredCards.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No cards match your search.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredCards.map((card) => (
                <PhraseCardListItem
                  key={card.id}
                  card={card}
                  romanizationPreference={romanizationPreference}
                  editHref={`/phrasebook/new?cardId=${card.id}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants} className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Practice packs</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {seededCollections.map((collection) => {
                const stats = statsFor(collection.id)
                return (
                  <PhraseCollectionCard
                    key={collection.id}
                    collection={collection}
                    {...stats}
                    onTogglePin={() => togglePin(collection)}
                  />
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">My Q&A</h2>
              <Link
                href="/phrasebook/new"
                className="text-xs font-bold text-primary hover:underline"
              >
                + Add
              </Link>
            </div>
            {myCollections.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Create your own Q&A cards or collections to build a personal Phrasebook.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myCollections.map((collection) => {
                  const stats = statsFor(collection.id)
                  return (
                    <PhraseCollectionCard
                      key={collection.id}
                      collection={collection}
                      {...stats}
                      onTogglePin={() => togglePin(collection)}
                    />
                  )
                })}
              </div>
            )}
          </motion.div>

          {recentlyPracticed.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Recently practiced</h2>
              <div className="space-y-3">
                {recentlyPracticed.map((card) => (
                  <PhraseCardListItem
                    key={card.id}
                    card={card}
                    romanizationPreference={romanizationPreference}
                    editHref={`/phrasebook/new?cardId=${card.id}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      <ImportPhrasesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        collections={collections}
        onImported={load}
      />
    </motion.div>
  )
}
