/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// ─── Module mocks ─────────────────────────────────────────────────────────────
// These components sit in the app shell, so they pull in Supabase-backed hooks
// (profile image, notifications) and Next's router. None of that is under test
// here — the navigation behaviour is.

const push = vi.fn()
const back = vi.fn()
const { openQuickCapture } = vi.hoisted(() => ({ openQuickCapture: vi.fn() }))

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push, replace: vi.fn(), back }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/hooks/useProfileImage", () => ({
  useProfileImage: () => ({ url: null, initials: "HH" }),
}))

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 3,
    isLoading: false,
    isError: false,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    respond: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("@/lib/auth-store", () => ({
  getUserEmail: () => "dev@example.com",
  getUserId: () => "user-1",
  clearAuth: vi.fn(),
  isAuthenticated: () => true,
}))

vi.mock("@/lib/quick-capture-bus", () => ({
  openQuickCapture,
}))

import { QuickSwitcher } from "@/components/app/quick-switcher"
import { DesktopSidebar } from "./DesktopSidebar"
import { WorkspaceFlyout } from "./WorkspaceFlyout"
import { MobileBottomNav } from "./MobileBottomNav"
import { MobileHeader, isDetailRoute } from "./MobileHeader"
import { MoreNavigationSheet } from "./MoreNavigationSheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { navSections, sidebarSections } from "@/lib/navigation"

// Radix needs these in jsdom.
beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
})

beforeEach(() => {
  push.mockClear()
  back.mockClear()
  openQuickCapture.mockClear()
  window.localStorage.clear()
})

// No vitest `globals: true` in this repo, so RTL's auto-cleanup never runs.
afterEach(cleanup)

function renderWithTooltips(ui: React.ReactElement) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>)
}

// ─── Mobile bottom navigation ─────────────────────────────────────────────────

describe("MobileBottomNav", () => {
  function setup(pathname: string, searchParams?: string) {
    render(<MobileBottomNav pathname={pathname} searchParams={searchParams} />)
  }

  it("renders the hub's five module destinations, no More trigger", () => {
    setup("/home")
    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(within(nav).getAllByRole("listitem")).toHaveLength(5)
    for (const label of ["Today", "Goals", "Korean", "Notes", "Progress"]) {
      expect(within(nav).getByText(label)).toBeTruthy()
    }
    expect(within(nav).queryByRole("button", { name: /more/i })).toBeNull()
  })

  it("uses the hub route mapping, in order", () => {
    setup("/home")
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"))
    expect(hrefs).toEqual(["/home", "/goals", "/learn", "/notes", "/progress"])
  })

  it("marks the current destination with aria-current", () => {
    setup("/notes")
    const current = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page")
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute("href")).toBe("/notes")
  })

  it("keeps the Progress tab lit on the pages its hub links to", () => {
    for (const route of ["/progress", "/statistics", "/achievements", "/review/evening"]) {
      setup(route)
      expect(screen.getByRole("link", { name: "Progress" }).getAttribute("aria-current")).toBe(
        "page",
      )
      cleanup()
    }
  })

  it("does not mark any tab current on a route outside the five modules", () => {
    setup("/growth/recovery")
    expect(
      screen.queryAllByRole("link").filter((el) => el.getAttribute("aria-current") === "page"),
    ).toHaveLength(0)
  })

  it("keeps /home inside the shell as the first tab", () => {
    setup("/home")
    const first = screen.getAllByRole("link")[0]
    expect(first.getAttribute("href")).toBe("/home")
    expect(first.getAttribute("aria-current")).toBe("page")
  })

  it("lights the Korean tab on every Korean Learning route, not just /learn", () => {
    for (const route of ["/learn", "/vocab", "/practice", "/korean-coach", "/phrasebook"]) {
      setup(route)
      expect(screen.getByRole("link", { name: "Korean" }).getAttribute("aria-current")).toBe("page")
      cleanup()
    }
  })

  it("lights the Goals tab across the Plan section (Calendar, Tasks, Inbox)", () => {
    for (const route of ["/goals", "/goals/calendar", "/goals/tasks", "/inbox"]) {
      setup(route)
      expect(screen.getByRole("link", { name: "Goals" }).getAttribute("aria-current")).toBe("page")
      cleanup()
    }
  })

  it("no longer spends tabs on individual Korean pages", () => {
    setup("/home")
    for (const label of ["Vocabulary", "Practice", "Coach", "Study"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull()
    }
  })
})

// ─── More sheet ───────────────────────────────────────────────────────────────

describe("MoreNavigationSheet", () => {
  function setup(open: boolean, onOpenChange = vi.fn(), pathname = "/growth/recovery") {
    render(
      <MoreNavigationSheet
        open={open}
        onOpenChange={onOpenChange}
        pathname={pathname}
        searchParams={undefined}
      />,
    )
    return onOpenChange
  }

  it("renders nothing while closed", () => {
    setup(false)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens with the Ask Hengo card at the top — the global AI action's mobile home", () => {
    setup(true)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Ask Hengo")).toBeTruthy()
    expect(
      within(dialog).getByText("Ask about your notes, goals, habits, and journal"),
    ).toBeTruthy()
    const aiLink = within(dialog).getAllByRole("link")[0]
    expect(aiLink.getAttribute("href")).toBe("/chat?mode=memory")
  })

  it("lists a labelled Memory group (Notes, Memories) plus a flat menu (Calendar, History, Settings)", () => {
    setup(true)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("heading", { level: 3, name: "Memory" })).toBeTruthy()
    const memoryGroup = within(dialog).getByRole("navigation", { name: "Memory" })
    expect(
      within(memoryGroup)
        .getAllByRole("link")
        .map((el) => el.textContent),
    ).toEqual(["Notes", "Memories"])
    const menu = within(dialog).getByRole("navigation", { name: "More" })
    expect(
      within(menu)
        .getAllByRole("link")
        .map((el) => el.textContent),
    ).toEqual(["Calendar", "History", "Settings"])
  })

  it("does not duplicate any Korean/Learn function, Goals sub-page, Progress route, or Ask Hengo in the menus", () => {
    setup(true)
    const dialog = screen.getByRole("dialog")
    for (const label of [
      "Practice",
      "Korean Coach",
      "Vocabulary",
      "Phrasebook",
      "Foundations",
      "Reading",
      "Listening",
      "Scenarios",
      "Exam Prep",
      "Inbox",
      "Journal",
      "Reflections",
      "Review",
      "Achievements",
      "Statistics",
      "Timeline",
      "Progress",
      "Goals",
      "Learn",
    ]) {
      expect(within(dialog).queryByRole("link", { name: label })).toBeNull()
    }
    // Only one "Ask Hengo" link — the pinned card — not a second row below.
    expect(within(dialog).getAllByRole("link", { name: /ask hengo/i })).toHaveLength(1)
  })

  it("marks the current route with aria-current and closes on navigation", () => {
    const onOpenChange = setup(true, vi.fn(), "/history")
    const history = screen.getByRole("link", { name: "History" })
    expect(history.getAttribute("aria-current")).toBe("page")
    fireEvent.click(history)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes on Escape", async () => {
    const onOpenChange = setup(true)
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("keeps Coming Soon features to a single muted line, not a grid of tiles", () => {
    setup(true)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Coming soon:/)).toBeTruthy()
    expect(within(dialog).queryByRole("link", { name: /deep work/i })).toBeNull()
  })

  it("puts Settings in the sheet instead of the mobile header, with no separate Account entry", () => {
    setup(true)
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog)
        .getByRole("link", { name: /settings/i })
        .getAttribute("href"),
    ).toBe("/settings")
    expect(within(dialog).queryByRole("link", { name: /account/i })).toBeNull()
  })
})

// ─── Mobile header ────────────────────────────────────────────────────────────

describe("MobileHeader", () => {
  it("classifies root vs detail routes", () => {
    expect(isDetailRoute("/goals")).toBe(false)
    expect(isDetailRoute("/home")).toBe(false)
    expect(isDetailRoute("/goals/abc-123")).toBe(true)
    expect(isDetailRoute("/growth/habits/h1")).toBe(true)
  })

  it("shows the root-page top bar without a Quick Capture (Inbox) button — V2 hides Inbox promotion", () => {
    render(<MobileHeader pathname="/goals" searchParams={undefined} onOpenSearch={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "Goals" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Quick capture" })).toBeNull()
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /notifications/i })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Go back" })).toBeNull()
    expect(screen.queryByRole("link", { name: /profile/i })).toBeNull()
  })

  it("gives Settings its own icon on the root-page bar — V2's bottom nav has no More sheet to hold it", () => {
    render(<MobileHeader pathname="/goals" searchParams={undefined} onOpenSearch={vi.fn()} />)
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings")
  })

  it("announces the unread notification count to screen readers", () => {
    render(<MobileHeader pathname="/goals" searchParams={undefined} onOpenSearch={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Notifications (3 unread)" })).toBeTruthy()
  })

  it("switches to Back | Title | Search Settings on a detail route", () => {
    render(
      <MobileHeader pathname="/goals/abc-123" searchParams={undefined} onOpenSearch={vi.fn()} />,
    )
    expect(screen.getByRole("button", { name: "Go back" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings")
    expect(screen.queryByRole("button", { name: /notifications/i })).toBeNull()
  })

  it("has no overflow menu on a detail route — Search and Settings are direct", () => {
    const onOpenSearch = vi.fn()
    render(
      <MobileHeader
        pathname="/goals/abc-123"
        searchParams={undefined}
        onOpenSearch={onOpenSearch}
      />,
    )
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Search" }))
    expect(onOpenSearch).toHaveBeenCalledOnce()
  })

  it("still keeps Quick Capture (Inbox) off the detail-page bar", () => {
    render(
      <MobileHeader pathname="/goals/abc-123" searchParams={undefined} onOpenSearch={vi.fn()} />,
    )
    expect(screen.queryByRole("button", { name: "Quick capture" })).toBeNull()
  })

  it("goes back through the router", () => {
    render(
      <MobileHeader pathname="/goals/abc-123" searchParams={undefined} onOpenSearch={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Go back" }))
    expect(back).toHaveBeenCalledOnce()
  })

  it("truncates long titles rather than wrapping", () => {
    render(<MobileHeader pathname="/goals/abc" searchParams={undefined} onOpenSearch={vi.fn()} />)
    expect(screen.getByRole("heading").className).toContain("truncate")
  })

  it("labels the AI mode from the query, not just the pathname", () => {
    render(
      <MobileHeader
        pathname="/chat"
        searchParams={{ mode: "corrections" }}
        onOpenSearch={vi.fn()}
      />,
    )
    expect(screen.getByRole("heading", { name: "Corrections" })).toBeTruthy()
  })
})

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

describe("DesktopSidebar", () => {
  function setup(pathname: string, collapsed: boolean, searchParams?: string, onToggle = vi.fn()) {
    renderWithTooltips(
      <DesktopSidebar
        pathname={pathname}
        searchParams={searchParams}
        collapsed={collapsed}
        onToggleCollapsed={onToggle}
      />,
    )
    return onToggle
  }

  // V2 rendered five destinations here and left ~28 built routes reachable
  // only by typing in the Quick Switcher. The sidebar now renders every
  // shipped destination grouped by section (`sidebarSections`), so browsing
  // finds the whole product.
  it("renders every shipped destination, grouped by section", () => {
    setup("/practice", false)
    const nav = screen.getByRole("navigation", { name: "Primary" })
    const links = within(nav).getAllByRole("link")

    const expected = sidebarSections.flatMap((section) => section.items)
    expect(links.map((el) => el.textContent)).toEqual(expected.map((item) => item.label))
    expect(links.map((el) => el.getAttribute("href"))).toEqual(expected.map((item) => item.href))

    // Each section contributes a heading naming the group.
    for (const section of sidebarSections) {
      expect(within(nav).getByRole("heading", { name: section.label })).toBeTruthy()
    }
  })

  it("leaves Coming Soon placeholders out — they have no page behind them", () => {
    setup("/practice", false)
    const nav = screen.getByRole("navigation", { name: "Primary" })
    for (const label of ["Deep Work", "Mood", "Rewards"]) {
      expect(within(nav).queryByText(label)).toBeNull()
    }
  })

  it("surfaces the routes V2 hid, so they are reachable without searching", () => {
    setup("/practice", false)
    for (const label of [
      "Goals",
      "Calendar",
      "Inbox",
      "History",
      "Notes",
      "Memories",
      "Ask Hengo",
      "Hengo Coach",
      "Progress",
      "Habits",
      "Recovery",
      "Listening",
      "Reading",
      "Phrasebook",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy()
    }
  })

  it("marks the current destination active", () => {
    setup("/practice", false)
    expect(screen.getByRole("link", { name: "Practice" }).getAttribute("aria-current")).toBe("page")
    for (const label of ["Today", "Vocabulary", "Coach", "Study"]) {
      expect(screen.getByRole("link", { name: label }).getAttribute("aria-current")).toBeNull()
    }
  })

  it("labels /korean-coach as Coach and /learn as Study", () => {
    setup("/korean-coach", false)
    expect(screen.getByRole("link", { name: "Coach" }).getAttribute("aria-current")).toBe("page")
    cleanup()
    setup("/learn", false)
    expect(screen.getByRole("link", { name: "Study" }).getAttribute("aria-current")).toBe("page")
  })

  it("gives every collapsed icon an accessible name", () => {
    setup("/practice", true)
    for (const item of sidebarSections.flatMap((section) => section.items)) {
      expect(screen.getByRole("link", { name: item.label })).toBeTruthy()
    }
  })

  it("exposes the collapse state to screen readers and toggles it", () => {
    const onToggle = setup("/practice", false)
    const button = screen.getByRole("button", { name: "Collapse sidebar" })
    expect(button.getAttribute("aria-expanded")).toBe("true")
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it("labels the expand action when collapsed", () => {
    setup("/practice", true)
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }).getAttribute("aria-expanded"),
    ).toBe("false")
  })

  it("keeps branding in the sidebar only once", () => {
    setup("/practice", false)
    expect(screen.getAllByRole("link", { name: "H-Space home" })).toHaveLength(1)
  })

  it("still gives Account access to Settings", () => {
    setup("/practice", false)
    expect(screen.getByRole("button", { name: "Account menu" })).toBeTruthy()
  })
})

// ─── Tablet workspace flyout ──────────────────────────────────────────────────

describe("WorkspaceFlyout", () => {
  // Learn no longer reaches this component in production (DesktopSidebar /
  // TabletNavigationRail render it as a flat link instead — see below), so
  // general flyout mechanics are covered here with Plan, which still has
  // visible children.
  const plan = navSections.find((s) => s.id === "plan")!

  function setup(open: boolean, onOpenChange = vi.fn()) {
    renderWithTooltips(
      <WorkspaceFlyout
        section={plan}
        pathname="/inbox"
        searchParams={undefined}
        open={open}
        onOpenChange={onOpenChange}
        active
      />,
    )
    return onOpenChange
  }

  it("labels the trigger and reports its expanded state", () => {
    setup(false)
    const trigger = screen.getByRole("button", { name: "Plan navigation" })
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })

  it("lists the section's child routes when open — Overview/Tasks/Roadmap are hidden hub children, reachable from the Goals hub's own tab nav instead, and Calendar is promoted out to its own top-level link", () => {
    setup(true)
    const panel = screen.getByRole("navigation", { name: "Plan" })
    expect(
      within(panel)
        .getAllByRole("link")
        .map((el) => el.textContent),
    ).toEqual(["Goals", "Inbox"])
  })

  it("marks the current child route", () => {
    setup(true)
    expect(screen.getByRole("link", { name: "Inbox" }).getAttribute("aria-current")).toBe("page")
  })

  it("closes after navigating to a child route", () => {
    const onOpenChange = setup(true)
    fireEvent.click(screen.getByRole("link", { name: "Goals" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes on Escape", async () => {
    const onOpenChange = setup(true)
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("does not render Coming Soon items as links, and lists only Progress for Grow (Recovery/Reflections are hidden)", () => {
    renderWithTooltips(
      <WorkspaceFlyout
        section={navSections.find((s) => s.id === "grow")!}
        pathname="/growth/recovery"
        searchParams={undefined}
        open
        onOpenChange={vi.fn()}
        active
      />,
    )
    const panel = screen.getByRole("navigation", { name: "Grow" })
    expect(
      within(panel)
        .getAllByRole("link")
        .map((el) => el.textContent),
    ).toEqual(["Progress"])
    expect(screen.getByText(/Coming soon:/)).toBeTruthy()
  })

  it("renders nothing for a section whose items are all hidden from the sidebar (Learn)", () => {
    const learn = navSections.find((s) => s.id === "learn")!
    renderWithTooltips(
      <WorkspaceFlyout
        section={learn}
        pathname="/practice"
        searchParams={undefined}
        open
        onOpenChange={vi.fn()}
        active
      />,
    )
    const panel = screen.getByRole("navigation", { name: "Korean Learning" })
    expect(within(panel).queryAllByRole("link")).toHaveLength(0)
  })

  it("renders nothing for Memory either — every item in that section is hidden now", () => {
    const memory = navSections.find((s) => s.id === "memory")!
    renderWithTooltips(
      <WorkspaceFlyout
        section={memory}
        pathname="/ask-hengo/memories"
        searchParams={undefined}
        open
        onOpenChange={vi.fn()}
        active
      />,
    )
    const panel = screen.getByRole("navigation", { name: "Memory" })
    expect(within(panel).queryAllByRole("link")).toHaveLength(0)
  })
})

// ─── Quick Switcher ───────────────────────────────────────────────────────────

describe("QuickSwitcher", () => {
  it("opens on Cmd/Ctrl+K", async () => {
    render(<QuickSwitcher />)
    expect(screen.queryByRole("listbox")).toBeNull()
    fireEvent.keyDown(window, { key: "k", metaKey: true })
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
  })

  it("opens on '/' from outside a text field", async () => {
    render(<QuickSwitcher />)
    fireEvent.keyDown(window, { key: "/" })
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
  })

  // Before typing, the palette is a browse view: every shipped destination in
  // its section group, so ⌘K shows what the app contains instead of five
  // entries. Previously this listed only V2's five and hid the rest behind a
  // search the user had to know to run.
  it("browses the full catalog by section before typing", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    expect(screen.queryByText("Suggested")).toBeNull()
    expect(screen.queryByText("Pages")).toBeNull()
    // Section headings — getAllByText because a section label can also appear
    // inside an entry's own description text.
    for (const label of ["Korean Learning", "Plan", "Grow", "Memory"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole("option", { name: /vocabulary/i })).toBeTruthy()
    expect(screen.getByRole("option", { name: /^goals$/i })).toBeTruthy()
  })

  it("switches to the full 'Pages' catalog once the user types a query", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "habit" } })
    expect(screen.getByText("Pages")).toBeTruthy()
    expect(screen.getByRole("option", { name: /habits/i })).toBeTruthy()
  })

  it("offers only Ask AI by default — Create goal and Add task (Goals/Tasks) stay search-only", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    expect(screen.getByRole("option", { name: /ask ai/i })).toBeTruthy()
    expect(screen.queryByRole("option", { name: /create goal/i })).toBeNull()
    expect(screen.queryByRole("option", { name: /add task/i })).toBeNull()

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "create goal" } })
    expect(screen.getByRole("option", { name: /create goal/i })).toBeTruthy()
  })

  it("surfaces a Recent group from locally stored destinations", async () => {
    window.localStorage.setItem(
      "hengo-recent-routes",
      JSON.stringify(["review-statistics", "learn-vocab"]),
    )
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    expect(screen.getByText("Recent")).toBeTruthy()
  })

  it("finds Settings by name and by keyword — it has no nav row to reach it by", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    const input = screen.getByRole("combobox")

    // The words a learner actually types, including when they don't know the
    // page is called "Settings".
    for (const term of ["settings", "preferences", "account", "theme"]) {
      fireEvent.change(input, { target: { value: term } })
      expect(screen.getByRole("option", { name: /settings/i })).toBeTruthy()
    }

    fireEvent.click(screen.getByRole("option", { name: /settings/i }))
    expect(push).toHaveBeenCalledWith("/settings")
  })

  it("searches keywords, not just labels", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "flashcards" } })
    expect(screen.getByRole("option", { name: /vocabulary/i })).toBeTruthy()
  })

  it("finds Ask Hengo as a searchable page — the command-menu entry point for that action", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "ask hengo" } })
    expect(screen.getByRole("option", { name: /ask hengo/i })).toBeTruthy()
  })

  it("still finds Hengo Coach and its mode variants by search, even though they're hidden from the sidebar", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "corrections" } })
    expect(screen.getByRole("option", { name: /corrections/i })).toBeTruthy()
  })

  it("navigates with arrow keys and opens on Enter", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "statistics" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(push).toHaveBeenCalledWith("/statistics")
  })

  it("shows an empty state for a query that matches nothing", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzzzz" } })
    expect(screen.getByText("No matching destination")).toBeTruthy()
  })

  it("renders no trigger button in triggerless mode", () => {
    render(<QuickSwitcher hideTrigger open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByRole("button", { name: "Open quick navigation" })).toBeNull()
  })
})
