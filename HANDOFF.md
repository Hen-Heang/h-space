# HANDOFF

## Snapshot

- **Updated:** 2026-11-08.
- **Checkout:** `main` at `57e2d7d` (PR #105). PRs #98–#105 (the UI audit work below) were merged by the owner on 2026-11-08, 13:47–13:53 UTC, as merge commits; all branches are kept. Each merge started a Vercel production deploy; the last one was still deploying when this was written. No migration, API, auth, data or env change in any of them.
- **The UI audit (2026-11-08)** checked `apps/web` against `docs/design-system.md` and found the screens Phases 1–5b never reached, plus the app icon. Record: `apps/web/docs/ui-redesign-audit.md` (Phase 6 status, the vocab/History/Reading restyle sections) and `docs/design-system.md` §2 and §6.
- **Merged:**
  - **#98 App icon set.** `apps/web/scripts/generate-app-icons.mjs` draws the H-Space mark and renders `public/icons/*` + `public/favicon.ico`. Wired into layout metadata, the manifest (incl. maskable), `sw.js` (icon + mono badge) and the ten in-app logo spots. Re-run the script; don't edit its outputs.
  - **#99 Vocab review (Memory Lab).** `ReviewSession.tsx` on tokens. Quiz answers to 1–4 + Enter, with a guard so Enter on a focused button can't grade twice (tested). Fixes the results buttons collapsing on phones.
  - **#100 Icon pass.** 305 custom Lucide strokes removed (stroke 2). Exceptions: `Check` ticks at 3, the bottom nav's state stroke, `/finance`. Emoji UI icons → Lucide (`lib/chat-presets.ts` now carries `icon`). Five repeated nav icons made distinct. Quick Switcher icons neutral.
  - **#101 Phase 6a.** Eight dead components deleted. `/interview/script` versions use `Dialog`/`AlertDialog` — no `window.confirm`/`prompt`/`alert` left in `app/` or `components/`.
  - **#102 Phase 6b.** New `components/ui/reader-skeleton.tsx` for the Reading and Notes page loaders. Twelve hand-made empty blocks → `EmptyState`. Planner and Home already complied; the remaining spinners are in-button progress, which is correct.
  - **#103 Landing + brand.** `--brand-from/via/to` + `.text-brand-gradient`/`.bg-brand-gradient` from the icon — marketing surfaces only (design-system §2). Landing restyled. `opengraph-image.tsx` uses the real mark (Node runtime, generated at build).
  - **#104 History** and **#105 Reading** (unit reader + `UnitEditor`) restyled: flat surfaces, divided rows, `primary` accent, success/destructive only for state.
- **How it was merged:** `gh pr merge` is on the `.claude/settings.json` deny list, so the owner ran each merge. #101/#102 had their #100 overlap resolved on their branches first. #103 needed `main` merged in after #100 landed (GitHub flagged it although git merged it cleanly). All eight were rehearsed in order with `git merge-tree` before merging.
- **Verification (merged `main`, 2026-11-08):**
  - `pnpm lint` — 0 errors (5 pre-existing warnings).
  - `pnpm test` — 192 files, 2,075 tests passed.
  - `pnpm build` — passed.
  - GitHub Actions still can't run (billing lock: jobs fail with 0 steps). Vercel previews built every PR.
  - Each PR was checked rendered with Playwright at 390/1280, light and dark, synthetic data, all network mocked. Not done: a physical iPhone/Android install of the new icon, a real push showing the badge, real AI sentence results and audio in Memory Lab, a social-site preview of the share image.
- **PR #106 (`fix/pr-validation`)** began as a combined integration of #98–#104; since those merged individually, after merging `main` it only adds: History's empty-state "Open AI Coach" now opens `/chat` (not `?mode=corrections`, which opens an empty review that can't create a first correction), and Prettier fixes in `apps/web/docs/design-system.md` and `apps/web/scripts/generate-app-icons.mjs`.
- **Untracked, not ours:** `test-results/` at the repo root.

## Current focus

1. Owner: check the production site after the deploys; re-add H-Space to the iPhone home screen for the new icon. Fix the GitHub billing lock so Actions CI runs again.
2. UI audit item 4, remaining screens: Chat leftovers (`ChatWindow`, `RealtimeVoicePanel`, `CorrectionsReview`), Interview (`components/interview/*`), Roadmap, Recovery visuals. The rest of vocab: `SentenceChallenge`, `VocabCard`, `VocabDeck`, `DeckBuilder`.
3. Follow-ups found during the audit:
   - History's "★ 4–5 / ★ 1–3" filters can never match — `toCorrectionReview` (`lib/api/learning.ts`) doesn't map `rating` (or `englishTranslation`). Hide the filters or map the data.
   - `UnitEditor`'s `FieldLabel` is a `<p>`, not a `<label>` — fields are announced by placeholder only.
   - Sign-in app tiles (`components/auth/auth-shell.tsx`) still use one colour per app.
   - The landing's "How it works" image (`public/app-process.png`) needs new artwork (old "H" logo).
   - Phase 6 still open: sweep at all widths in both themes, keyboard pass through dialogs/sheets, `@axe-core/playwright` (owner's OK needed).
4. Carried over: native-speaker pass on `lib/korean-phrasebook/work-seed.ts`; Planner slices 3–10; Finance redesign phases D–F; second-brain T2–T7; MCP auth decision; generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask`, `recovery-coach`.
