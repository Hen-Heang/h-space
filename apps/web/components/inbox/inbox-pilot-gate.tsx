"use client"

import { KeyRound, Loader2, ShieldAlert, WifiOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { hubSessionApi } from "@/lib/api/hub-http"
import { clearAuth } from "@/lib/auth-store"
import { HubApiError, pilotStateFor, resolveHubApiConfig, type PilotState } from "@/lib/auth-v2"
import { loginHref } from "@/lib/safe-next-path"

/**
 * Inbox on h-space-api's Auth V2 pilot (NEXT_PUBLIC_AUTHV2_INBOX_BACKEND=
 * spring): asks the session probe first and shows the matching state instead
 * of a failing list. The server enforces admission and aal2 on every Inbox
 * request; this only explains it. Pilot off: renders children unchanged.
 */
export function InboxPilotGate({ children }: { children: React.ReactNode }) {
  if (!resolveHubApiConfig().enabled) return <>{children}</>
  return <EnabledPilotGate>{children}</EnabledPilotGate>
}

function EnabledPilotGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<PilotState | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    hubSessionApi
      .get()
      .then((session) => active && setState(pilotStateFor(session)))
      .catch((error: unknown) => {
        if (!active) return
        const next = pilotStateFor(
          error instanceof HubApiError ? error : new HubApiError("other", 0, "", null),
        )
        setState(next)
        if (next.kind === "expired") {
          void clearAuth().then(() => router.replace(loginHref("/inbox")))
        }
      })
    return () => {
      active = false
    }
  }, [attempt, router])

  const retry = useCallback(() => {
    setState(null)
    setAttempt((n) => n + 1)
  }, [])

  if (state === null || state.kind === "expired") {
    return (
      <div className="app-surface flex items-center justify-center px-4 py-10" aria-busy="true">
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {state?.kind === "expired"
            ? "Your session ended. Signing you out…"
            : "Checking your session…"}
        </p>
      </div>
    )
  }
  if (state.kind === "ready") return <>{children}</>
  if (state.kind === "mfa_enrollment_required") {
    return (
      <EmptyState
        surface
        icon={KeyRound}
        title="Set up two-step verification to use the Inbox"
        description="The Inbox on the new H-Space API needs a session verified with an authenticator code. Add an authenticator (and a backup device), then sign in again with its code."
        action={
          <Button asChild className="min-h-11">
            <Link href="/settings/security">Set up an authenticator</Link>
          </Button>
        }
      />
    )
  }
  if (state.kind === "access_denied") {
    return (
      <EmptyState
        surface
        icon={ShieldAlert}
        title="No access to the Inbox"
        description="This account doesn't have access to H-Space's Inbox. Ask the H-Space owner if you think it should."
      />
    )
  }
  return (
    <EmptyState
      surface
      icon={WifiOff}
      title="The Inbox is unavailable"
      description="H-Space couldn't reach or confirm your session with its API. Nothing was changed. Try again in a moment."
      action={
        <Button type="button" variant="outline" className="min-h-11" onClick={retry}>
          Try again
        </Button>
      }
    />
  )
}
