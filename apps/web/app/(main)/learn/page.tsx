"use client"

import { motion, useReducedMotion } from "motion/react"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { ContinueCard } from "@/components/learn/ContinueCard"
import { LearningSubjects } from "@/components/learn/LearningSubjects"
import { LibraryList } from "@/components/learn/LibraryList"
import { QuickAccessGrid } from "@/components/learn/QuickAccessGrid"
import { StudySkillSummary } from "@/components/learn/StudySkillSummary"
import { TodayPlanList } from "@/components/learn/TodayPlanList"
import { WorkFocusCard } from "@/components/learn/WorkFocusCard"
import { useDailyMission } from "@/hooks/useDailyMission"
import { useSkillMastery } from "@/hooks/useSkillMastery"
import { useVocabDueCount } from "@/hooks/useVocab"
import { summarizeStudyGroups } from "@/lib/learning/skill-groups"
import { containerVariants, itemVariants } from "@/lib/motion"

// The Learning Hub. One primary action (Continue — the daily mission's next
// step), then today's plan, the "Korean for my work" focus entry, the four
// everyday skills, practice scores, and the
// rest of the workspace as a Library. Every number is read from an existing
// query cache: the mission (kori_daily_missions), live vocabulary due count,
// and skill mastery. Nothing here computes its own priority.
export default function LearnPage() {
  // Framer's stagger/slide-in entrance isn't covered by the sitewide
  // prefers-reduced-motion CSS rule (that only catches CSS transitions), so
  // it's opted out explicitly here — content just appears, no motion.
  const reduceMotion = useReducedMotion()
  const container = reduceMotion ? undefined : containerVariants
  const item = reduceMotion ? undefined : itemVariants

  const { mastery, loading: masteryLoading } = useSkillMastery()
  const {
    mission,
    loading: missionLoading,
    error: missionError,
    refreshMission,
  } = useDailyMission()
  const { dueCount, loading: dueLoading } = useVocabDueCount()
  const groups = summarizeStudyGroups(mastery)

  return (
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={container}
      className="space-y-6 pb-12"
    >
      <motion.div variants={item} className="space-y-3">
        <WorkspaceTabs sectionId="learn" />
        <p className="text-sm text-muted-foreground">
          Korean for work and daily life — pick up where you left off.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <motion.div variants={item} className="space-y-6">
          <ContinueCard
            mission={mission}
            loading={missionLoading}
            error={missionError}
            onRetry={() => void refreshMission()}
            dueCount={dueCount}
            dueLoading={dueLoading}
          />
          {mission && <TodayPlanList mission={mission} vocabDue={dueLoading ? null : dueCount} />}
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          <WorkFocusCard />
          <QuickAccessGrid vocabDue={dueLoading ? null : dueCount} />
          <StudySkillSummary groups={groups} loading={masteryLoading} />
        </motion.div>
      </div>

      <motion.div variants={item}>
        <LibraryList />
      </motion.div>

      <motion.div variants={item}>
        <LearningSubjects />
      </motion.div>
    </motion.div>
  )
}
