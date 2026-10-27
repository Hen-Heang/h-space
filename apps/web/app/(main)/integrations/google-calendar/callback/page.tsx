"use client"

// Google redirects here after the Calendar consent screen
// (lib/api/integrations.ts starts that redirect). This page never sees a
// Google access/refresh token — only the short-lived authorization `code`,
// which it immediately hands to the trusted server route
// (app/api/integrations/google-calendar/callback) and never stores or logs.
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CircleCheck, Loader2, ShieldOff } from "lucide-react"

import { getSupabaseAccessToken } from "@/lib/auth-store"

const OAUTH_STATE_STORAGE_KEY = "hengo:gcal-oauth-state"

type Status = "processing" | "success" | "error"

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>("processing")

  useEffect(() => {
    let cancelled = false

    async function run() {
      const error = searchParams.get("error")
      const code = searchParams.get("code")
      const state = searchParams.get("state")
      const expectedState = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY)
      sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)

      if (error || !code || !state || state !== expectedState) {
        if (!cancelled) setStatus("error")
        return
      }

      const accessToken = await getSupabaseAccessToken().catch(() => null)
      if (!accessToken) {
        if (!cancelled) setStatus("error")
        return
      }

      try {
        const res = await fetch("/api/integrations/google-calendar/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ code }),
        })
        if (!cancelled) setStatus(res.ok ? "success" : "error")
      } catch {
        if (!cancelled) setStatus("error")
      }
    }

    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status === "processing") return
    const timeout = setTimeout(() => {
      router.replace(`/settings/integrations?google_calendar=${status}`)
    }, 900)
    return () => clearTimeout(timeout)
  }, [status, router])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      {status === "processing" && (
        <>
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Connecting your Google Calendar…
          </p>
        </>
      )}
      {status === "success" && (
        <>
          <CircleCheck size={28} className="text-emerald-500" />
          <p className="text-sm font-medium text-foreground">Google Calendar connected</p>
        </>
      )}
      {status === "error" && (
        <>
          <ShieldOff size={28} className="text-destructive" />
          <p className="text-sm font-medium text-foreground">Could not connect Google Calendar</p>
        </>
      )}
    </div>
  )
}

export default function GoogleCalendarCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  )
}
