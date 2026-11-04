"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, type Variants } from "motion/react"
import { ArrowRight, Filter, Loader2, Search, Sparkles, Zap } from "lucide-react"
import { toast } from "sonner"

import { PageHero } from "@/components/app/page-hero"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CardGrid } from "@/components/ui/card-grid"
import EmojiIconPicker from "@/components/ui/emoji-icon-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { goalTemplates } from "@/lib/goal-templates"
import type { GoalTemplate } from "@/lib/goal-templates/types"
import { useCreateGoal } from "@/hooks/useGoalMutations"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
}

const LIFE_GOAL_CATEGORIES = new Set(["financial", "career", "personal"])

export default function CreateGoalPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [quickTitle, setQuickTitle] = useState("")
  const [quickIcon, setQuickIcon] = useState<string | null>(null)
  const [noDuration, setNoDuration] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const { createGoal, isLoading: isQuickCreating } = useCreateGoal()

  const categories = Array.from(new Set(goalTemplates.map((t) => t.category)))
  const filteredTemplates = goalTemplates.filter((template) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      template.name.toLowerCase().includes(q) ||
      template.description.toLowerCase().includes(q) ||
      template.category.toLowerCase().includes(q)
    const matchesCategory = activeCategory ? template.category === activeCategory : true
    return matchesSearch && matchesCategory
  })
  // None of these templates are Korean-study-specific (the goals system is a
  // general tracker shared with Orbit — see CLAUDE.md). Financial/career/
  // personal-habit templates read as noise dropped into a language-learning
  // app, so they get their own clearly labeled section below the
  // education/fitness/creative templates instead of blending in.
  const primaryTemplates = filteredTemplates.filter((t) => !LIFE_GOAL_CATEGORIES.has(t.category))
  const lifeGoalTemplates = filteredTemplates.filter((t) => LIFE_GOAL_CATEGORIES.has(t.category))

  // The whole card is one real link (keyboard, middle-click, "open in new
  // tab"), with nothing interactive inside it — the arrow is decoration.
  const renderTemplateCard = (template: GoalTemplate) => (
    <motion.div key={template.id} variants={itemVariants}>
      <Link
        href={`/goals/create/template/${template.id}`}
        className="group block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="relative flex h-full flex-col transition-colors group-hover:border-primary/30">
          <CardHeader className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div
                aria-hidden="true"
                className="mb-1 flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                style={{ background: template.color }}
              >
                {template.icon}
              </div>
              <ArrowRight
                aria-hidden="true"
                className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              />
            </div>
            <CardTitle className="mt-3 text-lg font-semibold leading-tight tracking-tight transition-colors group-hover:text-primary">
              {template.name}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed">
              {template.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto p-5 pt-0">
            <div className="mb-3">
              <span className="rounded-md border border-primary/10 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {template.category}
              </span>
            </div>
            <div className="flex items-center gap-4 border-t border-foreground/[0.05] pt-3 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-primary/60" />
                {template.sections.length} sections
              </span>
              <span className="flex items-center gap-1.5">
                <Zap size={12} className="text-primary/60" />
                {template.sections.reduce((acc, s) => acc + s.fields.length, 0)} fields
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )

  const handleQuickCreate = async () => {
    if (!quickTitle.trim()) {
      toast.error("Title is required", { description: "Please enter a goal title." })
      return
    }
    const defaultTargetDate = new Date()
    defaultTargetDate.setMonth(defaultTargetDate.getMonth() + 1)

    const result = await createGoal({
      title: quickTitle.trim(),
      description: "",
      target_date: noDuration ? null : defaultTargetDate,
      no_duration: noDuration,
      start_date: new Date(),
      metadata: {
        version: 1,
        goal_type: "general",
        start_date: new Date().toISOString(),
        no_duration: noDuration,
        icon: quickIcon ?? undefined,
      },
    })
    if (result.success && result.goal?.id) {
      router.push(`/goals/${result.goal.id}`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Planner"
        title="New goal"
        variant="compact"
        description="Start from a template or launch a blank goal — then schedule the work."
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* Left: Quick launch + filters + custom link */}
        <div className="space-y-5 lg:sticky lg:top-[calc(var(--shell-header-h,0px)+1.5rem)]">
          <Card>
            <CardHeader>
              <div className="mb-1 flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Zap size={20} />
                </div>
                <CardTitle className="text-xl font-semibold">Quick launch</CardTitle>
              </div>
              <CardDescription>Enter a title to instantly create a new goal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="quick-goal-title"
                  className="ml-1 text-xs font-medium text-muted-foreground"
                >
                  Goal title
                </Label>
                <div className="flex items-center gap-2">
                  <EmojiIconPicker value={quickIcon} onChange={setQuickIcon} align="start">
                    <button
                      type="button"
                      aria-label="Pick goal icon"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-xl transition-colors hover:border-primary/40 hover:bg-primary/20"
                    >
                      {quickIcon ?? (
                        <span className="text-sm font-semibold text-primary">
                          {quickTitle.trim().charAt(0).toUpperCase() || "G"}
                        </span>
                      )}
                    </button>
                  </EmojiIconPicker>
                  <Input
                    id="quick-goal-title"
                    placeholder="e.g., Master Quantum Computing"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        void handleQuickCreate()
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Infinite duration</span>
                  <span className="text-xs text-muted-foreground">No specific deadline</span>
                </div>
                <Switch checked={noDuration} onCheckedChange={setNoDuration} />
              </div>

              <Button
                onClick={handleQuickCreate}
                disabled={isQuickCreating || !quickTitle.trim()}
                className="w-full"
                size="lg"
              >
                {isQuickCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create goal"
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Filter size={14} className="text-primary" />
              <h3 className="text-xs font-medium text-muted-foreground">Categories</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <Link
            href="/goals/create/custom"
            className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="border-dashed transition-colors group-hover:border-primary/40">
              <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-1 text-base font-semibold">Custom Goal</h3>
                <p className="px-4 text-sm text-muted-foreground">
                  Build a unique goal with full manual control.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Right: template grid */}
        <div className="lg:col-span-2">
          <div className="relative mb-5">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full pl-11"
            />
          </div>

          <AnimatePresence mode="popLayout">
            {filteredTemplates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Search className="h-8 w-8 text-muted-foreground opacity-30" />
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight">No templates found</h3>
                <p className="max-w-xs text-sm font-medium text-muted-foreground">
                  No templates match your search.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("")
                    setActiveCategory(null)
                  }}
                  className="mt-4 text-primary"
                >
                  Clear filters
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {primaryTemplates.length > 0 && (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <CardGrid minCardWidth={280}>
                      {primaryTemplates.map(renderTemplateCard)}
                    </CardGrid>
                  </motion.div>
                )}

                {lifeGoalTemplates.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-foreground">Life Goals</h2>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Beta
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">
                      General habit and life-goal templates — not Korean-study specific.
                    </p>
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                      <CardGrid minCardWidth={280}>
                        {lifeGoalTemplates.map(renderTemplateCard)}
                      </CardGrid>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
