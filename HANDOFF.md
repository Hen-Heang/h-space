# HANDOFF

## Snapshot

- **Updated:** 2026-11-04
- **On `main` and in production:** UI redesign Phases 1–4 (#64–#67), PR #72 (iPhone 15 typography audit), and PR #71 (full 제6회 interview script). The previous snapshot is the top entry of `HANDOFF_HISTORY.md`.
- **Exam Prep script (#71):**
  - `lib/interview.ts` seeds the full 2026-09-30 Notion script ("한국에 온 후 새로 생긴 습관/취미") and adds a first outline section, `self-intro` (자기소개). `opening` is now only the topic intro.
  - The home station is kept out of the public seed on purpose (`lib/interview-content.test.ts` checks this).
  - Migration `20261104120000_reseed_habits_full_script` was **applied to the live database** on 2026-11-04, after production had deployed #71. Each `weather` draft was first saved as the version "Before full-script reseed (2026-11-04)"; then only the outline keys were cleared, so `/interview/script` refills them from the seed. Roll back from the page's Versions list.
  - Not verified: the owner's real account after the reseed (an agent can't read the live table). Open `/interview/script` and confirm 자기소개 comes first.
- **In review:** branch `chore/remove-google-calendar` holds the work that was left uncommitted after #72 merged, with `main` merged in:
  - Google Calendar integration removed: routes, callback and settings pages, hooks, `lib/server/google-calendar-*`, `UpcomingEventsCard` and `CalendarSourceFilter`. The `kori_google_calendar_integrations` table stays in the database.
  - The mobile glass fallback under reduced transparency (bottom nav and the Exam Prep section-jump menu), with `interview-audit.e2e.ts` checks.
  - Calendar/task UI tweaks, `apps/web/scripts/ui-sweep-report.mjs`, and AGENTS/security-rule updates.
  - Merge conflicts (HANDOFF files, `roadmap/page.tsx`, `ChatWindow.tsx`) were resolved to `main`'s side; those were typography and contrast lines `main` had already reviewed.
  - `interview-script-repeat.e2e.ts` now saves the `self-intro` section, the new first section, instead of `opening`.
- **Verification (this branch):** `tsc --noEmit` clean; unit tests 141 files / 1643 pass; `interview-script-repeat.e2e.ts` 3/3 pass against `next dev` on :3000.
  - Not run: the full e2e suite. An earlier session saw the calendar sticky-shell test expect `overflow: hidden/hidden` while Chrome computes `clip/hidden`; it was left unchanged.
- **Tracked test artifact:** `apps/web/test-results/playwright/.last-run.json` changes on every e2e run. Don't stage it.

## Current focus

1. The owner reviews and merges the `chore/remove-google-calendar` PR.
2. The owner checks `/interview/script` on production after the reseed.
3. Then **Phase 5** of the UI redesign: Learning, AI, Notes and Growth. The plan is in the history entry above and in the "Phase 5" section of `apps/web/docs/ui-redesign-audit.md`.

## Running the sweep

The command is in `apps/web/docs/design-system.md` §8. Use `UI_SWEEP_ROUTES=goals/overview,inbox` without a leading slash. A git worktree has no `.env.local`, so run its dev server with dummy local values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_AUTH_API_URL`; the sweep mocks everything else.
