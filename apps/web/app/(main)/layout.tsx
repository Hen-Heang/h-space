"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useSyncExternalStore } from "react"

import { AppShell } from "@/components/layout/AppShell"
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow"
import { userApi } from "@/lib/api"
import { isAuthenticated, getUserId, onAuthChange } from "@/lib/auth-store"
import { hasCompletedOnboarding, markOnboardingComplete } from "@/lib/onboarding-store"
import { recordLastVisited, type WorkspaceId } from "@/lib/last-visited"
import { sectionRoutePrefixes } from "@/lib/navigation"

// The route layout owns only what has to live at the route boundary: the auth
// gate, the onboarding wizard, and last-visited tracking. Every piece of visual
// navigation chrome lives in <AppShell> (components/layout/*).

const TRACKED_WORKSPACES = Object.keys(sectionRoutePrefixes) as WorkspaceId[]

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)

  const mounted = useSyncExternalStore(
    (callback) => {
      queueMicrotask(callback)
      return () => undefined
    },
    () => true,
    () => false,
  )

  useEffect(() => {
    if (!mounted) return
    if (!isAuthenticated()) {
      router.replace("/login")
      return
    }
    // The session can also end mid-visit: a rejected token refresh, or a
    // sign-out in another tab.
    return onAuthChange(() => {
      if (!isAuthenticated()) router.replace("/login")
    })
  }, [mounted, router])

  // Record the current route against its section so Today's "Continue" cards
  // can deep-link back into whatever the user was actually doing.
  useEffect(() => {
    const workspace = TRACKED_WORKSPACES.find((id) =>
      sectionRoutePrefixes[id].some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ),
    )
    if (workspace) recordLastVisited(workspace, pathname)
  }, [pathname])

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return
    const userId = getUserId()
    if (!userId || hasCompletedOnboarding(userId)) return
    let active = true
    // Cross-device fallback: the "seen it" flag is local-only. Accounts that
    // finished the old Korean-learning wizard have a learning goal set, so
    // they never see the welcome again. Newer accounts have no server-side
    // flag and see it once per device.
    userApi
      .getById(userId)
      .then((profile) => {
        if (!active) return
        if (profile.learningGoal) markOnboardingComplete(userId)
        else setShowOnboarding(true)
      })
      .catch(() => {
        /* if the profile check fails, don't block the app on the wizard */
      })
    return () => {
      active = false
    }
  }, [mounted])

  if (!mounted) return null
  if (!isAuthenticated()) return null

  return (
    <>
      <AppShell>{children}</AppShell>
      {showOnboarding && (
        <OnboardingFlow
          onDone={() => {
            markOnboardingComplete(getUserId())
            setShowOnboarding(false)
          }}
        />
      )}
    </>
  )
}
