"use client"

import { Suspense, useEffect, useState, type CSSProperties } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { QuickSwitcher } from "@/components/app/quick-switcher"
import { FloatingAiCoach } from "@/components/chat/FloatingAiCoach"
import { QuickCaptureDialog } from "@/components/inbox/QuickCaptureDialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useMobileKeyboard } from "@/hooks/useMobileKeyboard"
import { useNavigationMode } from "@/hooks/useNavigationMode"
import { useSidebarState } from "@/hooks/useSidebarState"
import { getActiveNavItem } from "@/lib/navigation"
import { recordRecentNavId } from "@/lib/last-visited"
import { cn } from "@/lib/utils"

import { DesktopHeader } from "./DesktopHeader"
import { DesktopSidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from "./DesktopSidebar"
import { MobileBottomNav } from "./MobileBottomNav"
import { MobileHeader } from "./MobileHeader"
import { MobileHeaderTitleProvider } from "./mobile-header-title"
import { RAIL_WIDTH_CSS, TabletNavigationRail } from "./TabletNavigationRail"

/**
 * `useSearchParams()` must sit under a Suspense boundary or Next fails the
 * production build. Each nav surface gets its own boundary so page content
 * never falls into a client-only hole.
 */
function NavSuspense({
  fallback = null,
  children,
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>
}

function useNavLocation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return { pathname, searchParams }
}

// ─── Chrome pieces (each reads the query, so each is its own boundary) ────────

function SidebarChrome({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const { pathname, searchParams } = useNavLocation()
  return (
    <DesktopSidebar
      pathname={pathname}
      searchParams={searchParams}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
    />
  )
}

function RailChrome() {
  const { pathname, searchParams } = useNavLocation()
  return <TabletNavigationRail pathname={pathname} searchParams={searchParams} />
}

function DesktopHeaderChrome() {
  const { pathname, searchParams } = useNavLocation()
  return <DesktopHeader pathname={pathname} searchParams={searchParams} />
}

function MobileHeaderChrome({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { pathname, searchParams } = useNavLocation()
  return (
    <MobileHeader pathname={pathname} searchParams={searchParams} onOpenSearch={onOpenSearch} />
  )
}

function BottomNavChrome() {
  const { pathname, searchParams } = useNavLocation()
  return <MobileBottomNav pathname={pathname} searchParams={searchParams} />
}

/** Records the current destination for the Quick Switcher's Recent group. */
function RecentTracker() {
  const { pathname, searchParams } = useNavLocation()
  const item = getActiveNavItem(pathname, searchParams)
  const id = item?.id

  useEffect(() => {
    if (id) recordRecentNavId(id)
  }, [id])

  return null
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const mode = useNavigationMode()
  const isKeyboardOpen = useMobileKeyboard()
  const { collapsed, toggle } = useSidebarState()
  const [searchOpen, setSearchOpen] = useState(false)

  const isMobile = mode === "mobile"

  // Immersive routes. `/chat` keeps the compact mobile header so there is
  // always a visible way back; `/growth/recovery/pause` is fully immersive by
  // design — navigation must never overlay the breathing timer. `/home` is
  // the persistent Today page and renders inside the standard shell like any
  // other route (see docs/navigation-shell-audit.md §2.3) — no isHomeRoute
  // branch here.
  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/")
  // `/growth/recovery/pause` is a server redirect to `/growth/recovery/urge`,
  // which is the screen that actually renders the guided pause as a fixed
  // full-screen overlay. Both are listed so no navigation is ever drawn over
  // the pause timer, whichever URL the user arrives on.
  const isPauseRoute = pathname === "/growth/recovery/pause" || pathname === "/growth/recovery/urge"
  // The OAuth consent screen (app/(main)/oauth/consent) is a standalone
  // decision page, not a Hengo feature — it must never show the app's own
  // nav chrome, same treatment as the pause timer.
  const isConsentRoute = pathname === "/oauth/consent"
  const isChromeless = isPauseRoute || isConsentRoute
  const fullBleed = isChatRoute || isChromeless
  // Calendar is a primary planning workspace rather than a document page. It
  // keeps the normal Hengo navigation chrome but owns every remaining pixel,
  // like a desktop calendar app, instead of inheriting the centered page frame.
  const isCalendarRoute = pathname === "/goals/calendar"
  const contentFullBleed = fullBleed || isCalendarRoute

  // Chat renders its own compact top bar (mode switcher + a "Back to home"
  // button), so the shell header would be a second one — but the escape route
  // is still always visible, which is what matters.
  const showMobileHeader = isMobile && !isChromeless && !isChatRoute
  // Unmounted (not just hidden) when the keyboard is up, so nothing inside
  // stays focusable behind the keyboard.
  const showBottomNav = isMobile && !isChromeless && !isChatRoute && !isKeyboardOpen
  const showFloatingCoach = !isChromeless && !isChatRoute

  // Heights of the shell chrome that overlaps scrolled content, for pages'
  // sticky elements: `top-[var(--shell-header-h)]` stays below the sticky
  // header, `bottom-[var(--shell-bottom-nav-h)]` above the fixed bottom nav.
  // Mirrors the headers' own classes: DesktopHeader is h-14; MobileHeader is a
  // size-11 row + pb-2 + 1px border + pt-[max(0.5rem,safe-area-top)].
  // MobileBottomNav is a floating capsule: min-h-12 tab + p-1 + 2px border,
  // sitting max(0.5rem, safe-area-bottom) above the screen edge.
  const showDesktopHeader = !isMobile && !isChromeless
  const shellOffsets = {
    "--shell-header-h": showDesktopHeader
      ? "3.5rem"
      : showMobileHeader
        ? "calc(3.25rem + 1px + max(0.5rem, env(safe-area-inset-top)))"
        : "0px",
    "--shell-bottom-nav-h": showBottomNav
      ? "calc(3.5rem + 2px + max(0.5rem, env(safe-area-inset-bottom)))"
      : "0px",
  } as CSSProperties

  return (
    <TooltipProvider delayDuration={200}>
      <MobileHeaderTitleProvider>
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>

        <NavSuspense>
          <RecentTracker />
        </NavSuspense>

        <div
          className={cn(
            "flex bg-background",
            isCalendarRoute ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]",
          )}
        >
          {mode === "desktop" && !isChromeless && (
            <NavSuspense
              fallback={
                <div
                  aria-hidden
                  style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
                  className="shrink-0 border-r border-border bg-sidebar"
                />
              }
            >
              <SidebarChrome collapsed={collapsed} onToggleCollapsed={toggle} />
            </NavSuspense>
          )}

          {mode === "tablet" && !isChromeless && (
            <NavSuspense
              fallback={
                <div
                  aria-hidden
                  style={{ width: RAIL_WIDTH_CSS }}
                  className="shrink-0 border-r border-border bg-sidebar"
                />
              }
            >
              <RailChrome />
            </NavSuspense>
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={shellOffsets}>
            {showDesktopHeader && (
              <NavSuspense
                fallback={<div aria-hidden className="h-[57px] border-b border-border" />}
              >
                <DesktopHeaderChrome />
              </NavSuspense>
            )}

            {showMobileHeader && (
              <NavSuspense
                fallback={<div aria-hidden className="h-[52px] border-b border-border" />}
              >
                <MobileHeaderChrome onOpenSearch={() => setSearchOpen(true)} />
              </NavSuspense>
            )}

            <main
              id="main-content"
              tabIndex={-1}
              className={cn(
                // overflow-x-clip, not -hidden: "hidden" makes <main> a scroll
                // container (overflow-y computes to auto) that never scrolls,
                // so every position: sticky inside it silently did nothing.
                // "clip" still stops sideways overflow. The calendar's
                // overflow-y-hidden turns clip back into hidden, as before.
                "min-h-0 flex-1 overflow-x-clip outline-none",
                // The max() keeps content clear of the notch / rounded corners
                // when a phone is turned sideways; the insets are 0 otherwise.
                contentFullBleed
                  ? "p-0"
                  : "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-5 sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:px-8",
                isCalendarRoute && "overflow-y-hidden",
                isCalendarRoute && showBottomNav
                  ? "pb-[calc(var(--shell-bottom-nav-h)+0.25rem)]"
                  : !fullBleed &&
                      !isCalendarRoute &&
                      (showBottomNav ? "pb-[calc(9rem+env(safe-area-inset-bottom))]" : "pb-10"),
              )}
            >
              <div
                className={cn(
                  "mx-auto w-full",
                  contentFullBleed ? "h-full max-w-none" : "max-w-6xl",
                )}
              >
                {children}
              </div>
            </main>
          </div>
        </div>

        {showBottomNav && (
          <NavSuspense>
            <BottomNavChrome />
          </NavSuspense>
        )}

        {/* Mobile has no header slot for the switcher's own button, so it gets
            a triggerless instance driven by the header's Search action. Only
            one QuickSwitcher is mounted at a time (the desktop header owns the
            other), so the ⌘K / "/" shortcuts never open two dialogs. */}
        {isMobile && <QuickSwitcher hideTrigger open={searchOpen} onOpenChange={setSearchOpen} />}

        {/* The global AI action now owns the floating surface. It is omitted on
            immersive routes and keeps itself clear of the mobile bottom bar. */}
        {showFloatingCoach && (
          <FloatingAiCoach
            mobile={isMobile}
            bottomNavVisible={showBottomNav}
            keyboardOpen={isKeyboardOpen}
          />
        )}

        {/* One shared instance: command palette and both top bars dispatch the
            open event, so Quick Capture keeps one form and mutation path. */}
        <QuickCaptureDialog />
      </MobileHeaderTitleProvider>
    </TooltipProvider>
  )
}
