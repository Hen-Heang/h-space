"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { GrowthTabs } from "@/components/growth/GrowthTabs"
import { navItem } from "@/lib/navigation"
import { containerVariants, itemVariants } from "@/lib/motion"
import { cn } from "@/lib/utils"

// The single "Progress" destination Grow links to — replaces four separate
// sidebar rows (Review, Achievements, Statistics; History merged separately,
// see app/(main)/history/page.tsx) with one hub, same pattern as the Learn
// and Goals hubs. Each linked page is untouched — this is navigation, not a
// content rewrite.
const CARDS = [navItem("review-hub"), navItem("review-achievements"), navItem("review-statistics")]

export default function ProgressPage() {
  const reduceMotion = useReducedMotion()
  const container = reduceMotion ? undefined : containerVariants
  const item = reduceMotion ? undefined : itemVariants

  return (
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={container}
      className="space-y-6 pb-12 sm:space-y-7"
    >
      <motion.div variants={item}>
        <GrowthTabs />
        <p className="text-sm text-muted-foreground">
          Your daily and weekly reviews, achievements, and stats.
        </p>
      </motion.div>

      <motion.div variants={item} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.id}
              href={card.href}
              className="group flex h-full min-h-11 items-start gap-3 rounded-lg border border-border bg-card p-4 outline-none transition-colors duration-150 hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div
                aria-hidden
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10",
                  card.color ?? "text-primary",
                )}
              >
                <Icon size={20} strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground">{card.label}</h3>
                {card.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {card.description}
                  </p>
                )}
              </div>
              <ArrowRight
                aria-hidden
                size={18}
                className="mt-1.5 shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </Link>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
