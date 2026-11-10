# Finance redesign

Status: **Phases A–C done** on `feat/finance-redesign` (2026-11-05); **Phases
D and E built** on `feat/finance-redesign-de` (2026-11-10). Phase F (visual and
e2e validation) is still open.

Goal: make `/finance` feel like an effortless daily money tracker inside
H-Space rather than a separate, dense dashboard. UI only: no change to the
finance database, `app/api/finance/*`, types, validation, calculations,
currency/exchange-rate logic, auth, jobs or deployment.

Line references in the audit are to `main` at `cd6fd41`, before this branch.

## 1. Audit

### Shared foundation

| Problem                                                                                                                                | Where                                                |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Finance overrode H-Space's whole palette (zinc neutrals, near-black `--primary`) and set a **14px base font** for everything inside it | `app/(main)/finance/luyra-theme.css:10-45`           |
| Eight nav tabs as a 2→3→4-column grid of pills: four rows at 375px, a second accent style                                              | `components/finance/finance-nav.tsx:37-55`           |
| Section headings 16px, descriptions 13px (H-Space: 18 / 14)                                                                            | `components/finance/ui/finance-primitives.tsx:71-75` |
| Every metric is a bordered tile with a tone-coloured border and a tinted icon chip; summaries are grids of four                        | `finance-primitives.tsx:108-139`, `:352-372`         |
| Base buttons shrink by viewport width (`sm:h-8`/`sm:size-9`), so tablets get 32–36px targets; `sm` label 13px                          | `components/finance/base/button.tsx:19-22`           |
| Amounts in the system monospace font (needed the `AmountText` ₩ workaround)                                                            | throughout                                           |
| The floating + sat over content on phones and offered no label on desktop                                                              | `transactions/quick-add-transaction.tsx:51`          |

### Overview (`components/finance/finance-overview.tsx`, 1,047 lines)

- 10 stacked sections, 13 bordered containers, 32 `text-xs` uses. At 375px the
  page was **4,871px** tall.
- Five KPI cards for single numbers (net, income, expenses, savings rate,
  budget) competing for attention (`:507-535`), then Financial health as three
  more cards (`:257-295`), then a tinted Daily-budget card (`:537-595`).
- "No budget alerts" filler card when nothing needs attention (`:597-613`).
- Category spending, recent activity and the review link each in their own
  card (`:678`, `:816`, `:1020`); a card-per-alert list (`:615-655`).
- Decorative tinted icon chips on nearly every block (`:179`, `:359`, `:549`,
  `:602`, `:1024`).

### Transactions (`components/finance/transactions/*`) — Phase D

- Three primary-looking adds on phones: the toolbar's Add, the floating +,
  and the AI launcher next to them (`transaction-list.tsx:316-324`).
- Each day group is its own bordered card (`transaction-list.tsx:510`).
- Rows: 13px metadata packing category · payment method · note · USD rate ·
  time, with the title `truncate`d beside a `max-w-[58%]` amount
  (`transaction-row.tsx:62-96`).
- Search, category select, filters and the type segmented control are three
  rows of bordered controls before the first record (`transaction-list.tsx:328-430`).
- `transaction-sheet.tsx` (758 lines): advanced fields always visible.

### Budgets — Phase E

- Four KPI tiles (`budget-summary.tsx:15-43`); one bordered card per budget
  (`budget-card.tsx:28`); spent/limit and remaining in 13px mono (`:57`, `:75-80`).
- Direction: one summary line, then rows (name / "spent of limit", remaining
  and status trailing, thin bar); the row opens the editor, Remove moves into it.

### Savings — Phase E

- Four tiles, two of them filler (`savings-summary.tsx:17-45`); each goal card
  carries a purpose pill, deadline, %, per-goal colour, note, an outline
  "Add contribution" and a kebab (`savings-goal-card.tsx:47-131`).
- Direction: summary line, goal rows with a neutral bar; Contribute / Edit /
  Delete inside the goal sheet.

### Subscriptions — Phase E

- Four tiles (`subscriptions-summary.tsx:15-41`); bordered card per
  subscription (`subscription-card.tsx:46`) with the amount squeezed to
  `max-w-[45%]` 13px mono (`:59-60`); a coloured pill even for "Keep".
- Merchant-name suggestions as bordered cards with two equal buttons each
  (`merchant-names-section.tsx:224`).
- Direction: rows; merchant names behind a "Review N similar names" row.

### Review — Phase E

- KPI set duplicates Analytics (`review-summary.tsx:9-41`); a whole section
  for one tile (`review-view.tsx:181-186`); every list wrapped in a card.
- Direction: a short narrative lede, flat rows, the plan as the one action.

### Analytics — Phase E

- Income/expenses/net shown three times (tiles, chart caption, month
  comparison); categories and payment methods each shown as donut + legend +
  list; the trend tooltip is pointer-only (`cash-flow-trend-chart.tsx:75-76`).
- Direction: one summary row group with "vs last month" deltas, one trend
  chart with keyboard/tap access, ranked rows instead of donuts.

### Settings — Phase E

- Nine bordered sections; one Save for five of them (`finance-settings-form.tsx:427`);
  Reports is a card holding tiles, a bordered list and review cards —
  card-in-card-in-card (`finance-reports-section.tsx:164`).
- Direction: grouped rows, switches, save per group; move the report viewer
  next to Review.

## 2. Layout (Overview, as built)

```
Phone (375)                               Desktop (≥1280, beside the sidebar)
┌──────────────────────────────┐          ┌─────────────────────────────────────────────┐
│ Overview Transactions Budgets│          │ Overview Transactions Budgets Savings Subs… │
│ More ▾                       │          │ ‹ November 2026 ›                           │
│ ‹ November 2026 ›            │          │ ┌─ Net cash flow ──────────────────────────┐│
│ ┌ Net cash flow ───────────┐ │          │ │ +₩1,842,500                              ││
│ │ +₩1,842,500              │ │          │ ├─ Income ₩3.6M ────┬─ Expenses ₩1.76M ───┤│
│ ├ Income ──┬ Expenses ─────┤ │          │ ├─ Savings rate 51.2%      ✓ above goal ──┘│
│ ├ Savings rate · verdict ──┘ │          │ Budget and spending                Budgets →│
│ Budget and spending          │          │ ┌ ₩166,500 left · 2 need attention ───────┐│
│ ┌ left · bar · daily guide ┐ │          │ │ Daily guide · per day · today · left    ││
│ │ spending by category rows│ │          │ │ category rows with bars                 ││
│ Recent activity            → │          │ Recent activity · Needs attention ·          │
│ Needs attention (if any)     │          │ Financial health (3 columns) · Daily spending│
│ Financial health (stacked)   │          │ · Review November →        [+ Add transaction]│
│ Daily spending · Review →  ⊕ │          └─────────────────────────────────────────────┘
└──────────────────────────────┘
```

Order: month → net cash flow → income/expenses → budget and spending → recent
activity → needs attention → financial health → daily trend → review. Every
metric the old Overview showed is still on it: the five KPI values live in
the cash-flow surface and the budget headline; the daily guide's three
figures, category share/budget usage, budget alerts, unclassified spending,
the no-income prompt, the three money-rule buckets with recommendations, the
daily trend and the review link all remain. Only the "No budget alerts"
filler and the per-transaction time (still on Transactions) were dropped.

At 375px the page went from 4,871px to about 3,450px tall; light and dark.

## 3. Design-system changes (Finance-scoped)

- `luyra-theme.css` now keeps **only** Finance's semantic money colours
  (`--success` emerald-700, `--warning` amber-700, `--finance-chart`,
  `--chart-series-*`). Surfaces, text, violet accent, radius and the 16px body
  come from H-Space. Nothing outside `.luyra` changed.
- `FinanceSection`: 18px heading, 14px description (matches `PageSection`).
- `FinanceMetricCard`: one neutral border, plain 16px icon, sans tabular
  numerals, 14px label/detail. `surfaceTone` is accepted and ignored.
- `AmountText`: a `<wbr>` after each thousands separator, so huge amounts wrap
  between digit groups instead of mid-group.
- `MonthSelector`, `FinanceEmptyState`, `FinanceErrorState`: flatter, 14–16px text.
- Base `Button`: sizes follow `pointer: coarse` (44px on touch at any width),
  like `components/ui/button`.
- `FinanceNav`: underline route tabs like `WorkspaceTabs`. Overview ·
  Transactions · Budgets · More on phones/tablets; all eight at ≥1280px. More
  carries the open page's name; Budgets steps into More under 375px, and
  under 640px while More names a page; the row wraps as a last resort. All
  routes stay real links.
- Floating Add: round + above the AI launcher on phones; a labelled
  "Add transaction" pill in the corner from 768px (no floating AI there).
  The layout adds `pb-16` so the last row scrolls clear.

## 4. Phases

- [x] **A — Audit** (this document).
- [x] **B — Foundation**: theme scope, type scale, primitives, base button,
      navigation, floating Add.
- [x] **C — Overview**: `components/finance/overview/*` (cash flow, budget and
      spending, recent activity, needs attention, insights) + display helpers
      in `lib/finance/overview-display.ts`.
- [x] **D — Transactions** (2026-11-10; see section 7): one Add (drop the toolbar duplicate on phones or
      the FAB on that page), flat day groups with sticky day headers, rows
      with title/amount on line one and category · date on line two (payment
      method, note, USD rate in the editor or an expanded row), a single
      search + "Filters" control, transaction sheet with type → amount →
      currency → category → payment method and "More details" for the rest.
      Keep bulk selection, recurring, templates, filters and search.
- [x] **E — Remaining screens** (2026-11-10; see section 7): Budgets, Savings, Subscriptions as rows;
      Review as a narrative; Analytics de-duplicated; Settings grouped.
- [ ] **F — Validation** for D/E, as below.

## 5. Testing

- `lib/finance/overview-display.test.ts` — labels, tones, bar widths, sorting,
  zero/NaN/huge inputs.
- `components/finance/finance-nav.test.tsx` — every route reachable, one
  `aria-current`, More's label and `aria-haspopup`.
- `tests/e2e/finance-overview.e2e.ts` (synthetic data only) — no horizontal
  overflow at 320/375/390/430/768/1024/1440 with typical **and** extreme data
  (₩987,654,321,000, negative net, missing category, USD entry, very long
  description); dark mode; nav per width incl. keyboard open/Escape/focus
  return; long page names in More; the + sits above the AI launcher; the
  labelled pill from tablet width.
- `UI_SWEEP=1 … ui-route-sweep` over all eight Finance routes: no overflow.

## 6. Preserved behaviour

Same queries (`overviewQuery`), same server-computed numbers, same error
messages and retry, same routes and deep links (`#finance-health`,
`#settings-categories`, …), same quick-add sheet and mutation path, same
budget status vocabulary (`budget-status.tsx`). No API, type, schema,
validation, currency, exchange-rate, budget, savings or auth change.

## 7. Phases D and E, as built (2026-11-10)

UI only, as before: no API, type, query key, schema, validation, currency or
calculation change. New pure display helpers live in
`lib/finance/{transactions,budgets,savings,subscriptions,analytics,review}-display.ts`
and `lib/finance/settings-form.ts`, each with tests.

- **Transactions:** the floating Add is the only add (toolbar Add removed at
  every width; the empty state keeps its button). One search plus a "Filters"
  button with a count; type, category, payment method, amount range and sort
  live in the panel, with a one-line summary and "Clear filters" when it's
  closed. Flat day groups with sticky headings and day totals. Rows match
  Recent activity; payment method, USD amount/rate, note and time moved into
  the row's menu. The sheet runs templates → type → amount → currency/rate →
  description → category → payment method → "More details" (date, note,
  save as template). Description sits before category because picking a
  suggestion fills category and payment method.
- **Budgets:** one summary line; rows with spent of limit, % and status, left
  or over trailing, thin bar in the status colour. The row opens the editor;
  Remove moved into it.
- **Savings:** one summary line with a neutral bar; goal rows (no per-goal bar
  colour). A row opens a goal sheet with Add contribution (primary), Edit and
  Delete.
- **Subscriptions:** one summary line; rows with the amount at body size; Keep
  is no longer coloured. Merchant-name suggestions and existing merges sit
  behind "Review N similar names" / "N merged names" disclosures.
- **Review:** a narrative lede replaces the KPI tiles; flat lists; savings and
  subscriptions share one section; "Apply plan" is the only filled button.
- **Analytics:** income, expenses, net and savings rate once, with "vs last
  month" deltas (Month comparison removed). The trend chart always has a
  selected day, reachable by keyboard, tap and pointer; expenses are dashed.
  Categories and payment methods are ranked rows; the donuts are gone.
- **Settings:** three groups with their own Save (Goals and money rule,
  Budget controls, Reviews and email reports), using the existing
  partial-update preferences endpoint. Reports are flat figures and lists.
- **Ids moved, not removed:** `#analytics-comparison` (summary block),
  `#review-subscriptions` (subscriptions row), `#settings-money-rule` and
  `#settings-email-reports` (subheadings in their groups). `#budgets-summary`
  only renders when budgets exist.
- **Known follow-ups:** `FinanceProgress` renders a `div` inside row buttons
  (needs a `span` option in `ui/`); `hashSeriesColor` in
  `lib/finance-chart-colors.ts` is now unused; a failed budget removal still
  shows no error (unchanged behaviour).
- **Phase F, done (2026-11-10):** `tests/e2e/finance-screens.e2e.ts`
  (synthetic data) checks the seven redesigned routes for horizontal
  overflow at 320/375/768/1024/1440 in light and at 375/1440 in dark, that
  Transactions has a single Add, that Filters opens and closes by keyboard,
  and that the trend chart moves between days with arrow keys and Home. It
  also walks the add-transaction sheet at iPhone 15 Pro Max size (430×932
  @3x, light and dark): the sheet fits, the submit stays in view, targets
  are ≥44px, inputs are ≥16px (no iOS focus zoom) and the button label is
  ≥4.5:1. With `finance-overview.e2e.ts`: 27/27 passed. A screenshot review
  caught Analytics' ranked rows dropping the amount to its own line on
  phones, a 24px-tall USD rate input and a 19px attribution link; all fixed. Run it against a dev server you start yourself
  (`pnpm exec next dev --port 3100`), since the config's `pnpm dev -- --port`
  passes a stray `--` to Next; with no Playwright browser installed, set
  `PLAYWRIGHT_EXECUTABLE_PATH` to a local Chrome.
- **Phase F, still owed:** `UI_SWEEP=1 ui-route-sweep`, a hand check of
  sheet-to-sheet focus return (Savings goal sheet → contribution/edit/delete,
  budget editor → remove dialog), and at 320px a single long word in a
  ranked or activity row can break mid-word.
