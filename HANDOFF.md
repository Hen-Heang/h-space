# HANDOFF

## Snapshot

- **Updated:** 2026-11-03
- **Branch:** `ui/redesign-foundation` (from `main` at `a19982a`). It has one local commit, which hasn't been pushed and has no PR yet.
- **Work:** UI/UX redesign, **Phase 1 (design foundation) and Phase 2 (app shell)** of six. The plan, the route-by-route audit (P0/P1/P2) and the before/after sweep results are in `apps/web/docs/ui-redesign-audit.md`. The rules are in `apps/web/docs/design-system.md`.
- **Phase 1 changes:**
  - `text-xs` is now a 13px floor, and `.app-surface-muted` is added.
  - `Card`, `Button`, `Input`, `Textarea` and `Select` no longer have drop shadows.
  - `PageHero` defaults to an `h2` with no glow or box. `PageHeader` renders an `h2`.
  - New primitives: `PageSection`, `RowList`/`InteractiveRow` and `EmptyState`, with tests.
  - **P0 fixes:** `/home` and `/goals/overview` no longer overflow at 320–768px (`minmax(0,1fr)` grid tracks). The `/home` banner title is no longer dark-on-navy.
- **Phase 2 changes:**
  - Bottom-bar, rail and sidebar-group labels go from 11px to 13px. The desktop page title goes from 14px to 16px.
  - In `WorkspaceTabs` on phones, the divider sits under the tabs.
  - The theme switch moved from the mobile header into the More sheet.
  - No route, registry, matching or Quick Switcher changes.
- **Verification:**
  - `pnpm lint`: 0 errors and 5 warnings in untouched files.
  - `pnpm test`: 1637/1638 passed in the full run. `lib/recovery-security.test.ts` failed once under load and passed alone (6/6).
  - `pnpm build` passed. `shell-sticky.e2e.ts` passed 11/11.
  - The new opt-in sweep (`tests/e2e/ui-route-sweep.e2e.ts`, `UI_SWEEP=1`) covers 48 routes × 7 widths in light mode, plus 390/1440px in dark mode. It uses a synthetic session and data, and off-machine requests are aborted. Results are in the audit's sweep log.
- **Not verified:** real-account populated states, dialogs, and the unlocked H-Vault. Signed-in screens were rendered only with synthetic data.
- **Open PR:** #59 remains open; its latest reported Lint & Format check failed.

## Current focus

The owner reviews this branch, and nothing is pushed or deployed without approval. **Phase 3 is next** (Home, Goals, Tasks) on its own branch. It covers:

- the `/goals` filter overflow at 320px
- `GoalList` two-line rows
- `TodaysTasks` row actions that work on touch
- `GoalTaskRow` and `HealthBadge`
- goal detail's second h1 and the sticky bar hidden under the bottom nav
- calendar touch targets

Its scope is listed in the audit's phased plan. Running the sweep on this machine:

```bash
cd apps/web
UI_SWEEP=1 UI_SWEEP_LABEL=after PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
  PLAYWRIGHT_EXECUTABLE_PATH="$LOCALAPPDATA/ms-playwright/chromium-1223/chrome-win64/chrome.exe" \
  npx playwright test ui-route-sweep --workers=1
```

Use `UI_SWEEP_ROUTES=home,goals` (no leading slash, because of Git Bash path rewriting) and `UI_SWEEP_WIDTHS=320,1440` to narrow a run. `UI_SWEEP_DARK=1` switches to the dark theme.
