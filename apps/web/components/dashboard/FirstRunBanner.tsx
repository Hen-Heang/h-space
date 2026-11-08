"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { Inbox, Target, TreeDeciduous, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

import { openQuickCapture } from "@/lib/quick-capture-bus"
import { cn } from "@/lib/utils"

const DISMISSED_KEY = "hengo_first_run_dismissed"
const DISMISSED_EVENT = "hengo:first-run-dismissed"

const STEPS = [
  {
    num: 1,
    icon: Inbox,
    title: "Capture your first thought",
    description: "Save an idea, task, note, or anything you want to remember.",
    href: null,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    num: 2,
    icon: Target,
    title: "Create your first goal",
    description: "Choose an outcome and break it into manageable actions.",
    href: "/goals/create",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    num: 3,
    icon: TreeDeciduous,
    title: "Add one helpful habit",
    description: "Start with one small routine that supports your growth.",
    href: "/growth/habits",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
  },
] as const

export function FirstRunBanner() {
  const dismissed = useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback)
      window.addEventListener(DISMISSED_EVENT, callback)
      return () => {
        window.removeEventListener("storage", callback)
        window.removeEventListener(DISMISSED_EVENT, callback)
      }
    },
    () => window.localStorage.getItem(DISMISSED_KEY) === "1",
    () => true,
  )

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1")
    window.dispatchEvent(new Event(DISMISSED_EVENT))
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative overflow-hidden rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm sm:p-5"
        >
          {/* Dismiss */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss welcome banner"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={15} />
          </button>

          <div className="mb-4 pr-8">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600/80 dark:text-blue-400/80">
              Getting started
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Welcome to Hengo 👋</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Three steps to get your workspace running.
            </p>
          </div>

          <div className="grid sm:grid-cols-3">
            {STEPS.map(({ num, icon: Icon, title, description, href, color, bg }) => {
              const itemClassName = cn(
                "group flex min-h-16 w-full items-start gap-3 border-t border-blue-500/10 px-1 py-3 text-left outline-none transition-colors first:border-t-0 hover:bg-blue-500/5 focus-visible:ring-2 focus-visible:ring-blue-500/50 sm:border-l sm:border-t-0 sm:px-3 sm:first:border-l-0",
              )
              const content = (
                <>
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      bg,
                      color,
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      <span className={color}>{num}.</span> {title}
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
                  </div>
                </>
              )

              if (href === null) {
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      openQuickCapture()
                      dismiss()
                    }}
                    className={itemClassName}
                  >
                    {content}
                  </button>
                )
              }

              return (
                <Link key={num} href={href} onClick={dismiss} className={itemClassName}>
                  {content}
                </Link>
              )
            })}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-2 flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            I already know what I&apos;m doing — dismiss
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
