import { describe, expect, it } from "vitest"

import {
  aiCoachItem,
  allNavItems,
  askHengoItem,
  browseSections,
  comingSoonItems,
  getActiveNavItem,
  getActiveTab,
  getSectionForPath,
  isMoreRoute,
  isNavigationItemActive,
  linkPath,
  memoryHubItem,
  mobileNavItems,
  moreComingSoon,
  moreNavItems,
  navItem,
  navSections,
  primarySections,
  sectionRoutePrefixes,
  shippedItems,
  todayItem,
  toolNavItems,
  workspaceNavItems,
  workspaceTabs,
  type NavItem,
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
      "memory",
      "apps",
      "ai",
    ])
  })

  it("labels the sections as the seven H-Space workspaces", () => {
    expect(navSections.map((s) => s.label)).toEqual([
      "Overview",
      "Learning",
      "Planner",
      "Growth",
      "Notes",
      "My Apps",
      "AI Assistant",
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

  it("represents /home as the global Overview destination", () => {
    expect(todayItem).toMatchObject({ href: "/home", label: "Overview" })
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
      "/growth",
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
      "/apps",
      "/vault",
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
    expect(getSectionForPath("/growth")?.id).toBe("grow")
    expect(getSectionForPath("/growth/recovery")?.id).toBe("grow")
    expect(getSectionForPath("/statistics")?.id).toBe("grow")
    expect(getSectionForPath("/ask-hengo/memories")?.id).toBe("memory")
    expect(getSectionForPath("/chat", "mode=memory")?.id).toBe("ai")
    expect(getSectionForPath("/notes")?.id).toBe("memory")
    expect(getSectionForPath("/timeline")?.id).toBe("memory")
    expect(getSectionForPath("/history")?.id).toBe("learn")
    expect(getSectionForPath("/apps")?.id).toBe("apps")
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
      "apps",
      "grow",
      "learn",
      "memory",
      "plan",
    ])
    expect(sectionRoutePrefixes.ai).toContain("/chat")
  })
})

describe("global sidebar: workspaces + tools only", () => {
  it("lists the six workspaces in order", () => {
    expect(workspaceNavItems.map((i) => i.label)).toEqual([
      "Overview",
      "My Apps",
      "Planner",
      "Learning",
      "Notes",
      "Growth",
    ])
    expect(workspaceNavItems.map((i) => i.href)).toEqual([
      "/home",
      "/apps",
      "/goals",
      "/learn",
      "/notes",
      "/growth",
    ])
  })

  it("lists the AI Assistant and Settings as tools", () => {
    expect(toolNavItems.map((i) => i.label)).toEqual(["AI Assistant", "Settings"])
    expect(toolNavItems.map((i) => i.href)).toEqual(["/chat", "/settings"])
  })

  it("never puts a workspace's child page in the global sidebar", () => {
    const hrefs = [...workspaceNavItems, ...toolNavItems].map((i) => i.href)
    for (const child of ["/goals/tasks", "/goals/calendar", "/vocab", "/timeline", "/vault"]) {
      expect(hrefs).not.toContain(child)
    }
  })

  it("gives sidebar entries ids that never collide with the registry", () => {
    const registryIds = new Set(allNavItems.map((i) => i.id))
    for (const item of workspaceNavItems.filter((i) => i.id !== "nav-today")) {
      expect(registryIds.has(item.id)).toBe(false)
    }
  })

  it("keeps a workspace lit on every route inside it", () => {
    const cases: [string, string, string?][] = [
      ["/home", "nav-today"],
      ["/goals/calendar", "nav-plan"],
      ["/goals/abc-123", "nav-plan"],
      ["/inbox", "nav-plan"],
      ["/roadmap", "nav-plan"],
      ["/vocab", "nav-learn"],
      ["/history", "nav-learn"],
      ["/phrasebook", "nav-learn", "mode=reading"],
      ["/ask-hengo/memories", "nav-memory"],
      ["/timeline", "nav-memory"],
      ["/vault", "nav-apps"],
      ["/growth", "nav-grow"],
      ["/growth/recovery/log", "nav-grow"],
      ["/statistics", "nav-grow"],
      ["/chat", "nav-ai"],
      ["/chat", "nav-ai", "mode=analyze"],
      ["/settings/reminders", "settings"],
    ]
    const entries = [...workspaceNavItems, ...toolNavItems]
    for (const [pathname, id, search] of cases) {
      const lit = entries.filter((item) =>
        isNavigationItemActive({ pathname, searchParams: search, item }),
      )
      expect(
        lit.map((i) => i.id),
        `${pathname}?${search ?? ""}`,
      ).toEqual([id])
    }
  })

  it("keeps Overview pinned to /home", () => {
    const overview = workspaceNavItems[0]
    expect(isNavigationItemActive({ pathname: "/home/anything", item: overview })).toBe(false)
  })
})

describe("workspace tabs (secondary navigation)", () => {
  const ids = (items: NavItem[] | undefined) => (items ?? []).map((i) => i.id)

  it("gives the Planner Tasks · Goals · Calendar · Overview · Inbox", () => {
    expect(workspaceTabs.plan!.map((i) => i.label)).toEqual([
      "Tasks",
      "Goals",
      "Calendar",
      "Overview",
      "Inbox",
    ])
  })

  it("gives Notes, Growth and My Apps their pages", () => {
    expect(ids(workspaceTabs.memory)).toEqual(["memory-notes", "memory-hub", "review-timeline"])
    expect(ids(workspaceTabs.grow)).toEqual([
      "growth-hub",
      "growth-habits",
      "growth-journal",
      "grow-progress",
    ])
    expect(ids(workspaceTabs.apps)).toEqual(["apps-catalog", "apps-vault", "apps-luyra"])
    expect(navItem("apps-luyra")).toMatchObject({
      href: "https://luyra.henheang.site/",
      description: expect.stringContaining("finance"),
    })
  })

  it("only uses registered routes, each inside its own workspace", () => {
    for (const [sectionId, tabs] of Object.entries(workspaceTabs)) {
      for (const tab of tabs!) {
        expect(allNavItems).toContain(tab)
        if (!tab.href.startsWith("http")) {
          expect(getSectionForPath(linkPath(tab.href))?.id).toBe(sectionId)
        }
      }
    }
  })

  it("picks exactly one active tab even where prefixes overlap", () => {
    const plan = workspaceTabs.plan!
    expect(getActiveTab(plan, "/goals/tasks")?.id).toBe("goals-tasks")
    expect(getActiveTab(plan, "/goals/overview")?.id).toBe("goals-overview")
    expect(getActiveTab(plan, "/goals/calendar")?.id).toBe("goals-calendar")
    expect(getActiveTab(plan, "/goals")?.id).toBe("goals-goals")
    expect(getActiveTab(plan, "/goals/abc-123")?.id).toBe("goals-goals")
    expect(getActiveTab(plan, "/inbox")?.id).toBe("plan-inbox")
    const grow = workspaceTabs.grow!
    expect(getActiveTab(grow, "/growth")?.id).toBe("growth-hub")
    expect(getActiveTab(grow, "/growth/habits")?.id).toBe("growth-habits")
    // Recovery is reached from the Growth overview, not a tab.
    expect(getActiveTab(grow, "/growth/recovery")).toBeUndefined()
  })
})

describe("mobile bottom bar + More", () => {
  it("has Home · Plan · Learn · Apps before the More trigger", () => {
    expect(mobileNavItems.map((i) => i.shortLabel ?? i.label)).toEqual([
      "Home",
      "Plan",
      "Learn",
      "Apps",
    ])
  })

  it("leads the More sheet with every workspace and tool that has no tab", () => {
    expect(moreNavItems.map((i) => i.label)).toEqual([
      "Notes",
      "Growth",
      "AI Assistant",
      "Settings",
    ])
  })

  it("lights exactly one tab on tab-owned routes and More nowhere there", () => {
    for (const route of ["/home", "/goals/calendar", "/inbox", "/vocab", "/history", "/vault"]) {
      const lit = mobileNavItems.filter((item) => isNavigationItemActive({ pathname: route, item }))
      expect(lit, route).toHaveLength(1)
      expect(isMoreRoute(route)).toBe(false)
    }
  })

  it("lights More on routes no tab owns", () => {
    for (const route of ["/notes", "/timeline", "/growth", "/progress", "/settings"]) {
      expect(isMoreRoute(route), route).toBe(true)
    }
    expect(isMoreRoute("/chat")).toBe(true)
    expect(isMoreRoute("/chat", "mode=memory")).toBe(true)
  })

  it("lists every shipped route in the More sheet's browse list", () => {
    const browsed = new Set(browseSections.flatMap((s) => s.items.map((i) => i.id)))
    for (const section of navSections) {
      for (const item of shippedItems(section.items)) {
        expect(browsed.has(item.id), item.id).toBe(true)
      }
    }
  })

  it("keeps soon placeholders out of the browse list", () => {
    const browsed = browseSections.flatMap((s) => s.items)
    expect(browsed.some((i) => i.soon)).toBe(false)
    expect(moreComingSoon.map((i) => i.label)).toEqual(["Deep Work", "Mood", "Rewards"])
  })

  it("shippedItems / comingSoonItems partition a list", () => {
    const grow = navSections.find((s) => s.id === "grow")!.items
    expect(shippedItems(grow).length + comingSoonItems(grow).length).toBe(grow.length)
  })
})

describe("AI Assistant routes", () => {
  it("keeps Chat, Analyze, Generate and Corrections as real hub-child routes", () => {
    for (const id of ["ai-chat", "ai-analyze", "ai-generate", "ai-corrections"]) {
      const item = navItem(id)
      expect(item.showInSidebar).toBe(false)
      expect(allNavItems).toContain(item)
    }
  })

  it("resolves Hengo Coach and its mode variants by title", () => {
    expect(getActiveNavItem("/chat")?.label).toBe("Hengo Coach")
    expect(getActiveNavItem("/chat", "mode=analyze")?.label).toBe("Analyze")
    expect(getActiveNavItem("/chat", "mode=generate")?.label).toBe("Generate")
  })

  it("separates browsing Memories from asking Hengo", () => {
    expect(memoryHubItem.href).toBe("/ask-hengo/memories")
    expect(askHengoItem.href).toBe("/chat?mode=memory")
  })

  it("puts Ask Hengo next to Hengo Coach, active only for ?mode=memory", () => {
    const ai = navSections.find((s) => s.id === "ai")!
    expect(ai.items.map((i) => i.id).slice(0, 2)).toEqual(["ai-chat", "memory-ask-hengo"])
    expect(active("/chat", "memory-ask-hengo", "mode=memory")).toBe(true)
    expect(active("/chat", "ai-chat", "mode=memory")).toBe(false)
    expect(active("/chat", "memory-ask-hengo")).toBe(false)
  })
})

describe("workspace registry details", () => {
  it("groups Notes, Memories and Timeline under Notes", () => {
    const memory = navSections.find((s) => s.id === "memory")!
    expect(memory).toMatchObject({ label: "Notes", href: "/notes" })
    expect(memory.items.map((i) => i.id)).toEqual(["memory-notes", "memory-hub", "review-timeline"])
  })

  it("gives Growth a landing page that doesn't claim its children", () => {
    const grow = navSections.find((s) => s.id === "grow")!
    expect(grow.href).toBe("/growth")
    expect(getActiveNavItem("/growth")?.id).toBe("growth-hub")
    expect(getActiveNavItem("/growth/habits")?.label).toBe("Habits")
    expect(getActiveNavItem("/growth/journal")?.label).toBe("Reflections")
    for (const route of ["/review/morning", "/achievements", "/statistics"]) {
      expect(getSectionForPath(route)?.id).toBe("grow")
    }
    expect(getActiveNavItem("/progress")?.label).toBe("Progress")
  })

  it("files Korean correction History under Learning and keeps its title", () => {
    expect(getSectionForPath("/history")?.id).toBe("learn")
    expect(getActiveNavItem("/history")?.label).toBe("History")
    expect(getActiveNavItem("/timeline")?.label).toBe("Timeline")
  })

  it("lists H-Vault as an internal app in My Apps", () => {
    const apps = navSections.find((s) => s.id === "apps")!
    expect(apps).toMatchObject({ label: "My Apps", href: "/apps" })
    expect(apps.items.map((i) => i.href)).toEqual([
      "/apps",
      "/vault",
      "https://luyra.henheang.site/",
    ])
    expect(getSectionForPath("/vault")?.id).toBe("apps")
    expect(getActiveNavItem("/vault")?.label).toBe("H-Vault")
    // /vault doesn't share /apps' prefix, so My Apps itself stays inactive there.
    expect(getActiveNavItem("/apps")?.label).toBe("My Apps")
  })

  it("makes H-Vault discoverable by the Quick Switcher's search terms", () => {
    const vault = navItem("apps-vault")
    const terms = [vault.label, vault.description ?? "", ...(vault.keywords ?? [])]
      .join(" ")
      .toLowerCase()
    for (const query of ["vault", "accounts", "username", "bitwarden"]) {
      expect(terms).toContain(query)
    }
  })

  it("keeps every Korean route inside Learning, with specific titles", () => {
    for (const route of [
      "/learn",
      "/practice",
      "/korean-coach",
      "/vocab",
      "/phrasebook",
      "/listening",
      "/scenarios",
      "/interview",
    ]) {
      expect(getSectionForPath(route)?.id).toBe("learn")
    }
    expect(getSectionForPath("/phrasebook", "mode=reading")?.id).toBe("learn")
    expect(getSectionForPath("/phrasebook", "mode=foundations")?.id).toBe("learn")
    expect(getActiveNavItem("/learn")?.label).toBe("Learning Hub")
    expect(getActiveNavItem("/korean-coach")?.label).toBe("Korean Coach")
    expect(getActiveNavItem("/phrasebook", { mode: "reading" })?.label).toBe("Reading")
    expect(getActiveNavItem("/interview")?.label).toBe("Exam Prep")
  })

  it("resolves Planner titles, and keeps Inbox in the Planner", () => {
    expect(getActiveNavItem("/goals")?.label).toBe("Goals")
    expect(getActiveNavItem("/goals/overview")?.label).toBe("Overview")
    expect(getActiveNavItem("/goals/tasks")?.label).toBe("Tasks")
    expect(getActiveNavItem("/goals/calendar")?.label).toBe("Calendar")
    expect(getActiveNavItem("/inbox")?.label).toBe("Inbox")
    expect(getSectionForPath("/inbox")?.id).toBe("plan")
  })

  it("no longer has a standalone Dashboard nav entry", () => {
    expect(allNavItems.some((i) => i.id === "goals-dashboard")).toBe(false)
    expect(allNavItems.some((i) => i.label === "Dashboard")).toBe(false)
  })

  it("leaves every route registered and reachable by URL", () => {
    for (const route of [
      "/goals/tasks",
      "/roadmap",
      "/growth/recovery",
      "/achievements",
      "/review/morning",
      "/ask-hengo/memories",
      "/scenarios",
      "/settings",
    ]) {
      expect(getActiveNavItem(route), route).toBeDefined()
    }
    expect(getActiveNavItem("/chat", "mode=analyze")).toBeDefined()
    expect(getActiveNavItem("/chat", "mode=generate")).toBeDefined()
  })
})

describe("/home stays inside the app shell", () => {
  it("is a first-class nav destination", () => {
    expect(mobileNavItems[0].href).toBe("/home")
    expect(navSections.find((s) => s.id === "today")!.items).toContain(todayItem)
  })

  it("resolves a section and a title for /home like any other route", () => {
    expect(getSectionForPath("/home")?.label).toBe("Overview")
    expect(getActiveNavItem("/home")?.label).toBe("Overview")
  })
})
