"use client"

import { useState } from "react"
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Lightbulb,
  Quote,
  Scale,
  ArrowRight,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import {
  JUDGES_AVOID,
  JUDGES_WANT,
  SAFETY_SENTENCES,
  SKILL_TRAINING_PLAN,
  SPEAKING_RULES,
} from "@/lib/exam-strategy"
import { cn } from "@/lib/utils"

/**
 * Exam-day speaking strategy from the candidate's prep doc: the nine rules to
 * remember, memorized safety sentences (speakable for ear-drilling), what the
 * judges actually reward, and the per-skill training plan. Collapsible, same
 * pattern as the Study Pack, so it can sit on the Exam Prep page without
 * dominating it.
 */
export function SpeakingTipsCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-5 text-left sm:px-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
            <Lightbulb size={20} />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Speaking Strategy</CardTitle>
            <p className="text-xs font-medium text-muted-foreground">
              The 9 rules, safety sentences & training plan — how to score, not just what to say.
            </p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-7 border-t border-border/80 pt-6">
              {/* The nine rules */}
              <section>
                <TipsSectionLabel icon={<Lightbulb size={13} />} color="violet">
                  Main ideas to remember
                </TipsSectionLabel>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {SPEAKING_RULES.map((rule, i) => (
                    <div
                      key={rule.title}
                      className="rounded-2xl border border-border bg-accent/5 px-3.5 py-3"
                    >
                      <p className="font-bold leading-snug text-foreground">
                        <span className="mr-1.5 text-violet-600 dark:text-violet-400">
                          {i + 1}.
                        </span>
                        {rule.title}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {rule.points.map((point) => (
                          <li
                            key={point}
                            className="text-xs font-medium leading-relaxed text-muted-foreground"
                          >
                            · {point}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                        <ArrowRight aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                        {rule.takeaway}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Safety sentences — memorize + drill by ear */}
              <section>
                <TipsSectionLabel icon={<Quote size={13} />} color="emerald">
                  Safety sentences · memorize these
                </TipsSectionLabel>
                <div className="mt-3 space-y-2">
                  {SAFETY_SENTENCES.map((entry) => (
                    <div
                      key={entry.ko}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-accent/5 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold leading-snug text-foreground">{entry.ko}</p>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                          {entry.en}
                        </p>
                      </div>
                      <SpeakButton text={entry.ko} className="mt-0.5 shrink-0 p-1.5" />
                    </div>
                  ))}
                </div>
              </section>

              {/* What the judges want */}
              <section>
                <TipsSectionLabel icon={<Scale size={13} />} color="sky">
                  What the judges want
                </TipsSectionLabel>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-3.5 py-3">
                    {JUDGES_AVOID.map((item) => (
                      <p
                        key={item}
                        className="flex items-center gap-2 py-0.5 text-sm font-bold text-destructive"
                      >
                        <Ban size={14} className="shrink-0" /> {item}
                      </p>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3">
                    {JUDGES_WANT.map((item) => (
                      <p
                        key={item}
                        className="flex items-center gap-2 py-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-400"
                      >
                        <CheckCircle2 size={14} className="shrink-0" /> {item}
                      </p>
                    ))}
                  </div>
                </div>
              </section>

              {/* Per-skill training plan */}
              <section>
                <TipsSectionLabel icon={<Dumbbell size={13} />} color="amber">
                  Training plan by skill
                </TipsSectionLabel>
                <div className="mt-3 space-y-2">
                  {SKILL_TRAINING_PLAN.map((plan) => (
                    <div
                      key={plan.skill}
                      className="rounded-2xl border border-border bg-accent/5 px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="font-bold text-foreground">
                          {plan.skill}
                          <span className="ml-2 text-sm font-medium text-muted-foreground">
                            {plan.goal}
                          </span>
                        </p>
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          {plan.frequency}
                        </p>
                      </div>
                      <ul className="mt-1.5 space-y-0.5">
                        {plan.methods.map((method) => (
                          <li
                            key={method}
                            className="text-xs font-medium leading-relaxed text-muted-foreground"
                          >
                            · {method}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function TipsSectionLabel({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode
  color: "violet" | "emerald" | "sky" | "amber"
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-md",
          color === "violet" && "bg-violet-500/10 text-violet-600",
          color === "emerald" && "bg-emerald-500/10 text-emerald-600",
          color === "sky" && "bg-sky-500/10 text-sky-600",
          color === "amber" && "bg-amber-500/10 text-amber-600",
        )}
      >
        {icon}
      </span>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {children}
      </p>
    </div>
  )
}
