"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Drama, MessageCircle, Sparkles, Target } from "lucide-react"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"

import { PageHero } from "@/components/app/page-hero"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChipSelect } from "@/components/ui/chip-select"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { scenarioApi, getApiErrorMessage } from "@/lib/api"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { containerVariants, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { ScenarioDetail } from "@/lib/types"

const LEVEL_BADGE: Record<string, string> = {
  Beginner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Intermediate: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Advanced: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
}

export default function ScenariosPage() {
  useSessionTimer("scenarios")
  const router = useRouter()
  const [scenarios, setScenarios] = useState<ScenarioDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [category, setCategory] = useState("All")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [customTopic, setCustomTopic] = useState("")
  const customTopicInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    scenarioApi
      .getList()
      .then((data) => {
        if (active) setScenarios(data)
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err, "Could not load scenarios."))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(scenarios.map((s) => s.category)))],
    [scenarios],
  )

  const visible = category === "All" ? scenarios : scenarios.filter((s) => s.category === category)

  function handlePractice(scenario: ScenarioDetail) {
    const prompt = scenario.introMessage || `Let's practice: ${scenario.goal}`
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`)
  }

  function handleCustomPractice() {
    const topic = customTopic.trim()
    if (!topic) return
    router.push(`/chat?prompt=${encodeURIComponent(`Let's practice this in Korean: ${topic}`)}`)
  }

  function focusCustomTopic() {
    customTopicInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    customTopicInputRef.current?.focus()
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-12 sm:space-y-7"
    >
      <motion.div variants={itemVariants}>
        <PageHero
          eyebrow="Scenarios"
          title="Roleplay Scenarios"
          description="Practice real-life and workplace situations in Korean — from ordering food to giving a status update to your manager — then jump into a guided AI conversation."
          stats={[
            { label: "Scenarios", value: `${scenarios.length}` },
            { label: "Categories", value: `${Math.max(categories.length - 1, 0)}` },
          ]}
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-lg border border-border bg-card p-4 shadow-sm dark:bg-slate-900/40 sm:p-5"
      >
        <label className="text-sm font-semibold text-foreground">Category</label>
        <ChipSelect options={categories} value={category} onChange={setCategory} className="mt-3" />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-lg border border-border bg-card p-4 shadow-sm dark:bg-slate-900/40 sm:p-5"
      >
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles size={14} className="text-blue-500" />
          Or practice your own topic
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Input
            ref={customTopicInputRef}
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomPractice()
            }}
            placeholder="e.g. asking a coworker for help with a bug"
            className="h-11 rounded-lg"
          />
          <Button
            type="button"
            disabled={!customTopic.trim()}
            onClick={handleCustomPractice}
            className="h-11 shrink-0 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <MessageCircle size={14} className="mr-2" />
            Practice with AI Coach
          </Button>
        </div>
      </motion.div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading && (
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </motion.div>
      )}

      {!loading && visible.length > 0 && (
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2">
          {visible.map((scenario) => {
            const expanded = expandedId === scenario.id
            return (
              <div
                key={scenario.id}
                className="rounded-lg border border-border bg-card p-4 shadow-sm dark:bg-slate-900/40 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Drama size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80">
                        {scenario.category}
                      </p>
                      <h3 className="text-base font-semibold text-foreground">{scenario.title}</h3>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border px-2.5 py-1 text-xs font-semibold",
                      LEVEL_BADGE[scenario.level],
                    )}
                  >
                    {scenario.level}
                  </Badge>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">{scenario.summary}</p>

                <div className="mt-3 flex items-start gap-2 text-sm text-foreground">
                  <Target size={14} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  <span>{scenario.goal}</span>
                </div>

                {expanded && scenario.introMessage && (
                  <div className="mt-4 rounded-lg border border-border bg-background/60 px-4 py-3 dark:bg-white/4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Conversation starter
                    </p>
                    <p className="mt-1 text-sm leading-6 text-foreground">
                      {scenario.introMessage}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : scenario.id)}
                    className="min-h-11 px-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {expanded ? "Hide preview" : "Preview"}
                  </button>
                  <Button
                    type="button"
                    onClick={() => handlePractice(scenario)}
                    className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    <MessageCircle size={14} className="mr-2" />
                    Practice with AI Coach
                  </Button>
                </div>
              </div>
            )
          })}
        </motion.div>
      )}

      {!loading && !error && visible.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center"
        >
          <Drama size={32} className="mx-auto text-muted-foreground/50" />
          {scenarios.length === 0 ? (
            <>
              <p className="mt-3 text-sm font-bold text-foreground">
                You haven&apos;t created any scenarios yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Practice your own topic instead — describe a situation and jump straight into a
                guided AI conversation.
              </p>
              <Button
                type="button"
                onClick={focusCustomTopic}
                className="mt-5 h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-500 active:scale-95"
              >
                <Sparkles size={14} className="mr-2" />
                Practice your own topic
              </Button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-bold text-foreground">
                No scenarios in this category
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different category filter.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategory("All")}
                className="mt-5 h-10 rounded-xl px-5 text-xs font-bold"
              >
                Show all scenarios
              </Button>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
