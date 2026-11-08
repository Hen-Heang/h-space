# HANDOFF

## Snapshot

- **Updated:** 2026-11-08.
- **Checkout:** `ui/app-icon-set`, branched from `main` at `11a66f8` (PR #97, the reminder handoff fix). Committed and opened as a PR at the owner's request. No migration, API, auth or data change.
- **App icon set** (record: the "app icon set" status under Phase 6 in `apps/web/docs/ui-redesign-audit.md`):
  - **Before:** every icon slot (favicon, Apple touch icon, all manifest entries, push icon and badge) loaded `H Space Icon.png` (1254px, 1.6 MB, artwork inside a black margin). The sized `public/icon-192/512`, `apple-icon` and `favicon-32` PNGs were the old Hengo mark and unreferenced; they're deleted.
  - **Now:** `apps/web/scripts/generate-app-icons.mjs` draws the mark once as SVG and renders every size with Playwright's Chromium into `public/icons/` plus `public/favicon.ico`. Re-run it (`node scripts/generate-app-icons.mjs` from `apps/web`) rather than editing outputs.
  - The crossbar is a shallow wave on purpose: a steep diagonal read as "N" at 16–32px.
  - **Wired in:** `app/layout.tsx` icons, `site.webmanifest` (real sizes + maskable), `sw.js` (192px icon, white mono badge), and the ten in-app logo spots, which now use `icons/h-space-mark.svg` with the wrapper radius matching the mark's 22.5% corner.
  - `H Space Icon.png` stays as source artwork (no longer served); `hengo-icon.png` stays the AI Coach avatar.
- **Verification (2026-11-08):**
  - `pnpm lint`: 0 errors (5 pre-existing warnings).
  - `pnpm test`: 192 files, 2,071 tests passed.
  - `pnpm build`: passed.
  - On `pnpm start`: every icon URL returns 200 with the right content type; head links emitted. Screenshots of the shell sidebar (light/dark), tablet rail, login, 404 and landing show the mark with no CSP errors.
  - Not done: a physical iPhone/Android install, and a real push to see the badge. Existing home-screen installs keep the old icon until re-added.
- **Untracked, not ours:** `test-results/` at the repo root.

## Current focus

1. Owner: review the redrawn mark (`apps/web/public/icons/icon-512.png` and `favicon-32.png` on the branch) and merge the icon PR; then re-add H-Space to the iPhone home screen to pick up the new icon.
2. UI audit follow-ups, in order (from the 2026-11-08 audit):
   - **Vocab review flow:** `components/vocab/ReviewSession.tsx` and related files hold the most off-system styling.
   - **Icon pass:** Lucide stroke 2 (171 icons at 2.5, 71 at 3), Lucide instead of emoji as UI icons (`ReviewSession`, `DeckBuilder`, `ChatWindow`), one colour per meaning.
   - **Screen-by-screen restyle:** History, Reading, Chat leftovers, Interview, Roadmap, Recovery visuals.
   - **Phase 6 consistency pass:** skeletons over the ~98 ad-hoc spinners, `EmptyState` (4 users), `AlertDialog` for the three `window.confirm` calls in `interview/script`, and deleting the 8 dead components.
   - **Landing/brand pass:** the OG image logo and the landing's blue gradients.
3. Carried over: native-speaker pass on `lib/korean-phrasebook/work-seed.ts`; fix the GitHub billing lock so Actions CI runs; Planner slices 3–10; Finance redesign phases D–F; second-brain T2–T7; MCP auth decision; generic-error treatment for `chat/stream`, `goals/coach`, `memory/ask`, `recovery-coach`.
