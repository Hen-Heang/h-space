# H-Space Second Brain — audit, target architecture and plan

Status: **proposal + first slice shipped (uncommitted)**, 2026-11-04. Covers both
repositories (`Hen-Heang/h-space`, `Hen-Heang/h-space-api`). Everything below was
checked against the code on that date (`h-space` @ `b97e468` + working tree,
`h-space-api` @ `96e0122`). Nothing here authorises a migration, a deployment or
an h-space-api change — each such step is called out as needing an owner
decision.

Related records: `apps/web/docs/second-brain-implementation.md` (Phases 1–6 as
built), `apps/web/docs/chatgpt-mcp-integration.md` (MCP server as built),
h-space-api `docs/spring-migration-plan.md` (domain moves, plan of record),
h-space-api `docs/vault-design.md`.

---

## 1. As-is inventory

Legend: **✅ implemented** · **◐ partial** · **✖ broken** · **○ missing**.

### 1.1 Platform

| Capability                                                                               | Status         | Owner / storage                                     | Notes                                                                                                                                       |
| ---------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in (password, email code, Google ID token), TOTP MFA, step-up MFA, refresh rotation | ✅             | h-space-api `security-api`                          | HS512 JWT, 24 h access, 7-day refresh. **A new refresh token revokes every other one** — one session per user. No `aud`/`iss`/scope claims. |
| Supabase token bridge                                                                    | ✅ (temporary) | `POST /api/auth/supabase-token`                     | HS256, `aud=authenticated`, 10 min (cap 15), not revocable. To be deleted in migration Phase 6.                                             |
| Machine credentials (PAT, OAuth client, service token, scopes)                           | ○              | —                                                   | None exist. No non-browser client can authenticate with a scoped, long-lived credential.                                                    |
| Security audit log                                                                       | ✅             | h-space-api `audit_logs`                            | 28 auth/MFA/vault event types. No data-access, inbox or finance events.                                                                     |
| AI usage + rate limits                                                                   | ✅             | Supabase `kori_ai_usage`, `lib/server/ai-limits.ts` | Per-user rolling 24 h buckets. Metadata only, never prompt text.                                                                            |
| MCP tool audit                                                                           | ✅             | Supabase `kori_mcp_audit`                           | Shape only (tool, client, kind, outcome, timing).                                                                                           |

### 1.2 Domains

| Domain                                                 | Status              | Authoritative backend today                                                                                               | Notes                                                                                                                                                        |
| ------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Goals, tasks, key results, plan phases, schedule rules | ✅                  | Supabase (Orbit-shared `goals`/`tasks` + H-Space tables)                                                                  | Health is computed live (`lib/goal-health.ts`); the stored `goals.health_status` is never written.                                                           |
| Goal reviews, goal evidence                            | ◐                   | Supabase `goal_reviews`, `goal_evidence`                                                                                  | Tables + API exist; no UI writes either.                                                                                                                     |
| Inbox (Quick Capture)                                  | ◐                   | Supabase `kori_inbox_items` (default) **or** hub-api `/api/hub/inbox-items` behind `NEXT_PUBLIC_DATA_SOURCE_INBOX=spring` | Built in both; cutover pending. With the flag on, reminders can't attach to inbox items. Triage is fully manual.                                             |
| Inbox → note/task/journal conversion                   | ◐                   | target domain's backend                                                                                                   | Two non-atomic writes; Supabase `markConverted` ignores errors; note conversion records no `converted_to_id`; task conversion is always "today".             |
| Notes + note projects                                  | ✅                  | Supabase `kori_notes`, `kori_note_projects`                                                                               | English-config FTS. No goal/task link picker.                                                                                                                |
| Journal, manual activities, timeline                   | ✅                  | Supabase                                                                                                                  | Timeline is a client-side merge.                                                                                                                             |
| Habits                                                 | ✅                  | Supabase `kori_habits`                                                                                                    | Separate from Recovery's `kori_focus_habits`.                                                                                                                |
| Reminders                                              | ◐                   | Supabase `kori_reminders` + `pg_cron` → `kori_dispatch_push` → Telegram / `kori-send-push` Edge Function                  | Edge Functions are not version-controlled; `last_sent_at` means attempted, not delivered; send errors are swallowed.                                         |
| Morning / Evening / Weekly review                      | ✅ (fixed in §8)    | client-side aggregation (`lib/review.ts`) + `app/api/ai/review/summarize`                                                 | AI summary is not persisted. Goal-attention list was **broken until this slice** (§8).                                                                       |
| Ask Hengo (memory retrieval)                           | ✅                  | `lib/server/memory-retrieval.ts` over Supabase (+ hub-api inbox when flagged)                                             | FTS only (embeddings deliberately deferred). Memory candidates need approval. No unit tests for retrieval.                                                   |
| H-Vault                                                | ✅ (review pending) | hub-api `/api/hub/vault`, ciphertext only                                                                                 | Live since 2026-11-01; independent security review still open.                                                                                               |
| Finance                                                | ◐ (moving in)       | Neon `luyra` DB via `apps/web/app/api/finance/*`; `finance-api` Spring module implemented but not cut over                | `apps/luyra` stays the rollback.                                                                                                                             |
| Notion capture                                         | ✅ (opt-in)         | Notion API from `app/api/integrations/notion/capture`                                                                     | Off unless env + `NEXT_PUBLIC_NOTION_CAPTURE_ENABLED`.                                                                                                       |
| MCP server (`/mcp`)                                    | ✖ end-to-end        | Next.js, Supabase OAuth as authorization server                                                                           | Code is solid (7 read + 7 gated write tools, audit, rate limits, ownership gates, 6 test files) but **no current user can obtain a valid token** — see §4.1. |

### 1.3 Summary

The second-brain loop (capture → process → recall → review) exists and is used
daily. The weak points are **correctness of the signals feeding the reviews**,
**manual triage**, **MCP authentication after the move to Spring sign-in**, and
**two backends per domain during the Supabase → Spring migration**.

---

## 2. Target architecture

### 2.1 Principles

1. **One authoritative backend per domain**, following h-space-api's
   `spring-migration-plan.md`. AI code never keeps its own copy of domain data.
2. **AI orchestration stays in Next.js** (`app/api/ai/*`, `/mcp`). Spring owns
   data, identity and authorization; it does not call models (the planned
   finance "money coach" is the only proposed exception and needs its own
   decision).
3. **One of each**: one chat, one retrieval layer, one MCP server, one
   approval mechanism. New features extend them; they never fork them.
4. **AI proposes, the user approves, the domain owner executes.** No AI path
   writes to a domain without an explicit user action, except the existing,
   flag-gated MCP write tools acting on a user's own direct request.

### 2.2 Domain ownership (current → target)

| Domain                                              | Now                          | Target (owner)                        | Gate                      |
| --------------------------------------------------- | ---------------------------- | ------------------------------------- | ------------------------- |
| Identity, MFA, sessions                             | security-api                 | security-api                          | —                         |
| H-Vault                                             | hub-api                      | hub-api — **never reachable from AI** | security review           |
| Inbox                                               | Supabase (flag → hub-api)    | hub-api                               | migration Phase 1 cutover |
| Notes, journal, memories, habits, manual activities | Supabase                     | hub-api                               | Phase 2                   |
| Reminders + delivery                                | Supabase `pg_cron`           | hub-api `@Scheduled`                  | Phase 2b                  |
| Goals, tasks                                        | Supabase (Orbit-shared)      | hub-api                               | Phase 3                   |
| Finance                                             | Neon via Next.js `finance/*` | `finance-api` (D-1)                   | Luyra cutover             |
| AI calls, retrieval assembly, workflows, MCP        | Next.js                      | Next.js                               | —                         |

### 2.3 Layers

```
 Clients: web app · Claude/ChatGPT via MCP
            │                         │
            ▼                         ▼
   app/api/ai/* (in-app AI)       /mcp (tools)          ← Next.js, server-only
            │                         │
            └──────┬──────────────────┘
                   ▼
   lib/server/context/   — context providers, one per domain, + exclusion policy
   lib/server/operations/ — typed domain operations (read | write), shared by
                            in-app proposals and MCP tools
                   │
         ┌─────────┴───────────┐
         ▼                     ▼
   Supabase (RLS, per-request    h-space-api hub-api / finance-api
   bridge-token client)          (user's own JWT; service-layer ownership)
```

- **Context retrieval.** Each domain gets one _context provider_
  (`(principal, query, limits) → RetrievedItem[]`) that reads from that
  domain's authoritative backend — the switch that `memory-retrieval.ts`
  already does for the inbox, made general. Ask Hengo, Daily Focus, Weekly
  Review and MCP read tools all use the same providers, so a domain moving to
  Spring changes one provider, not four features. The provider registry is
  where AI exclusions are enforced (§6.5): an excluded domain simply has no
  provider.
- **Tool orchestration.** Domain writes are defined once as operations with
  zod input schemas and a `kind` (`read`, `write`, `destructive`). MCP tools and
  in-app AI proposals are thin adapters over them. `destructive` operations are
  never exposed to AI.
- **Workflow execution.** A workflow is a deterministic, request-scoped
  pipeline: gather context → optional single structured model call →
  **proposals** → user approves each one → operations execute → audit row. No
  long-running agents and no unattended writes. Scheduling reuses reminders
  ("your Weekly Review is ready") — it never auto-executes a workflow.
- **Identity for MCP.** The target is h-space-api as the OAuth 2.1
  authorization server (§4.1), so the MCP server verifies an h-space-api token
  bound to its own audience and scopes. The temporary bridge must not become
  the permanent MCP data path.

---

## 3. Roadmap, by daily usefulness

| #   | Item                                                                                              | Why it matters daily                                                                                    | Size | Needs decision?                 |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| 1   | **Reviews flag the right goals** (live health) + review prompt hardening                          | Morning Brief and Weekly Review are opened daily/weekly; they silently showed "nothing needs attention" | S    | No — **shipped in §8**          |
| 2   | Daily Focus v1: top-3 picks with reasons on Morning Brief and Home                                | Turns the brief from counts into "do these three"                                                       | S    | No                              |
| 3   | Smart Capture v1: AI triage suggestion with one-tap approval                                      | Inbox items pile up because triage is manual                                                            | M    | No (new AI route, no migration) |
| 4   | Inbox conversion robustness (date/goal choice, error handling, idempotency)                       | Conversion is the inbox's main job; failures leave duplicates                                           | S    | No                              |
| 5   | Weekly Review v2: per-goal review saved to `goal_reviews`                                         | Makes weekly review leave a record; table already exists                                                | M    | No migration; UI scope decision |
| 6   | MCP truthfulness (instructions, consent copy, route header) + an explicit "MCP unavailable" state | Today clients are told the wrong tool set                                                               | S    | No                              |
| 7   | Shared context providers + retrieval tests                                                        | Prerequisite for every AI feature to stay correct as domains move                                       | M    | No                              |
| 8   | MCP authentication via h-space-api OAuth                                                          | Unlocks Claude/ChatGPT access to the second brain                                                       | L    | **Yes** (Spring auth design)    |
| 9   | Inbox cutover to hub-api; reminders for hub-api items                                             | Finishes migration Phase 1                                                                              | M    | **Yes** (data copy)             |
| 10  | Retrieval quality for Korean/Khmer text (FTS config)                                              | Mixed-language notes are under-retrieved                                                                | M    | **Yes** (Supabase migration)    |
| 11  | Reminder delivery observability                                                                   | Know when a reminder did not arrive                                                                     | M    | Partly (Edge Function source)   |
| —   | Deferred: embeddings, autonomous agents, any work/corporate data                                  | Not justified yet / out of scope                                                                        | —    | —                               |

---

## 4. Gap analysis

### 4.1 MCP authentication — **broken end-to-end**

- `/mcp` trusts **Supabase Auth's OAuth 2.1 server** (`lib/mcp/config.ts`,
  `lib/mcp/auth.ts`): ES256/RS256 tokens whose `aud` is the MCP resource URL
  (set by a Custom Access Token Hook), with an allowed `client_id`.
- Users now sign in to **h-space-api**, not Supabase Auth. The consent page
  (`app/(main)/oauth/consent/page.tsx`) calls `supabase.auth.oauth.*`, which
  throws whenever the browser client uses the bridge's `accessToken` option
  (`apps/web/AGENTS.md` lists it as a known casualty).
- The bridge token could not stand in either: it is HS256 with
  `aud=authenticated` and no `client_id`, so the verifier rejects it — correctly.
- h-space-api has no OAuth client, PAT, scope or audience concept, and its
  single-refresh-session rule would log the browser out if a second client
  signed in with the same user's credentials.

**Options** (owner decision):

| Option                                                                                                                                                                                                    | Effort | Notes                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| A. h-space-api becomes an OAuth 2.1 AS (auth code + PKCE, pre-registered clients, `aud` = MCP resource, scopes `hspace.read`, `hspace.capture`, `hspace.plan`, ES256 + JWKS, per-client refresh sessions) | L      | **Recommended.** Matches the plan's "asymmetric signing + JWKS" open item and keeps one identity provider. |
| B. Per-user personal access tokens (hashed, scoped, expiring, revocable, created behind step-up MFA)                                                                                                      | M      | Simpler; works for Claude Code/desktop clients; ChatGPT connectors need OAuth.                             |
| C. Revive Supabase Auth sessions alongside Spring                                                                                                                                                         | M      | Rejected: a second identity provider.                                                                      |

Either A or B also needs a data path for Supabase-owned domains until they move.
The only safe interim is a **scope-limited server-side exchange** for a bridge
token, time-boxed to the Supabase migration. That is an explicit, recorded
exception to "don't expand the bridge" — not a default.

### 4.2 Outdated tool descriptions

| Where                                                                                | Says                                                         | Reality                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `lib/mcp/server.ts` `MCP_SERVER_INSTRUCTIONS` (sent to every client at `initialize`) | Only `get_hengo_server_info` exists; cannot read goals/tasks | 7 read tools always, 7 write tools when `MCP_WRITE_ENABLED=true` |
| `lib/mcp/server.ts` header comment                                                   | "still holds only the one foundation tool"                   | as above                                                         |
| `app/mcp/route.ts` header                                                            | "No Supabase query is issued by any tool yet"                | every domain tool queries Supabase                               |
| `app/(main)/oauth/consent/page.tsx`                                                  | "six read tools"                                             | seven                                                            |
| `apps/web/docs/chatgpt-mcp-integration.md`                                           | "Status: implemented", OAuth via Supabase                    | implemented but unreachable (§4.1)                               |

Wrong `instructions` are a correctness and safety issue: a model told "this
server holds no user data" may disbelieve real tool output, or describe
capabilities to the user wrongly. **Fixed by T6 (2026-11-04):** instructions are
now built per connection from `READ_TOOL_NAMES` / `WRITE_TOOL_NAMES`, a test fails
if they differ from `tools/list`, and the comments and MCP doc state the auth gap.

### 4.3 Existing memory retrieval

Strengths to keep: RLS-scoped client, `<user_data>` framing, server-side
citation resolution, approval-gated memory candidates, inbox source switch.

Gaps:

1. **No tests** for `retrieveMemoryContext` / `formatRetrievedContext`.
2. **`</user_data>` is not neutralised** inside retrieved text, so a stored note
   can close the block early. The helper added in §8 (`lib/server/user-data.ts`)
   fixes this for the review route; Ask Hengo should adopt it (T7).
3. **Stale goal health**: retrieval cites `goals.health_status`, which is always
   the `not_started` default — the model is told every goal is "not started".
4. **The latest 5 journal entries go into every prompt**, whatever the question.
   That is a privacy cost for questions unrelated to the journal.
5. **English-only FTS config** on notes/inbox/journal: likely weak for Korean
   and Khmer text (to verify before changing; changing it is a migration).
6. **Hard-coded per-domain queries**: every domain move to Spring means editing
   this file (the providers in §2.3 address this).
7. Corrections and learning data are always included, whatever the question.

### 4.4 Cross-backend data access

- **Two possible owners for the inbox** at runtime (flag). Ask Hengo handles it;
  reminders, note-conversion links and MCP do not (MCP has no inbox tools).
- **Token plumbing**: AI routes authenticate with the bridge token and must
  also receive the user's h-space-api token (`x-hspace-token`) to reach hub-api.
  Every new cross-backend read needs both, and MCP has neither model yet.
- **No cross-database integrity**: hub-api `inbox_items.goal_id` has no FK
  (goals live in Supabase); `kori_notes.inbox_item_id` has an FK to the
  Supabase table, so it cannot point at a hub-api item.
- **Ownership semantics differ**: Supabase RLS lets goal _members_ write tasks;
  hub-api is owner-only (404). AI write paths must use the stricter rule —
  already done in `lib/mcp/tools/ownership.ts`.
- **Finance** is a third store (Neon), reached only through
  `requireFinanceUserId`. It stays outside AI context until there is a
  separate decision.

---

## 5. Workflow designs

All three share one shape: **gather (read-only, owner backends) → compute
(pure `lib/*`, tested) → optional single model call (`<user_data>`) →
proposals → explicit approval → execute through existing APIs → audit**.

### 5.1 Smart Capture

- **Trigger:** the user taps "Suggest" on an inbox item, or opts into
  suggestions at capture time. Never automatic in the background.
- **Inputs:** the item (title, content, type, tags, from the inbox's current
  owner); the names and ids of the user's active, _owned_ goals.
- **AI step:** `POST /api/ai/inbox/suggest` (new, `structured` bucket). It
  returns `{ target: note|task|journal|keep, title, dueDate?, goalId?, tags[],
reason }`. Server-side, `goalId` is validated against the goal list sent
  in, and an invented id is dropped.
- **Approval:** the suggestion is shown inline as an editable chip row ("Task
  · due Fri · Goal: TOPIK II · [Apply] [Edit] [Dismiss]"). **Apply** calls the
  existing `inboxApi.convertTo*` with the chosen values.
- **Writes:** only via the existing conversion paths. `source` stays the
  user's; nothing is written if the user dismisses.
- **Exclusions:** item text only. No journal/vault/recovery/finance context.
- **Failure:** model error → toast, item unchanged. Rate limit → 429 message.
- **Tests:** pure suggestion → conversion-payload mapping; route 401/400/429;
  invented goal ids are stripped; `<user_data>` wrapping; UI applies only after
  a click.

### 5.2 Daily Focus

- **Trigger:** opening Morning Brief or Home; optional reminder ("Daily Focus
  is ready") using the existing reminders path.
- **Inputs:** today's/overdue tasks, live goal health (fixed in §8), due
  reminders, pending habits, the inbox backlog count.
- **Compute (no AI):** `lib/daily-focus.ts` ranks at most three picks. The
  order: overdue tasks under goals that need attention, then other overdue
  tasks, then today's scheduled tasks under at-risk goals, then due
  reminders. Each pick carries a short reason ("overdue 2 days · goal at
  risk").
- **AI step (optional):** the existing review summary turns the picks into one
  encouraging sentence. The ranking itself is deterministic, so it is
  explainable and testable.
- **Approval / writes:** none needed to view. "Start" or "Done" on a pick uses
  the existing task actions.
- **Tests:** ranking table tests (ties, empty day, all-done day, timezone
  boundaries); the view renders ≤3 picks on 375 px without overflow.

### 5.3 Weekly Review

- **Trigger:** `/review/weekly`; a weekly reminder.
- **Inputs:** the week's timeline summary, habit completion, live goal health,
  open inbox count, proposed memory candidates waiting for approval.
- **Steps:**
  1. Summary (exists).
  2. **Per-goal check-in** for each goal needing attention: keep / adjust
     target date / pause, plus a one-line note. Saved to the existing
     `goal_reviews` table (no migration).
  3. **Inbox sweep**: "N items older than 7 days — process or archive".
  4. **Memory review**: approve or reject proposed memories (existing UI).
- **AI step:** optional suggestion per goal ("adjust the target date — 25
  days past deadline"). The user decides and submits each change.
- **Writes:** `goal_reviews` rows and goal edits — each one explicitly
  submitted.
- **Tests:** pure review-builder tests; a `goal_reviews` API test with
  synthetic data; an e2e smoke on a synthetic account.

---

## 6. Security design

### 6.1 Personal vs work data

- H-Space is a **personal** space. It never connects corporate systems (mail,
  chat, repositories, ticketing) and never imports work documents. This is a
  product rule, not a filter.
- Captures may _mention_ work in the owner's own words. If that later needs
  separating, add a user-set `context: personal | work` label on capture-type
  records. The AI context policy then excludes `work` by default. Not built;
  it needs a migration decision.
- No AI provider receives data from Finance or Vault, whatever the label.

### 6.2 Least-privilege tools

| Tier                      | Examples                                               | Exposure                                                            |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Read, low sensitivity     | today overview, goals, tasks, learning progress        | MCP read scope; in-app AI context                                   |
| Capture (append-only)     | capture inbox item, capture reflection, capture phrase | MCP write scope `hspace.capture`; dedupe window                     |
| Plan (modify own records) | create/update task or goal, complete task              | MCP write scope `hspace.plan`; owner-only, never goal-member rights |
| Destructive               | delete anything, archive goals                         | **never exposed to AI**                                             |
| Excluded domains          | vault, recovery, finance, raw journal reads over MCP   | no tool, no provider                                                |

Every tool derives the user from the verified token, never from an argument;
inputs are zod-bounded; outputs are capped.

### 6.3 Explicit approvals

- In-app AI produces **proposals**; the execution is a separate user click that
  calls the normal domain API with the user's session. The model never holds a
  write capability in-app.
- MCP write tools act only on a direct user request in the client, are off by
  default (`MCP_WRITE_ENABLED`), and are rate-limited and audited. Clients
  show their own per-call confirmation for non-read-only tools (annotations
  are already set accurately).
- Sensitive account actions (vault reset, MFA changes, future token creation)
  require h-space-api step-up MFA — never reachable from AI.

### 6.4 Access control and audit

- Authorization is server-side only: RLS for Supabase domains, service-layer
  ownership (ArchUnit-enforced) for hub-api/finance-api,
  `requireFinanceUserId` for Neon. UI guards are UX.
- Audit, shape only, never content or tokens:
  - `kori_mcp_audit` for MCP tool calls;
  - `kori_ai_usage` for model calls;
  - h-space-api `audit_logs` for auth, MFA and vault events.
- Gap: no audit of AI-proposal approvals. Add a `feature`-tagged usage row per
  applied proposal (no migration), and a hub-api event type once domains move.
- MCP tokens (§4.1 option A or B) must be revocable per client, listed in
  Settings, and audited on issue/use/revoke.

### 6.5 AI exclusions

| Data                                                    | In-app AI                                     | MCP                               | Rule                                                               |
| ------------------------------------------------------- | --------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| H-Vault (any field, incl. service names)                | **never**                                     | **never**                         | `.claude/rules/vault.md`; only `v2.` ciphertext leaves the browser |
| Credentials, tokens, MFA/recovery codes, env values     | never                                         | never                             | AGENTS.md                                                          |
| Finance records                                         | never (until a separate decision)             | never                             | Neon stays behind `requireFinanceUserId`                           |
| Recovery (`kori_focus_*`)                               | only its own coach route                      | never                             | domain-neutral rule                                                |
| Journal                                                 | Ask Hengo (recent 5 + FTS) — to narrow (§4.3) | write-only (`capture_reflection`) |                                                                    |
| Notes, inbox, goals, tasks, habits, memories (approved) | yes, `<user_data>`                            | goals/tasks read; capture writes  |                                                                    |

Prompt-injection controls: `<user_data>` blocks with tag neutralisation
(`lib/server/user-data.ts`), a data-not-instructions system rule, citations
resolved server-side, structured outputs validated by zod, no model-chosen
ids trusted without checking them against what was retrieved.

---

## 7. Incremental implementation plan

Each task is one small PR (feature branch, owner merges). "Rollback" assumes no
data migration unless stated.

| ID        | Task                                                                                                                 | Acceptance criteria                                                                                                                           | Unit tests                                           | Integration tests                                                  | Rollback                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| **T1** ✅ | Reviews use live goal health; review prompt in `<user_data>`                                                         | Morning/Weekly list the goals the Goals page marks attention/at risk/blocked, most severe first; the route wraps context and neutralises tags | `lib/review.test.ts`, `lib/server/user-data.test.ts` | `app/api/ai/review/summarize/route.test.ts` (401/400/prompt shape) | revert the PR                                                |
| T2        | Daily Focus v1 (`lib/daily-focus.ts`, Morning Brief + Home card)                                                     | ≤3 picks with reasons; empty/all-done states; 375–1440 px clean                                                                               | ranking tables                                       | component test for states                                          | revert; no data                                              |
| T3        | Inbox conversion hardening: pick date + goal for task; surface `markConverted` errors; record note `converted_to_id` | No silent failure; retry doesn't duplicate (checks `convertedToId`)                                                                           | `lib/inbox.test.ts` payloads                         | `lib/api/inbox` with fake client, both stores                      | revert                                                       |
| T4        | Smart Capture route `app/api/ai/inbox/suggest`                                                                       | 401/400/429 paths; invented goal ids dropped; no write server-side                                                                            | suggestion → payload mapper                          | route test like T1's                                               | remove route + button                                        |
| T5        | Smart Capture UI on `InboxItemCard`                                                                                  | Suggest → editable chips → Apply uses existing conversion; keyboard/mobile ok                                                                 | —                                                    | component test: nothing applied without click                      | hide button                                                  |
| **T6** ✅ | MCP truthfulness: instructions, headers, consent copy, doc status; derive tool count from the registry               | `initialize` instructions list the real tools; test asserts instructions mention every registered tool                                        | `lib/mcp/server.test.ts`                             | drift guard over the real `tools/list` per surface                 | revert                                                       |
| T7        | Ask Hengo uses `userDataBlock`; tests for `memory-retrieval`; stop citing stored health; journal only on match       | Retrieval tests cover each source, the inbox switch and exclusions                                                                            | new `memory-retrieval.test.ts`                       | ask route test (prompt shape, citation resolution)                 | revert                                                       |
| T8        | Context-provider registry (`lib/server/context/*`) with the exclusion list; Ask Hengo + reviews move onto it         | No behaviour change; excluded domains have no provider (tested)                                                                               | registry tests                                       | ask route test unchanged                                           | revert                                                       |
| T9        | Weekly Review v2 per-goal check-in → `goal_reviews`                                                                  | Each submitted review creates one row for an owned goal only                                                                                  | builder tests                                        | API test vs synthetic data; e2e smoke                              | hide step; rows remain harmless                              |
| T10       | **Decision doc** for MCP auth (option A vs B) in h-space-api                                                         | Owner picks; threat model written                                                                                                             | —                                                    | —                                                                  | —                                                            |
| T11       | h-space-api: chosen MCP credential + JWKS + scopes (several PRs)                                                     | Token bound to MCP audience/scopes; revocable; audited; doesn't end browser session                                                           | JUnit                                                | `@SpringBootTest` + real Postgres, denial paths                    | feature flag off; keys rotate                                |
| T12       | `/mcp` verifies h-space-api tokens; scope → tool gating                                                              | Wrong aud/scope/expired → 401; capture vs plan scopes gate tools                                                                              | `lib/mcp/auth.test.ts` extended                      | MCP Inspector + two-account manual check                           | env switch back; tools stay off                              |
| T13       | Inbox cutover to hub-api (+ reminders for hub-api items)                                                             | Row counts reconcile; rollback flag tested                                                                                                    | —                                                    | copy dry-run on non-prod                                           | flag off (Supabase untouched) — **needs migration approval** |

T10–T13 change h-space-api or live data and each needs an explicit owner
go-ahead.

---

## 8. First slice (T1) — shipped in the working tree

**Why this one:** Morning Brief and Weekly Review are the existing surfaces for
two of the three target workflows, and they were silently wrong.
`goalsNeedingAttention` filtered on the stored `goals.health_status`, which
nothing writes (it keeps its `'not_started'` default). So both reviews always
reported that no goal needed attention, while the Goals page and Home — which
compute health live — showed goals at risk or blocked. Daily Focus and Weekly
Review can't be built on a signal that is never set. The fix needs no
migration, no new AI surface and no backend change.

**Changes**

- `apps/web/lib/review.ts` — `goalsNeedingAttention(goals, now)` computes health
  live with `computeListGoalHealth` (the same engine as the Goals list), returns
  copies carrying the live `health_status`/`health_reason` (inputs untouched),
  and sorts blocked → at risk → attention. `buildWeeklyReviewSummary` takes an
  optional `now`.
- `apps/web/lib/server/user-data.ts` (new) — `userDataBlock`,
  `neutralizeUserDataTags`, `USER_DATA_SYSTEM_RULE`: the shared way to put
  user-authored text into a prompt so it can't close the block early.
- `apps/web/app/api/ai/review/summarize/route.ts` — the review context (which
  contains task/goal/habit/reminder names) now goes to the model inside a
  neutralised `<user_data>` block with the data-not-instructions rule.
  Previously it was sent bare, and the system prompt claimed it held "never raw
  personal content".
- Tests: `lib/review.test.ts` (live health, stale-column cases in both
  directions, severity order, no mutation, completed/archived excluded, brief +
  weekly + AI context), `lib/server/user-data.test.ts`, and the first AI-route
  test, `app/api/ai/review/summarize/route.test.ts` (prompt shape with a hostile
  closing tag, no-session and invalid-session 401s, three 400 cases, usage
  logged without content).

**User-visible behaviour:** Morning Brief and Weekly Review now list the same
goals, with the same labels, as the Goals page, most severe first. The AI
summary and focus suggestion can therefore name them. A goal with tasks but no
key results is flagged "Needs attention", exactly as the Goals list already
shows it.

**Security:** no new data leaves the browser; the same counts and names already
reached the model. Prompt-injection resistance is improved for this route.

**Rollback:** revert the commit. No data, schema, environment or deployment
change.
