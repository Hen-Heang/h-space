"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { workspaceNavItems } from "@/lib/navigation"
import { cn } from "@/lib/utils"

type OnboardingFlowProps = {
  onDone: () => void
}

/**
 * First-run welcome. H-Space is a hub of several apps, so this asks no
 * per-app questions — it introduces the workspaces and lets the user pick
 * where to start. App-specific setup (e.g. Hengo Learning's level and goal)
 * lives in that app's own preferences.
 */
export function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const router = useRouter()

  function start(href: string) {
    onDone()
    router.push(href)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] max-w-md gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md"
      >
        <div className="px-6 pt-6 pb-4">
          <span className="mb-4 flex size-11 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <Image
              src="/H%20Space%20Icon.png"
              alt=""
              width={44}
              height={44}
              className="h-full w-full"
            />
          </span>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Welcome to H-Space
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed">
            Your projects in one space. Pick where to start — every workspace stays one click away
            in the sidebar.
          </DialogDescription>
        </div>

        <ul className="space-y-1.5 px-4 pb-4">
          {workspaceNavItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => start(item.href)}
                  className="group flex min-h-14 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon size={19} aria-hidden="true" className={cn(item.color)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-6 py-3">
          <button
            type="button"
            onClick={onDone}
            className="min-h-11 px-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
          >
            Skip for now
          </button>
          <Button type="button" onClick={() => start("/home")} className="h-11 rounded-xl px-5">
            Go to Overview
            <ArrowRight />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
