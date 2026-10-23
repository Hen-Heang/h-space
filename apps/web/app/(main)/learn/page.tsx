"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"

import { LearningModuleCard } from "@/components/learn/LearningModuleCard"
import { LearningSubjects } from "@/components/learn/LearningSubjects"
import { StudyRecommendation } from "@/components/learn/StudyRecommendation"
import { StudySkillSummary } from "@/components/learn/StudySkillSummary"
import { useDailyMission } from "@/hooks/useDailyMission"
import { useSkillMastery } from "@/hooks/useSkillMastery"
import { useVocabDueCount } from "@/hooks/useVocab"
import { learningModules } from "@/lib/learning-modules"
import { summarizeStudyGroups } from "@/lib/learning/skill-groups"
import { containerVariants, itemVariants } from "@/lib/motion"
import { linkPath, navSections } from "@/lib/navigation"

// Korean routes the module cards don't cover (Scenarios, Exam Prep, History).
// Derived from the registry so a new Learning route shows up here without a
// second list to maintain — this hub is their front door now that the global
// sidebar lists only workspaces.
const moduleHrefs = new Set(learningModules.map((module) => linkPath(module.href)))
const moreKoreanRoutes = (navSections.find((s) => s.id === "learn")?.items ?? []).filter(
  (item) => !item.soon && item.id !== "learn-hub" && !moduleHrefs.has(linkPath(item.href)),
)

export default function LearnPage() {
  // Framer's stagger/slide-in entrance isn't covered by the sitewide
  // prefers-reduced-motion CSS rule (that only catches CSS transitions), so
  // it's opted out explicitly here — content just appears, no motion.
  const reduceMotion = useReducedMotion()
  const container = reduceMotion ? undefined : containerVariants
  const item = reduceMotion ? undefined : itemVariants

  const { mastery, loading: masteryLoading } = useSkillMastery()
  const { mission, loading: missionLoading } = useDailyMission()
  const { dueCount, loading: dueLoading } = useVocabDueCount()
  const groups = summarizeStudyGroups(mastery)

  return (
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={container}
      className="space-y-8 pb-12"
    >
      <motion.section variants={item} aria-labelledby="learn-subjects" className="space-y-3">
        <h2 id="learn-subjects" className="text-sm font-semibold text-foreground">
          Subjects
        </h2>
        <LearningSubjects />
      </motion.section>

      <motion.section
        variants={item}
        id="korean"
        aria-labelledby="learn-korean"
        className="scroll-mt-20 space-y-5"
      >
        <div>
          <h2 id="learn-korean" className="text-lg font-semibold text-foreground">
            Korean · Hengo Learning
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the Korean you need for work and daily life.
          </p>
        </div>

        <StudySkillSummary groups={groups} loading={masteryLoading} />

        <StudyRecommendation
          mission={mission}
          loading={missionLoading}
          dueCount={dueCount}
          dueLoading={dueLoading}
        />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Modules</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {learningModules.map((module) => (
              <LearningModuleCard key={module.id} module={module} />
            ))}
          </div>
          {moreKoreanRoutes.length > 0 && (
            <nav aria-label="More Korean practice" className="flex flex-wrap gap-x-1 gap-y-1 pt-1">
              <span className="py-2 pr-1 text-sm text-muted-foreground">Also:</span>
              {moreKoreanRoutes.map((route) => (
                <Link
                  key={route.id}
                  href={route.href}
                  className="inline-flex min-h-9 items-center rounded-md px-2.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {route.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </motion.section>
    </motion.div>
  )
}
