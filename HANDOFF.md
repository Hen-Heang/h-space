# HANDOFF

## Snapshot

- **Updated:** 2026-11-04.
- **Checkout:** `feat/second-brain-foundations`, cut from `origin/main` at `764d29f` (typography PR #82 and the Finance PRs #77–#81 already merged). It holds slices T1 and T6 plus the audit doc, committed and pushed for a PR at the owner's request. No migration or h-space-api change was made.
- **Second-brain audit + plan:** `docs/SECOND_BRAIN_ARCHITECTURE.md` covers both repos: as-is inventory, target architecture (one owner per domain, shared context providers, propose → approve → execute), roadmap, gap analysis, Smart Capture / Daily Focus / Weekly Review designs, security design, and tasks T1–T13.
- **Slice T1 shipped (uncommitted):** Morning Brief and Weekly Review now flag goals by **live** health (`computeListGoalHealth`, most severe first) instead of the never-written `goals.health_status` column, which made both reviews always report that no goal needed attention. The review AI route now sends its context inside a neutralised `<user_data>` block (new `apps/web/lib/server/user-data.ts`). Files: `apps/web/lib/review.ts`, `lib/review.test.ts`, `lib/server/user-data.ts` (+ test), `app/api/ai/review/summarize/route.ts` (+ first AI-route test), `apps/web/docs/second-brain-implementation.md`, `docs/SECOND_BRAIN_ARCHITECTURE.md`.
- **Slice T6 shipped (uncommitted):** the MCP server's `initialize` instructions are now built per connection (`buildServerInstructions(surfaceFor(ctx))` in `apps/web/lib/mcp/server.ts`) from `READ_TOOL_NAMES`/`WRITE_TOOL_NAMES` (`lib/mcp/tools/index.ts`). They used to say only `get_hengo_server_info` existed. `lib/mcp/server.test.ts` fails if the instructions and `tools/list` ever disagree. Stale comments fixed in `app/mcp/route.ts` and the consent page; `apps/web/docs/chatgpt-mcp-integration.md` now flags that MCP is unreachable since sign-in moved to h-space-api.
- **Verification (T1):** `pnpm test:web` passed (166 files, 1,880 tests); `pnpm build:web` passed (with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`); `pnpm lint:web` showed 0 errors and 5 pre-existing warnings; `tsc --noEmit` was clean. No browser check of `/review/*` was run.
- **Untracked, not ours:** an empty file named `false` at the repo root (created 17:48) and `luyra-web/`. Left untouched.

## Current focus

1. Owner review of `docs/SECOND_BRAIN_ARCHITECTURE.md`, then commit T1 on a feature branch.
2. Next small slices, no migrations needed: T2 (Daily Focus), T3 (inbox conversion hardening), T4/T5 (Smart Capture), T7 (Ask Hengo `userDataBlock` + retrieval tests).
3. Owner decision needed before T10–T13: how MCP authenticates now that sign-in is h-space-api (`/mcp` is unreachable end to end — §4.1 of the doc), and the inbox cutover.
