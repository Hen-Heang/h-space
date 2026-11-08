# H-Space UI/UX redesign — audit and phased plan

Date: 2026-11-03 · Branch: `ui/redesign-foundation` · Scope: `apps/web` only
(Luyra is out of scope). Design rules: [`design-system.md`](design-system.md).

## How this audit was done (coverage, honestly)

| Method                                                                            | What it covers                                                                                                                                                                                                                              | Limits                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source audit** of every `page.tsx` under `app/` and the components each renders | All 106 route files, plus shared `components/ui`, `components/layout`, `components/app`                                                                                                                                                     | Static reading. Some findings are judgement calls.                                                                                                                                                                                                                                                                                                                                |
| **Rendered sweep** (`tests/e2e/ui-route-sweep.e2e.ts`)                            | 48 signed-in feature routes × 7 widths (320/375/390/430/768/1024/1440), light theme. Fails on horizontal overflow, logs text under the 13px floor (12px in the runs below), saves full-page screenshots to `test-results/ui-sweep/<label>/` | **Synthetic session and data only.** Auth is a fake local token, Supabase REST is fulfilled locally (two goals, five tasks, everything else empty), and every off-machine request is aborted. Screens therefore show mostly **empty states**. No real account or live database was used. Populated states beyond goals/tasks, dialogs and drawers were reviewed from source only. |
| Public pages                                                                      | `/`, `/login`, `/register` were last rendered on 2026-11-02 (HANDOFF)                                                                                                                                                                       | Not re-rendered in this pass                                                                                                                                                                                                                                                                                                                                                      |

Not visually reviewed: chromeless OAuth screens (`/oauth/consent`,
`/integrations/google-calendar/callback`), the immersive pause overlay,
voice/realtime panels in a live call, and the H-Vault unlocked state. Vault
was reviewed from source for **layout only**, with no data, fixtures or
screenshots of credentials.

## Overall findings

The shell (sidebar, rail, headers, bottom bar, tabs) is already in good shape
from earlier passes. The inconsistency lives **inside pages**, and it comes
from a handful of repeated patterns:

1. **Second titles.** ~35 screens add their own `h1` hero (title, kicker, icon
   tile, sometimes a blur glow or dark banner) under the shell's `h1`. The
   largest single source is `components/app/page-hero.tsx`, which defaults to
   `h1` (10 callers).
2. **Boxes in boxes.** Cards wrap bordered rows that wrap tinted boxes. The
   worst cases are goal detail tabs, recovery, home cards, history,
   ReviewSession and the interview live session. `Card` itself shipped a
   shadow, so every card added elevation.
3. **Tiny text.** 247 uses of `text-[10px]`/`text-[11px]` plus 917 `text-xs`
   (12px). Many carry real information: deadlines, transcripts, calendar
   chips, nav labels, tags.
4. **Rainbow accents.** Per-item icon colours (home metrics, settings
   headers, timeline kinds, recovery tools, habit categories, progress cards)
   and off-brand primary actions (blue-600 in chat/notes/interview, rose in
   Korean Coach, emerald in reading/review, `#1cb0f6` in vocab review).
5. **Stacked controls.** Up to three tab bars on one page (`/vocab`), filter +
   sort + view-toggle rows (`/goals`), four chrome layers before the first
   task (`/goals/tasks`).
6. **Touch targets.** Hand-rolled 24–36px buttons that bypass `Button`'s
   coarse-pointer sizing: calendar, task rows, chat composer, roadmap,
   habit calendar.

## Priority definitions

- **P0** — broken, inaccessible, overflowing, or data hidden/clipped.
- **P1** — hierarchy, clutter or consistency problem a daily user feels.
- **P2** — polish.

## Route checklist

Legend — **Type**: F feature · R redirect stub · H real but not in nav · C
chromeless. **Seen**: S = source audited, ✓ = also rendered in the sweep.
**Worst** = highest open priority. **Phase** = where it's fixed.

### Shell and public

| Route / surface                                                                             | Type | Seen | Worst | Phase | Key issues                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | ---- | ---- | ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell (sidebar, rail, headers, bottom bar, More)                                        | —    | S ✓  | P1    | 2     | 11px bottom-bar, rail and sidebar-group labels; the desktop `h1` is 14px, weaker than section headings; four or five icon actions in the mobile header; under `WorkspaceTabs` the divider sits below the action button on phones |
| `/`, `/privacy`, `/terms`                                                                   | F    | S    | P2    | 6     | Marketing surfaces; out of the app shell                                                                                                                                                                                         |
| `/login` `/register` `/forgot-password` `/reset-password` `/verify-email` `/unlock-account` | F    | S    | P2    | 6     | Rendered clean 2026-11-02; no change planned                                                                                                                                                                                     |

### Overview

| Route        | Type | Seen | Worst | Phase | Key issues                                                                                                                                                                                                                                                                                 |
| ------------ | ---- | ---- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/home`      | F    | S ✓  | P1    | 3     | ~~Horizontal overflow at 320px~~ (Today's tasks card 669px wide) — **fixed in Phase 1**. Two heroes (greeting + dark `HomeHero` banner that repeats My Apps); vanity metrics; rainbow tiles; bordered rows inside bordered cards; a `role=button` row nests a toggle button; 11px eyebrows |
| `/dashboard` | R    | S    | —     | —     | → `/goals/overview`; its old dashboard components are unused                                                                                                                                                                                                                               |

### Planner

| Route                                                      | Type | Seen            | Worst  | Phase | Key issues                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ---- | --------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/goals`                                                   | F    | S ✓             | **P0** | 3     | At 320px the goal row leaves about 50px for the title, and the `shrink-0` metadata clips; the deadline is hidden on mobile; 10px "Next"; the list/grid toggle adds a third control row; the progress bar has a rainbow gradient                                           |
| `/goals/tasks`                                             | F    | S ✓             | **P0** | 3     | Edit/Delete are hover-only 28px buttons, invisible on touch; the composer's nine colour swatches clip at 320px; a second "Today's tasks" title; four chrome layers; a heavy add form (third task form); no error state                                                    |
| `/goals/overview`                                          | F    | S ✓             | P1     | 3     | An unrelated `RoadmapTeaser`; mixed card styles; duplicated deadline banner; no error states                                                                                                                                                                              |
| `/goals/calendar`                                          | F    | S ✓             | **P0** | 3     | `ModernTaskItem` Edit/Delete are 24px everywhere; 9–11px chips and labels; 24px day buttons; the day-add button is hover-only                                                                                                                                             |
| `/goals/create`, `/create/custom`, `/create/template/[id]` | F    | S ✓ (first two) | **P0** | 3     | The template back button has no `aria-label`; PageHero and second h1s; nested interactive template cards; 11px labels                                                                                                                                                     |
| `/goals/join/[code]`                                       | F    | S               | P2     | 3     | Fine single card                                                                                                                                                                                                                                                          |
| `/goals/[id]` + `/plan` `/progress` `/schedule` `/tasks`   | F    | S ✓             | **P0** | 3     | The mobile sticky "Add task" bar sits **under** the bottom nav (`AllTasksView`); a second h1; pill nav doesn't match `WorkspaceTabs`; up to seven 10–11px metadata items per task row; cards nested two to three levels; a nine-column table squeezes the title at 1024px |
| `/inbox`                                                   | F    | S ✓             | P1     | 3     | Control-heavy cards (three badges, pin, reminder, convert, archive, delete); raw error string with no retry                                                                                                                                                               |
| `/roadmap`                                                 | H    | S               | **P0** | 5     | 20px toggle with no name or state; seventeen 10–11px low-contrast labels; second h1; rainbow levels                                                                                                                                                                       |

### My Apps, H-Vault, Settings

| Route                                                      | Type | Seen                    | Worst | Phase | Key issues                                                                                                                                                                       |
| ---------------------------------------------------------- | ---- | ----------------------- | ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/apps`                                                    | F    | S ✓                     | P1    | 4     | Good baseline. Chips, links and favourite are 36px; 11px stack tags; `h-9` search                                                                                                |
| `/vault`                                                   | F    | S ✓ (locked/empty only) | P1    | 4     | A second hero with h1 "Account vault"; four shadowed stat tiles; account card nests a muted box and a dashed box; 11px pills. **Layout only; crypto, session and CSP untouched** |
| `/settings`                                                | F    | S ✓                     | P1    | 4     | Every group is a shadowed `SectionCard`; no `h2`; rainbow header icons; `<button onClick=router.push>` rows instead of links; two rows go to the same page                       |
| `/settings/security`                                       | F    | S ✓                     | P1    | 4     | A second h1; a local `Card` with nested bordered boxes; `text-xs` hints                                                                                                          |
| `/settings/reminders`                                      | F    | S ✓                     | P1    | 4     | A second h1; `text-xs` uppercase section headings; each row is a card                                                                                                            |
| `/settings/integrations`                                   | F    | S ✓                     | P1    | 4     | A second h1; a copy of SectionCard with shadow                                                                                                                                   |
| `/account`                                                 | R    | S                       | —     | —     | → `/settings`                                                                                                                                                                    |
| `/oauth/consent`, `/integrations/google-calendar/callback` | C    | S                       | P1    | 4     | Extra gutter and `min-h-dvh` inside the shell; the callback status has no `aria-live`                                                                                            |

### Learning

| Route                                                       | Type | Seen      | Worst  | Phase | Key issues                                                                                                                                                                                                      |
| ----------------------------------------------------------- | ---- | --------- | ------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/learn`                                                    | F    | S ✓       | P1     | 5     | Six stacked sections, three of them overlapping link lists; the `LearningSubjects` "not set up" panels pull focus                                                                                               |
| `/learn/today`, `/learn/foundations`, `/reading`            | R    | S ✓       | —      | —     | Redirect into `/practice/today` and phrasebook modes                                                                                                                                                            |
| `/learn/[lessonId]`                                         | F    | S         | P2     | 5     | Calm already                                                                                                                                                                                                    |
| `/practice`                                                 | F    | S ✓       | P1     | 5     | Double gutter (an extra `px-4` and safe-area padding inside the shell); `rounded-3xl` cards                                                                                                                     |
| `/practice/today`                                           | F    | S         | P1     | 5     | Dark hero with a second h1; a nested `<main>`; blue CTA                                                                                                                                                         |
| `/vocab`                                                    | F    | S ✓       | P1     | 5     | **Three stacked tab bars**; mixed CTA colours in ReviewSession; 10px stats                                                                                                                                      |
| `/phrasebook` (+ `[collectionId]`, `new`, `practice`)       | F    | S ✓ (hub) | P1     | 5     | Two tab bars; low-contrast 0.18em uppercase headings; 32px card actions; 11px form labels                                                                                                                       |
| `/reading/[id]`, `/reading/[id]/edit`, `/reading/new`       | F    | S         | P1     | 5     | `shadow-xl` hero; emerald primaries; 11px pills                                                                                                                                                                 |
| `/listening`                                                | F    | S ✓       | P1     | 5     | PageHero h1 with filler stats right under the tabs                                                                                                                                                              |
| `/scenarios`                                                | H    | S ✓       | P1     | 5     | No tabs; PageHero h1; two stacked control panels; blue CTA                                                                                                                                                      |
| `/history`                                                  | H    | S ✓       | **P0** | 5     | Month nav icon buttons have **no `aria-label`**; the search input is 14px, so iOS zooms; nested tinted correction boxes; 28px copy button                                                                       |
| `/study-packs/social-awareness`                             | H    | S         | P1     | 5     | PageHero h1 + stat tiles; nested `rounded-2xl` tiles                                                                                                                                                            |
| `/daily-phrase`, `/mistakes`                                | R    | S         | P2     | —     | Client redirects flash blank (server `redirect()` would not)                                                                                                                                                    |
| `/korean-coach` + 7 subroutes                               | F    | S ✓ (hub) | P1     | 5     | An h1 hero on every subroute; rose gradient hero and rose CTA; 10px mistake badge; 36px chips                                                                                                                   |
| `/interview` + `/script` `/speaking` `/listening` `/repeat` | F    | S ✓ (hub) | **P0** | 5     | `/interview/script`: the four-tab bar (≈440px) **overflows at 320px**; 10px, 24px-tall version-history buttons. The sticky action bar uses a hard-coded bottom offset; `rounded-[1.8rem]` and `shadow-xl` cards |

### AI

| Route               | Type          | Seen | Worst  | Phase | Key issues                                                                                                                                                                                                  |
| ------------------- | ------------- | ---- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/chat` (all modes) | F (immersive) | S ✓  | **P0** | 5     | The composer is 15px, so iOS zooms; send/stop are 36px; message actions are 24px; voice transcript is 11px. Two stacked header bars; blue-600 throughout; card chrome on an immersive screen; 8–11px labels |
| `/ask-hengo`        | R             | S    | —      | —     | → `/chat?mode=memory` (which adds a second h1 on desktop)                                                                                                                                                   |
| Floating AI coach   | —             | S ✓  | P2     | 5     | Fixed `w-[26rem]` panel with `shadow-2xl` on desktop                                                                                                                                                        |

### Notes

| Route                  | Type | Seen | Worst | Phase | Key issues                                                                                            |
| ---------------------- | ---- | ---- | ----- | ----- | ----------------------------------------------------------------------------------------------------- |
| `/notes`               | F    | S ✓  | P1    | 5     | Correct structure; `text-xs` metadata; fixed `w-36` filter                                            |
| `/notes/[slug]`        | F    | S    | P1    | 5     | Title `h1`; double gutter; `prose-sm` (14px body on mobile); blurred floating pills; 10px TOC heading |
| `/notes/new`           | F    | S ✓  | P1    | 5     | Save button is `bg-blue-600`; `text-xs` labels                                                        |
| `/notes/projects/[id]` | F    | S    | P1    | 5     | Its own breadcrumb; a `text-2xl` hero; multi-colour status pills                                      |
| `/ask-hengo/memories`  | F    | S ✓  | P1    | 5     | Tabs boxed to `max-w-2xl` (narrower than its siblings)                                                |
| `/timeline`            | F    | S ✓  | P1    | 5     | Every entry is a bordered card; rainbow kind icons; crowded filters at 320px                          |

### Growth

| Route                                  | Type | Seen      | Worst  | Phase | Key issues                                                                                                                                                                                                                                        |
| -------------------------------------- | ---- | --------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/growth`                              | F    | S ✓       | P2     | 5     | Area cards repeat the tabs                                                                                                                                                                                                                        |
| `/growth/habits`                       | F    | S ✓       | P1     | 5     | A mobile "Home" back link above the tabs; tabs boxed to `max-w-xl`; an extra h2 and banner; rainbow category tiles; the create form has a second h1                                                                                               |
| `/growth/habits/[id]`                  | F    | S         | **P0** | 5     | `CheckinCalendar` month nav is 32px on touch; hero h1; 11px weekday headers                                                                                                                                                                       |
| `/growth/journal`                      | F    | S ✓       | P1     | 5     | The reminder box squeezes the title at 320px; no empty state; 11px tags                                                                                                                                                                           |
| `/growth/recovery` + 13 subroutes      | F    | S ✓ (hub) | **P0** | 5     | `LogFlow` five-button row **overflows at 320px**; the `RecoveryOverview` "N due" badge overlaps the count; a dark blurred hero and h1 on every subpage; six different page widths; rainbow tools; nested checklists. _Copy stays domain-neutral._ |
| `/focus/*` (7)                         | R    | S         | P2     | —     | → `/growth/recovery/*`; blank until the redirect fires                                                                                                                                                                                            |
| `/progress`                            | F    | S ✓       | P1     | 5     | Rainbow card icons (the same card is muted on `/growth`)                                                                                                                                                                                          |
| `/statistics`, `/achievements`         | H    | S ✓       | P1     | 5     | PageHero h1s; shadowed cards; gradient tiles                                                                                                                                                                                                      |
| `/review/morning` `/evening` `/weekly` | H    | S ✓       | P1     | 5     | A boxed blue segmented control unlike `WorkspaceTabs`; an h1 date in each view; `text-xs` content                                                                                                                                                 |

## Rendered sweep results (before)

Baseline run on unmodified `main` code (`a19982a`). 48 routes × 7 widths, 336
screenshots in `test-results/ui-sweep/before/` (git-ignored, local only). The
first run lost 43 routes to a dev-server crash, so they were re-run separately
against the same code.

| Route                                    | Overflows at | What sticks out                                                                                          | Fixed in    |
| ---------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------- | ----------- |
| `/home`                                  | 320–768px    | Today's tasks card up to 669px wide: grid's implicit `auto` track grows to a long single-line task title | **Phase 1** |
| `/goals/overview`                        | 320–768px    | Same bug, "Goal tasks today" card 777px wide                                                             | **Phase 1** |
| `/chat`                                  | 320–390px    | Mode switcher + history button run 7–46px past the screen                                                | Phase 5     |
| `/goals`                                 | 320px        | All · Active · Completed filter is 336px wide                                                            | Phase 3     |
| `/review/morning`, `/evening`, `/weekly` | 320px        | "Weekly" segment ends 9px past the screen                                                                | Phase 5     |
| `/notes/new`                             | 320px        | One input ends 33px past the screen                                                                      | Phase 5     |
| `/vault`                                 | 320px        | One dropdown chevron, 6px past the screen                                                                | Phase 4     |
| `/goals/calendar`                        | not checked  | Worker crash in the first run; covered by the after-sweep                                                | —           |

Every one of the 48 routes logged text under 12px. The shell's 11px
bottom-bar, rail and sidebar-group labels appear on every page.

**Also found while reviewing screenshots (P0, fixed in Phase 1):** the `/home`
banner title rendered dark-on-navy. `globals.css` gives every `h1–h6`
`text-foreground`, which beats a container's inherited `text-white`. Other dark
panels with headings need the same check (Phase 6): `RecoveryDashboard`,
`DailyStudyPlanPage`, `ChatWindow`, `VoicePracticeSetup`, `UrgeRescueFlow`.

## Phased plan

Each phase is one reviewable branch/PR. Nothing merges or deploys without the
owner's approval.

**Phase 1 — foundation (this branch)**

- `design-system.md`; this audit; the route sweep.
- Tokens: `text-xs` → 13px floor; `.app-surface-muted`.
- Primitives flattened: `Card` (no shadow, solid surface), `Button` (no
  shadow), `Input` (no shadow). `PageHero` defaults to `h2` and loses its
  glow, hairline and box. `PageHeader` renders `h2`.
- New primitives: `PageSection`, `RowList` / `InteractiveRow`, `EmptyState`.

**Phase 2 — shell (this branch)**

- Bottom bar, rail and sidebar-group labels go from 11px to 13px.
- Desktop header title goes from 14px to 16px.
- `WorkspaceTabs` on phones: the divider sits under the tabs, and actions sit
  below it without their own border.
- Mobile header: the theme toggle moves into the More sheet (four icons
  become three on root pages).
- No route, registry, matching or Quick Switcher changes.

**Phase 3 — Home, Goals, Tasks** (next PR)

- `/home` (overflow already fixed in Phase 1). Drop `HomeHero` and the static metrics, use one tone,
  and flatten the card rows. Show today's tasks first.
- `GoalList`: two-line mobile row, one `⋯` menu, a primary progress bar, and
  no grid toggle.
- `TodaysTasks`: always-visible row actions (or `⋯`), a wrapping colour
  picker behind "More options", no inner title, and an error state.
- `GoalTaskRow` becomes a divider row with at most two metadata items.
  `HealthBadge` becomes a dot plus label.
- Goal detail: drop the second h1, tab style from `WorkspaceTabs`, and fix
  the `AllTasksView` sticky offset.
- Calendar: 13px floor, 44px targets, no hover-only add.
- Create flows: aria-label on the back button, and no nested interactive
  cards.

**Phase 4 — My Apps, Vault, Settings**

- A `SettingsGroup` built on `PageSection` + `RowList`, with `Link` rows.
- Vault hero becomes tabs + one line; flat account rows. No logic changes.
- Settings subpages lose their second h1s.

_Status (2026-11-04, branch `ui/redesign-phase4`):_

- **My Apps** — chips, project links, the favourite star, search and "Clear
  filters" are 44px on touch; stack tags use the 13px floor; card titles are
  16px; the empty state is `EmptyState`.
- **Settings** — every group is one flat surface with a real `h2` and a
  neutral icon (no shadow, no per-group colour). The pages Settings links to
  are one "Preferences & security" `RowList` of real `Link` rows, not a
  card per `<button onClick={router.push}>`. The two rows that opened the
  same page (Learning goal, Romanization) are one row whose description names
  both. Notification rows have neutral icons; "Custom reminders" is a link;
  the reminder-time picker is no longer a tinted box inside the card.
- **Settings subpages** — security, reminders and integrations demote their
  title to `h2` (the shell keeps the only `h1`). Security's card loses its
  shadow; its QR frame, setup key and backup codes are unchanged (MFA flow
  untouched). Reminders are divider rows on one surface per group, with
  sentence-case `h3` group headings.
- **H-Vault (layout only)** — the boxed hero with a second `h1` is one line
  plus the same actions; stat tiles and the compact list lose their shadows;
  account cards drop the muted login box and the dashed password box; 11px
  pills are 13px. The 320px overflow is fixed: Radix `Select.Value` drops
  `className`, so the sort value is truncated from the trigger
  (`[&>[data-slot=select-value]]:truncate`). `lib/vault-*`, `hooks/useVault`,
  `lib/api/vault`, `lib/csp.ts` and every handler are unchanged.

Sweep (worktree dev server, synthetic session, vault in demo mode with
fictional accounts): `/apps`, `/vault`, `/settings` and its three subpages
pass at 320/390/768/1024/1440 (`/vault` also at 375). Remaining sub-13px
text: the `⌘K` hint only.

**Phase 5 — Learning, AI, Notes, Growth**

- Chat composer: 16px input and 44px controls; one header row; violet only.
- `/interview/script` overflow, `/history` labels, `LogFlow` overflow,
  `RecoveryOverview` badge, `CheckinCalendar` targets, roadmap toggle.
- One tab level per page (`/vocab`, `/phrasebook`).
- Remove hero h1s on Korean Coach, recovery, review and practice/today.
- Notes reader: 16px body, single gutter.

_Status — 5a, the P0 fixes (2026-11-04, branch `ui/redesign-phase5a`):_

- **Overflow at 320/390px fixed** (baseline: 5 of 12 routes failed; after:
  12/12 pass at 320/390/768/1024/1440):
  - `/chat` — the mode switcher's wrapper had no `min-w-0`, so five 44px
    modes pushed the history button off the screen (to 399px at 390). The
    switcher now scrolls inside the space between back and history.
  - `/interview/script` — the four-mode bar (≈386px) scrolls inside its own
    box; its 12px uppercase labels are 13px sentence case, primary not blue.
  - `/review/*` — `ReviewTabs` is the underline tab style instead of a boxed
    blue segmented control whose `flex-1` links couldn't shrink.
  - `/notes/new` — the slug input gets `min-w-0` (an input's intrinsic
    width stopped `flex-1` from shrinking it).
  - Recovery `LogFlow` — the five intensity buttons are a 5-column grid of
    squares, not five fixed 56px buttons (328px).
- **Touch and zoom** — chat composer input is 16px (no iOS zoom); send,
  stop and voice are 44px on touch and primary-coloured; message-action icons
  keep their 24px look with a 44px `after:` hit area; the edit composer's
  buttons are 44px on touch. `/history` search is 16px on phones;
  `CheckinCalendar` month buttons are 44px on touch.
- **Names and state** — `/history` month buttons are labelled; the roadmap
  topic toggle is a `role="checkbox"` with `aria-checked` and its topic as
  its name (40px hit area), and its edit/delete buttons are labelled.
- **`RecoveryOverview`** — the "N due" badge sits beside the icon instead of
  overlapping the count; 10–11px text is 13px. Copy unchanged.
- The sweep now also covers `/roadmap`, `/interview/script` and
  `/growth/recovery/log`.

Left for 5b: the remaining hero `h1`s, one tab level on `/vocab` and
`/phrasebook`, the Notes reader gutter, chat's two header rows and the
remaining blue in chat (user bubbles, the start button). At 320px chat's
five modes scroll — "Review" and "My Data" sit off to the right until swiped;
5b's single header row should make them fit.

_Status — 5b, hierarchy (2026-11-04, branch `ui/redesign-phase5b`):_

- **One `h1` per page** — 23 files that rendered their own `h1` under the
  shell's demote it to `h2`: Korean Coach (hub and six subroutes, plus
  `SessionSummary`), Recovery (overview, dashboard, insights, plan, review,
  settings, lock gate and three forms), Review (morning, evening, weekly),
  the Notes reader, practice/today and chat's "Ask Hengo". `UrgeRescueFlow`
  keeps its `h1`s: `/growth/recovery/urge` is chromeless, so there's no shell
  title, and only one step shows at a time. Visual hero boxes are unchanged.
- **Dark-on-dark titles fixed** — the global `h1–h6 { color: foreground }`
  rule beats a dark panel's inherited white. practice/today's hero title and
  five `UrgeRescueFlow` step titles (on `bg-slate-950`) now set `text-white`.
  practice/today also renders `<div>`s instead of a second `<main>`.
- **One tab level** — `/vocab` stacked three (workspace, Words/Phrases,
  Library/Courses inside Words); it now has one row, Words · Courses ·
  Phrases, with the daily review card above it. `?tab=phrases` still works
  and `?tab=courses` is new. `/phrasebook` already had one local row; its
  0.18em uppercase section headings are sentence-case 16px. The tab rule is
  written down in `design-system.md` §7.
- **Notes reader** — one gutter (the shell's; the reader added 16–48px
  more), 16px body at every width (`prose-base`, was `prose-sm` on phones),
  primary links, no blur on the floating pills, a 14px TOC heading.
- **Chat** — on phones the mode switcher is one "current mode ▾" menu
  (`DropdownMenuRadioGroup`), so all five modes are reachable at 320px; the
  segmented control stays from `sm`. User bubbles, the start button and
  selected states use primary, not blue. Every 8–12px label in chat is 13px.
  The two header rows were **not** merged: the second (`ChatWindow`) carries
  voice-call state, and merging is a larger change than this pass.

Sweep: `/chat`, `/vocab`, `/phrasebook`, `/notes`, `/korean-coach`,
`/growth/recovery`, `/growth/recovery/log`, `/review/*`, `/learn/today` and
`/history` pass at 320/390/768/1024/1440. Not seen rendered: practice/today's
hero (synthetic data leaves it loading), the Notes reader with a real note,
and the urge flow's steps.

**Phase 6 — consistency pass**

- Re-run the sweep at all widths, light and dark.
- Fix remaining sub-12px text.
- Keyboard pass through dialogs and sheets.
- Delete confirmed-dead components (`WorkspacePosterCard`, `StreakCard`,
  `BestQuizStreakCard`, `FirstRunBanner`, `GoalMilestones`,
  `ExamCountdownBanner`, `SpeakingScoreCard`, `practice/LearningSnapshot`),
  only after re-confirming zero imports.
- Consider `@axe-core/playwright` in the sweep. It's a dev dependency, added
  only with the owner's OK.

_Status — app icon set (2026-11-08, branch `ui/app-icon-set`):_

- **Before:** the favicon, Apple touch icon, every manifest entry and the
  push-notification icon _and_ badge all pointed at `H Space Icon.png`
  (1254px, 1.6 MB, the artwork drawn inside a black margin), so a 32px tab
  icon downloaded 1.6 MB and iOS/Android added a second rounded corner around
  the artwork's own. The correctly sized `public/icon-192.png`,
  `icon-512.png`, `apple-icon.png` and `favicon-32.png` were the old Hengo
  mark and unreferenced; they're deleted.
- **Now:** `scripts/generate-app-icons.mjs` draws the mark once as SVG and
  renders every size with Playwright's Chromium into `public/icons/` plus
  `public/favicon.ico`. Variants: _full_ (bars, ribbon, orbit, sparkle) for
  ≥180px and the in-app logo; _simple_ (H only) for 16–48px favicons; a white
  _mono_ badge for Android notifications. Shapes: rounded with transparent
  corners (tab, PWA `any`, in-app), full bleed for the iOS touch icon and the
  `maskable` icon (mark inside the 80% safe circle). The crossbar is a
  shallow wave on purpose — a steep diagonal read as "N" at 16–32px.
- **Wired in:** `app/layout.tsx` icons, `site.webmanifest` (real sizes, a
  maskable entry, `background_color` matches the icon), `sw.js` (192px icon,
  mono badge), and the ten in-app logo spots (shell sidebar and rail, auth,
  onboarding, error/404, privacy/terms, landing) now use
  `icons/h-space-mark.svg`, with the wrapper radius set to the mark's own
  22.5% corner instead of clipping it to a near-circle.
- `H Space Icon.png` stays as the source artwork and is no longer served by
  the app; `hengo-icon.png` stays the Hengo Learning / AI Coach avatar.
- Not done here: the Open Graph image (`app/opengraph-image.tsx`) still draws
  a plain blue square for the logo, and the landing page's blue gradients —
  both belong with the landing/brand pass.

## Sweep log

**After Phase 1 + 2** (2026-11-03, this branch, same synthetic data):

| Run                                                        | Result                                                                                                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light, 48 routes × 7 widths (336 screenshots, `after/`)    | 40 pass, 8 overflow. **`/home` and `/goals/overview` now pass at every width.** The 8 are the known baseline offenders (`/chat`, `/goals`, `/vault`, `/notes/new`, `/review/*` ×3) plus `/ask-hengo` |
| Dark, 48 routes × 390/1440 (96 screenshots, `after-dark/`) | 46 pass. `/chat` and `/ask-hengo` overflow at 390px, same as light                                                                                                                                   |
| `/goals/calendar`                                          | ~~Passes at all 7 widths~~ — **not a real pass**: the check skipped every element under the calendar shell's `overflow-hidden`. See the correction below                                             |
| `tests/e2e/shell-sticky.e2e.ts`                            | 11 / 11 pass: sticky header and bottom-nav offsets still match the changed chrome                                                                                                                    |

`/ask-hengo` is a redirect to `/chat?mode=memory`. Its baseline screenshot was
taken mid-redirect ("Rendering…"), so it never measured the chat page. The
overflow is `/chat`'s mode switcher, unchanged by this branch. The sweep now
waits for `networkidle` so redirects settle first.

Remaining overflows are all in page-level components scheduled for Phases
3–5. The shell's 11px labels are gone. Remaining sub-12px text is page-level
(`text-[10px]`/`[11px]` in feature components), tracked per route above.

**Correction — sweep check tightened** (2026-11-03, after the runs above):

- The old overflow check excused any element with an `overflow: hidden`
  ancestor other than `<main>`. On `/goals/calendar` the whole shell is
  `h-[100dvh] overflow-hidden` (`AppShell`), so nothing there was measured.
  A clipping box now excuses an element only when the box ends inside the
  screen (intentional truncation). The sweep also fails when the page itself
  scrolls sideways.
- Re-run at 320/1440px: **`/goals/calendar` overflows at 320px**. The
  all-day task chips run to 374px and are cut off at the screen edge, with no
  ellipsis or right border (P0, Phase 3). It passes at 1440px.
- The small-text report now flags anything under the 13px floor, not 12px.
- The runs above weren't repeated with the new check. The Phase 6 full re-run
  replaces them.

**Correction — the Phase 1 + 2 after-sweep ran on stale CSS.** The local dev
server had missed the `globals.css` change, so those runs rendered `text-xs`
at 12px and had no `.app-surface-muted`. The code was right (the production
build emits `--text-xs: .8125rem`); the 13px floor just wasn't what got
measured. The Phase 3 run below used a restarted server and replaces them.

**After Phase 3** (2026-11-03, branch `ui/redesign-phase3-planner`, fresh dev
server, tightened check):

| Run                                       | Result                                                                                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light, 48 routes × 7 widths (`after-p3/`) | 41 pass. Overflow on `/vault`, `/chat`, `/ask-hengo`, `/notes/new`, `/review/*` ×3 — the baseline offenders, unchanged, scheduled for Phases 4–5. **No new overflow from the 13px floor anywhere.** |
| `/goals`, `/goals/tasks`, `/home`         | Pass at all 7 widths. `/goals` no longer overflows at 320px                                                                                                                                         |
| `/goals/calendar`, `/goals/[id]/schedule` | Pass at all 7 widths after the all-day column fix (re-run after the full sweep, which had measured the calendar before the fix landed)                                                              |
| `/learn/today`                            | Passes. It redirects to `/practice/today`, which renders a second `<main>` (P1, Phase 5); the sweep now waits on the shell's `main#main-content` instead of failing on the duplicate                |
| Dark, 48 routes × 390/1440                | 45 pass + `/learn/today` (re-run). `/chat` and `/ask-hengo` overflow at 390px, same as light                                                                                                        |
| `tests/e2e/shell-sticky.e2e.ts`           | 11 / 11 pass                                                                                                                                                                                        |

### Phase 3 status

Done on `ui/redesign-phase3-planner`:

- **Home** — the day's work leads (Today: tasks + Upcoming; Progress: goals,
  habits, continue/learning), then My Apps, the snapshot as a quiet strip and
  the "Your daily space" strip — both kept, moved below the work at the
  owner's choice. Every card uses one `DashboardCard` frame (one border, a
  neutral icon, divided rows, sentence-style empty/error states). Fixed: a
  `role="button"` row nesting a toggle button (now a button beside a link),
  per-card rainbow icons, the 11px eyebrows, the "Could't" typo.
- **`HealthBadge`** — a dot plus a 13px label, no 10px pill (5 screens).
- **Goals list** — the filter fits 320px; the list/grid toggle shares the sort
  row (owner's choice); rows are a real stretched link with a two-line title,
  status · deadline · tasks on one wrapping line (deadline now visible on
  phones), a single-colour progress bar and one `⋯` menu on phones (the star
  joins the menu below `sm`). No more buttons nested in a `role="link"` div.
- **Tasks tab (`TodaysTasks`)** — Edit/Delete were hover-only 28px buttons
  (invisible on touch): now one always-visible `⋯` menu. Rows are links;
  16px inputs (no iOS zoom); details and colour behind "More options"; the
  colour swatches wrap (they clipped at 320px); an error state; no second
  title block or collapse toggle; no nested scroll area.
- **Goal detail** — the title is an `h2` (the shell owns the `h1`) and wraps;
  the mobile sticky "Add task" bar sits above the bottom nav instead of under
  it.
- **Calendar** — all-day columns no longer widen past the screen
  (`min-w-0`); 9–11px labels are 13px (month-cell chips stay 11px on phones
  only — the documented dense exception); `ModernTaskItem` Edit/Delete are
  44px on touch; day numbers and checkboxes get larger tap areas.
- **Template create page** — the back button has an accessible name; the
  template name is an `h2`.

### Phase 3b status

Done on `ui/redesign-phase3b` (2026-11-04):

- **`/goals/overview`** — every card is a `DashboardCard` with divided rows
  and an inline error state. The goal-task toggle is a sibling of its link
  (no button inside a `role="button"` row), and progress bars use one colour.
  The amber deadline banner is gone: the Overdue stat and the deadlines list
  already say it. The dev-roadmap card moved to the Learning hub's Library
  (`RoadmapLibraryItem`); `RoadmapTeaser` is deleted.
- **Goal detail** — the section nav uses the `WorkspaceTabs` underline
  style. The task table has 6 columns from 1024px (title, status, schedule,
  effort), and phase, key result and impact join from 1280px; one shared
  `taskTableColumns` keeps the header and rows aligned. `GoalTaskRow` on
  phones and in Plan is a divider row with one metadata line (status ·
  schedule · evidence); phase, key result, impact and effort are in the
  details sheet. Bordered rows inside cards in Plan, Progress and Schedule
  are divider rows, and their 10–11px text is 13px. `KeyResultsCard` is one
  surface with divided rows.
- **Calendar month view** — the per-day "add" button is visible (and 36px)
  on touch, where hover never revealed it.
- **`/goals/create`** — template cards and "Custom goal" are real links with
  no button inside; the arrow is decoration and always visible.
- **Inbox** — divider rows on one surface, one metadata line instead of
  three badges, and Convert + reminder + one `⋯` menu (pin, archive, delete
  with confirm). Errors offer "Try again".
- **Tokens** — `--destructive-foreground` is defined, so delete-confirm
  buttons have readable text in both themes.

Sweep (worktree dev server, synthetic data): `/goals/overview`, `/inbox`,
`/goals/create`, `/goals/calendar` and the five goal-detail routes pass at
320/390/768/1024/1440. Remaining sub-13px text there: the `⌘K` hint, the
"Anytime" badge and phone calendar weekday labels.
