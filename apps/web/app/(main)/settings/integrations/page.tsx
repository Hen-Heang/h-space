"use client"

import { Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { motion } from "motion/react"
import { toast } from "sonner"

import { BackLink } from "@/components/ui/back-link"
import { GoogleCalendarIntegrationCard } from "@/components/settings/GoogleCalendarIntegrationCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useGoogleCalendarIntegration } from "@/hooks/useGoogleCalendarIntegration"
import { isCalendarIntegrationsEnabled } from "@/lib/feature-flags"
import { containerVariants, itemVariants } from "@/lib/motion"

// Handles the redirect back from the Google Calendar OAuth callback
// (?google_calendar=success|error) — toasts once, refetches the connection
// status, then strips the param so a refresh doesn't re-toast.
function ConnectionResultHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const handled = useRef(false)

  useEffect(() => {
    const result = searchParams.get("google_calendar")
    if (!result || handled.current) return
    handled.current = true

    if (result === "success") {
      toast.success("Google Calendar connected")
      void queryClient.invalidateQueries({ queryKey: ["google-calendar-integration"] })
    } else if (result === "error") {
      toast.error("Could not connect Google Calendar", { description: "Please try again." })
    }
    router.replace("/settings/integrations")
  }, [searchParams, router, queryClient])

  return null
}

export default function IntegrationsSettingsPage() {
  // Hidden until Plan is navigable (lib/feature-flags.ts). Someone who
  // connected while the section was live keeps the full card, so their only
  // route to "Disconnect" never disappears behind a flag flip.
  const { connected, isLoading } = useGoogleCalendarIntegration()
  const enabled = isCalendarIntegrationsEnabled()
  const showCard = enabled || connected

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-2xl space-y-6 pb-16"
    >
      <Suspense>
        <ConnectionResultHandler />
      </Suspense>

      <motion.div variants={itemVariants}>
        <BackLink href="/settings" label="Settings" desktopOnly />
        <h2 className="mt-2 text-lg font-semibold text-foreground">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {showCard
            ? "Connect external calendars and services to Hengo."
            : "Calendar connections are not available yet."}
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        {isLoading ? (
          <Skeleton className="h-44 w-full rounded-lg" />
        ) : showCard ? (
          <GoogleCalendarIntegrationCard />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">Not available yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Connecting a calendar is only useful once you can see your tasks and schedule
              alongside it. This comes back when the Plan section ships.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
