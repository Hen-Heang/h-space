# HANDOFF

## Snapshot

- **Updated:** 2026-11-05.
- **Checkout:** `chore/remove-luyra-app-link`, cut from `origin/main` at `6f7dd44` (Planner UX PR #90 merged). Committed and pushed for a PR at the owner's request. No migration, API or data change.
- **Luyra app link removed:** done at the owner's request, since Finance now lives in H-Space at `/finance`. `lib/projects.ts` no longer has the Luyra card or `LUYRA_FINANCE_URL`. The card is gone from `/apps`, the public landing page's My Apps section, Overview's My Apps grid and the app count. The Finance nav item (`apps-luyra` → `/finance`) is unchanged: sidebar, My Apps tab, phone tab, and Quick Switcher, where "luyra" is still a keyword. A stale `luyra` favourite in localStorage is harmless, because favourites only match existing projects.
- **Docs:** `apps/web/AGENTS.md`, the `lib/navigation.ts` comment and `docs/LUYRA_MIGRATION.md` (the step 2 note and step 6, Cutover) now say the card was removed.
- **Tests:** the "My Apps card links to Luyra" case in `components/vault/vault-dashboard.test.tsx` now asserts there is no Luyra card or external Luyra link.
- **Verification:** `pnpm test:web` passed (178 files, 1,958 tests); `tsc --noEmit` clean; ESLint and Prettier clean on the changed files. Not run: `pnpm build`, a browser check.
- **Not changed:**
  - The sign-in page tile "Luyra · Personal finance" in `components/auth/auth-shell.tsx`. It's decorative, not a link.
  - `apps/luyra` and `luyra.henheang.site`. Those belong to the cutover step.
- **Untracked, not ours:** `false` at the repo root, `luyra-web/`, the owner's change in `apps/web/lib/api/finance-client.ts`, and `test-results/playwright/.last-run.json`. Left unstaged.
- **Still open from the reminder work:** `20261105121000_fix_reminder_reconcile_alias.sql` is not applied yet.

## Current focus

1. Owner: merge the Luyra-link PR, and decide whether the sign-in tile should say "Finance".
2. Planner: owner decision on Tasks-as-default, then slices 3–10. See the top `HANDOFF_HISTORY.md` entry and `apps/web/docs/planner-ux-audit.md`.
3. Finance redesign phases D–F and the "Keep Luyra's look" wording. See the second `HANDOFF_HISTORY.md` entry.
4. Carried over: apply the reminder migration; second-brain T2–T7; MCP auth decision.
