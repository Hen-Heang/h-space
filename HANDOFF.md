# HANDOFF

## Snapshot

- **Updated:** 2026-11-10.
- **Checkout:** branch `feature/retire-notes` from `main` at `3dd2a57`, pushed; **PR #124** open, not merged. The owner's own uncommitted `second-brain/` changes (`H-Space.md`, `.gitignore`, `.obsidian/graph.json`) and `test-results/` came along on the branch; they are not part of this work — stage explicit paths only.
- **This session: Notes retired behind one switch** (the owner's notes moved to Obsidian). `NEXT_PUBLIC_FEATURE_NOTES` (`isNotesEnabled()`, `apps/web/lib/feature-flags.ts`) is **off unless `"true"`**. Off:
  - Nav (`lib/navigation.ts`): the `memory` workspace is **Memory** (Memories · Timeline, lands on `/ask-hengo/memories`); the Notes item is out of the registry, so no sidebar/rail/tab/More/Quick Switcher entry. Mobile bottom bar back to **Home · Plan · Learn · Finance · More** (More leads with Memory, Growth, Settings).
  - Routes: `/notes` and `/notes/*` → **HTTP 307 to `/inbox`** (`next.config.ts` `redirects()`), with `app/(main)/notes/layout.tsx` as a server-side backstop so the pages never mount.
  - Inbox: "Convert to note" hidden (task/journal stay). Quick capture = Home "Quick capture" and Inbox "Quick capture" (same `QuickCaptureDialog`); `NotesCaptureButton` only lives on the Notes page, kept for flag-on.
  - AI: Ask Hengo's workspace search skips `kori_notes` (`retrieveMemoryContext(..., { includeNotes })`, route passes the flag) and its copy no longer claims to search notes; the six MCP project-knowledge tools aren't registered and the server instructions say no notes are reachable.
  - Learning Hub's "Software Engineering → Open notes" link removed.
  - **Untouched:** `kori_notes` / `kori_note_projects` (rows, RLS, `ai_access` / `ai_can_edit`), all Notes code, migrations. No DB, Vercel or env change was made.
- **Turn Notes back on:** set `NEXT_PUBLIC_FEATURE_NOTES=true` in Vercel (+ `.env.local`) and redeploy — it's inlined at build time. Verified locally: a build with the flag on serves `/notes`, `/notes/new`, `/notes/<slug>` with 200.
- **Data:** the owner asked for the OLV/SQL Learning/QA notes to be deleted, a verified JSON backup of the 12 owner notes was written outside the repo on the owner's machine, and then the owner **cancelled the delete — nothing was deleted**. The two tables hold 13 notes / 4 projects (that's all rows).
- **Verification (local):** `pnpm lint` 0 errors / 5 warnings (pre-existing files); `pnpm test` 224 files, 2,416 tests passed (new: `app/(main)/notes/layout.test.ts`, `components/inbox/InboxItemCard.test.tsx`, `lib/server/memory-retrieval.test.ts`; nav/shell/MCP tests cover flag off and on); `tsc` clean; `pnpm build:web` passed (needs `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`); production server: `/notes*` → 307 `/inbox`, `/inbox` `/home` `/timeline` `/ask-hengo/memories` 200.
- **Playwright e2e (local dev server, installed Chrome, no `HENGO_E2E_STORAGE_STATE`):** branch, all 15 specs: 63 passed, 21 failed, 91 skipped (mostly signed-in-only tests, incl. the Notes journey; the Notes sticky-bar test is skipped by design). **No new failures:** the same 8 spec files on `main` (`3dd2a57`) give 22 failed / 27 passed — all 21 branch failures, plus the Notes sticky-bar test. The pre-existing failures were a test-setup problem, not missing copy: with no Supabase URL in the environment the CSP blocked every data request before the specs' mocks saw it (18 of 21), plus three real spec drifts (single-page sign-up, an ambiguous "Today's practice" match, Chrome 157 reporting `overflow-x: clip`). Fixed in #125 (`fix/stale-e2e-specs`): full suite 85 passed, 93 skipped, 0 failed. **Not done:** a signed-in visual check of the new mobile bar / Memory workspace.
- `apps/web/.env.example` was not updated (agent read denied) — add `NEXT_PUBLIC_FEATURE_NOTES=` there by hand if wanted.

## Current focus

1. **Notes retirement:** owner reviews and merges PR #124 (`feature/retire-notes`). Later cleanup (after a few weeks, separate decision): delete Notes code + flag, then — only with an explicit decision and backup — drop `kori_notes` / `kori_note_projects` (shared Orbit DB). List in `apps/web/docs/notes-projects.md`.
2. **Finance:** owner reviews and merges the D–F PR, then tries adding a transaction on a real iPhone (keyboard over the sheet, Safari toolbar, safe areas). Follow-ups in `finance-redesign.md` §7: `FinanceProgress` `div` inside row buttons, unused `hashSeriesColor`, no error on a failed budget removal, sheet-to-sheet focus return, `UI_SWEEP=1` route sweep, and fix the Playwright `webServer` command.
3. **MCP live (from #111):** confirm whether the token hook is applied and the Vercel `MCP_*` env is set; then register ChatGPT as a second client. Note the project-knowledge tools are now off with Notes.
4. **Connected apps** (Settings → Security): list and revoke connector grants via Supabase `GET`/`DELETE /user/oauth/grants`.
5. **UI audit follow-ups (unchanged):** History "★" filters never match; `UnitEditor` `FieldLabel` is a `<p>`; sign-in tiles one colour per app; `public/app-process.png` artwork; Phase 6 sweep; remaining restyles (Chat leftovers, Interview, Roadmap, Recovery, vocab components).
6. **Carried over:** native-speaker pass on `lib/korean-phrasebook/work-seed.ts`; Planner slices 3–10; second-brain T2–T7; long-term MCP auth via h-space-api (#36); generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask`, `recovery-coach`; independent H-Vault security audit and restore drill.

## Notes for the next session

- **Playwright on this machine:** the config's `webServer` command (`pnpm dev -- --port 3100`) fails because pnpm passes the `--` to Next; start `pnpm exec next dev --port 3100` yourself and set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100`. No Playwright browser is installed; set `PLAYWRIGHT_EXECUTABLE_PATH` to the installed Chrome. To cover Notes in e2e, run both the app and Playwright with `NEXT_PUBLIC_FEATURE_NOTES=true`.
- **GitHub Actions** was down for a billing lock as of 2026-11-09; not re-checked. Run lint/test/build locally before merging.
