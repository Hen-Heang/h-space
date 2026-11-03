# H-Space design system

Status: **Phase 1 foundation** (2026-11-03, branch `ui/redesign-foundation`).
Audit and phased plan: [`ui-redesign-audit.md`](ui-redesign-audit.md).

The aim is a calm daily-use app. Whitespace, type and alignment organise
content. Borders, shadows, tints and icons are used only when they add
meaning. When unsure, leave it out.

## 1. Principles

1. **One title per page.** The shell's header renders the page's only `h1`
   (`DesktopHeader` / `MobileHeader`). A page starts with `WorkspaceTabs` (tabs
   plus the workspace's one primary action), then a one-line description. It
   never adds a second hero title.
2. **Sections, not boxes.** A page is a stack of `PageSection`s, each a heading
   plus content with no border. Reach for a surface only when content truly
   needs grouping against its neighbours.
3. **Lists are rows.** Collections render as `RowList` / `InteractiveRow`:
   full-width rows with subtle dividers, not a grid of decorated cards. Grids
   are for visual catalogues (My Apps), not for text records.
4. **Never a card inside a card.** If something inside a surface needs
   separating, use a divider or spacing.
5. **One accent.** Violet `primary` marks the primary action, the current
   location and progress. Status colours (`destructive`, `success`, the amber
   warning used by `text-amber-*`) appear only for real states, never as
   decoration. Icons are neutral `text-muted-foreground` unless they _are_ a
   state.
6. **Readable first.** Fix tight layouts with wrapping, stacking or
   progressive disclosure. Never shrink text or hide essential data.

## 2. Colour tokens

All colours are CSS variables in `app/globals.css` (`:root` and `.dark`),
exposed as Tailwind colours (`bg-card`, `text-muted-foreground`, …).

| Role           | Token                               | Use                                                 |
| -------------- | ----------------------------------- | --------------------------------------------------- |
| Page           | `background`                        | App background (cool neutral `#f6f7fb` / `#0b1120`) |
| Surface        | `card`                              | Grouping surfaces, dialogs, rows on hover           |
| Quiet surface  | `muted` (`.app-surface-muted`)      | Tinted group without a border                       |
| Text           | `foreground`                        | Titles, body                                        |
| Secondary text | `muted-foreground`                  | Descriptions, metadata, idle icons                  |
| Accent         | `primary`                           | Primary button, active tab/nav, progress, links     |
| Selected nav   | `sidebar-accent` / `-foreground`    | Active nav row background                           |
| Hover          | `accent`                            | Row/ghost hover (neutral, _not_ the brand colour)   |
| Divider        | `border`                            | Row dividers, the one surface border                |
| States         | `destructive`, `success`, `grade-*` | Errors, success, SRS grades only                    |
| Brand panel    | `brand-surface`                     | Auth + marketing panels only                        |

Contrast: `foreground` and `muted-foreground` on `background` and `card` meet
WCAG AA for body text in both themes. `primary` on white meets 4.5:1 for
button text. Don't put `muted-foreground` text on a `muted` fill below 14px.

## 3. Typography

Root size is `clamp(16px, 0.35vw + 15px, 17px)` (16.5px on phones). All sizes are
rem, so they follow browser zoom and the user's text-size setting.

| Role                                      | Classes                                                               | ≈ px    |
| ----------------------------------------- | --------------------------------------------------------------------- | ------- |
| Page title (shell `h1`)                   | desktop `text-base font-semibold`; mobile `text-[17px] font-semibold` | 16–17   |
| Display heading (rare: empty state, hero) | `text-2xl font-semibold tracking-tight`                               | 24      |
| Section heading (`h2`)                    | `text-lg font-semibold` (`PageSection`)                               | 18      |
| Row / card title                          | `text-base font-medium`                                               | 16      |
| Body                                      | `text-base`                                                           | 16      |
| Secondary / description                   | `text-sm text-muted-foreground`                                       | 14      |
| Metadata, labels, badges, timestamps      | `text-xs text-muted-foreground`                                       | **13**  |
| Buttons, inputs                           | `Button` (`text-sm` semibold); inputs `text-base` (no iOS zoom)       | 14 / 16 |

- `text-xs` is redefined to **13px** (`--text-xs` in `globals.css`). It is the
  floor: don't use `text-[10px]`, `text-[11px]` or `text-[12px]` for anything
  a person needs to read. The only exceptions are dense visualisations
  (a calendar month cell, a chart axis), and even those prefer `text-xs`.
- Uppercase "kicker" labels (`.app-kicker`) are allowed once per section at most.
  Prefer sentence case.
- Long text wraps. Titles use `min-w-0` plus `line-clamp-2` or `break-words`,
  not a single-line `truncate`, when the title is the main content of the row.
  Korean text needs `break-keep` only for short labels. Paragraphs wrap normally.

## 4. Spacing and layout

Tailwind's 4px scale, limited to **4 · 8 · 12 · 16 · 24 · 32** (`1 · 2 · 3 · 4 ·
6 · 8`). Use 40/48 only for large vertical breaks.

| Context                     | Value                                                                |
| --------------------------- | -------------------------------------------------------------------- |
| Page gutter                 | 16px on phones, 24px from `sm`, 32px from `lg` (the shell owns this) |
| Max content width           | `max-w-6xl` (shell). Reading surfaces narrow further (`max-w-3xl`)   |
| Between page sections       | 32px (`space-y-8`), 24px on dense pages                              |
| Section heading → content   | 12px                                                                 |
| Inside a surface            | 16px (`p-4`), 20–24px only for a single prominent surface            |
| Row padding                 | 12px vertical, 12–16px horizontal; min height 56px for two-line rows |
| Gap between inline controls | 8px                                                                  |

**Don't stack padding.** The shell already provides the gutter. A section adds
none, and a surface inside a section adds 16px. Never nest surface padding
inside surface padding.

## 5. Surface patterns (`components/ui`)

| Pattern          | Component                                           | Notes                                                                |
| ---------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| Page section     | `PageSection` (`page-section.tsx`)                  | `h2` + optional description + one action. No border.                 |
| Grouping surface | `.app-surface` / `Card`                             | One border, `bg-card`, **no shadow**.                                |
| Quiet group      | `.app-surface-muted`                                | Tinted, no border. Good for summaries inside a page.                 |
| List             | `RowList` + `InteractiveRow` (`row-list.tsx`)       | Divided rows, hover feedback, leading/trailing slots, 44px+ targets. |
| Summary          | `Card size="sm"`                                    | Only for real summaries (a metric, a single status).                 |
| Empty state      | `EmptyState` (`empty-state.tsx`)                    | Icon (optional) + one sentence + one next action.                    |
| Overlay          | `Dialog`, `Sheet` (bottom on phones), `AlertDialog` | Radix. Scroll inside, safe-area padding.                             |

`Card` and `Button` lost their drop shadows in Phase 1, so every existing card
already reads flatter. Elevated shadows remain only on overlays (dialogs,
popovers, menus, the floating AI button).

## 6. Icons

- Lucide only. Sizes: **16** inline with text / dense rows, **18** nav rows,
  **20** mobile header and bottom nav, **24** empty states. Default stroke 2.
- An icon earns its place by speeding recognition (nav, a known action) or by
  being the action (icon button). Don't prefix every label with an icon.
- Icon-only controls need an `aria-label`, and a 44×44 target on touch
  (`Button size="icon"`, or an `after:absolute after:-inset-*` hit area).
- Neutral colour by default. One colour per meaning, never a different colour
  per item.

## 7. Interaction and states

- **Primary action:** one `Button` (default variant) per view, beside the tabs.
  Secondary actions are `outline`/`ghost`. Destructive is the tinted
  `destructive` variant, always behind a confirm.
- **Touch:** 44×44px minimum on coarse pointers (`Button` sizes already grow
  under `pointer: coarse`).
- **Focus:** the global `:focus-visible` ring. Never remove it without a
  replacement.
- **Motion:** `motion/react` for small feedback (≤200ms, opacity/translate).
  The global `prefers-reduced-motion` rule disables it.
- **States are part of the design:** every data view has loading (`Skeleton`
  shaped like the content), empty (`EmptyState`), error (`ErrorBanner` + retry)
  and populated states.

## 8. Responsive rules

Check 320 · 375 · 390 · 430 · 768 · 1024 · 1440. The opt-in Playwright sweep
`tests/e2e/ui-route-sweep.e2e.ts` loads every route at those widths with a
synthetic session and fails on horizontal overflow:

```bash
UI_SWEEP=1 UI_SWEEP_LABEL=after PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
  PLAYWRIGHT_EXECUTABLE_PATH="$LOCALAPPDATA/ms-playwright/chromium-1223/chrome-win64/chrome.exe" \
  npx playwright test ui-route-sweep --workers=1
```

- No horizontal page scroll. Wide content (tables, tab rows, chip rows) scrolls
  inside its own `overflow-x-auto` container.
- Rows stack on phones: title on its own line, metadata below, actions at the
  end or behind a `⋯` menu. Never let buttons squeeze a title to a few
  characters.
- Forms: single column on phones, `text-base` inputs, sticky submit bar only
  when the form is longer than a screen.
- Safe areas: the shell applies `env(safe-area-inset-*)`. Fixed elements a page
  adds must do the same.
