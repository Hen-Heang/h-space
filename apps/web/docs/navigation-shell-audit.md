# Navigation shell audit & redesign

> **Current (2026-10-22): seven workspaces.** The registry in
> `lib/navigation.ts` is organized as Today · Learning · Goals & Tasks ·
> Growth · Notes & Knowledge · My Apps · AI Assistant (section ids unchanged
> except `history` → `apps`; `/history` moved into Learning, `/timeline` into
> Notes & Knowledge, Ask Hengo into AI Assistant). The desktop sidebar lists all
> seven. Mobile and tablet show four tabs (Today · Goals · Learning · Notes)
> plus a **Spaces** trigger that opens `components/layout/SpacesSheet.tsx` — the
> same `sidebarSections` data as the desktop sidebar, so every shipped route has
> a tappable entry on every screen size. No route was removed or renamed. The
> notes below are historical.

> **Superseded (2026-08-31).** This document records the V1 grouped-workspace
> shell — expandable Plan/Grow sections, four mobile tabs plus a "More" sheet.
> Hengo V2 replaced that with five flat destinations (Today · Vocabulary ·
> Practice · Coach · Study) and no More sheet. Kept for the rationale and the
> before/after analysis, which still explain why the shell is structured the
> way it is; see [`HENGO_V2.md`](../../../docs/HENGO_V2.md) for what's current.

**Date:** 2026-07-24
**Scope:** application shell + navigation IA for `app/(main)/*`. No page-content
redesign, no schema changes, no routes removed.

---

## 1. Architecture before this change

| Concern                                                                              | Where it lived                      |
| ------------------------------------------------------------------------------------ | ----------------------------------- |
| Auth redirect                                                                        | `app/(main)/layout.tsx`             |
| Onboarding wizard                                                                    | `app/(main)/layout.tsx`             |
| Soft-keyboard detection (`visualViewport`)                                           | `app/(main)/layout.tsx`             |
| Last-visited route tracking                                                          | `app/(main)/layout.tsx`             |
| Desktop sidebar (brand, workspace icon row, contextual links, Settings)              | `app/(main)/layout.tsx`             |
| Desktop top bar (title, Quick Switcher, AI Coach button, theme, level, bell, avatar) | `app/(main)/layout.tsx`             |
| Mobile top bar (logo, "Hengo", page title, switcher, level, bell, avatar)            | `app/(main)/layout.tsx`             |
| Mobile bottom tab bar (4 tabs + More, sliding pill)                                  | `app/(main)/layout.tsx`             |
| Mobile floating AI button                                                            | `app/(main)/layout.tsx`             |
| More sheet (2-column grid, grouped by workspace)                                     | `app/(main)/layout.tsx`             |
| Main content padding / immersive route branches                                      | `app/(main)/layout.tsx`             |
| Nav data                                                                             | `lib/navigation.ts`                 |
| Quick Switcher                                                                       | `components/app/quick-switcher.tsx` |

`app/(main)/layout.tsx` was **620 lines** owning all twelve concerns above.

### Nav data model (before)

```ts
type NavLink = { href; label; icon; soon? }
type Workspace = { id; label; icon; links: NavLink[] }
```

Five workspaces: `learning`, `productivity`, `ai`, `progress`, `growth`.
Identity was `href`. Active state was `isLinkActive(pathname, href)` —
**pathname only**.

Responsive split was a single Tailwind `lg` breakpoint (1024px): `lg:hidden`
for mobile chrome, `lg:flex` / `lg:grid-cols-[280px_1fr]` for desktop.

---

## 2. Confirmed problems

Each was verified against the code before being changed.

### 2.1 AI navigation duplication — **confirmed**

AI was reachable through five competing permanent entry points:

1. `workspaces[2]` (`id: "ai"`) — a whole desktop workspace in the icon switcher.
2. A bespoke blue **AI Coach** button in the desktop top bar (`layout.tsx` ~L384).
3. A permanent **floating circular AI button** on mobile (`layout.tsx` ~L519).
4. AI links inside the mobile **More sheet** (via `moreWorkspaces`).
5. Query-mode links `/chat?mode=analyze|generate|corrections`.

**Decision:** one AI strategy. AI Coach stays a _destination_ in the sidebar/rail
(bottom of the primary list) and a _card_ at the top of the More sheet, plus an
**Ask AI** action in the Quick Switcher. The floating mobile button and the
bespoke desktop top-bar button are **removed**. Pages keep the freedom to add
contextual "Ask AI" actions (`/home` already has one) — that is the sanctioned
pattern.

### 2.2 Crowded mobile header — **confirmed**

`layout.tsx` L344–L368 rendered, simultaneously: logo, "Hengo" wordmark,
current page title, `QuickSwitcher compact`, `LevelBadge`, `NotificationBell`,
`UserAvatar`. Seven controls on a 390px-wide bar.

**Decision:** contextual `MobileHeader` — title + at most two actions. Root
pages get title + notifications + More; detail pages get `Back | Title | ⋯`.
Level badge and avatar move off the global header (level → Today/Progress
pages, profile → More sheet).

### 2.3 `/home` inconsistency — **confirmed**

`isHomeRoute` (L163) removed the desktop sidebar, the desktop top bar, the
mobile top bar and the bottom tab bar, replacing them with a bespoke header.
`/home` was a dead-end "pick a lane" gate — the user had to click a poster card
to get navigation back.

**Decision:** `/home` is the persistent **Today** page and renders inside the
standard shell on every breakpoint. It is bottom tab #1 and the first sidebar
entry. No `isHomeRoute` branch remains.

### 2.4 Workspace discoverability — **confirmed**

`layout.tsx` L220–L241: a row of five 44px **icon-only** buttons with only
`title` / `aria-label` for names. The sidebar showed _only_ the active
workspace's links, so four of the five product areas were invisible without
hovering, and their contents were invisible without navigating.

**Decision:** the expanded desktop sidebar shows **labelled collapsible
sections** (Learn / Goals / Growth / Progress) with Today and AI Coach as
standalone rows. The current route's section is always expanded — a selected
route can never hide inside a collapsed group.

### 2.5 AI query active state — **confirmed broken**

`isLinkActive` did `href.split("?")[0]`, so `/chat`, `/chat?mode=analyze`,
`/chat?mode=generate` and `/chat?mode=corrections` **all** matched pathname
`/chat`. On `/chat?mode=analyze` all four AI links rendered active
simultaneously, and `allLinks.find(...)` for the header title always returned
"Chat".

**Decision:** new `NavMatch` type with `query` (must equal) and `absentQuery`
(must be missing), plus a pure `isNavigationItemActive({ pathname, searchParams, item })`.
`/chat` declares `absentQuery: ["mode"]`, so exactly one AI item is ever active.
Covered by tests in `lib/navigation.test.ts`.

### 2.6 Oversized layout file — **confirmed** (620 lines, 12 concerns)

**Decision:** all visual shell moves to `components/layout/*`. The route layout
keeps only auth redirect, onboarding, mount gate and last-visited tracking —
the things that must stay tied to the route boundary — and renders `<AppShell>`.

### 2.7 Additional problems found during the audit

- **`href` as identity.** `bottomTabs`, `moreWorkspaces` and the Quick Switcher
  all keyed off `href`, and `moreWorkspaces` filtered by comparing `linkPath`.
  A single href appearing twice (as `/chat` does) produced duplicate React keys
  and ambiguous filtering. Fixed with stable `id`s.
- **`/goals/calendar` was not in the nav at all** even though the route exists
  (`app/(main)/goals/calendar/page.tsx`) — it was only reachable from inside the
  Goals page. It is now a first-class Goals item. _(This resolves the brief's
  "if there is not yet a dedicated route for a goal calendar" clause: there is
  one, so no substitute was needed.)_
- **Last-visited tracking silently skipped two workspaces.** `workspaceRoutePrefixes`
  omitted `ai`, and the layout's effect only branched on
  learning/productivity/progress, so Growth and AI never got "continue where you
  left off". Now generated from `primarySections`, covering all five.
- **`useIsMobile()` uses a 1024px breakpoint** while the shell used Tailwind
  `lg` (also 1024px) — consistent, but wrong for tablets: a 768×1024 iPad got
  the _mobile_ bottom bar and mobile header. Replaced by `useNavigationMode()`
  with explicit 768 / 1200 boundaries.
- **`aria-hidden` on a focusable subtree.** The bottom nav set
  `aria-hidden={isKeyboardOpen}` but left its links tabbable, and the floating
  AI button did the same. Fixed by removing the node from the tree entirely
  when the keyboard is open.
- **Decoration stacking.** The bottom bar combined blur-32, two rings, a large
  shadow, a spring-animated sliding pill, per-icon `scale-110`, and
  `active:scale-90` — six effects at once, none of them reduced-motion aware.

---

## 3. New information architecture

```
Today        → /home
Learn        → Practice · Vocabulary · Foundations · Reading · Listening · Scenarios · Exam Prep
Goals        → Dashboard · Goals · Calendar · Roadmap · Notes
Growth       → Habits · Recovery   (+ Deep Work / Mood / Journal / Rewards — Coming Soon)
Progress     → Achievements · Statistics · History
AI Coach     → /chat  (+ Analyze / Generate / Corrections modes)
Settings     → /settings  (+ /account)
```

Renames: learning's `Today` → **Practice**; `Productivity` → **Goals**;
the `ai` workspace → **AI Coach**, demoted from a peer workspace to a single
destination with modes.

### Surface mapping

| Surface                    | Shows                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Desktop sidebar (≥1200px)  | Today, four labelled sections, AI Coach, profile, Settings                                           |
| Tablet rail (768–1199px)   | Today, Learn, Goals, Growth, Progress, AI Coach (icons + micro-labels) → flyout for children         |
| Mobile bottom nav (<768px) | Today, Learn, Goals, Growth, More                                                                    |
| More sheet                 | AI Coach card, then Progress / Tools / Learn more / Growth / Account, then a small Coming Soon strip |

---

## 4. Responsive strategy

| Mode    | Width        | Chrome                                                               |
| ------- | ------------ | -------------------------------------------------------------------- |
| mobile  | `< 768px`    | `MobileHeader` + `MobileBottomNav` + `MoreNavigationSheet`           |
| tablet  | `768–1199px` | `TabletNavigationRail` (+ `WorkspaceFlyout`) + `DesktopHeader`       |
| desktop | `≥ 1200px`   | `DesktopSidebar` (expanded 272px / collapsed 76px) + `DesktopHeader` |

Tailwind's `lg` (1024px) is the wrong tablet boundary in both directions, so the
shell switches on `useNavigationMode()` (`matchMedia`, SSR-safe) rather than
utility classes. The layout already gates rendering on a mount check, so there
is no first-paint flash from reading `matchMedia` in an effect.

---

## 5. Implementation decisions

1. **Auth & onboarding stay in the route layout.** The brief's ideal
   (`return <AppShell>{children}</AppShell>`) would move the auth gate into a
   shared component. Keeping `isAuthenticated()` / `OnboardingFlow` /
   `recordLastVisited` in `app/(main)/layout.tsx` preserves the exact existing
   redirect semantics with zero behavioural risk; only visual code moved out.
   The layout is now ~85 lines instead of 620.

2. **`useSearchParams()` needs a Suspense boundary.** Next's build fails on
   `useSearchParams` outside Suspense in a prerenderable tree. Rather than wrap
   `children` (which would deopt every page), each nav component that needs the
   query is individually wrapped in `<Suspense fallback={…}>` inside `AppShell`.
   Page content stays outside the boundary.

3. **`PageHeader` is opt-in.** A `components/layout/PageHeader.tsx` API is
   provided (`title` / `breadcrumb` / `actions` / `description`) and the
   `DesktopHeader` derives its breadcrumb automatically from the nav model, so
   **no page had to change**. Migrating individual pages off `PageHero` is
   deliberately left for a follow-up — doing 20 pages in this run was judged
   higher-risk than the benefit.

4. **Immersive routes.** Two intentional exceptions remain:
   - `/chat` — full-bleed on mobile (no bottom nav, no content padding) so the
     composer owns the viewport. **A back/close affordance is always present in
     the compact header**, so there is a visible escape.
   - `/growth/recovery/pause` — the breathing timer stays fully immersive
     (no header, no bottom nav, no padding). This is deliberate: navigation must
     not overlay the pause timer. Documented here so it isn't "fixed" later.

5. **Level badge removed from the global header.** `LevelBadge` is unchanged and
   still available; it now appears on Today / Progress surfaces only, per the
   brief. It also fired an `achievementsApi.getSummary()` request on _every_
   route change from the shell — removing it from the shell removes that cost.

6. **No new dependencies.** Sidebar, rail, flyout, sheet and command menu are
   built from the existing Radix primitives already vendored in
   `components/ui/*` (`Sheet`, `Dialog`, `Popover`, `Tooltip`,
   `DropdownMenu`, `Collapsible`).

7. **Quick Switcher recents are local-only.** The Recent group reads nav ids
   from `localStorage` (`hengo-recent-routes`) written on navigation. Recent
   _goals_ were **not** added: there is no already-cached global goals query in
   the shell, and adding one would fetch every goal on every page just to render
   a menu. Explicitly out of scope per the brief's "do not introduce a global
   N+1 query".

---

## 6. Compatibility risks & assumptions

- **`WorkspaceId` values in `lib/last-visited.ts` changed** (`learning`→`learn`,
  `productivity`→`goals`). Existing users' stored deep links under the old keys
  are ignored and fall back to the default route. This is a one-time,
  self-healing reset of a convenience feature — no data loss.
- **`lib/navigation.ts` exports changed shape.** `workspaces`, `allLinks`,
  `moreWorkspaces`, `homeLink`, `settingsLink` and `workspaceRoutePrefixes` are
  gone, replaced by `navSections`, `allNavItems`, `moreGroups`, `todayItem`,
  `settingsItem` and `sectionRoutePrefixes`. Only three files imported them
  (`layout.tsx`, `quick-switcher.tsx`, `GrowthTabs.tsx`); all three were updated.
  `isLinkActive(pathname, href)` is kept as a thin wrapper for compatibility.
- **Redirect stubs are untouched.** `/mistakes`, `/daily-phrase` and `/focus/*`
  still exist and still redirect.
- **Playwright was not run.** Every route under `(main)` is behind a client-side
  Supabase auth gate that returns `null` until a real session exists, and no test
  credentials are available in this environment. Writing e2e specs that cannot
  execute would produce false confidence, so responsive behaviour is covered by
  jsdom component tests instead. See the "Remaining improvements" section of the
  run report.
