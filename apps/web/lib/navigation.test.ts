import { describe, expect, it } from "vitest"

import {
  aiCoachItem,
  allNavItems,
  askHengoItem,
  bottomTabs,
  comingSoonItems,
  getActiveBottomTabIndex,
  getActiveNavItem,
  getSectionForPath,
  isMoreRoute,
  isNavigationItemActive,
  memoryHubItem,
  moreComingSoon,
  moreGroups,
  navItem,
  navSections,
  primaryNavItems,
  primarySections,
  secondaryNavItems,
  sectionRoutePrefixes,
  shippedItems,
  sidebarSections,
  todayItem,
  visibleSidebarItems,
  workspaceNavSections,
} from "./navigation"

function active(pathname: string, id: string, search?: string) {
  return isNavigationItemActive({ pathname, searchParams: search, item: navItem(id) })
}

describe("nav model integrity", () => {
  it("gives every item a unique stable id", () => {
    const ids = allNavItems.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("exposes the agreed top-level sections in order", () => {
    expect(navSections.map((s) => s.id)).toEqual([
      "today",
      "learn",
      "plan",
      "grow",
      "history",
      "memory",
      "ai",
    ])
  })

  it("keeps Today out of the primary section list (rendered on its own)", () => {
    expect(primarySections.map((s) => s.id)).not.toContain("today")
  })

  it("renames the old learning 'Today' entry to Practice", () => {
    const learn = navSections.find((s) => s.id === "learn")!
    expect(learn.items[0]).toMatchObject({ href: "/practice", label: "Practice" })
    expect(learn.items.map((i) => i.label)).not.toContain("Today")
  })

  it("represents /home as the global Today destination", () => {
    expect(todayItem).toMatchObject({ href: "/home", label: "Today" })
  })

  it("keeps every previously shipped route reachable", () => {
    const hrefs = allNavItems.map((i) => i.href)
    for (const href of [
      "/home",
      "/practice",
      "/vocab",
      "/learn",
      "/phrasebook?mode=reading",
      "/listening",
      "/scenarios",
      "/interview",
      "/goals/overview",
      "/goals",
      "/goals/tasks",
      "/goals/calendar",
      "/roadmap",
      "/notes",
      "/inbox",
      "/growth/habits",
      "/growth/recovery",
      "/progress",
      "/achievements",
      "/statistics",
      "/history",
      "/timeline",
      "/review/morning",
      "/ask-hengo/memories",
      "/chat",
      "/chat?mode=analyze",
      "/chat?mode=generate",
      "/chat?mode=corrections",
      "/chat?mode=memory",
      "/settings",
    ]) {
      expect(hrefs).toContain(href)
    }
  })

  it("has no separate Account nav item — /account is a legacy alias for Settings, not a distinct destination", () => {
    expect(allNavItems.some((i) => i.id === "account")).toBe(false)
    expect(allNavItems.some((i) => i.href === "/account")).toBe(false)
  })
})

describe("pathname active matching", () => {
  it("matches an exact pathname", () => {
    expect(active("/goals", "goals-goals")).toBe(true)
    expect(active("/vocab", "learn-vocab")).toBe(true)
  })

  it("does not match an unrelated pathname", () => {
    expect(active("/vocab", "goals-goals")).toBe(false)
  })

  it("does not match a pathname that merely shares a prefix string", () => {
    // "/goalsomething" must not activate "/goals"
    expect(
      isNavigationItemActive({ pathname: "/goalsomething", item: navItem("goals-goals") }),
    ).toBe(false)
  })

  it("never marks a Coming Soon item active", () => {
    expect(active("/growth/focus", "growth-deep-work")).toBe(false)
  })
})

describe("nested route active matching", () => {
  it("activates Goals for /goals/create and /goals/[id]", () => {
    expect(active("/goals/create", "goals-goals")).toBe(true)
    expect(active("/goals/abc-123", "goals-goals")).toBe(true)
  })

  it("activates Habits for /growth/habits/[id]", () => {
    expect(active("/growth/habits/h1", "growth-habits")).toBe(true)
  })

  it("activates Recovery for /growth/recovery/pause", () => {
    expect(active("/growth/recovery/pause", "growth-recovery")).toBe(true)
  })

  it("lets a more specific sibling win over its parent prefix", () => {
    expect(active("/goals/calendar", "goals-calendar")).toBe(true)
    expect(active("/goals/calendar", "goals-goals")).toBe(false)
  })

  it("keeps Today pinned to /home only", () => {
    expect(active("/home", "today")).toBe(true)
    expect(active("/home/anything", "today")).toBe(false)
  })
})

describe("query-aware AI active matching", () => {
  const modes = ["ai-chat", "ai-analyze", "ai-generate", "ai-corrections"]

  function activeAiIds(search?: string) {
    return modes.filter((id) => active("/chat", id, search))
  }

  it("activates plain Chat when no mode is present", () => {
    expect(activeAiIds()).toEqual(["ai-chat"])
    expect(activeAiIds("")).toEqual(["ai-chat"])
  })

  it("activates only Analyze for ?mode=analyze", () => {
    expect(activeAiIds("mode=analyze")).toEqual(["ai-analyze"])
  })

  it("activates only Generate for ?mode=generate", () => {
    expect(activeAiIds("mode=generate")).toEqual(["ai-generate"])
  })

  it("activates only Corrections for ?mode=corrections", () => {
    expect(activeAiIds("mode=corrections")).toEqual(["ai-corrections"])
  })

  it("activates nothing extra for an unknown mode", () => {
    expect(activeAiIds("mode=unknown")).toEqual([])
  })

  it("accepts URLSearchParams as well as a raw string", () => {
    const params = new URLSearchParams({ mode: "analyze" })
    expect(
      isNavigationItemActive({
        pathname: "/chat",
        searchParams: params,
        item: navItem("ai-analyze"),
      }),
    ).toBe(true)
    expect(
      isNavigationItemActive({ pathname: "/chat", searchParams: params, item: aiCoachItem }),
    ).toBe(false)
  })

  it("accepts a plain object", () => {
    expect(
      isNavigationItemActive({
        pathname: "/chat",
        searchParams: { mode: "generate" },
        item: navItem("ai-generate"),
      }),
    ).toBe(true)
  })
})

describe("section (workspace) selection", () => {
  it("maps routes to their owning section", () => {
    expect(getSectionForPath("/practice")?.id).toBe("learn")
    expect(getSectionForPath("/goals/create")?.id).toBe("plan")
    expect(getSectionForPath("/growth/recovery")?.id).toBe("grow")
    expect(getSectionForPath("/statistics")?.id).toBe("grow")
    expect(getSectionForPath("/ask-hengo/memories")?.id).toBe("memory")
    expect(getSectionForPath("/chat", "mode=memory")?.id).toBe("memory")
    expect(getSectionForPath("/notes")?.id).toBe("memory")
    expect(getSectionForPath("/inbox")?.id).toBe("plan")
    expect(getSectionForPath("/chat")?.id).toBe("ai")
    expect(getSectionForPath("/home")?.id).toBe("today")
  })

  it("returns undefined for routes outside every section", () => {
    expect(getSectionForPath("/settings")).toBeUndefined()
  })

  it("resolves the active item for header titles", () => {
    expect(getActiveNavItem("/statistics")?.label).toBe("Statistics")
    expect(getActiveNavItem("/chat", "mode=corrections")?.label).toBe("Corrections")
  })

  it("gives every primary section a route prefix list for last-visited tracking", () => {
    expect(Object.keys(sectionRoutePrefixes).sort()).toEqual([
      "ai",
      "grow",
      "history",
      "learn",
      "memory",
      "plan",
    ])
    expect(sectionRoutePrefixes.ai).toContain("/chat")
  })
})

describe("Simplified AI + Memory/Progress navigation", () => {
  it("only shows Plan and Grow as primary sidebar/rail groups, in that order", () => {
    expect(workspaceNavSections.map((s) => s.id)).toEqual(["plan", "grow"])
  })

  it("lists Learn, Calendar, and History as the secondary destinations — Settings lives in the account menu", () => {
    expect(secondaryNavItems.map((i) => i.id)).toEqual([
      "learn-hub",
      "goals-calendar",
      "history-hub",
    ])
  })

  it("promotes Calendar out of Plan's nested sidebar group now that it's a secondary top-level item", () => {
    const plan = navSections.find((s) => s.id === "plan")!
    expect(visibleSidebarItems(plan).map((i) => i.id)).not.toContain("goals-calendar")
  })

  it("keeps Chat, Analyze, Generate and Corrections as real, hidden-from-chrome routes", () => {
    for (const id of ["ai-chat", "ai-analyze", "ai-generate", "ai-corrections"]) {
      const item = navItem(id)
      expect(item.showInSidebar).toBe(false)
      expect(allNavItems).toContain(item)
    }
  })

  it("resolves Hengo Coach and its mode variants by title even though they're hidden", () => {
    expect(getActiveNavItem("/chat")?.label).toBe("Hengo Coach")
    expect(getActiveNavItem("/chat", "mode=analyze")?.label).toBe("Analyze")
    expect(getActiveNavItem("/chat", "mode=generate")?.label).toBe("Generate")
  })

  it("separates the Memory workspace (browse) from the Ask Hengo action (ask) as distinct routes", () => {
    expect(memoryHubItem.href).toBe("/ask-hengo/memories")
    expect(askHengoItem.href).toBe("/chat?mode=memory")
    expect(memoryHubItem.href).not.toBe(askHengoItem.href)
    // Memory has no chrome presence at all now — every item in the section
    // (Notes, Memories, Ask Hengo) is hidden from the sidebar/rail/bottom nav.
    expect(memoryHubItem.showInSidebar).toBe(false)
    expect(askHengoItem.showInSidebar).toBe(false)
  })

  it("activates the Memory workspace for /ask-hengo/memories, /chat?mode=memory and /notes — Inbox moved to Plan", () => {
    expect(getSectionForPath("/ask-hengo/memories")?.id).toBe("memory")
    expect(getSectionForPath("/chat", "mode=memory")?.id).toBe("memory")
    expect(getSectionForPath("/notes")?.id).toBe("memory")
    expect(getSectionForPath("/notes/abc-123")?.id).toBe("memory")
    expect(getSectionForPath("/inbox")?.id).toBe("plan")
  })

  it("keeps Memory as a hidden-but-real registry — Notes, Memories and Ask Hengo, none visible in chrome", () => {
    const memory = navSections.find((s) => s.id === "memory")!
    expect(memory.items.map((i) => i.id)).toEqual([
      "memory-notes",
      "memory-hub",
      "memory-ask-hengo",
    ])
    expect(memory.items.every((i) => i.showInSidebar === false)).toBe(true)
  })

  it("folds the old Progress workspace's routes into Grow, hidden alongside the merged Progress row", () => {
    const grow = navSections.find((s) => s.id === "grow")!
    const hidden = grow.items.filter((i) => i.showInSidebar === false && !i.soon)
    expect(hidden.map((i) => i.id).sort()).toEqual(
      [
        "growth-habits",
        "growth-recovery",
        "growth-journal",
        "review-achievements",
        "review-hub",
        "review-statistics",
      ].sort(),
    )
    for (const route of ["/review/morning", "/achievements", "/statistics"]) {
      expect(getSectionForPath(route)?.id).toBe("grow")
    }
    expect(grow.items.some((i) => i.id === "grow-progress" && i.showInSidebar !== false)).toBe(true)
    expect(getActiveNavItem("/progress")?.label).toBe("Progress")
  })

  it("merges Timeline into History as one standalone destination", () => {
    expect(getSectionForPath("/history")?.id).toBe("history")
    expect(getSectionForPath("/timeline")?.id).toBe("history")
    expect(getActiveNavItem("/history")?.label).toBe("History")
    const history = navSections.find((s) => s.id === "history")!
    expect(history.items.find((i) => i.id === "review-timeline")?.showInSidebar).toBe(false)
  })
})

describe("Learning Hub consolidation", () => {
  const learnRoutes = [
    "/learn",
    "/practice",
    "/korean-coach",
    "/vocab",
    "/phrasebook",
    "/listening",
    "/scenarios",
    "/interview",
  ]

  it("keeps every Korean route inside the learn section", () => {
    for (const route of learnRoutes) {
      expect(getSectionForPath(route)?.id).toBe("learn")
    }
    // Reading and Foundations are merged into Phrasebook as ?mode= query
    // variants, not their own pathnames — see learn-reading/learn-foundations
    // in lib/navigation.ts.
    expect(getSectionForPath("/phrasebook", "mode=reading")?.id).toBe("learn")
    expect(getSectionForPath("/phrasebook", "mode=foundations")?.id).toBe("learn")
  })

  it("resolves a specific child title for every route, and 'Learn' for the hub itself", () => {
    expect(getActiveNavItem("/learn")?.label).toBe("Learn")
    expect(getActiveNavItem("/practice")?.label).toBe("Practice")
    expect(getActiveNavItem("/korean-coach")?.label).toBe("Korean Coach")
    expect(getActiveNavItem("/phrasebook", { mode: "reading" })?.label).toBe("Reading")
    expect(getActiveNavItem("/interview")?.label).toBe("Exam Prep")
  })

  it("hides every Learn child from the sidebar/rail while keeping it a real, searchable route", () => {
    const learn = navSections.find((s) => s.id === "learn")!
    const hidden = learn.items.filter((i) => i.id !== "learn-hub")
    expect(hidden).toHaveLength(9)
    expect(hidden.every((i) => i.showInSidebar === false)).toBe(true)
    expect(hidden.every((i) => allNavItems.includes(i))).toBe(true)
  })

  it("has its own mobile bottom tab now — Learn moved out of the More sheet", () => {
    expect(bottomTabs.some((t) => t.id === "tab-learn")).toBe(true)
    for (const route of ["/learn", "/practice", "/korean-coach", "/phrasebook", "/interview"]) {
      expect(getActiveBottomTabIndex(route)).toBe(1)
    }
  })
})

describe("Plan Hub consolidation (formerly Goals)", () => {
  it("keeps every Goals hub route inside the plan section", () => {
    for (const route of [
      "/goals",
      "/goals/overview",
      "/goals/tasks",
      "/goals/calendar",
      "/inbox",
    ]) {
      expect(getSectionForPath(route)?.id).toBe("plan")
    }
  })

  it("resolves a specific child title for Overview/Tasks/Calendar/Inbox, and 'Goals' for the hub's own list route", () => {
    expect(getActiveNavItem("/goals")?.label).toBe("Goals")
    expect(getActiveNavItem("/goals/overview")?.label).toBe("Overview")
    expect(getActiveNavItem("/goals/tasks")?.label).toBe("Tasks")
    expect(getActiveNavItem("/goals/calendar")?.label).toBe("Calendar")
    expect(getActiveNavItem("/inbox")?.label).toBe("Inbox")
  })

  it("hides Overview, Tasks and Roadmap from the sidebar/rail while keeping them real, searchable routes", () => {
    const plan = navSections.find((s) => s.id === "plan")!
    const hidden = plan.items.filter((i) => i.showInSidebar === false)
    expect(hidden.map((i) => i.id).sort()).toEqual([
      "goals-overview",
      "goals-roadmap",
      "goals-tasks",
    ])
    expect(hidden.every((i) => allNavItems.includes(i))).toBe(true)
  })

  it("no longer has a standalone Dashboard nav entry — its content moved into Overview", () => {
    expect(allNavItems.some((i) => i.id === "goals-dashboard")).toBe(false)
    expect(allNavItems.some((i) => i.label === "Dashboard")).toBe(false)
  })

  it("now owns Inbox (quick capture feeds Plan, not a Memory browsing tool) — Notes stays with Memory", () => {
    const plan = navSections.find((s) => s.id === "plan")!
    expect(plan.items.some((i) => i.label === "Inbox")).toBe(true)
    expect(plan.items.some((i) => i.label === "Notes")).toBe(false)
  })

  it("keeps the Goals bottom tab lit while browsing hidden hub children, not just /goals itself", () => {
    const goalsIndex = bottomTabs.findIndex((t) => t.id === "tab-goals")
    for (const route of ["/goals", "/goals/overview", "/goals/tasks"]) {
      expect(getActiveBottomTabIndex(route)).toBe(goalsIndex)
    }
    // Calendar and Inbox keep their own distinct sidebar/rail presence, so
    // they still fall through to More on the bottom bar.
    expect(getActiveBottomTabIndex("/goals/calendar")).toBe(bottomTabs.length)
    expect(getActiveBottomTabIndex("/inbox")).toBe(bottomTabs.length)
  })
})

describe("Grow workspace consolidation (Habits folded into Recovery, Progress merged in)", () => {
  it("hides Habits from the sidebar/rail while keeping it a real, searchable route", () => {
    const grow = navSections.find((s) => s.id === "grow")!
    expect(grow.items.some((i) => i.id === "growth-habits" && i.showInSidebar === false)).toBe(true)
    expect(allNavItems).toContain(navItem("growth-habits"))
  })

  it("makes Recovery the section's default href, not Habits", () => {
    const grow = navSections.find((s) => s.id === "grow")!
    expect(grow.href).toBe("/growth/recovery")
  })

  it("still resolves /growth/habits to the grow section and the Habits title", () => {
    expect(getSectionForPath("/growth/habits")?.id).toBe("grow")
    expect(getActiveNavItem("/growth/habits")?.label).toBe("Habits")
  })

  it("relabels Journal as Reflections", () => {
    expect(getActiveNavItem("/growth/journal")?.label).toBe("Reflections")
  })
})

describe("bottom tabs", () => {
  it("has exactly four routed tabs (plus the More trigger)", () => {
    expect(bottomTabs).toHaveLength(4)
    expect(bottomTabs.map((t) => t.label)).toEqual(["Today", "Learn", "Goals", "Progress"])
  })

  it("uses the recommended route mapping", () => {
    expect(bottomTabs.map((t) => t.href)).toEqual(["/home", "/learn", "/goals", "/progress"])
  })

  it("selects the right tab index per route", () => {
    expect(getActiveBottomTabIndex("/home")).toBe(0)
    expect(getActiveBottomTabIndex("/practice")).toBe(1)
    expect(getActiveBottomTabIndex("/goals/abc")).toBe(2)
    expect(getActiveBottomTabIndex("/progress")).toBe(3)
  })

  it("falls through to More for /growth/habits and /growth/recovery — Grow has no bottom tab of its own", () => {
    expect(getActiveBottomTabIndex("/growth/habits")).toBe(bottomTabs.length)
    expect(getActiveBottomTabIndex("/growth/recovery")).toBe(bottomTabs.length)
  })

  it("does not light up Progress for Grow's other routes (Recovery, Reflections)", () => {
    expect(getActiveBottomTabIndex("/growth/journal")).toBe(bottomTabs.length)
  })

  it("falls back to the More slot for routes no tab owns", () => {
    expect(getActiveBottomTabIndex("/statistics")).toBe(bottomTabs.length)
    expect(getActiveBottomTabIndex("/settings")).toBe(bottomTabs.length)
    expect(getActiveBottomTabIndex("/growth/recovery")).toBe(bottomTabs.length)
    expect(getActiveBottomTabIndex("/chat")).toBe(bottomTabs.length)
  })
})

describe("More-route detection", () => {
  it("is false on the four direct tabs and any route inside a tab's section", () => {
    expect(isMoreRoute("/home")).toBe(false)
    expect(isMoreRoute("/goals")).toBe(false)
    expect(isMoreRoute("/learn")).toBe(false)
    expect(isMoreRoute("/practice")).toBe(false)
    expect(isMoreRoute("/progress")).toBe(false)
  })

  it("is true for routes reachable only through More", () => {
    expect(isMoreRoute("/achievements")).toBe(true)
    expect(isMoreRoute("/goals/calendar")).toBe(true)
    expect(isMoreRoute("/inbox")).toBe(true)
    expect(isMoreRoute("/settings")).toBe(true)
    expect(isMoreRoute("/chat")).toBe(true)
    expect(isMoreRoute("/growth/recovery")).toBe(true)
    expect(isMoreRoute("/growth/habits")).toBe(true)
    expect(isMoreRoute("/growth/journal")).toBe(true)
    expect(isMoreRoute("/notes")).toBe(true)
  })
})

describe("More sheet grouping", () => {
  it("has a labelled Memory group (Notes, Memories) plus a flat menu (Calendar, History, Settings)", () => {
    expect(moreGroups).toHaveLength(2)
    expect(moreGroups[0]).toMatchObject({ label: "Memory" })
    expect(moreGroups[0].items.map((i) => i.id)).toEqual(["memory-notes", "memory-hub"])
    expect(moreGroups[1].items.map((i) => i.id)).toEqual([
      "goals-calendar",
      "history-hub",
      "settings",
    ])
  })

  it("omits destinations already reachable from a bottom tab, and Ask Hengo (it's the pinned card instead)", () => {
    const ids = moreGroups.flatMap((g) => g.items.map((i) => i.id))
    expect(ids).not.toContain("goals-goals")
    expect(ids).not.toContain("learn-hub")
    expect(ids).not.toContain("grow-progress")
    expect(ids).not.toContain("memory-ask-hengo")
    expect(ids).not.toContain("today")
  })

  it("does not duplicate Goals/Grow sub-pages or the hidden Progress routes", () => {
    const ids = moreGroups.flatMap((g) => g.items.map((i) => i.id))
    for (const id of [
      "plan-inbox",
      "growth-journal",
      "growth-recovery",
      "review-hub",
      "review-achievements",
      "review-statistics",
      "review-timeline",
    ]) {
      expect(ids).not.toContain(id)
    }
  })

  it("keeps those routes real and searchable even though the More sheet no longer lists them", () => {
    for (const route of [
      "/goals/calendar",
      "/inbox",
      "/growth/journal",
      "/growth/recovery",
      "/achievements",
      "/statistics",
    ]) {
      expect(getActiveNavItem(route)).toBeDefined()
    }
  })
})

describe("Coming Soon filtering", () => {
  it("keeps soon items out of every More group", () => {
    const ids = moreGroups.flatMap((g) => g.items.map((i) => i.id))
    expect(ids.some((id) => moreComingSoon.some((s) => s.id === id))).toBe(false)
  })

  it("collects the soon placeholders separately", () => {
    expect(moreComingSoon.map((i) => i.label)).toEqual(["Deep Work", "Mood", "Rewards"])
  })

  it("shippedItems / comingSoonItems partition a list", () => {
    const grow = navSections.find((s) => s.id === "grow")!.items
    expect(shippedItems(grow).length + comingSoonItems(grow).length).toBe(grow.length)
  })
})

describe("Hub primary navigation (tablet rail + mobile bottom bar)", () => {
  it("has exactly five destinations, one per module, in order", () => {
    expect(primaryNavItems.map((i) => i.label)).toEqual([
      "Today",
      "Goals",
      "Korean",
      "Notes",
      "Progress",
    ])
    expect(primaryNavItems.map((i) => i.href)).toEqual([
      "/home",
      "/goals",
      "/learn",
      "/notes",
      "/progress",
    ])
  })

  it("keeps Korean pointed at /learn — same route, only the display label changes", () => {
    const korean = primaryNavItems.find((i) => i.label === "Korean")!
    expect(korean.href).toBe("/learn")
    // The underlying registry item keeps its own title for page headers/breadcrumbs.
    expect(getActiveNavItem("/learn")?.label).toBe("Learn")
  })

  it("resolves active state to exactly one tab on each module's routes", () => {
    for (const route of [
      "/home",
      "/goals",
      "/goals/calendar",
      "/inbox",
      "/learn",
      "/vocab",
      "/practice",
      "/korean-coach",
      "/notes",
      "/progress",
    ]) {
      const activeCount = primaryNavItems.filter((item) =>
        isNavigationItemActive({ pathname: route, item }),
      ).length
      expect(activeCount).toBe(1)
    }
  })

  it("keeps every route it points to fully registered — reachable, titled, matchable — beyond just this list", () => {
    for (const item of primaryNavItems) {
      expect(getActiveNavItem(item.href)).toBeDefined()
    }
  })

  it("orders the desktop sidebar personal tools first, Korean Learning after, and drops no section", () => {
    expect(sidebarSections.map((s) => s.id)).toEqual([
      "today",
      "plan",
      "grow",
      "memory",
      "history",
      "learn",
      "ai",
    ])
    // A section added to the registry must also get a place in the sidebar order.
    const withShippedItems = navSections.filter((s) => shippedItems(s.items).length > 0)
    expect(sidebarSections).toHaveLength(withShippedItems.length)
    expect(sidebarSections.find((s) => s.id === "learn")?.label).toBe("Korean Learning")
  })

  it("still leaves every removed-from-chrome route registered and reachable by URL", () => {
    for (const route of [
      "/goals",
      "/goals/tasks",
      "/goals/calendar",
      "/inbox",
      "/roadmap",
      "/growth/habits",
      "/growth/recovery",
      "/growth/journal",
      "/progress",
      "/achievements",
      "/statistics",
      "/review/morning",
      "/history",
      "/timeline",
      "/notes",
      "/ask-hengo/memories",
      "/chat",
      "/scenarios",
      "/interview",
      "/settings",
    ]) {
      expect(getActiveNavItem(route)).toBeDefined()
    }
    expect(getActiveNavItem("/chat", "mode=analyze")).toBeDefined()
    expect(getActiveNavItem("/chat", "mode=generate")).toBeDefined()
  })
})

describe("/home stays inside the app shell", () => {
  it("is a first-class nav destination, not a standalone gate", () => {
    expect(bottomTabs[0].href).toBe("/home")
    expect(navSections.find((s) => s.id === "today")!.items).toContain(todayItem)
  })

  it("resolves a section and a title for /home like any other route", () => {
    expect(getSectionForPath("/home")?.label).toBe("Today")
    expect(getActiveNavItem("/home")?.label).toBe("Today")
  })
})
