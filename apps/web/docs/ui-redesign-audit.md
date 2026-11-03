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

**Phase 5 — Learning, AI, Notes, Growth**

- Chat composer: 16px input and 44px controls; one header row; violet only.
- `/interview/script` overflow, `/history` labels, `LogFlow` overflow,
  `RecoveryOverview` badge, `CheckinCalendar` targets, roadmap toggle.
- One tab level per page (`/vocab`, `/phrasebook`).
- Remove hero h1s on Korean Coach, recovery, review and practice/today.
- Notes reader: 16px body, single gutter.

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
