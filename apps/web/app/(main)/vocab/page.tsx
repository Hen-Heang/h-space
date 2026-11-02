"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowUpRight,
  BookOpenText,
  LibraryBig,
  MessageSquareText,
  Plus,
  Search,
  X,
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { PageHero } from "@/components/app/page-hero"
import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DailyPhraseCard } from "@/components/practice/DailyPhraseCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddWordsDialog } from "@/components/vocab/AddWordsDialog"
import { CoreKoreanPanel } from "@/components/vocab/CoreKoreanPanel"
import { EssentialBooksPanel } from "@/components/vocab/EssentialBooksPanel"
import { ReviewSession, type AutoStart } from "@/components/vocab/ReviewSession"
import { VocabDictionary } from "@/components/vocab/VocabDictionary"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useVocab } from "@/hooks/useVocab"
import { dailyPhraseApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import type { DailyPhrase } from "@/lib/types"
import { computeVocabStats } from "@/lib/vocab-review"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
} as const

export default function VocabPage() {
  return (
    <div className="space-y-6">
      <WorkspaceTabs sectionId="learn" />
      <Suspense fallback={null}>
        <VocabPageContent />
      </Suspense>
    </div>
  )
}

function VocabPageContent() {
  const {
    dueToday,
    dueCount,
    error,
    loading,
    rateWord,
    words,
    addWord,
    generate,
    importList,
    updateWord,
    deleteWord,
  } = useVocab()
  const { logActivity } = useLogActivity("vocab")
  useSessionTimer("vocab")
  const [query, setQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  // "/vocab?tab=phrases" (used by the daily_phrase mission step) lands
  // directly on the Phrases tab instead of the vocabulary deck.
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") === "phrases" ? "phrases" : "vocabulary"
  // Set by a deck's "Review this deck" button; consumed by ReviewSession to
  // jump straight into a scoped Memory Lab session for that category.
  const [focusCategory, setFocusCategory] = useState<string | null>(null)
  // "/vocab?review=session" opens Memory Lab straight into the next due batch,
  // "?review=setup" into its session picker — how /practice and /learn hand a
  // learner extra reps once the daily mission is finished. Read once into
  // state so closing the overlay doesn't immediately re-open it.
  const [autoStart, setAutoStart] = useState<AutoStart | null>(() => {
    const raw = searchParams.get("review")
    return raw === "session" || raw === "setup" ? raw : null
  })

  // Phrases tab — merges Daily Phrase history into the same page as the vocab
  // dictionary so both "learn a phrase" surfaces live in one place.
  const userId = getUserId()
  const queryClient = useQueryClient()
  const phrasesKey = ["daily-phrases", "history", userId] as const
  const { data: phraseHistory, isPending: phrasesLoading } = useQuery({
    queryKey: phrasesKey,
    queryFn: dailyPhraseApi.getHistory,
    enabled: userId != null,
  })
  function handlePhraseChange(next: DailyPhrase) {
    queryClient.setQueryData<DailyPhrase[]>(phrasesKey, (prev) =>
      (prev ?? []).map((p) => (p.id === next.id ? next : p)),
    )
  }

  const topics = useMemo(
    () => Array.from(new Set(words.map((word) => word.category).filter(Boolean))).sort(),
    [words],
  )
  const stats = useMemo(() => computeVocabStats(words), [words])

  async function handleGenerate(category: string) {
    await generate(category)
    void logActivity()
    // The dialog's job is done — close it so the fresh deck is visible below.
    setAddOpen(false)
    toast.success("Deck ready", {
      description: `New “${category}” cards were added to your dictionary.`,
    })
  }

  async function handleImport(deckName: string, text: string) {
    const count = await importList(deckName, text)
    if (count > 0) {
      void logActivity()
    }
    return count
  }

  const heroStats = [
    { label: "Due now", value: loading ? "…" : `${dueCount}` },
    { label: "Saved words", value: loading ? "…" : `${words.length}` },
    { label: "Decks", value: loading ? "…" : `${topics.length}` },
    { label: "Avg. mastery", value: loading ? "…" : `${stats.averageMastery}%` },
  ]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-10 sm:space-y-8 sm:pb-16"
    >
      <motion.div variants={itemVariants}>
        <PageHero
          eyebrow="Learning · Vocabulary"
          title="Build words you can actually use"
          description="Capture Korean from work and daily life, organize it into focused decks, then review each word at the right time."
          stats={heroStats}
          actions={
            <Button
              type="button"
              onClick={() => setAddOpen(true)}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Plus size={18} strokeWidth={2.5} />
              Add words or a deck
            </Button>
          }
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue={defaultTab} className="gap-0">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl border border-border/70 bg-muted/60 p-1 sm:max-w-md">
            <TabsTrigger value="vocabulary" className="rounded-xl px-3 font-semibold">
              <LibraryBig />
              Words
              <span className="font-mono text-[11px] text-muted-foreground">{words.length}</span>
            </TabsTrigger>
            <TabsTrigger value="phrases" className="rounded-xl px-3 font-semibold">
              <MessageSquareText />
              Phrases
              <span className="font-mono text-[11px] text-muted-foreground">
                {phraseHistory?.length ?? 0}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vocabulary" className="space-y-6 pt-5 sm:space-y-7 sm:pt-6">
            {/* The daily task leads the page; the full session opens in a focused overlay. */}
            <ReviewSession
              dueToday={dueToday}
              dueCount={dueCount}
              allWords={words}
              loading={loading}
              onRate={rateWord}
              focusCategory={focusCategory}
              onFocusHandled={() => setFocusCategory(null)}
              autoStart={autoStart}
              onAutoStartHandled={() => {
                setAutoStart(null)
                // Drop the param so a refresh or a Back-then-Forward doesn't
                // silently re-launch a session the learner already left.
                const url = new URL(window.location.href)
                url.searchParams.delete("review")
                window.history.replaceState(null, "", `${url.pathname}${url.search}`)
              }}
            />

            <CoreKoreanPanel words={words} loading={loading} />
            <EssentialBooksPanel words={words} loading={loading} />

            {error ? <ErrorBanner>{error}</ErrorBanner> : null}

            <section aria-labelledby="word-library-title" className="space-y-4 sm:space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="app-kicker">Your collection</p>
                  <h2
                    id="word-library-title"
                    className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                  >
                    Word library
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Find a word, check deck health, or open a card for examples and practice.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus />
                  Add words
                </Button>
              </div>

              {words.length > 0 ? (
                <div className="flex items-center gap-1 rounded-2xl border border-border/80 bg-card p-1.5 shadow-sm transition-shadow focus-within:ring-3 focus-within:ring-ring/30 dark:bg-slate-900/50">
                  <Search
                    size={18}
                    strokeWidth={2}
                    className="pointer-events-none ml-2 shrink-0 text-muted-foreground"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search Korean, English, deck, or tag…"
                    aria-label={`Search ${words.length} saved vocabulary words`}
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                  />
                  {query ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => setQuery("")}
                      aria-label="Clear vocabulary search"
                      className="shrink-0 rounded-xl text-muted-foreground"
                    >
                      <X />
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <VocabDictionary
                words={words}
                loading={loading}
                dueCount={dueCount}
                query={query}
                onUpdate={updateWord}
                onDelete={deleteWord}
                onAdd={addWord}
                onReviewDeck={setFocusCategory}
                onStartAdd={() => setAddOpen(true)}
                onClearSearch={() => setQuery("")}
              />
            </section>
          </TabsContent>

          <TabsContent value="phrases" className="space-y-5 pt-6">
            <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <BookOpenText />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Daily phrase collection</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Revisit useful expressions and turn the best ones into flashcards.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/daily-phrase">
                  Get today&apos;s phrase
                  <ArrowUpRight />
                </Link>
              </Button>
            </div>

            {phrasesLoading ? (
              <div className="space-y-4" role="status" aria-label="Loading saved phrases">
                {[1, 2].map((item) => (
                  <Skeleton key={item} className="h-52 w-full rounded-3xl" />
                ))}
              </div>
            ) : !phraseHistory || phraseHistory.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-accent/5 px-6 py-12 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <MessageSquareText size={24} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">No saved phrases yet</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Start with one practical phrase today, then return here to review and practice it.
                </p>
                <Button asChild className="mt-5">
                  <Link href="/daily-phrase">Learn your first phrase</Link>
                </Button>
              </div>
            ) : (
              phraseHistory.map((phrase, index) => (
                <BlurFade key={phrase.id} inView delay={Math.min(index * 0.04, 0.24)}>
                  <DailyPhraseCard phrase={phrase} onChange={handlePhraseChange} />
                </BlurFade>
              ))
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <AddWordsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        topics={topics}
        dueCount={dueCount}
        totalCount={words.length}
        existingTerms={words.map((word) => word.term)}
        onAdd={addWord}
        onUpdate={updateWord}
        onGenerate={handleGenerate}
        onImport={handleImport}
      />
    </motion.div>
  )
}
