import {
  BarChart3,
  BookOpen,
  BookOpenText,
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
  ListChecks,
  Map,
  MessageCircle,
  MessagesSquare,
  Mic,
  NotebookPen,
  RotateCcw,
  ScanText,
  Settings,
  Smile,
  Sparkles,
  Sunrise,
  Target,
  TreeDeciduous,
  Trophy,
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
   * Whether this item gets its own row in the sidebar / rail / bottom nav.
   * Defaults to visible. Set `false` for routes that are still first-class,
   * reachable, searchable destinations (Quick Switcher, breadcrumbs, page
   * titles) but shouldn't clutter the nav chrome individually — e.g. the
   * Learn section's children, which are all reachable from the `/learn` hub
   * instead. Never remove an item from `navSections` just to hide it; that
   * would also break route matching, page titles, and the Quick Switcher.
   */
  showInSidebar?: boolean
}

export type NavSectionId = "today" | "learn" | "plan" | "grow" | "history" | "memory" | "ai"

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
  label: "Today",
  icon: Home,
  color: "text-blue-500",
  description: "Your daily overview",
  keywords: ["home", "dashboard", "start", "overview"],
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
 * Standalone top-level destination (peer of Today, not nested in a group) —
 * merges the old separate Timeline entry (see `timelineItem`) under one row.
 * Both routes are preserved and unchanged; History is just the one a reader
 * lands on first, with Timeline reachable from inside it.
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

// ─── Sections ─────────────────────────────────────────────────────────────────

export const navSections: NavSection[] = [
  {
    id: "today",
    label: "Today",
    icon: Home,
    color: "text-blue-500",
    href: todayItem.href,
    items: [todayItem],
  },
  {
    // Labelled as the module it is — H-Space is a multi-app hub and Korean
    // learning is one area of it, so a generic "Learn" heading oversold it.
    id: "learn",
    label: "Korean Learning",
    icon: Sparkles,
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
      {
        id: "learn-hub",
        href: "/learn",
        label: "Learn",
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
    label: "Plan",
    icon: ClipboardList,
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
        // Data-model home stays here (route registry, GoalsHubNav's local
        // tab, last-visited tracking for Plan's shortcut tile), but it's
        // promoted OUT of Plan's nested sidebar group and into a top-level
        // row — see `secondaryNavItems` and `visibleSidebarItems` below —
        // since Calendar is a primary daily surface, not a Goals sub-page.
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
    label: "Grow",
    icon: TreeDeciduous,
    color: "text-emerald-500",
    href: "/growth/recovery",
    items: [
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
    // Standalone top-level destination, not a collapsible group — rendered
    // via `secondaryNavItems`, same as Learn. Merges the old separate
    // Timeline entry (`timelineItem`) under one row — Timeline stays a real,
    // hidden, searchable route (surfaced from inside the History page), but
    // visiting it directly does not light up the History row (a minor,
    // accepted gap — same as Roadmap not lighting up Plan).
    id: "history",
    label: "History",
    icon: History,
    color: "text-amber-500",
    href: "/history",
    items: [historyItem, timelineItem],
  },
  {
    // "Memory" owns everything Hengo remembers about you: freeform Notes and
    // the Memories hub that surfaces facts extracted from notes/goals/
    // habits/journal, plus the "Ask Hengo" action. No dedicated sidebar/rail/
    // bottom-nav presence at all now (Inbox moved to Plan) — every item here
    // is `showInSidebar: false`, reachable via Quick Switcher (desktop) and
    // the More sheet's Memory group (mobile). Same zero-chrome pattern the
    // "ai" section below already used.
    id: "memory",
    label: "Memory",
    icon: BrainCircuit,
    color: "text-indigo-500",
    href: memoryHubItem.href,
    items: [notesItem, memoryHubItem, askHengoItem],
  },
  {
    // Preserved routes, no primary sidebar/rail presence — see the
    // `showInSidebar: false` note on `aiCoachItem` above.
    id: "ai",
    label: "Hengo Coach",
    icon: MessageCircle,
    color: "text-teal-500",
    href: aiCoachItem.href,
    items: [
      aiCoachItem,
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
      // Not listed here again — `askHengoItem` above (a child of the "memory"
      // section) already registers `/chat?mode=memory` as a route. Duplicating
      // it here would register the same id twice.
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

// ─── Hub primary navigation ────────────────────────────────────────────────────
//
// H-Space is a personal hub of several apps, so the tablet rail and mobile
// bottom bar give each module one tab instead of spending all five on Korean
// learning (Hengo V2's original Today · Vocabulary · Practice · Coach · Study).
// Each tab reuses its registry item's href/icon via spread, overriding only
// `id` (so the display variant doesn't collide with the registry item),
// `label`, and — for hub tabs — `match`, the same pattern the old
// `bottomTabs`'s `tab-learn` override used. Everything not given a tab stays a
// real, registered route reachable from those hubs, the desktop sidebar, and
// the Quick Switcher.
/**
 * Shorter display names for the two destinations whose registry labels are
 * longer than a nav row wants, used by the desktop sidebar. The one
 * deliberate exception is the rail/bottom bar's "Korean" tab: it also lands on
 * `/learn` but stands for the whole Korean Learning module (section-wide
 * match), so it takes the module's name rather than the page's "Study". The
 * underlying page title and breadcrumb still come from the registry label.
 */
const NAV_DISPLAY_LABELS: Record<string, string> = {
  "learn-korean-coach": "Coach",
  "learn-hub": "Study",
}

function withDisplayLabel(item: NavItem): NavItem {
  const label = NAV_DISPLAY_LABELS[item.id]
  return label ? { ...item, label } : item
}

export const primaryNavItems: NavItem[] = [
  todayItem,
  // Section-wide match so Calendar, Tasks, Inbox and Roadmap keep Goals lit
  // instead of going dark — none of them has a tab of its own here.
  {
    ...navItem("goals-goals"),
    id: "primary-goals",
    match: { pathname: "/goals", sectionId: "plan" },
  },
  // `/vocab`, `/korean-coach`, `/phrasebook`, … don't share the `/learn`
  // prefix, so the whole Korean Learning section lights this tab.
  {
    ...navItem("learn-hub"),
    id: "primary-korean",
    label: "Korean",
    match: { pathname: "/learn", sectionId: "learn" },
  },
  { ...notesItem, id: "primary-notes" },
  // No sectionId match: "grow" also holds Recovery/Habits/Journal, which
  // shouldn't light a tab labelled Progress. The pages the /progress hub links
  // to are listed instead, so drilling into them keeps the tab lit.
  {
    ...progressHubItem,
    id: "primary-progress",
    match: {
      pathname: "/progress",
      alsoPathnames: ["/review", "/achievements", "/statistics"],
    },
  },
]

/**
 * Desktop sidebar section order. Personal tools first, then the Korean
 * Learning module and its AI coach — the registry order in `navSections` is
 * left alone because `getActiveNavItem` / `getSectionForPath` are first-match.
 */
const SIDEBAR_SECTION_ORDER: NavSectionId[] = [
  "today",
  "plan",
  "grow",
  "memory",
  "history",
  "learn",
  "ai",
]

/**
 * Every shipped destination, grouped by its section — the desktop sidebar's
 * data source, and the Quick Switcher's pre-typing browse view.
 *
 * This deliberately ignores `showInSidebar`. That flag was V2's way of hiding
 * ~28 built, working routes behind Quick Switcher search only; the audit found
 * that leaves most of the product with no front door you can click. Sections
 * come straight from `navSections` (ordered by `SIDEBAR_SECTION_ORDER`), so a
 * new route still only needs registering there.
 *
 * `soon` placeholders are filtered out: they have no page behind them, so a
 * row would be a dead end. They stay in `navSections` (and in `moreComingSoon`)
 * for whoever builds them.
 */
export const sidebarSections: NavSection[] = SIDEBAR_SECTION_ORDER.map(section)
  .map((section) => ({ ...section, items: shippedItems(section.items).map(withDisplayLabel) }))
  .filter((section) => section.items.length > 0)

// ─── V1 workspace grouping (superseded by `primaryNavItems` above) ───────────
//
// Everything below in this section is the pre-V2 grouped-sidebar model (Plan/
// Grow expandable workspaces, a Learn/Calendar/History secondary row, and a
// mobile "More" sheet). No longer wired into any shell component — V2's flat
// five-item nav replaced it — but left in place and still exported/tested
// since the underlying routes it lists are all still real and some of this
// may be revisited by a later V2 phase instead of being deleted outright.

/**
 * The only sections that render as a real, expandable primary group in the
 * desktop sidebar and tablet rail: Plan and Grow. Order here is display
 * order. Learn and History are secondary flat destinations (see
 * `secondaryNavItems`); Memory and AI have no chrome presence at all — every
 * item they hold is `showInSidebar: false`.
 */
export const workspaceNavSections: NavSection[] = ["plan", "grow"].map((id) =>
  section(id as NavSectionId),
)

/**
 * Secondary desktop/tablet destinations, rendered below the primary groups:
 * Learn's card hub, Calendar, and History. Calendar's `NavItem` still lives
 * inside the "plan" section's `items` (see the comment there) purely for
 * route registry / GoalsHubNav / last-visited purposes — listing it here too
 * is what actually promotes it to a top-level row; `visibleSidebarItems`
 * below excludes it from Plan's nested group so it isn't rendered twice.
 * Neither "Account" nor "Settings" gets its own row here — the existing
 * `ProfileMenu` component already serves as the sidebar's Account entry
 * point (avatar + email, labelled "Account") and its dropdown's first item
 * is Settings, so a standalone Settings row would duplicate that same
 * destination right above it.
 */
export const secondaryNavItems: NavItem[] = [
  navItem("learn-hub"),
  navItem("goals-calendar"),
  navItem("history-hub"),
]

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

// ─── Mobile bottom bar (V1 — superseded, `MobileBottomNav` now renders
// `primaryNavItems` directly) ──────────────────────────────────────────────────

/**
 * Four routed mobile destinations. The fifth slot ("More") is a sheet
 * trigger, not a route, so it is not in this list — see `MobileBottomNav`.
 * Hengo Coach deliberately has no bottom tab of its own: the floating
 * launcher (`components/chat/FloatingAiCoach`) already gives it one-tap
 * mobile access without spending a tab slot, which is also the only way
 * Grow/Memory/Settings/History stay reachable without a "More" trigger.
 */
export const bottomTabs: NavItem[] = [
  todayItem,
  {
    ...navItem("learn-hub"),
    id: "tab-learn",
    label: "Learn",
    match: { pathname: "/learn", sectionId: "learn" },
  },
  { ...navItem("goals-goals"), id: "tab-goals", label: "Goals" },
  // No sectionId match: "grow" also holds Recovery/Journal, which have no
  // chrome row at all now (reachable via Quick Switcher / deep link) and
  // shouldn't light up this tab. Only /progress itself (and its children,
  // via the default pathname match) does.
  { ...navItem("grow-progress"), id: "tab-progress", label: "Progress" },
]

/**
 * Whether the current route lives behind the "More" sheet rather than one of
 * the four direct tabs. Anything no tab owns counts — so /growth/recovery,
 * /vocab, /chat and /settings all light up "More".
 */
export function isMoreRoute(pathname: string, searchParams?: NavSearchParams): boolean {
  return !bottomTabs.some((item) => isNavigationItemActive({ pathname, searchParams, item }))
}

/** Index of the active bottom tab, or `bottomTabs.length` for More, or -1. */
export function getActiveBottomTabIndex(pathname: string, searchParams?: NavSearchParams): number {
  const index = bottomTabs.findIndex((item) =>
    isNavigationItemActive({ pathname, searchParams, item }),
  )
  if (index !== -1) return index
  return isMoreRoute(pathname, searchParams) ? bottomTabs.length : -1
}

// ─── "More" sheet grouping (V1 — superseded, `MoreNavigationSheet` is no
// longer mounted by `AppShell`; V2's five `primaryNavItems` need no overflow
// sheet) ────────────────────────────────────────────────────────────────────

export type MoreGroup = {
  id: string
  label: string
  items: NavItem[]
}

/** Only shipped items — `soon` placeholders are surfaced separately. */
export function shippedItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => !item.soon)
}

export function comingSoonItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.soon)
}

/**
 * Shipped items that also get their own sidebar/rail/flyout row. A section
 * where every item opts out (like Learn — see `showInSidebar` on `NavItem`)
 * renders as a single flat link to `section.href` instead of an expandable
 * group; see `DesktopSidebar` / `TabletNavigationRail`. Items promoted into
 * `secondaryNavItems` (currently just Calendar) are excluded here too, so a
 * promoted item gets its one top-level row instead of also appearing nested
 * in its data-model section's group.
 */
export function visibleSidebarItems(section: NavSection): NavItem[] {
  return shippedItems(section.items).filter(
    (item) => item.showInSidebar !== false && !secondaryNavItems.includes(item),
  )
}

/**
 * The More sheet's menu, grouped: Calendar/History/Settings as a flat menu,
 * plus a labelled "Memory" group for Notes and Memories (Inbox is a Plan
 * item now, reachable from the Goals tab). Calendar leads the flat menu —
 * mobile's mirror of the desktop promotion into `secondaryNavItems` — so
 * it's one tap from "More" instead of two taps via the Goals hub's local tab
 * nav. Recovery and Journal are unused day-to-day (see the "grow" section
 * comment above) and stay real, hidden routes reachable via Quick Switcher
 * rather than a row here. "Ask Hengo" is rendered separately as a pinned
 * card at the top of the sheet (the mobile home for that action), so it's
 * excluded here to avoid listing it twice. Today, Learn, Goals and Progress
 * aren't repeated here either — they're already bottom tabs.
 */
export const moreGroups: MoreGroup[] = [
  {
    id: "memory",
    label: "Memory",
    items: [notesItem, memoryHubItem],
  },
  {
    id: "menu",
    label: "",
    items: [navItem("goals-calendar"), historyItem, settingsItem],
  },
]

/** `soon` placeholders, kept out of the main groups so they don't dominate. */
export const moreComingSoon: NavItem[] = navSections.flatMap((s) => comingSoonItems(s.items))

// ─── Last-visited tracking ────────────────────────────────────────────────────

/** Plain route prefixes per section id, for `lib/last-visited.ts`. */
export const sectionRoutePrefixes: Record<string, string[]> = Object.fromEntries(
  primarySections.map((s) => [s.id, s.items.map((i) => linkPath(i.href))]),
)
