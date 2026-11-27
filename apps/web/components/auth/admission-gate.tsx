"use client"

import { Loader2, ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { admissionApi } from "@/lib/api/admission"
import { clearAuth, getUserId, onAuthChange } from "@/lib/auth-store"
import { isAdmissionEnforced } from "@/lib/auth-v2"

type GateState = "checking" | "approved" | "unavailable"

/** Where a refused account lands: the sign-in page, with a generic notice. */
export const ACCESS_DENIED_LOGIN_HREF = "/login?reason=access_denied"

/**
 * Auth V2 admission on app entry (NEXT_PUBLIC_HSPACE_ADMISSION=enforce): a
 * session restored from storage is re-checked before the app shell mounts,
 * so no workspace query runs for an account that isn't (or is no longer) an
 * H-Space member. Re-checked when the account changes. Off: renders children
 * exactly as before. UX only - RLS and h-space-api enforce the same rule.
 */
export function AdmissionGate({ children }: { children: React.ReactNode }) {
  if (!isAdmissionEnforced()) return <>{children}</>
  return <EnforcedAdmissionGate>{children}</EnforcedAdmissionGate>
}

function EnforcedAdmissionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const userId = useSyncExternalStore(onAuthChange, getUserId, () => null)
  const [state, setState] = useState<{ userId: string | null; value: GateState }>({
    userId: null,
    value: "checking",
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!userId) return
    let active = true
    void admissionApi.check(userId).then(async (admission) => {
      if (!active) return
      if (admission === "approved") {
        setState({ userId, value: "approved" })
      } else if (admission === "unavailable") {
        setState({ userId, value: "unavailable" })
      } else {
        await clearAuth()
        router.replace(ACCESS_DENIED_LOGIN_HREF)
      }
    })
    return () => {
      active = false
    }
  }, [userId, attempt, router])

  const retry = useCallback(() => {
    setState({ userId, value: "checking" })
    setAttempt((n) => n + 1)
  }, [userId])

  // A different account than the one last checked is "checking" again.
  const current: GateState = state.userId === userId ? state.value : "checking"

  if (current === "approved") return <>{children}</>
  if (current === "unavailable") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-10">
        <EmptyState
          surface
          icon={ShieldAlert}
          className="w-full max-w-md"
          title="Couldn't confirm your access"
          description="H-Space checks that your account has access before opening it, and that check didn't answer. Nothing was loaded. Try again in a moment."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" className="min-h-11" onClick={retry}>
                Try again
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void clearAuth().then(() => router.replace("/login"))}
              >
                Sign out
              </Button>
            </div>
          }
        />
      </main>
    )
  }
  return (
    <main className="flex min-h-dvh items-center justify-center px-4" aria-busy="true">
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Checking access…
      </p>
    </main>
  )
}
