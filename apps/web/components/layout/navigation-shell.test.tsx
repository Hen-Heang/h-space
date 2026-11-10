/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// ─── Module mocks ─────────────────────────────────────────────────────────────
// These components sit in the app shell, so they pull in Supabase-backed hooks
// (profile image, notifications) and Next's router. None of that is under test
// here — the navigation behaviour is.

const push = vi.fn()
const back = vi.fn()
const { openQuickCapture, mockPathname } = vi.hoisted(() => ({
  openQuickCapture: vi.fn(),
  mockPathname: { value: "/" },
}))

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
  useRouter: () => ({ push, replace: vi.fn(), back }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/hooks/useProfileImage", () => ({
  useProfileImage: () => ({ url: null, initials: "HH", firstName: null }),
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
import { DesktopHeader } from "./DesktopHeader"
import { DesktopSidebar } from "./DesktopSidebar"
import { getHeaderTrail } from "./header-trail"
import { MobileBottomNav } from "./MobileBottomNav"
import { MobileHeader, isDetailRoute } from "./MobileHeader"
import { MoreSheet } from "./MoreSheet"
import { TabletNavigationRail } from "./TabletNavigationRail"
import { WorkspaceTabs } from "./WorkspaceTabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { browseSections, moreNavItems, toolNavItems, workspaceNavItems } from "@/lib/navigation"

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
  mockPathname.value = "/"
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

  // Notes is retired by default (NEXT_PUBLIC_FEATURE_NOTES unset): the third
  // tab is Learn again. lib/navigation.test.ts covers the flag-on bar.
  it("renders Home · Plan · Learn · Finance plus a More trigger", () => {
    setup("/home")
    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(within(nav).getAllByRole("listitem")).toHaveLength(5)
    for (const label of ["Home", "Plan", "Learn", "Finance", "More"]) {
      expect(within(nav).getByText(label)).toBeTruthy()
    }
    expect(within(nav).getByRole("button", { name: "More" })).toBeTruthy()
  })

  it("uses the workspace route mapping, in order", () => {
    setup("/home")
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"))
    expect(hrefs).toEqual(["/home", "/goals", "/learn", "/finance"])
  })

  it("marks the current destination with aria-current", () => {
    setup("/finance/transactions")
    const current = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page")
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute("href")).toBe("/finance")
  })

  it("lights More, not a tab, on routes no tab owns", () => {
    for (const route of [
      "/apps",
      "/vault",
      "/ask-hengo/memories",
      "/timeline",
      "/growth/recovery",
      "/progress",
      "/chat",
      "/settings",
    ]) {
      setup(route)
      expect(
        screen.queryAllByRole("link").filter((el) => el.getAttribute("aria-current") === "page"),
      ).toHaveLength(0)
      expect(screen.getByRole("button", { name: "More" }).getAttribute("aria-current")).toBe("page")
      cleanup()
    }
  })

  it("lights the Learn tab on every Learning route, not just /learn", () => {
    for (const route of ["/learn", "/vocab", "/practice", "/korean-coach", "/history"]) {
      setup(route)
      expect(screen.getByRole("link", { name: "Learn" }).getAttribute("aria-current")).toBe("page")
      cleanup()
    }
  })

  it("lights the Plan tab across the Planner (Calendar, Tasks, Inbox)", () => {
    for (const route of ["/goals", "/goals/calendar", "/goals/tasks", "/inbox"]) {
      setup(route)
      expect(screen.getByRole("link", { name: "Plan" }).getAttribute("aria-current")).toBe("page")
      cleanup()
    }
  })

  it("lights More on My Apps pages outside the bottom bar", () => {
    setup("/vault")
    expect(screen.getByRole("button", { name: "More" }).getAttribute("aria-current")).toBe("page")
  })

  it("opens the More sheet from the trigger", () => {
    setup("/home")
    expect(screen.queryByRole("dialog")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "More" }))
    expect(screen.getByRole("dialog", { name: "More" })).toBeTruthy()
  })
})

// ─── More sheet ───────────────────────────────────────────────────────────────

describe("MoreSheet", () => {
  function setup(open: boolean, onOpenChange = vi.fn(), pathname = "/growth/recovery") {
    render(
      <MoreSheet
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

  it("holds the phone's theme switch (moved out of the mobile header)", () => {
    setup(true)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByRole("button", { name: "Toggle theme" })).toBeTruthy()
  })

  it("leads with Memory, Growth and Settings", () => {
    setup(true)
    const lead = screen.getByRole("navigation", { name: "More destinations" })
    expect(
      within(lead)
        .getAllByRole("link")
        .map((el) => el.getAttribute("href")),
    ).toEqual(moreNavItems.map((item) => item.href))
    expect(
      within(lead)
        .getByRole("link", { name: /^Memory/ })
        .getAttribute("href"),
    ).toBe("/ask-hengo/memories")
    expect(
      within(lead)
        .getByRole("link", { name: /^Settings/ })
        .getAttribute("href"),
    ).toBe("/settings")
  })

  it("lists every page grouped by workspace", () => {
    setup(true)
    const dialog = screen.getByRole("dialog")
    for (const section of browseSections) {
      const group = within(dialog).getByRole("navigation", { name: section.label })
      expect(within(group).getAllByRole("link")).toHaveLength(section.items.length)
    }
    for (const [label, href] of [
      ["Recovery", "/growth/recovery"],
      ["Search my workspace", "/chat?mode=memory"],
      ["Calendar", "/goals/calendar"],
      ["Exam Prep", "/interview"],
    ]) {
      expect(within(dialog).getByRole("link", { name: label }).getAttribute("href")).toBe(href)
    }
  })

  it("marks the current route and closes on navigation", () => {
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

  it("keeps Coming Soon features to a single muted line, not dead rows", () => {
    setup(true)
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Coming soon:/)).toBeTruthy()
    expect(within(dialog).queryByRole("link", { name: /deep work/i })).toBeNull()
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
    // Content over chrome: the theme switch lives in the More sheet.
    expect(screen.queryByRole("button", { name: "Toggle theme" })).toBeNull()
  })

  it("shows a labelled Ask Hengo link to General chat on root and detail pages", () => {
    for (const pathname of ["/home", "/goals/abc-123"]) {
      render(<MobileHeader pathname={pathname} searchParams={undefined} onOpenSearch={vi.fn()} />)
      const link = screen.getByRole("link", { name: "Ask Hengo" })
      expect(link.textContent).toContain("Ask Hengo")
      expect(link.getAttribute("href")).toBe("/chat")
      cleanup()
    }
  })

  it("gives Settings its own icon on the root-page bar", () => {
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

  it("renders Finance with the workspace destinations and tools under two headings", () => {
    setup("/practice", false)
    const nav = screen.getByRole("navigation", { name: "Primary" })
    const links = within(nav).getAllByRole("link")
    const expected = [...workspaceNavItems, ...toolNavItems]
    expect(links.map((el) => el.textContent)).toEqual(
      expected.map((item) =>
        item.href.startsWith("http") ? `${item.label} (opens in a new tab)` : item.label,
      ),
    )
    expect(links.map((el) => el.getAttribute("href"))).toEqual(expected.map((item) => item.href))
    expect(within(nav).getByRole("heading", { name: "Workspace" })).toBeTruthy()
    expect(within(nav).getByRole("heading", { name: "Tools" })).toBeTruthy()
  })

  it("keeps workspace pages out of the global sidebar", () => {
    setup("/practice", false)
    const nav = screen.getByRole("navigation", { name: "Primary" })
    for (const label of ["Calendar", "Inbox", "Vocabulary", "Timeline", "H-Vault", "Recovery"]) {
      expect(within(nav).queryByRole("link", { name: label })).toBeNull()
    }
  })

  it("lights the owning workspace for a child route", () => {
    setup("/practice", false)
    expect(screen.getByRole("link", { name: "Learning" }).getAttribute("aria-current")).toBe("page")
    for (const label of ["Overview", "Planner", "Memory"]) {
      expect(screen.getByRole("link", { name: label }).getAttribute("aria-current")).toBeNull()
    }
  })

  it("lights Finance across its routes", () => {
    for (const route of ["/finance", "/finance/transactions", "/finance/review"]) {
      setup(route, false)
      expect(screen.getByRole("link", { name: "Finance" }).getAttribute("aria-current")).toBe(
        "page",
      )
      cleanup()
    }
  })

  it("gives every collapsed icon an accessible name", () => {
    setup("/practice", true)
    for (const item of [...workspaceNavItems, ...toolNavItems]) {
      const name = item.href.startsWith("http") ? `${item.label} (opens in a new tab)` : item.label
      expect(screen.getByRole("link", { name })).toBeTruthy()
    }
    // Headings stay for screen readers even with no room to show them.
    expect(screen.getByRole("heading", { name: "Workspace" }).className).toContain("sr-only")
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

  it("still gives Account access through the profile menu", () => {
    setup("/practice", false)
    expect(screen.getByRole("button", { name: "Account menu" })).toBeTruthy()
  })
})

// ─── Desktop header ───────────────────────────────────────────────────────────

describe("DesktopHeader", () => {
  it("leaves the Account menu to the sidebar so it isn't shown twice", () => {
    renderWithTooltips(<DesktopHeader pathname="/practice" searchParams={undefined} />)
    expect(screen.queryByRole("button", { name: "Account menu" })).toBeNull()
  })

  it("shows one labelled Ask Hengo link that opens General chat", () => {
    renderWithTooltips(<DesktopHeader pathname="/finance" searchParams={undefined} />)
    const links = screen.getAllByRole("link", { name: "Ask Hengo" })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toBe("/chat")
    expect(screen.queryByRole("button", { name: /AI Assistant/ })).toBeNull()
  })
})

// ─── Tablet rail ──────────────────────────────────────────────────────────────

describe("TabletNavigationRail", () => {
  it("shows the same workspaces and tools as the desktop sidebar, with short labels", () => {
    renderWithTooltips(<TabletNavigationRail pathname="/finance/review" searchParams={undefined} />)
    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(
      within(nav)
        .getAllByRole("link")
        .map((el) => el.getAttribute("href")),
    ).toEqual([...workspaceNavItems, ...toolNavItems].map((item) => item.href))
    expect(screen.getByRole("link", { name: "Finance" }).getAttribute("aria-current")).toBe("page")
    expect(within(nav).getByText("Finance")).toBeTruthy()
  })
})

// ─── Workspace tabs + header trail ────────────────────────────────────────────

describe("WorkspaceTabs", () => {
  it("renders a workspace's pages with exactly one current tab", () => {
    mockPathname.value = "/goals/tasks"
    render(<WorkspaceTabs sectionId="plan" />)
    const nav = screen.getByRole("navigation", { name: "Workspace sections" })
    expect(
      within(nav)
        .getAllByRole("link")
        .map((el) => el.textContent),
    ).toEqual(["Tasks", "Goals", "Calendar", "Overview", "Inbox"])
    const current = within(nav)
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page")
    expect(current.map((el) => el.textContent)).toEqual(["Tasks"])
  })

  it("renders actions beside the tabs", () => {
    mockPathname.value = "/timeline"
    render(<WorkspaceTabs sectionId="memory" actions={<button type="button">Log activity</button>} />)
    expect(screen.getByRole("button", { name: "Log activity" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Timeline" }).getAttribute("aria-current")).toBe("page")
    expect(screen.queryByRole("link", { name: "Notes" })).toBeNull()
  })
})

describe("getHeaderTrail", () => {
  it("shows Workspace / Page, linking the workspace only when it's another page", () => {
    expect(getHeaderTrail("/goals/tasks")).toEqual({
      title: "Tasks",
      crumbs: [{ label: "Planner", href: "/goals" }],
    })
    expect(getHeaderTrail("/goals")).toEqual({
      title: "Goals",
      crumbs: [{ label: "Planner", href: undefined }],
    })
  })

  it("drops the crumb when it would repeat the title", () => {
    expect(getHeaderTrail("/home")).toEqual({ title: "Overview", crumbs: [] })
    expect(getHeaderTrail("/growth")).toEqual({ title: "Growth", crumbs: [] })
  })

  it("titles query-based AI modes", () => {
    expect(getHeaderTrail("/chat", "mode=corrections").title).toBe("Corrections")
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
    for (const label of ["Learning", "Planner", "Growth", "Memory"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    // Retired Notes is not a Quick Switcher result.
    expect(screen.queryByRole("option", { name: /^notes$/i })).toBeNull()
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

  it("finds both Ask Hengo modes by searching 'ask hengo'", async () => {
    render(<QuickSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Open quick navigation" }))
    await waitFor(() => expect(screen.getByRole("listbox")).toBeTruthy())
    const input = screen.getByRole("combobox")
    fireEvent.change(input, { target: { value: "ask hengo" } })
    expect(screen.getByRole("option", { name: /general chat/i })).toBeTruthy()
    expect(screen.getByRole("option", { name: /search my workspace/i })).toBeTruthy()
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
