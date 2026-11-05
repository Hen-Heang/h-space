# Planner UX audit and redesign plan

Status: **audit done, slice 1 shipped on `feat/planner-ux`** (2026-11-05).
Scope: every Planner route (`/goals`, `/goals/tasks`, `/goals/overview`,
`/goals/calendar`, `/goals/create*`, `/goals/[id]/*`, `/inbox`) and their
dialogs, sheets, menus and states. Frontend only. No API, schema, RLS, route,
calculation or reminder change is proposed.

Method: full code read of the scoped files, plus Playwright screenshots of the
synthetic-data sweep (`tests/e2e/ui-route-sweep.e2e.ts`) at 320, 375 and 1440
(`test-results/ui-sweep/planner-before|after/`, gitignored). Items marked
_(code)_ were found by reading code and not yet seen in a browser.

Design rules applied: [`design-system.md`](design-system.md) — sections not
boxes, lists are rows, one primary action per view, readable first.

## 1. Real bugs found during the audit

These are behaviour bugs, not styling. Each needs its own small fix and test.

| #   | Bug                                                                                                                                                                                                      | Where                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| B1  | **Travel goals can't be submitted.** The travel step's `onNextStep` sets `"advanced"`, which renders the travel step again, so `AdvancedStep` (and submit) is never reached.                             | `components/goals/form/GoalFormContainer.tsx:213-219`                                |
| B2  | **Inbox Tag filter does nothing.** The page passes only `{ query }` to `filterInboxItems`; `useInbox` takes only status/type. `lib/inbox.test.ts` covers tag filtering, but the page never passes a tag. | `app/(main)/inbox/page.tsx:38-41`                                                    |
| B3  | **Dialogs capped at 384px from 640px up** _(code)_. `DialogContent` has `sm:max-w-sm`, which survives callers' unprefixed `max-w-[500px]` / `max-w-lg`.                                                  | `components/ui/dialog.tsx:56`; `AddTaskDialog.tsx:253`; `QuickCaptureDialog.tsx:171` |
| B4  | **Calendar task sheet: two close buttons**, the Sheet's own X over the panel's Edit/Delete _(code)_.                                                                                                     | `components/calendar/TaskDetailsSheet.tsx:29`, `TaskDetailsPanel.tsx:62-100`         |
| B5  | **Calendar edit → delete confirms twice** (AlertDialog, then `DeleteConfirmDialog`, then an Undo toast).                                                                                                 | `EditTaskDialog.tsx:270-289`, `Calendar.tsx:326-332`                                 |
| B6  | **Schedule tab mobile order has no effect.** `order-1/2` inside a `space-y` block, so the 420–720px calendar sits above capacity/backlog on phones.                                                      | `components/goals/detail/ScheduleTab.tsx:352-362`                                    |
| B7  | **Calendar task titles cut to 23 characters in JS**, on top of CSS truncate.                                                                                                                             | `components/calendar/ModernTaskItem.tsx:32`                                          |

Also seen: `/goals/[id]` failed to render in both sweeps because the local
`next dev` crashed ("Jest worker encountered 2 child process exceptions")
under low memory. That's the dev server, not the page. Re-check once memory
allows.

## 2. Findings by screen (prioritised)

P1 = hurts daily use on a phone · P2 = clutter / hierarchy · P3 = polish.

### Navigation (`WorkspaceTabs`, `lib/navigation.ts`)

- P2: At 320px the five Planner tabs wrap, with **Inbox alone on line 2**.
  They fit on one line from 375px (screenshots).
- P2: Each Planner tab picks its own primary action. Tasks showed **New goal**,
  Calendar has none (Create task sits in the sidebar or a FAB), and Inbox shows
  Quick capture. `GoalsHubHeader.tsx`, `calendar/page.tsx:20-22`,
  `Calendar.tsx:398,544`.
- P2: "View all" links repeat tabs that sit just above them
  (`GoalTasksSnapshot.tsx:38`, `GoalsOverview.tsx:41`).
- P2: `/goals/create` renders a `PageHero` ("Planner / New goal"), which
  repeats the shell header (`create/page.tsx:146-151`). `GoalFormContainer`
  adds a second `h1` (`:165`), and so does `TaskDetailsPanel` (`:134`).

### Tasks (`/goals/tasks`, `TodaysTasks.tsx`)

- P1: Four stacked blocks before the first task: the date, the progress bar,
  the composer, then Mark all + Filter (`:626-633`).
- P1: The composer moves its controls on focus. Inline **Add** disappears and
  **Add task** shows up at the bottom (`:221`). The goal chip is capped at
  `max-w-[160px]` (`:250`).
- P2: ~~Rows repeat "Anytime" under the Anytime header and "Overdue ·" under
  the Overdue header (`:551-552`).~~ **Fixed in slice 1.**
- P2: Borders are stacked three deep: the `.app-surface` card, the bordered
  composer, then bordered inputs (`:199, 314, 325, 344, 624`).
- P3: Icon sizes are mixed (h-4 / h-3.5 / h-3) inside the composer.

### Goals list (`/goals`, `GoalList.tsx`)

- P2: The progress `%` is `font-semibold` while the title is `font-medium`,
  so the number outweighs the title. Progress also shows three ways: the %,
  the bar and `x/y tasks` (`:559-576`).
- P2: Two control rows sit above the list: the All/Active/Completed filter
  (`goals/page.tsx:97`) and Sort + view (`GoalList.tsx:369`).
- P2: The avatar is an emoji-picker button right next to the title link on
  phones (`:241-257`).
- P2: "Next:" in list view vs "Next action" in grid view (`:579` vs `:290`).
  The grid's chevron looks like a button but isn't one (`:296`).
- P3: The health dot is two sizes (`GoalList.tsx:269` vs `HealthBadge.tsx:26`).
  `DeadlineStatusBadge` is a blurred pill while health is plain text.
- OK: no hover-only controls. The row ⋯ menu is always visible.

### Goal detail (`/goals/[id]/*`)

- P1: Two back controls and two titles on phones. `MobileHeader` has back +
  title, and `GoalDetailHeader` adds both again (`GoalDetailHeader.tsx:83`).
- P1: Header row 1 holds four 44px boxes (back, tile, star, ⋯) around the
  title (`:83-178`).
- P1: Header and next-best-action buttons are `text-xs`
  (`GoalDetailHeader.tsx:211-225`, `OverviewTab.tsx:130-137`).
- P1: Several selects and inputs are `text-sm`, so iOS zooms on focus
  (`GoalTaskDetailsSheet.tsx:229,245,271`, `PhaseDialog.tsx:166`,
  `ScheduleRuleDialog.tsx:158,287,303`). The global touch rule in
  `globals.css` lifts most of these. Verify on device.
- P1: Small targets: AI draft checkbox `h-4` (`AiTaskPlanDialog.tsx:184`),
  clear-search `h-8` (`AllTasksView.tsx:142`), coach chips `py-1.5`.
- P1: Nested scrolling. The coach chat has a fixed height inside a scrolling
  sheet (`GoalCoachChat.tsx:76`, `CoachPanel.tsx:50`).
- P2: Two filled primaries compete: header **Plan week**, which only navigates
  to the Schedule tab, and the next-best action's **Mark done**.
- P2: Add task shows up twice on the Tasks route (header and sticky bar,
  `AllTasksView.tsx:371`).
- P2: Repeated metadata. The target date appears 3× (deadline badge, "Target …"
  and Overview details), the health reason 2× (tooltip and text), and KR bars
  3× (Overview, KeyResultsCard, Progress).
- P2: Outcome vs activity progress: the header shows one bar whose label
  switches (`layout.tsx:166`). Only the Progress tab shows both.
- P2: Edit and Delete are in both the ⋯ menu and ManagementPanel.
- P2: Nested cards: Progress → LearningMetricCard → its edit box (3 levels),
  six SmartAnalytics cards, and five ManagementPanel cards.
- P2: Overview "This week" shows six numbers (`OverviewTab.tsx:182-198`).
- P3: `Card`'s built-in `gap-4` stacks with child `mt-3`, giving ~28px under
  headings.
- Dead code: `GoalMilestones.tsx` (which has a hover-only delete) and
  `LearningPracticeCard.tsx` are not rendered anywhere.

### Goal creation (`/goals/create*`)

- P1: On phones, templates come after the whole left column (quick launch,
  categories, Custom card) (`create/page.tsx:155-274`).
- P1: The template wizard's section pills scroll sideways (`min-w-max`), and
  its labels, help text and errors are `text-xs` (`template/[templateId]/page.tsx:181-217,408`).
- P2: The custom form asks for the goal type before the title. Description
  and both dates are always shown, and there's no "no deadline" option,
  unlike Quick launch (`BasicInfoStep.tsx:35,71`).
- P2: Nested borders: the switch box inside the Quick-launch card, and cards
  inside the wizard card (`create/page.tsx:203`, template page `:309` in `:440`).
- P2: The template Tip says "AI task generation arrives soon", but submit
  already sends `generateTasksWithAI` (template page `:532` vs `:155`).
- P3: Edit panel: Save appears in both header and footer, every label has an
  icon, the close button has no `aria-label`, and the panel has no
  `role="dialog"` (`EditGoalSlidePanel.tsx:137,142,273`).

### Calendar (`/goals/calendar`)

- P1: The date label is the jump-to-date trigger, but its tap area is only
  ~28px (`CalendarViewSwitcher.tsx:108`).
- P1: Each row keeps 44px Edit and Delete buttons visible, at 13px title text
  (`ModernTaskItem.tsx:88,113-146`).
- P1: The keyboard can cover the Add task / Quick capture footers. They're
  centred `dvh` dialogs with autofocus _(code)_.
- P2: Day view shows the date up to four times (switcher, day header, focus
  strip, TaskList heading).
- P2: TaskDetailsPanel has three "complete" controls, Edit twice, and a
  Color hex row.
- P2: On desktop, opening a task replaces the whole grid (`Calendar.tsx:564-581`).
- P2: The Edit form uses two-column grids on phones (`TaskFormFields.tsx:378,409,438`).
- P3: The ←/→ shortcut fires while a button or select has focus
  (`Calendar.tsx:174-183`). Today and selected look almost the same in the
  month view.

### Overview (`/goals/overview`)

- P2: The same deadline badge appears in Upcoming deadlines and in Your
  goals, next to the Overdue stat.
- P2: "View all" links duplicate the tabs.

### Inbox (`/inbox`)

- P2: "N unprocessed" counts only within the current filter, so it reads
  "0 unprocessed" on the Processed view. Rows there repeat "Processed".
- P2: On phones the filters take up to three 44px rows. The Tag select wraps
  alone (and is broken, B2).
- P3: The empty state mentions ⌘K on phones (`inbox/page.tsx:103`).
- OK: it's already one divided list, not separate cards, and search comes first.

## 3. Navigation proposal

**Recommendation: keep all five Planner tabs visible on every width. Don't
add a "More" overflow.**

- Tasks · Goals · Calendar · Overview · Inbox fit on one line from 375px
  (most phones, including 390/430). Only 320px wraps, and wrapping is the
  design-system rule ("tab rows wrap, never scroll").
- A "Tasks | Goals | Calendar | More" row would hide two destinations behind
  a tap on every phone to fix a 320px-only cosmetic issue. It would also add
  a menu that duplicates the global More sheet, which already lists every
  Planner route.
- Cheaper fix for 320px: tighten tab padding below 360px only
  (`px-2` → `px-1.5`). That keeps one line without shrinking text. Measure
  before committing.
- The default landing route (`/goals` = Goals) is unchanged. Making Tasks the
  default would better fit "what do I do next", but it changes bookmarks and
  the bottom-tab destination. **It needs the owner's decision.**
- Each tab gets **one** primary action in the `WorkspaceTabs` actions slot:
  Tasks → none (the composer is primary; New goal is outline), Goals → New
  goal, Calendar → New task (moved from the sidebar/FAB on desktop; the FAB
  stays on phones), Overview → New goal, Inbox → Quick capture.

## 4. Shared component recommendations

- **`ItemRow`** (extend `components/ui/row-list.tsx`'s `InteractiveRow`, not
  a new system): leading control (checkbox / avatar) · title (`text-base`,
  wraps, `line-clamp-2`) · one quiet meta line (`text-sm text-muted-foreground`,
  `gap-x-3`, 16px icons) · trailing ⋯. Use it for task rows (TodaysTasks,
  GoalTaskRow, ModernTaskItem) and goal rows.
- **`MetaItem`**: icon + text with one icon size (`size-4`) and gap
  (`gap-1.5`), replacing the mix of h-3 / h-3.5 / h-4.
- **One status vocabulary**: health = dot + text, deadline = text (no pill),
  in `HealthBadge`, `DeadlineStatusBadge` and GoalList's local dot.
- **Section heading**: `PageSection` everywhere in goal detail, replacing the
  four heading styles (xs-uppercase, base+icon, sm+pill, bold).
- **Fix `DialogContent` width** (B3) once in the primitive by moving
  `sm:max-w-sm` behind a default that callers can override.
- No new dependencies.

## 5. Implementation plan (small, reviewable slices)

| Slice | Phase | Change                                                                                                                                                   | Risk |
| ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1 ✅  | 2/3   | Tasks: no repeated group labels in rows (sr-only kept), New goal secondary on Tasks                                                                      | Low  |
| 2 ✅  | —     | Bug fixes B1 (travel step), B2 (inbox tag), B4 (double close), B5 (double confirm), B7 (JS truncation), each with a test                                 | Low  |
| 3     | 2     | Primary action per tab (Calendar → New task in the slot), drop "View all" duplicates, remove create-page `PageHero` and the extra `h1`s                  | Low  |
| 4     | 3     | Tasks composer: stable submit button, Mark all + Filter in one toolbar row, flatter borders                                                              | Med  |
| 5     | 3     | Goals list: title-first hierarchy, one progress expression + task count, filter merged into the toolbar, avatar not a picker on phones                   | Med  |
| 6     | 4     | Goal detail header: one back and one title on phones, buttons `text-sm`, Plan week → outline or menu, Add task header only on Overview                   | Med  |
| 7     | 4     | Goal detail body: dedupe date/health/KR repeats, Overview "This week" to one line, flatten nested cards, fix Schedule mobile order (B6)                  | Med  |
| 8     | 4     | Create: blank goal first on phones, templates below as shortcuts; title-first custom form with optional details; wizard labels `text-sm`                 | Med  |
| 9     | 5     | Calendar: 44px date trigger, single date per view, one complete/Edit in the task panel, rows without visible Edit/Delete; Inbox counts + compact filters | Med  |
| 10    | 6     | `DialogContent` width fix (B3) + bottom-sheet dialogs on phones; full sweep at 320–1440 in light and dark; keyboard/focus pass                           | Med  |

Each slice runs `pnpm test:web`, lint, the narrowed UI sweep for the touched
routes, and a before/after screenshot pair.

## 6. Slice 1 — shipped

- `components/goals/TodaysTasks.tsx`: a row in the Overdue or Anytime group no
  longer repeats the header's word. The word stays as `sr-only` because the
  group headers are `aria-hidden`. A scheduled task that ran late today still
  shows the red "Overdue · 08:00". A carried-over anytime task still shows
  "Anytime". A row with no time to show and no goal is one line.
- `components/goals/hub/GoalsHubHeader.tsx` + `app/(main)/goals/tasks/page.tsx`:
  `newGoalEmphasis="secondary"` makes New goal an outline button on Tasks, so
  the composer is the one primary action. Goals and Overview are unchanged.
- `components/goals/TodaysTasks.test.tsx` (new, 4 cases, synthetic data).

## 7. Slice 2 — bug fixes

- **B1** `lib/goal-form.ts`:
  - Adds a `travel` step plus `nextGoalFormStep` / `prevGoalFormStep`.
  - `GoalFormContainer` now goes basics → travel → advanced, so travel goals
    reach submit.
  - The step indicator counts the travel step as step 1.
  - Tests: `lib/goal-form.test.ts`.
- **B2** `lib/inbox.ts`:
  - Adds `visibleInboxItems` (search + tag, pinned first) and
    `resolveInboxTag`. A tag that no loaded item carries falls back to
    "All tags".
  - `inbox/page.tsx` now applies the Tag select.
  - Tests: `lib/inbox.test.ts`.
- **B4** Calendar task sheet:
  - `TaskDetailsSheet.tsx`: `showCloseButton={false}`, so only the panel's
    close button remains.
  - `TaskDetailsPanel.tsx`: the task title is an `h2`, and the complete toggle
    has `aria-label` + `aria-pressed`.
  - The panel footer still has a second "Mark complete" button (slice 9).
  - Tests: `TaskDetailsSheet.test.tsx`.
- **B5** `EditTaskDialog.tsx`:
  - Delete now hands off to the calendar's single `DeleteConfirmDialog`. The
    Undo toast is unchanged.
  - The removed AlertDialog also wrongly said "cannot be undone".
  - Tests: `EditTaskDialog.test.tsx`.
- **B7** `ModernTaskItem.tsx`:
  - No more JS cut at 23 characters. The full title wraps to two lines at
    `text-sm` (it was one line at `text-xs`).
  - Tests: `ModernTaskItem.test.tsx`.
- Still open: **B3** (dialog width, slice 10) and **B6** (Schedule mobile
  order, slice 7).
