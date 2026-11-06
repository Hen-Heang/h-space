# HANDOFF

## Snapshot

- **Updated:** 2026-11-06.
- **Checkout:** `main` at `d497eaa`. PR #96 (`feat/work-korean-focus`) was merged by the owner on 2026-11-06 and Vercel's production deploy completed. The branch is kept.
- **Feature: "Korean for my work"** (record: `apps/web/docs/korean-for-work.md`). A focus inside Learning, not a new nav item:
  - **Analyzer** (`/chat?mode=analyze`):
    - Results come main-point first (what it means → what to do → My reply → useful language → practice → collapsed details).
    - The editable box is the payload; a sensitive-text warning offers to replace fragments with placeholders.
    - Analyzer history is now **opt-in**.
    - Save to Phrasebook goes through an editable, idempotent draft.
  - **Phrasebook:**
    - Readable situation labels.
    - Compact Filters popover/sheet with active count, removable chips and Clear all.
    - New 25-card starter pack `work-communication`, with 6 comprehension cards.
    - Saved messages go to a private "My work messages" collection.
  - **Work practice** — new `/phrasebook/practice?mode=work` mode. Reply typed or spoken-then-corrected; meaning-first feedback; never a pronunciation score.
  - **Mission engine** — with the goal set to Workplace Korean, one `work_message` step; due reviews are trimmed to fit the time budget, and the backlog is kept and shown as secondary text.
  - **Learning Hub** — compact "Korean for my work" card.
- **Data:** stays in Supabase/RLS. No h-space-api change, since Learning migration is phase 4 and hasn't started.
- **Migration applied 2026-11-06 at the owner's request:** `apps/web/supabase/migrations/20261106120000_work_korean_focus.sql`, recorded live as `20261106145253 work_korean_focus`. Verified: three nullable columns on `kori_phrase_cards`, `work_message` in the mission item check, RLS still on, row counts unchanged (132 cards, 84 items).
  - Adds three nullable `kori_phrase_cards` columns and a `work_message` mission item type.
  - The app degrades without it: card inserts retry without the columns; the mission plan is rebuilt without the work step on `23514`.
  - The rollback block is at the end of the file.
- **Also changed:**
  - `jsonAiRoute` and the analyzer stream no longer return provider error text.
  - New shared `userDataBlock()` in `lib/server/ai.ts`.
  - `ChipSelect` takes an optional `getLabel`.
- **Verification (2026-11-06):**
  - `pnpm lint` — 0 errors (5 warnings, all pre-existing).
  - `pnpm test` — 192 files, 2,070 tests passed.
  - `pnpm build` — passed.
  - `tests/e2e/work-korean.e2e.ts` — 10/10 against a dev server with synthetic Supabase env, all network mocked; screenshots in `apps/web/test-results/work-korean/` (git-ignored).
  - Not done: a real-account run (it would seed the pack into live data), a physical device / WebKit run, and a human review of real model outputs and the pack's romanization.
- **Untracked, not ours:** `test-results/` at the repo root.
- **Reminder reconcile fix applied 2026-11-06 at the owner's request:** `20261105121000_fix_reminder_reconcile_alias.sql`, recorded live as `fix_reminder_reconcile_alias`. Verified: one function overload, alias clash gone, execute still revoked from `anon`/`authenticated`; `kori-reminder-delivery-check` failed every minute through 15:05 UTC and **succeeded from 15:06 UTC**. `kori_reminder_deliveries` was empty, so nothing was stuck — the next reminder that fires is the first end-to-end delivery check.

## Current focus

1. Owner: open the Phrasebook once signed in (adds the new starter pack); from the next day's plan, check the work-message step. Fix the GitHub billing lock so Actions CI runs again.
2. Native-speaker pass on `lib/korean-phrasebook/work-seed.ts` (Korean + romanization).
3. Carried over: review the Home redesign PR; Planner slices 3–10; Finance redesign phases D–F; second-brain T2–T7; MCP auth decision.
4. Follow-up candidates: the same generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask` and `recovery-coach` (they still echo `err.message`).
