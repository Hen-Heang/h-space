# HANDOFF

## Snapshot

- **Updated:** 2026-11-04.
- **Checkout:** `feat/finance-telegram-push` at `b97e468` (same HEAD as `origin/feat/finance-alert-jobs`; this local branch has no upstream configured). Typography work is uncommitted; no commit, push, or deploy was made.
- **Typography:** Added the global Inter / Pretendard Variable / Noto Sans Khmer font stack; licensed Pretendard variable Unicode subsets are served locally. Added shared size, weight, and line-height tokens and replaced undersized readable text across app routes and components.
- **Responsive review:** Synthetic UI sweep passed 13 representative routes in light mode and 7 routes in dark mode at 320, 375, 390, 430, 768, 1024, and 1440 px, with no horizontal overflow or readable text below 13px. Production screenshots: `apps/web/test-results/ui-sweep/typography-production-2026-11-04/` and `apps/web/test-results/ui-sweep/typography-dark-2026-11-04-dark/` (ignored).
- **Verification:** `pnpm test:web` passed (1,860 tests); `pnpm build:web` passed with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` (163 static pages generated). `pnpm lint:web` remains blocked by two hook-rule errors in the pre-existing untracked Finance Telegram route; five existing warnings also remain.
- **Uncommitted work preserved:** Existing Finance settings, report/export/email/Telegram and navigation changes plus untracked `luyra-web/`. Do not stage or discard unrelated work.

## Current focus

1. Review the Finance work on the current branch and preserve all concurrent edits.
2. Keep Finance data in Neon and the independently deployable Luyra configuration unchanged.
3. No live data, deployment configuration, or Git remote was changed during this typography task.
