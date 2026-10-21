# HANDOFF HISTORY

Append-only log, newest entry first. Read only the latest five entries
unless a task genuinely needs older context — this file exists so old
handoffs aren't lost, not so every session has to read all of them.

Each time `HANDOFF.md` is overwritten with new "Current focus" content, move
its old content here as a dated entry before overwriting.

---

## 2026-10-21 (a)

### Snapshot

- **Updated:** 2026-09-22
- **Branch:** `main` (synced with `origin/main` at the time)
- **Last commit:** f629870 — Merge pull request #25 from
  Hen-Heang/docs/handoff-post-api-removal

### Current focus

The Spring Boot backend had been removed, leaving `apps/web` as the repository's
only application. The removed `apps/api` subtree, API workflow, Maven scripts,
and API-only infrastructure remain recoverable from git history and the
untouched `Hen-Heang/hengo-api` backup repository.

Root commands and documentation had been rewired to the Next.js/Supabase app.
The app uses hosted Supabase for auth and data plus authenticated Next.js AI
route handlers; there is no separate backend service to run.

### Verification

- `pnpm test` had 1129 passes and one load-related timeout in
  `navigation-shell.test.tsx`; the same 56-test file passed by itself.
- `pnpm lint` passed with five pre-existing warnings.
- Repository scans found no stale Spring application references outside the
  migration history and the unrelated embedded `dev-learning-notes` project.

PRs #24 and #25 had been merged, and `main` was the only remaining local and
remote branch.

### Vercel follow-up

`apps/web` was linked to the existing `koriai-frontend` Vercel project. Dead
Spring/Railway environment variables were removed from Production and Preview.
Supabase variables were still Production-only, so Preview deploys remained
broken. VAPID/Telegram variables and integration-managed database variables
were deliberately left in place pending separate review.

### Open items

- Delete or repoint the old Railway service whose root was `/apps/api`.
- Copy the Supabase URL and publishable key to Vercel Preview.
- Optionally remove stale IntelliJ MCP configuration and reconcile the duplicate
  Supabase seed layout.

### Notes for future sessions

- One app remains: `apps/web`, using Next.js, Supabase, and `app/api/ai/*`.
- Hidden routes and features are not safe to delete.
- Query live Supabase before making schema claims.
- Run jsdom suites on Node 25 with
  `NODE_OPTIONS=--no-experimental-webstorage`.

---

## 2026-09-04 (b)

### Snapshot

- **Updated:** 2026-09-04
- **Branch:** `main` (aligned with `origin/main` before the handoff edits)
- **Last commit:** b232872 — Merge pull request #17 from Hen-Heang/feat/core-korean-300

### Current focus

**Account-specific Korean pattern practice was expanded in the live Hengo
Supabase project** (`dnzqgnejwyucenghugrb`) for `henheang15@gmail.com`
(`auth.users.id = 31dec390-4b91-4516-bcc0-a0f5f9045217`). No schema or
application-code change was needed because the existing Phrasebook already
supports collections, cards, speaking practice, and review progress.

A pinned collection was created idempotently:

- Collection: `직장·일상 실전 한국어 문형 22` /
  `22 Essential Work & Daily Korean Patterns`
- Collection ID: `83a5152d-c4bf-4b59-99e5-2d8cf5c0e400`
- Source key: `mentor-real-situation-patterns`
- Seed/content version: 2
- Twenty-two active, user-editable cards cover the original mentor patterns
  plus high-utility work and daily-life situations.
- Original patterns:
  - `믿기지 않을 정도로 ~`
  - `~했을 뿐이에요`
  - `~에 대해서는 잘 모르겠어요`
  - quoted clause + `~라고/다고 생각하다`
- Added workplace language: work in progress, completion estimates, blockers,
  clarification, permission, checking and following up, suggestions, respectful
  disagreement, completion reports, and polite refusal/availability.
- Added daily-life language: intentions, decided plans, past experience, things
  the learner wants to try, café ordering, exchanges/refunds, directions, and
  appointments.

Each card uses a realistic workplace prompt, romanization, English meaning,
alternate answers, usage/register guidance, vocabulary, and recall-oriented
tags. The mentor's casual `~라고 생각하니?` is retained as a variant; the
recommended workplace answer uses polite `~라고 생각하세요?`.

### Verification

- Live Auth lookup found exactly the requested account, with a recent sign-in.
- The collection is pinned and owns exactly 22 active cards in positions 0–21,
  with 22 distinct positions.
- Category distribution is 10 workplace, 8 daily-life, and 4 original mentor
  pattern cards.
- All questions are JSON objects; all answer lists are non-empty; every card has
  a recommended answer. Required Korean, romanization, English, register,
  vocabulary, and tags all passed live integrity queries.
- `kori_phrase_collections` and `kori_phrase_cards` both have RLS enabled with
  their existing per-owner policies.
- Stable per-user source keys make both the original and expanded data writes
  safe to rerun without duplicating the collection or cards.

### Working tree

- Only `HANDOFF.md` and `HANDOFF_HISTORY.md` were changed to record this live
  data update; the application source was not modified.

### Next steps

- The user can open `/phrasebook`, select the pinned collection, and start the
  built-in practice flow.
- Browser verification is still optional because no login password/session was
  provided; database shape, ownership, content, and RLS were verified directly.

### Notes for future sessions

- Two independent apps remain: `apps/web` uses Next.js/Supabase; `apps/api` is
  an imported backup and is not the live backend.
- V2 features hidden from navigation are not safe to delete.
- Query live Supabase before schema claims; the repository migration folder is
  not a complete live-schema ledger.
- Running jsdom suites on Node 25 requires
  `NODE_OPTIONS=--no-experimental-webstorage`.

---

## 2026-09-04 (a)

### Snapshot

- **Branch:** `main` (aligned with `origin/main` before handoff edits)
- **Last commit:** b232872 — Merge pull request #17 from Hen-Heang/feat/core-korean-300

### Current focus

An initial account-specific Phrasebook collection was added to live Hengo
Supabase for `henheang15@gmail.com`: `실전 한국어 문형 연습` / `Real-Situation
Korean Patterns` (`83a5152d-c4bf-4b59-99e5-2d8cf5c0e400`). It contained four
active cards based on the learner's mentor-provided patterns, was pinned, used
stable per-user source keys, and required no schema or application-code change.

The four-card version was verified for Auth ownership, JSON shape, recommended
answers, RLS, and idempotency. It was then expanded later the same day into the
22-card practical work-and-daily-life curriculum recorded in `HANDOFF.md`.

## 2026-09-03 (a)

### Snapshot

- **Branch:** `main` (aligned with `origin/main`)
- **Last commit:** 2d4106d — add new ci

### Current focus

**Supabase performance audit and RLS cleanup.** The live `hengo` project
(`dnzqgnejwyucenghugrb`, ap-northeast-2) was audited with the Supabase MCP
advisors. Performance lints went from **91 to 65**: `auth_rls_initplan` (10) and
`multiple_permissive_policies` (16) both reached zero.

One migration was applied and mirrored into the repo as
`apps/web/supabase/migrations/20260903013902_perf_rls_policy_consolidation.sql`.
It removed duplicate permissive owner policies from the four `kori_focus_*`
tables while retaining their restrictive owner guards, rewrote remaining bare
`auth.uid()` policy calls as `(select auth.uid())`, and pinned `search_path` on
`public.kori_next_reminder_run`. Access predicates and roles were preserved.

Verification found no remaining bare `auth.uid()` in the affected policies,
each focus table had four per-action policies plus one restrictive guard, and
`lib/recovery-security.test.ts` passed 6/6.

### Working tree at the time

- The migration file above was untracked and uncommitted, although already
  applied to the live database.
- The prior 616-file formatting/tooling set had landed as 2d4106d (`add new ci`).
- GitHub CLI authentication might still have been invalid; authenticated Git
  operations worked independently.

### Next steps at the time

- Commit the new migration file. *(Resolved after this snapshot.)*
- Leave the 46 unused-index and 19 unindexed-foreign-key advisories alone until
  table sizes justify revisiting them.
- Human decisions remained for `vector`/`pg_net` in `public` and leaked-password
  protection being disabled.
- Older open items remained: assess `v0/hen-heang-12e5395f`, optionally rewrite
  `apps/web/docs/navigation-shell-audit.md`, and fix the aged hardcoded date in
  `lib/learning/corrections.test.ts`.

### Notes

- The apps remain independent: `apps/web` uses Next.js/Supabase, while
  `apps/api` is an imported backup and is not the live backend.
- V2 features hidden from navigation must not be treated as safe to delete.
- The repository migration folder is not a complete live-schema ledger; query
  live Supabase before making schema claims.
- Running jsdom suites on Node 25 requires
  `NODE_OPTIONS=--no-experimental-webstorage`.

## 2026-08-31 (d)

### Snapshot

- **Branch:** `main` (aligned with `origin/main`)
- **Last commit:** 48ef886 — update new logo

### Current focus

**Repository and branch cleanup was complete.** PRs #1 through #14 were all
merged, including Hengo V2 in PR #13 and the workflow tooling in PR #14. No open
or draft PRs remained.

The remote branch list had been reduced from 19 branches to three intentional
ones: `main`, `archive/hengo-v1-2026-08-31` (V1 snapshot), and
`v0/hen-heang-12e5395f` (one unique unmerged commit touching three root-level
chat components). Sixteen merged, superseded, or duplicate remote branches were
deleted, and a stale local tracking ref for the already-deleted PR #1 branch was
pruned.

### Working tree at the time

- A pre-existing staged formatting/tooling change set of 616 files (21,253
  insertions, 9,661 deletions) covering Prettier configuration, a composite
  GitHub Action, workflow edits, package changes, and broad formatting. It was
  to be preserved and reviewed before committing.
- GitHub CLI authentication was still invalid, though authenticated Git
  operations worked.

### Next steps at the time

- Review and test the staged 616-file formatting/tooling change set before
  committing it. *(Resolved 2026-09-03: landed as 2d4106d "add new ci",
  618 files, 21,327 insertions, 9,680 deletions.)*
- Decide whether `v0/hen-heang-12e5395f` was still valuable — 215 commits behind
  `main`, but its single commit was never merged. *(Still open.)*
- Optionally rewrite `apps/web/docs/navigation-shell-audit.md`, marked
  superseded but not rewritten. *(Still open.)*
- `lib/learning/corrections.test.ts` failed on a hardcoded date aged past
  "today", pre-existing and unrelated to V2. *(Still open.)*

## 2026-08-31 (c)

### Snapshot

- **Branch:** `feat/hengo-v2-korean-focus` (8 commits ahead of `main`, not
  pushed at the time)
- **Last commit:** 1f55db3 — docs: document hengo v2 product direction

### Current focus

**Hengo V2 — focused Korean learning.** All 8 implementation phases were
complete and committed locally. `docs/HENGO_V2.md` held the full product
direction, hidden-V1 list, and architecture decisions.

### Blocked at the time

Pushing the branch and opening the PR had failed because the stored GitHub CLI
token was invalid. The intended commands after re-authentication were:

```bash
git push -u origin feat/hengo-v2-korean-focus
gh pr create --base main --head feat/hengo-v2-korean-focus \
  --title "feat: Hengo V2 focused Korean learning experience"
```

The user had asked for the PR to be prepared only, not merged automatically.

### Next steps at the time

- Push and open the PR once authentication was restored.
- Optionally rewrite `apps/web/docs/navigation-shell-audit.md`, which was
  marked superseded.
- A pre-existing `lib/learning/corrections.test.ts` test failed because its
  hardcoded date had aged past "today"; the V2 branch had not touched it.

### Notes

- The apps remain independent: `apps/web` uses Next.js/Supabase, while
  `apps/api` is an imported Spring Boot/MyBatis backup and is not the live
  backend.
- **V2 rule: hide, don't delete.** V1 routes, components, and tables remained
  available by direct URL; `primaryNavItems` in `lib/navigation.ts` controlled
  visibility.
- jsdom suites on Node 25 required
  `NODE_OPTIONS=--no-experimental-webstorage`.
- Repo tooling files were deliberately kept outside the V2 PR at that point.

## 2026-08-31 (b)

- Repo was clean on `main`, no active task. Superseded by the Hengo V2 work
  below on the same day.

## 2026-08-31 (a)

- Set up the HANDOFF.md / HANDOFF_HISTORY.md session-continuity pattern for
  this repo, adapted from a Claude Code workflow reviewed in an external
  Notion guide. No code changes.
