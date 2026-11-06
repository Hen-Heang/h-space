"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { BriefcaseBusiness, ChevronRight } from "lucide-react"

import { koreanCoachApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"

// "Korean for my work" — a focus inside the Learning workspace, not a new
// destination. Two entries: understand a message (the analyzer) and practice
// replies (the Phrasebook's work mode). The focus itself is the existing
// "Workplace Korean" goal (Korean Coach preferences), which is also what
// gives Today's plan its one work-message task. Shares the preferences query
// cache with useRomanizationPreference — no extra request.
export function WorkFocusCard() {
  const userId = getUserId()
  const { data } = useQuery({
    queryKey: ["korean-coach-preferences", userId],
    queryFn: () => koreanCoachApi.getPreferences(),
    enabled: userId != null,
    staleTime: 60_000,
  })
  const focused = data?.mainGoal === "workplace"

  return (
    <section aria-labelledby="work-focus-heading" className="app-surface p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <BriefcaseBusiness aria-hidden="true" className="size-4" />
        </span>
        <h2 id="work-focus-heading" className="text-sm font-semibold text-foreground">
          Korean for my work
        </h2>
      </div>
      <ul className="mt-3 -mx-2">
        <li>
          <FocusLink
            href="/chat?mode=analyze"
            title="Understand a work message"
            detail="Main point, what to do, and a short reply"
          />
        </li>
        <li>
          <FocusLink
            href="/phrasebook/practice?mode=work"
            title="Practice work replies"
            detail="Listen, find the action, answer in 1–3 sentences"
          />
        </li>
      </ul>
      {data && (
        <p className="mt-2 text-xs text-muted-foreground">
          {focused ? (
            "Your goal is Workplace Korean, so today's plan includes one work message."
          ) : (
            <>
              Want a work message in today&apos;s plan?{" "}
              <Link
                href="/korean-coach/preferences"
                className="font-medium text-primary hover:underline"
              >
                Set your goal to Workplace Korean
              </Link>
              . It applies from the next plan.
            </>
          )}
        </p>
      )}
    </section>
  )
}

function FocusLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-11 items-center gap-3 rounded-md px-2 py-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}
