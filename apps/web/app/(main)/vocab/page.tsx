"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { GraduationCap, LibraryBig, MessageSquareText, Plus, Search, X } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { Button } from "@/components/ui/button"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddWordsDialog } from "@/components/vocab/AddWordsDialog"
import { CoreKoreanPanel } from "@/components/vocab/CoreKoreanPanel"
import { EssentialBooksPanel } from "@/components/vocab/EssentialBooksPanel"
import { PhrasesTab } from "@/components/vocab/PhrasesTab"
import { ReviewSession, type AutoStart } from "@/components/vocab/ReviewSession"
import { VocabDictionary } from "@/components/vocab/VocabDictionary"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useVocab } from "@/hooks/useVocab"
import { dailyPhraseApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"

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
    <Suspense fallback={null}>
      <VocabPageContent />
    </Suspense>
  )
}

// /vocab: the review batch leads (Memory Lab), then the word library. Courses
// (Core Korean 300, the essential books) sit behind their own switch so they
// don't push the library below the fold. Each number appears once: the batch
// and backlog on the Memory Lab card, deck health in the library header.
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
  const tabParam = searchParams.get("tab")
  const defaultTab = tabParam === "phrases" || tabParam === "courses" ? tabParam : "vocabulary"
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

  // Only for the Phrases tab's count — PhrasesTab reads the same cache.
  const userId = getUserId()
  const { data: phraseHistory } = useQuery({
    queryKey: ["daily-phrases", "history", userId] as const,
    queryFn: dailyPhraseApi.getHistory,
    enabled: userId != null,
  })

  const topics = useMemo(
    () => Array.from(new Set(words.map((word) => word.category).filter(Boolean))).sort(),
    [words],
  )

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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-10 sm:pb-16"
    >
      <motion.div variants={itemVariants} className="space-y-3">
        <WorkspaceTabs
          sectionId="learn"
          actions={
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus aria-hidden="true" />
              Add words
            </Button>
          }
        />
        <p className="text-sm text-muted-foreground">
          Capture Korean from work and daily life, then review each word at the right time.
        </p>
      </motion.div>

      {/* The daily task leads the page; the full session opens in a focused overlay. */}
      <motion.div variants={itemVariants} className="space-y-6">
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

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      </motion.div>

      {/* One tab row under the workspace tabs — Words · Courses · Phrases.
          Library/Courses used to be a second tab row nested inside Words, so
          the page stacked three levels of tabs. The values stay "vocabulary"
          and "phrases" so `/vocab?tab=phrases` deep links keep working. */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue={defaultTab} className="gap-4">
          <TabsList className="no-scrollbar w-fit max-w-full overflow-x-auto">
            <TabsTrigger value="vocabulary">
              <LibraryBig aria-hidden="true" />
              Words
              <span className="text-xs tabular-nums text-muted-foreground">{words.length}</span>
            </TabsTrigger>
            <TabsTrigger value="courses">
              <GraduationCap aria-hidden="true" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="phrases">
              <MessageSquareText aria-hidden="true" />
              Phrases
              <span className="text-xs tabular-nums text-muted-foreground">
                {phraseHistory?.length ?? 0}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vocabulary" className="space-y-4">
            {words.length > 0 ? (
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1.5 transition-shadow focus-within:ring-3 focus-within:ring-ring/30">
                <Search
                  aria-hidden="true"
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
              query={query}
              onUpdate={updateWord}
              onDelete={deleteWord}
              onAdd={addWord}
              onReviewDeck={setFocusCategory}
              onStartAdd={() => setAddOpen(true)}
              onClearSearch={() => setQuery("")}
            />
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <CoreKoreanPanel words={words} loading={loading} />
            <EssentialBooksPanel words={words} loading={loading} />
          </TabsContent>

          <TabsContent value="phrases">
            <PhrasesTab />
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
