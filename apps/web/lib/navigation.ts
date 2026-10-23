import {
  BarChart3,
  BookOpen,
  BookOpenText,
  Bot,
  BrainCircuit,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Compass,
  Drama,
  GraduationCap,
  Headphones,
  History,
  Home,
  Inbox,
  Languages,
  LayoutGrid,
  ListChecks,
  ListTodo,
  Map,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Mic,
  NotebookPen,
  RotateCcw,
  ScanText,
  Settings,
  Smile,
  Sparkles,
  Sprout,
  Sunrise,
  Target,
  Trophy,
  Vault,
  Wand2,
  Zap,
} from "lucide-react"

// Single source of truth for the whole nav surface — desktop sidebar, tablet
// rail, mobile bottom bar, the "More" sheet, and the Quick Switcher all render
// from this file. Adding a new module later (Career, Fitness, …) means adding
// one section entry here, not touching the shell components.

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * How a route is matched to a nav item. Split out from `href` so query-string
 * destinations (`/chat?mode=analyze`) can be told apart from their bare
 * pathname sibling (`/chat`) — pathname-only matching cannot do that.
 */
export type NavMatch = {
  pathname: string
  /** Every entry must be present in the URL with exactly this value. */
  query?: Record<string, string>
  /**
   * Query keys that must be ABSENT for the item to be active. Lets `/chat`
   * stay inactive while `/chat?mode=analyze` is the current route, so only one
   * AI mode is ever highlighted.
   */
  absentQuery?: string[]
  /** Whether nested routes (`/goals/create`) activate this item. Default true. */
  includeChildren?: boolean
  /**
   * Active whenever the current route belongs to this section, regardless of
   * URL prefix. For hub items that represent a whole section (e.g. mobile's
   * Learn tab) whose child routes (`/practice`, `/korean-coach`, …) don't
   * share a common path with the hub itself.
   */
  sectionId?: NavSectionId
  /**
   * Extra route prefixes that also activate the item — for a hub whose child
   * routes live elsewhere but whose section holds unrelated siblings too, so
   * `sectionId` would over-match (e.g. Progress → /statistics, but not
   * Recovery).
   */
  alsoPathnames?: string[]
}

export type NavItem = {
  /** Stable identity — never derive identity from `href`. */
  id: string
  href: string
  label: string
  /** Tighter label for the mobile bottom bar / tablet rail. */
  shortLabel?: string
  icon: React.ElementType
  /**
   * Tailwind text-color utility applied to the icon only (never the label),
   * so each destination reads as its own purpose at a glance instead of one
   * flat neutral tone. Full literal classes only (e.g. "text-sky-500") —
   * never construct these dynamically, Tailwind's scanner needs the literal
   * string. Omit for utility items (Settings, `soon` placeholders) that
   * should stay neutral.
   */
  color?: string
  description?: string
  /** Extra search terms for the Quick Switcher. */
  keywords?: string[]
  soon?: boolean
  match?: NavMatch
  /**
   * Whether this item is a standalone destination that can claim its own
   * active state from a parent's prefix match (see `navPathnames`). Defaults
   * to true. `false` marks a hub child — Planner's Overview/Tasks, Learning's
   * modules — whose parent should stay lit while it is open.
   *
   * It no longer decides chrome visibility: the global sidebar shows only the
   * workspaces in `workspaceNavItems`, and per-workspace pages are listed in
   * `workspaceTabs`. Never remove an item from `navSections` to hide it; that
   * would break route matching, page titles, and the Quick Switcher.
   */
  showInSidebar?: boolean
}

export type NavSectionId = "today" | "learn" | "plan" | "grow" | "memory" | "apps" | "ai"

export type NavSection = {
  id: NavSectionId
  label: string
  icon: React.ElementType
  /** Tailwind text-color utility for the section's own icon — see `NavItem.color`. */
  color: string
  /** Where the rail / switcher lands when the section itself is clicked. */
  href: string
  items: NavItem[]
}

// ─── Standalone destinations ──────────────────────────────────────────────────

export const todayItem: NavItem = {
  id: "today",
  href: "/home",
  label: "Overview",
  shortLabel: "Home",
  icon: Home,
  color: "text-blue-500",
  description: "Your daily dashboard",
  keywords: ["home", "today", "dashboard", "start", "overview"],
  // /home has no children; keep the match tight so nothing else lights it up.
  match: { pathname: "/home", includeChildren: false },
}

// `/account` is a legacy alias for this same page (`app/(main)/account/page.tsx`
// re-exports the Settings component) — kept working for old links/bookmarks,
// but deliberately has no nav item of its own. Settings itself has no sidebar
// row either — it's reached through the ProfileMenu ("Account" trigger) on
// every surface, so it never sits redundantly next to that same menu.
export const settingsItem: NavItem = {
  id: "settings",
  href: "/settings",
  label: "Settings",
  icon: Settings,
  keywords: ["preferences", "account", "profile", "theme"],
}

// AI Coach and its mode variants are preserved routes (Chat, Analyze,
// Generate, Corrections all still work), but no longer get their own primary
// sidebar/rail presence. "Hengo Coach" is the one AI identity used everywhere
// (desktop header button, mobile floating launcher) — this item's `label` is
// what those surfaces render, so renaming the assistant only ever happens
// here.
export const aiCoachItem: NavItem = {
  id: "ai-chat",
  href: "/chat",
  label: "Hengo Coach",
  shortLabel: "Coach",
  icon: MessageCircle,
  color: "text-teal-500",
  description: "Practice, analyze, plan, or get support",
  keywords: ["ai", "coach", "hengo", "chat", "ask", "assistant", "korean", "speaking"],
  // Bare /chat only — the mode variants below own their own active state.
  match: { pathname: "/chat", absentQuery: ["mode"] },
  showInSidebar: false,
}

// A distinct *mode* of Hengo Coach ("My Data") that answers from the user's
// own notes, goals, habits, and journal — not a second competing assistant
// identity. Kept as its own destination (searchable, linkable) rather than
// folded into the generic coach entry point because it answers a different
// question ("what do I know") than the coach's general help.
export const askHengoItem: NavItem = {
  id: "memory-ask-hengo",
  href: "/chat?mode=memory",
  label: "Ask Hengo",
  shortLabel: "Ask Hengo",
  icon: BrainCircuit,
  color: "text-sky-500",
  description: "Ask about your notes, goals, habits, and journal",
  keywords: ["memory", "ask", "second brain", "recall", "remember", "search"],
  match: { pathname: "/chat", query: { mode: "memory" } },
  showInSidebar: false,
}

/**
 * The "Memory" workspace: what Hengo remembers about you, browsable on its
 * own (distinct from the *action* of asking — see `askHengoItem` above). A
 * real, searchable, deep-linkable route — just with no dedicated row in any
 * nav chrome (sidebar, rail, bottom bar) since the whole "memory" section has
 * none. Reachable via Quick Switcher (desktop) and the More sheet's Memory
 * group (mobile).
 */
export const memoryHubItem: NavItem = {
  id: "memory-hub",
  href: "/ask-hengo/memories",
  label: "Memories",
  icon: BrainCircuit,
  color: "text-indigo-500",
  description: "Facts Hengo remembers from your notes, goals, habits, and journal",
  keywords: ["memory", "memories", "second brain", "notes", "recall", "context"],
  showInSidebar: false,
}

/**
 * Quick capture for ideas, tasks, and phrases. Lives under "Plan" — it's
 * where a stray idea becomes a goal or task, not a Memory browsing surface.
 * Route and data untouched: still `/inbox`, same `lib/api/inbox.ts` backing.
 */
export const inboxItem: NavItem = {
  id: "plan-inbox",
  href: "/inbox",
  label: "Inbox",
  icon: Inbox,
  color: "text-fuchsia-500",
  description: "Quick capture for ideas, tasks, and phrases",
  keywords: ["capture", "quick capture", "idea", "second brain", "triage"],
}

/**
 * Freeform notes. No sidebar/rail/bottom-nav row of its own — Hengo is not a
 * general notes app, so Notes is a real, preserved, searchable route reached
 * via Quick Switcher or the More sheet's Memory group, not a primary nav
 * destination. Data and route untouched: still `/notes`.
 */
export const notesItem: NavItem = {
  id: "memory-notes",
  href: "/notes",
  label: "Notes",
  icon: NotebookPen,
  color: "text-violet-400",
  keywords: ["note", "scratchpad", "ideas"],
  showInSidebar: false,
}

/**
 * Single merged destination for what used to be four separate sidebar rows
 * (Review, Achievements, Statistics — History merged separately, see
 * `historyItem`). Lives under "Grow" as `grow-progress`; its own landing page
 * is a small hub (`/progress`) linking out to the three routes below, which
 * stay real and unchanged.
 */
export const progressHubItem: NavItem = {
  id: "grow-progress",
  href: "/progress",
  label: "Progress",
  icon: BarChart3,
  color: "text-sky-500",
  description: "Morning/evening/weekly review, achievements, and stats",
  // Deliberately no "statistics"/"stats" keyword — Statistics itself already
  // carries those, and duplicating them here would make it rank behind this
  // hub for a search that should go straight to the page.
  keywords: ["progress", "review", "achievements", "badges", "xp", "level"],
}

/**
 * Korean correction history (`/history` reads `correctionApi`/`progressApi`),
 * so it lives in the Learning section. Timeline — the cross-app activity log
 * it used to share a section with — moved to Notes.
 */
export const historyItem: NavItem = {
  id: "history-hub",
  href: "/history",
  label: "History",
  icon: History,
  color: "text-amber-500",
  description: "Corrections, patterns, and streaks over time",
  keywords: ["history", "activity", "log", "past", "sessions"],
}

const timelineItem: NavItem = {
  id: "review-timeline",
  href: "/timeline",
  label: "Timeline",
  icon: CalendarClock,
  color: "text-orange-500",
  description: "Everything you did, day by day",
  keywords: ["timeline", "activity", "journal", "habits", "tasks", "day", "week", "month"],
  showInSidebar: false,
}

/** The in-app catalog of the projects H-Space links to (`lib/projects.ts`). */
export const appsItem: NavItem = {
  id: "apps-catalog",
  href: "/apps",
  label: "My Apps",
  icon: LayoutGrid,
  color: "text-cyan-500",
  description: "The applications in H-Space and what each one solves",
  keywords: ["apps", "projects", "portfolio", "catalog"],
}

/**
 * H-Vault — the private account directory (metadata only; passwords live in
 * Bitwarden). An internal app inside the My Apps workspace.
 */
export const vaultItem: NavItem = {
  id: "apps-vault",
  href: "/vault",
  label: "H-Vault",
  icon: Vault,
  color: "text-cyan-600",
  description: "Which email or username you use for each service",
  keywords: ["vault", "accounts", "logins", "username", "email", "bitwarden", "services"],
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export const navSections: NavSection[] = [
  {
    id: "today",
    label: "Overview",
    icon: Home,
    color: "text-blue-500",
    href: todayItem.href,
    items: [todayItem],
  },
  {
    // The Learning workspace. Korean is its only module today, so the items
    // keep their Korean-specific names and the mobile tab still lands on the
    // Korean hub (`/learn`).
    id: "learn",
    label: "Learning",
    icon: GraduationCap,
    color: "text-violet-500",
    href: "/learn",
    // Every child below is a real, reachable, searchable route — just hidden
    // from the sidebar/rail/bottom-nav (`showInSidebar: false`) in favor of a
    // single "Learn" entry that lands on `/learn`, the Learning Hub. Keeping
    // them here (rather than deleting them) is what keeps route matching,
    // page titles, breadcrumbs, and the Quick Switcher all working unchanged.
    items: [
      {
        id: "learn-practice",
        href: "/practice",
        label: "Practice",
        icon: Sparkles,
        color: "text-violet-500",
        description: "Today's Korean practice session",
        keywords: ["learn", "korean", "daily", "drill", "speaking"],
        showInSidebar: false,
      },
      {
        id: "learn-korean-coach",
        href: "/korean-coach",
        label: "Korean Coach",
        shortLabel: "Coach",
        icon: Mic,
        color: "text-rose-500",
        description: "Listening and speaking practice with AI feedback",
        keywords: ["voice", "speaking", "listening", "workplace", "korean", "coach"],
        showInSidebar: false,
      },
      {
        id: "learn-vocab",
        href: "/vocab",
        label: "Vocabulary",
        icon: BookOpen,
        color: "text-amber-500",
        keywords: ["words", "srs", "review", "flashcards", "korean"],
        showInSidebar: false,
      },
      {
        id: "learn-phrasebook",
        href: "/phrasebook",
        label: "Phrasebook",
        icon: MessagesSquare,
        color: "text-sky-500",
        description: "Workplace and daily-life Q&A practice",
        keywords: [
          "phrasebook",
          "questions",
          "answers",
          "workplace",
          "qa",
          "speaking",
          "listening",
          "korean",
        ],
        // Bare /phrasebook only — the "Reading" mode below owns its own
        // active state (same pattern as aiCoachItem/absentQuery).
        match: { pathname: "/phrasebook", absentQuery: ["mode"] },
        showInSidebar: false,
      },
      {
        // Foundations is merged into the Phrasebook hub as a "Foundations"
        // mode (?mode=foundations on the same route) — see app/(main)/
        // phrasebook/page.tsx and the redirect stub at app/(main)/learn/
        // foundations/page.tsx. Same pattern as askHengoItem's
        // /chat?mode=memory.
        id: "learn-foundations",
        href: "/phrasebook?mode=foundations",
        label: "Foundations",
        icon: Languages,
        color: "text-indigo-500",
        keywords: ["grammar", "hangul", "basics", "korean"],
        match: { pathname: "/phrasebook", query: { mode: "foundations" } },
        showInSidebar: false,
      },
      {
        // Reading is merged into the Phrasebook hub as a "Reading" mode
        // (?mode=reading on the same route) — see app/(main)/phrasebook/
        // page.tsx and the redirect stub at app/(main)/reading/page.tsx.
        // Same pattern as askHengoItem's /chat?mode=memory.
        id: "learn-reading",
        href: "/phrasebook?mode=reading",
        label: "Reading",
        icon: BookOpenText,
        color: "text-teal-500",
        keywords: ["articles", "comprehension", "korean"],
        match: { pathname: "/phrasebook", query: { mode: "reading" } },
        showInSidebar: false,
      },
      {
        id: "learn-listening",
        href: "/listening",
        label: "Listening",
        icon: Headphones,
        color: "text-cyan-500",
        keywords: ["audio", "dictation", "korean"],
        showInSidebar: false,
      },
      {
        id: "learn-scenarios",
        href: "/scenarios",
        label: "Scenarios",
        icon: Drama,
        color: "text-pink-500",
        keywords: ["roleplay", "workplace", "situations", "korean"],
        showInSidebar: false,
      },
      {
        id: "learn-interview",
        href: "/interview",
        label: "Exam Prep",
        icon: GraduationCap,
        color: "text-orange-500",
        keywords: ["topik", "interview", "test", "exam"],
        showInSidebar: false,
      },
      historyItem,
      {
        id: "learn-hub",
        href: "/learn",
        label: "Learning Hub",
        icon: Sparkles,
        color: "text-violet-500",
        description: "Practice, study, and exam prep — all Korean learning in one hub",
        keywords: ["learn", "hub", "korean", "overview", "foundations", "practice"],
        showInSidebar: false,
      },
    ],
  },
  {
    // "Plan" answers "what do I want to achieve, and what tasks will get me
    // there?" — Overview/Tasks are real routes (hidden from the sidebar/rail
    // like Learn's children above) reached via the Goals hub's own local tab
    // nav (see components/goals/hub/GoalsHubNav) rather than separate nav
    // rows. Overview and Tasks are listed before Goals so getActiveNavItem
    // (first match wins) resolves their more specific title instead of the
    // parent's — see the navPathnames note below for why they can share the
    // /goals prefix with the parent without losing bottom-tab/sidebar
    // highlighting. Inbox lives here too (not a "Memory" browsing tool — it's
    // where a stray idea becomes a goal or task).
    id: "plan",
    label: "Planner",
    icon: ListTodo,
    color: "text-sky-500",
    href: "/goals",
    items: [
      {
        id: "goals-overview",
        href: "/goals/overview",
        label: "Overview",
        icon: BarChart3,
        color: "text-sky-500",
        description: "Snapshot of your active goals, deadlines, and progress",
        keywords: ["overview", "summary", "snapshot", "dashboard", "progress"],
        showInSidebar: false,
      },
      {
        id: "goals-tasks",
        href: "/goals/tasks",
        label: "Tasks",
        icon: ClipboardList,
        color: "text-blue-500",
        description: "Today's tasks across every goal",
        keywords: ["tasks", "today", "todo", "checklist"],
        showInSidebar: false,
      },
      {
        id: "goals-goals",
        href: "/goals",
        label: "Goals",
        icon: Target,
        color: "text-emerald-600",
        keywords: ["goal", "objective", "outcome", "plan"],
        // /goals/calendar is its own visible item; keep it from also lighting
        // up Goals. Overview/Tasks are hidden items, so they no longer shadow
        // this prefix match — see the navPathnames fix below.
        match: { pathname: "/goals", includeChildren: true },
      },
      {
        // One of the Planner's local tabs (`workspaceTabs.plan`).
        // `showInSidebar` deliberately stays unset (true): flipping it would
        // drop this href out of `navPathnames`, breaking the sibling-wins
        // exclusion `goals-goals` relies on above.
        id: "goals-calendar",
        href: "/goals/calendar",
        label: "Calendar",
        icon: CalendarDays,
        color: "text-cyan-500",
        keywords: ["schedule", "week", "month", "task", "deadline", "project"],
      },
      inboxItem,
      {
        id: "goals-roadmap",
        href: "/roadmap",
        label: "Roadmap",
        icon: Map,
        color: "text-lime-500",
        description: "Your long-term, phase-by-phase learning/career plan",
        keywords: ["milestones", "phases", "timeline", "long-term", "planning"],
        // Not a primary nav destination — it's a long-term planning tool
        // reachable from the Goals Overview tab (RoadmapTeaser) and
        // search/More sheet. Route and localStorage data are untouched.
        showInSidebar: false,
      },
    ],
  },
  {
    // "Grow" absorbs the old "Progress" workspace (Review/Achievements/
    // Statistics, merged into one `progressHubItem` row — see the comment on
    // that item) alongside Recovery/Habits/Journal. Progress is the only one
    // of these that keeps its own sidebar/rail row; Recovery and Journal are
    // unused day-to-day and stay hidden (`showInSidebar: false`) like Habits
    // and the three merged Progress routes — all real routes at their
    // original URLs with their own data untouched, same pattern as Plan's
    // Overview/Tasks.
    id: "grow",
    label: "Growth",
    icon: Sprout,
    color: "text-emerald-500",
    href: "/growth",
    items: [
      {
        // The Growth workspace's landing page — a small hub over Habits,
        // Journal, Progress and Recovery. Exact match only, so it never
        // claims the child routes below.
        id: "growth-hub",
        href: "/growth",
        label: "Growth",
        icon: Sprout,
        color: "text-emerald-500",
        description: "Habits, reflection, and progress in one place",
        keywords: ["growth", "habits", "journal", "progress", "reflection"],
        match: { pathname: "/growth", includeChildren: false },
      },
      {
        id: "growth-habits",
        href: "/growth/habits",
        label: "Habits",
        icon: ListChecks,
        color: "text-emerald-500",
        keywords: ["habit", "streak", "routine", "check-in"],
        showInSidebar: false,
      },
      {
        id: "growth-recovery",
        href: "/growth/recovery",
        label: "Recovery",
        icon: Compass,
        color: "text-cyan-600",
        keywords: ["recovery", "urge", "trigger", "pause", "plan", "habit", "streak", "check-in"],
        showInSidebar: false,
      },
      {
        id: "growth-journal",
        href: "/growth/journal",
        label: "Reflections",
        icon: NotebookPen,
        color: "text-amber-500",
        description: "Daily reflection — mood, wins, lessons",
        keywords: ["journal", "reflection", "mood", "energy", "gratitude", "diary"],
        showInSidebar: false,
      },
      progressHubItem,
      {
        id: "review-hub",
        href: "/review/morning",
        label: "Review",
        icon: Sunrise,
        color: "text-orange-500",
        description: "Morning brief, evening review, weekly review",
        keywords: ["review", "morning", "evening", "weekly", "brief", "reflection", "summary"],
        // Any of the three review pages should light this item up, not just
        // the default one it links to.
        match: { pathname: "/review" },
        showInSidebar: false,
      },
      {
        id: "review-achievements",
        href: "/achievements",
        label: "Achievements",
        icon: Trophy,
        color: "text-yellow-500",
        keywords: ["badges", "xp", "level", "progress"],
        showInSidebar: false,
      },
      {
        id: "review-statistics",
        href: "/statistics",
        label: "Statistics",
        icon: BarChart3,
        color: "text-indigo-500",
        keywords: ["stats", "charts", "analytics", "progress"],
        showInSidebar: false,
      },
      { id: "growth-deep-work", href: "/growth/focus", label: "Deep Work", icon: Zap, soon: true },
      { id: "growth-mood", href: "/growth/mood", label: "Mood", icon: Smile, soon: true },
      { id: "growth-rewards", href: "/growth/rewards", label: "Rewards", icon: Trophy, soon: true },
    ],
  },
  {
    // Notes: what you've written down and what Hengo remembers —
    // freeform Notes, the Memories hub (facts extracted from notes/goals/
    // habits/journal), and the cross-app Timeline. The "memory" id is kept
    // because last-visited tracking stores it in localStorage.
    id: "memory",
    label: "Notes",
    icon: NotebookPen,
    color: "text-indigo-500",
    href: notesItem.href,
    items: [notesItem, memoryHubItem, timelineItem],
  },
  {
    id: "apps",
    label: "My Apps",
    icon: LayoutGrid,
    color: "text-cyan-500",
    href: appsItem.href,
    items: [appsItem, vaultItem],
  },
  {
    // AI Assistant: the general Hengo Coach chat, its modes, and Ask Hengo
    // (answers from your own data). All share `/chat`; `NavMatch` query rules
    // keep exactly one of them active.
    id: "ai",
    label: "AI Assistant",
    icon: Bot,
    color: "text-teal-500",
    href: aiCoachItem.href,
    items: [
      aiCoachItem,
      askHengoItem,
      {
        id: "ai-analyze",
        href: "/chat?mode=analyze",
        label: "Analyze",
        icon: ScanText,
        color: "text-blue-500",
        keywords: ["ai", "analyze", "breakdown", "explain"],
        match: { pathname: "/chat", query: { mode: "analyze" } },
        showInSidebar: false,
      },
      {
        id: "ai-generate",
        href: "/chat?mode=generate",
        label: "Generate",
        icon: Wand2,
        color: "text-violet-500",
        keywords: ["ai", "generate", "create", "draft"],
        match: { pathname: "/chat", query: { mode: "generate" } },
        showInSidebar: false,
      },
      {
        id: "ai-corrections",
        href: "/chat?mode=corrections",
        label: "Corrections",
        icon: RotateCcw,
        color: "text-amber-500",
        keywords: ["ai", "mistakes", "corrections", "fix", "grammar"],
        match: { pathname: "/chat", query: { mode: "corrections" } },
        showInSidebar: false,
      },
    ],
  },
]

/** Sections that get their own rail/sidebar entry (Today is rendered on its own). */
export const primarySections: NavSection[] = navSections.filter((s) => s.id !== "today")

/** Every navigable item in the app, including Settings. */
export const allNavItems: NavItem[] = [...navSections.flatMap((s) => s.items), settingsItem]

// Only items that actually get their own sidebar/rail/bottom-nav row can
// "shadow" a parent's prefix match (see the sibling-wins comment below).
// Hidden hub children (showInSidebar: false — Learn's practice/vocab/etc.,
// Plan's overview/tasks/roadmap, Grow's review/achievements/statistics)
// have no separate row to hand the highlight to, so excluding them here lets
// the parent (e.g. the Goals bottom tab) stay lit while browsing them instead
// of going dark.
const navPathnames = new Set(
  allNavItems.filter((item) => item.showInSidebar !== false).map((item) => linkPath(item.href)),
)

/** Look an item up by its stable id. Throws on typos at module-load time. */
export function navItem(id: string): NavItem {
  const found = allNavItems.find((item) => item.id === id)
  if (!found) throw new Error(`Unknown nav item id: ${id}`)
  return found
}

function section(id: NavSectionId): NavSection {
  return navSections.find((s) => s.id === id)!
}

// ─── Navigation layers ────────────────────────────────────────────────────────
//
// The registry above (`navSections`) covers every route and drives titles,
// breadcrumbs, active matching, and the Quick Switcher. What each surface
// *shows* is chosen from it in four small layers, so no shell component ever
// decides visibility itself:
//
//   1. `workspaceNavItems` + `toolNavItems` — the global sidebar / tablet rail:
//      six workspaces plus the AI Assistant and Settings. Nothing else.
//   2. `workspaceTabs` — each workspace's local navigation, rendered inside the
//      workspace by `WorkspaceTabs` (Planner: Tasks · Goals · Calendar · …).
//   3. `mobileNavItems` — the four mobile bottom-bar tabs before "More".
//   4. `browseSections` — every shipped route grouped by workspace, for the
//      mobile "More" sheet's full list.
//
// Entries in layers 1 and 3 represent a whole workspace, so they use a
// `sectionId` match: every route in that workspace (Calendar, `/vocab`,
// Memories, …) keeps its workspace lit.

/**
 * One global-nav entry per workspace, built from the section itself so the
 * label, icon, and landing route are defined once. `id` is prefixed so it
 * never collides with the registry item that shares the href.
 */
function workspaceEntry(id: NavSectionId, overrides: Partial<NavItem> = {}): NavItem {
  const s = section(id)
  return {
    id: `nav-${id}`,
    href: s.href,
    label: s.label,
    icon: s.icon,
    match: { pathname: linkPath(s.href), sectionId: id },
    ...overrides,
  }
}

/** The global sidebar's WORKSPACE group, in display order. */
export const workspaceNavItems: NavItem[] = [
  // /home has no children, so a plain exact match is enough.
  workspaceEntry("today", {
    shortLabel: "Home",
    description: todayItem.description,
    match: todayItem.match,
  }),
  workspaceEntry("apps", {
    shortLabel: "Apps",
    description: "Projects and personal applications",
  }),
  workspaceEntry("plan", { shortLabel: "Plan", description: "Tasks, goals, and calendar" }),
  workspaceEntry("learn", {
    shortLabel: "Learn",
    description: "Korean, software engineering, and AI",
  }),
  workspaceEntry("memory", { description: "Notes, memories, and timeline" }),
  workspaceEntry("grow", { description: "Habits, reflection, and progress" }),
]

/**
 * The global sidebar's TOOLS group. "AI Assistant" is the one AI identity in
 * the chrome; Hengo Coach and its modes stay the assistant's internal names.
 * Section-wide match so every `/chat?mode=…` keeps it lit.
 */
export const toolNavItems: NavItem[] = [
  workspaceEntry("ai", { shortLabel: "AI", description: aiCoachItem.description }),
  settingsItem,
]

/** Mobile bottom bar: four tabs; the fifth slot is the "More" sheet trigger. */
export const mobileNavItems: NavItem[] = ["nav-today", "nav-plan", "nav-learn", "nav-apps"].map(
  (id) => workspaceNavItems.find((item) => item.id === id)!,
)

/** Workspaces and tools the "More" sheet leads with — everything without a tab. */
export const moreNavItems: NavItem[] = [
  ...workspaceNavItems.filter((item) => !mobileNavItems.includes(item)),
  ...toolNavItems,
]

/** Icon for the "More" trigger, kept here with the rest of the nav vocabulary. */
export const moreIcon = MoreHorizontal

/** Whether the "More" trigger should read as current: no bottom tab owns the route. */
export function isMoreRoute(pathname: string, searchParams?: NavSearchParams): boolean {
  return !mobileNavItems.some((item) => isNavigationItemActive({ pathname, searchParams, item }))
}

/**
 * Local navigation inside each workspace. Workspaces without an entry
 * (Overview, Learning, AI Assistant) navigate with their own page content —
 * the Learning Hub's cards, the chat's mode switcher.
 */
export const workspaceTabs: Partial<Record<NavSectionId, NavItem[]>> = {
  plan: ["goals-tasks", "goals-goals", "goals-calendar", "goals-overview", "plan-inbox"].map(
    navItem,
  ),
  memory: ["memory-notes", "memory-hub", "review-timeline"].map(navItem),
  grow: ["growth-hub", "growth-habits", "growth-journal", "grow-progress"].map(navItem),
  apps: ["apps-catalog", "apps-vault"].map(navItem),
}

/**
 * The one tab that should read as current. A parent tab's prefix match can
 * overlap a sibling's (Goals' `/goals` vs Tasks' `/goals/tasks`), so when
 * several match, the most specific href wins.
 */
export function getActiveTab(
  tabs: NavItem[],
  pathname: string,
  searchParams?: NavSearchParams,
): NavItem | undefined {
  return tabs
    .filter((item) => isNavigationItemActive({ pathname, searchParams, item }))
    .sort((a, b) => linkPath(b.href).length - linkPath(a.href).length)[0]
}

/**
 * Display order for `browseSections` — the workspace order of the global
 * sidebar. The registry order in `navSections` is left alone because
 * `getActiveNavItem` / `getSectionForPath` are first-match.
 */
const BROWSE_SECTION_ORDER: NavSectionId[] = [
  "today",
  "plan",
  "learn",
  "memory",
  "apps",
  "grow",
  "ai",
]

/**
 * Every shipped route, grouped by workspace — the mobile "More" sheet's full
 * list, so phones keep a tappable door to routes that only a workspace's own
 * page links to on desktop. `soon` placeholders are excluded: no page behind
 * them.
 */
export const browseSections: NavSection[] = BROWSE_SECTION_ORDER.map(section)
  .map((s) => ({ ...s, items: shippedItems(s.items) }))
  .filter((s) => s.items.length > 0)

// ─── Matching ─────────────────────────────────────────────────────────────────

/** Base href without its query string. */
export function linkPath(href: string): string {
  return href.split("?")[0]
}

/** Read-only view of the current query — accepts `URLSearchParams` or a plain object. */
export type NavSearchParams =
  URLSearchParams | Record<string, string | undefined> | string | null | undefined

function readParam(search: NavSearchParams, key: string): string | null {
  if (search == null) return null
  if (typeof search === "string") return new URLSearchParams(search).get(key)
  if (search instanceof URLSearchParams) return search.get(key)
  return search[key] ?? null
}

function resolveMatch(item: NavItem): NavMatch {
  if (item.match) return item.match
  const [pathname, query] = item.href.split("?")
  if (!query) return { pathname }
  const parsed: Record<string, string> = {}
  new URLSearchParams(query).forEach((value, key) => {
    parsed[key] = value
  })
  return { pathname, query: parsed }
}

/**
 * Query-aware active matching. Pure — no hooks — so the shell can pass in
 * `usePathname()` / `useSearchParams()` and tests can pass plain strings.
 */
export function isNavigationItemActive({
  pathname,
  searchParams,
  item,
}: {
  pathname: string
  searchParams?: NavSearchParams
  item: NavItem
}): boolean {
  if (item.soon) return false

  const match = resolveMatch(item)

  // Section-wide match — used by hub items whose child routes don't share a
  // URL prefix with the hub (e.g. mobile's Learn tab: `/korean-coach` and
  // `/reading` aren't under `/learn`, but should still light it up).
  if (match.sectionId) {
    return getSectionForPath(pathname, searchParams)?.id === match.sectionId
  }

  if (match.alsoPathnames?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true
  }

  const includeChildren = match.includeChildren ?? true

  if (match.query) {
    for (const [key, value] of Object.entries(match.query)) {
      if (readParam(searchParams, key) !== value) return false
    }
  }
  if (match.absentQuery) {
    for (const key of match.absentQuery) {
      if (readParam(searchParams, key) != null) return false
    }
  }

  if (pathname === match.pathname) return true
  if (!includeChildren) return false
  if (!pathname.startsWith(`${match.pathname}/`)) return false

  // Prefix match — but if the current pathname is itself ANOTHER nav item's
  // exact path (e.g. "/goals/calendar" under "/goals", or
  // "/growth/recovery/log" under "/growth/recovery"), that more specific
  // sibling wins instead of both showing active. Sub-routes that aren't
  // themselves nav items (e.g. "/goals/create", "/goals/[id]") still match.
  // Excludes the item's own href so a deliberately loose match (e.g.
  // review-hub: href "/review/morning", match.pathname "/review", to also
  // catch /review/evening and /review/weekly) doesn't shadow itself.
  return !(navPathnames.has(pathname) && linkPath(item.href) !== pathname)
}

/** Convenience wrapper used by non-query surfaces (Growth tabs, etc.). */
export function isLinkActive(pathname: string, href: string): boolean {
  const item = allNavItems.find((i) => i.href === href)
  if (item) return isNavigationItemActive({ pathname, item })
  return isNavigationItemActive({
    pathname,
    item: { id: href, href, label: href, icon: Home },
  })
}

/** Which section the current route belongs to, or undefined for /settings etc. */
export function getSectionForPath(
  pathname: string,
  searchParams?: NavSearchParams,
): NavSection | undefined {
  return navSections.find((section) =>
    section.items.some((item) => isNavigationItemActive({ pathname, searchParams, item })),
  )
}

/** The single nav item matching the current route — drives header titles. */
export function getActiveNavItem(
  pathname: string,
  searchParams?: NavSearchParams,
): NavItem | undefined {
  return allNavItems.find((item) => isNavigationItemActive({ pathname, searchParams, item }))
}

// ─── Shipped / coming-soon filters ────────────────────────────────────────────

/** Only shipped items — `soon` placeholders are surfaced separately. */
export function shippedItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => !item.soon)
}

export function comingSoonItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.soon)
}

/** `soon` placeholders, kept out of the main groups so they don't dominate. */
export const moreComingSoon: NavItem[] = navSections.flatMap((s) => comingSoonItems(s.items))

// ─── Last-visited tracking ────────────────────────────────────────────────────

/** Plain route prefixes per section id, for `lib/last-visited.ts`. */
export const sectionRoutePrefixes: Record<string, string[]> = Object.fromEntries(
  primarySections.map((s) => [s.id, s.items.map((i) => linkPath(i.href))]),
)
