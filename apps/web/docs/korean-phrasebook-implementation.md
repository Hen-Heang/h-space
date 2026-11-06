# Korean Phrasebook & Q&A Practice System — Implementation Doc

> **2026-11-06:** the "Korean for my work" focus extends this system — a third
> starter pack, optional `work_context` / `provenance` / `source_label` card
> columns, readable filter labels with a compact filter panel, a `work` practice
> mode, and Save to Phrasebook from the analyzer. See
> [`korean-for-work.md`](korean-for-work.md); sections below that say "two
> packs" predate it.

## 1. Current-state audit

The original task brief assumed a codebase shape that does not match this
repository. Before writing any code the following was verified directly
against the source:

| Assumed in brief                                                                  | Actual state in this repo                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/korean-coach` route + `components/korean-coach/`                                | Does not exist. Korean practice is spread across `/practice` (mission hub + daily phrase), `/chat` (AI Coach, modes `analyze`/`generate`/`corrections`), `/vocab`, `/scenarios`, `/interview`, `/listening`.                                 |
| `lib/korean-coach/scenarios.ts`, `schemas.ts`, `tutor-prompt.ts`                  | Don't exist. Closest equivalents: `lib/api/learning.ts` (`scenarioApi`, `dailyPhraseApi`, `messageGenApi`, `listeningApi`), `lib/server/ai.ts` (shared prompt/route plumbing), `app/api/ai/*` routes per feature.                            |
| `AudioRecorder` component + server transcription pipeline                         | Doesn't exist. Speech capture is 100% client-side via the browser Web Speech API, wrapped in `hooks/useSpeechRecognition.ts`. There is no audio upload or server-side STT anywhere in the app — only text transcripts ever reach the server. |
| Inbox feature with a `phrase` item type and conversion actions                    | Does not exist at all — no capture inbox, no item-type union, no conversion pipeline. Closest analog is the plain-markdown `/notes` feature (`lib/api/notes.ts`), which has no "convert" concept.                                            |
| "Ask Hengo" as a retrieval/RAG system over the user's own data, with source links | "Ask Hengo AI" is just the nav label (`components/layout/MoreNavigationSheet.tsx`) for the general streaming AI Coach chat (`/chat`, `app/api/ai/chat/stream/route.ts`). It has no retrieval tool and produces no citations today.           |
| A stored romanization preference (Always / On request / Never)                    | Does not exist. Romanization is a static per-item field (`romanization?: string`) shown whenever present; no user-level toggle anywhere.                                                                                                     |
| Playwright wired for authenticated e2e tests                                      | `@playwright/test` is a `devDependency` but there is no `playwright.config.*`, no `e2e/`/`tests/` directory, and no auth harness. Effectively unused today.                                                                                  |

**Decisions made with the user before implementing** (see below) resolve
each mismatch. Everything else in the brief (SRS reuse, TTS reuse, speech
reuse, RLS model, `kori_` naming, additive-migrations-only, Zod validation,
no raw audio, no exact-string-match grading) matches this repo's existing
architecture and is followed as specified.

### Reused systems (confirmed by reading the actual source)

- **SRS**: `lib/srs.ts` — `applyRating`, `previewIntervalDays`, `isDue`,
  `formatInterval`, `ReviewRating = AGAIN|HARD|GOOD|EASY`. Used unmodified;
  Phrasebook cards store the same `easeFactor/intervalDays/repetitions/lapses`
  shape `kori_vocab_cards` and `kori_corrections` already use.
- **TTS**: `lib/api/tts.ts` (`ttsApi.speak`) + `components/ui/SpeakButton.tsx`
  (object-URL cache, `playbackRate` prop for speed control — the app has no
  server-side "speed" concept, speed is applied client-side to the decoded
  MP3). Phrasebook listening mode reuses `SpeakButton`'s `getCachedAudioUrl`
  helper directly for the 0.75×/1×/1.25× replay control.
- **Speech capture**: `hooks/useSpeechRecognition.ts` (browser
  `SpeechRecognition`/`webkitSpeechRecognition`, `ko-KR`). No new recording
  component is introduced.
- **AI route plumbing**: `lib/server/ai.ts` — `requireUser` (RLS-scoped
  per-request client, no service key), `jsonAiRoute` (zod-validated
  input/output, `generateObject`, usage logging), `learnerProfileBlock`.
- **Corrections notebook**: `lib/server/corrections-store.ts`
  (`persistTurnMistakes`) — Phrasebook speaking-mode mistakes are persisted
  through the same fingerprint-deduped `kori_corrections` upsert path, tagged
  `source_feature: "phrasebook_speaking"`.
- **Mission engine**: `lib/learning/mission-engine.ts` — deterministic,
  no-`Math.random` candidate/weight system; extended additively.
- **Activity logging / Statistics**: `lib/api/progress.ts`
  (`progressApi.logDuration(feature, ms)` + `getFeatureBreakdown`) — grouping
  is by free-text `feature` column, so logging `"phrasebook"` needs no schema
  change and appears in `/statistics` automatically via the existing
  `FeatureBreakdown` component.
- **Rate limiting / usage**: `lib/server/ai-limits.ts` — new AI route
  registered in the `structured` bucket.

## 2. Architecture decisions (confirmed with the user)

1. **Routes**: `/phrasebook`, `/phrasebook/[collectionId]`,
   `/phrasebook/practice`, `/phrasebook/new` — added as a new entry in the
   existing **Learn** nav section (`lib/navigation.ts`), not under a
   nonexistent `/korean-coach`.
2. **Inbox integration**: **deferred**. There is no Inbox feature to extend;
   building one is a separate project. Noted under Deferred Improvements.
3. **Ask Hengo**: implemented as **lightweight context injection** — a
   compact, RLS-scoped summary of the user's due/weak Phrasebook cards is
   spliced into the existing `/chat` system prompt (same pattern as
   `learnerProfileBlock`), not a new retrieval tool with citations.
4. **Romanization preference**: originally implemented as a new
   `kori_profiles.romanization_preference` column plus a Settings control.
   **Superseded — see §2a.**

## 2a. Post-merge correction: romanization has one source of truth

The audit in §1 was performed against a checkout that did not yet contain the
Korean Coach / Inbox / Ask Hengo code — it existed only in the live database
and in an unmerged branch. After that branch was merged, three of the four
decisions above turned out to have a pre-existing implementation:

| Concept      | Pre-existing implementation (now merged)                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| Korean Coach | `/korean-coach/*`, `lib/api/korean-coach.ts`, `lib/korean-coach/schemas.ts`                                       |
| Inbox        | `kori_inbox_items`, `/inbox`, `lib/api/inbox.ts` (has a `converted_to_type`/`converted_to_id` conversion pattern) |
| Ask Hengo    | `/ask-hengo`, `kori_memory_candidates`, `app/api/ai/memory/ask`                                                   |

Only romanization was an outright duplicate, and it was resolved:

- **Single source of truth:** `kori_korean_coach_preferences.romanization_mode`
  (`always | on-request | never`), edited at `/korean-coach/preferences`.
- `hooks/useRomanizationPreference.ts` is the one adapter onto it; Phrasebook
  and `lib/api/daily-study-plan.ts` both read through it.
- The duplicate Settings control was replaced with a link to
  `/korean-coach/preferences` — kept for discoverability, not duplicated state.
- `kori_profiles.romanization_preference` is no longer read by anything and is
  marked deprecated via a SQL `COMMENT`
  (`20260728120000_deprecate_profile_romanization_preference.sql`). It was
  deliberately **not** dropped; that is a separate step once no branch
  references it.

Note the two value spellings differed (`on_request` vs `on-request`); the
coach spelling won, since it was the already-shipped one.

**Still open after the merge:** Inbox → Phrasebook conversion is now actually
buildable (§8 deferred it because no Inbox existed). `kori_inbox_items`
already has `item_type` and `converted_to_type`/`converted_to_id`, so a
"Save to Phrasebook" action would follow the established conversion pattern.

## 3. Database design

All new tables are additive, `kori_`-prefixed, RLS-enabled, owner-only, and
cascade on `auth.users` delete — matching every existing migration's pattern
(see `supabase/migrations/20260721040000_ai_usage.sql` for the reference
shape this follows almost verbatim).

- **`kori_phrase_collections`** — `id, user_id, source_key, title_ko,
title_en, description, category, seed_version, pinned, created_at,
updated_at`. Unique `(user_id, source_key)` where `source_key` is not null,
  so seeded packs are idempotent per user while user-created collections
  (`source_key = null`) are unrestricted.
- **`kori_phrase_cards`** — `id, user_id, collection_id, source_key,
category, situation, difficulty, question jsonb, question_variants jsonb,
answers jsonb, usage_note, vocabulary jsonb, tags text[], position,
active, is_user_edited, created_at, updated_at`. `question`/`answers` shape
  matches the brief exactly (`korean/romanization/english/register[/usageNote]
[/isRecommended]`). `is_user_edited` is the flag that makes seed upgrades
  skip a card without clobbering an edit (see §6).
- **`kori_phrase_progress`** — one row per `(user_id, phrase_id)` (unique
  constraint), same SM-2 fields as `kori_vocab_cards`/`kori_corrections`
  (`state, repetitions, interval_days, ease_factor, lapses, attempt_count,
successful_count, last_grade, last_reviewed_at, next_review_at,
mastered`).
- **`kori_phrase_attempts`** — append-only log, **no audio, ever** — only
  `transcript` (length-capped) and `feedback jsonb` (validated shape from the
  AI route, not free-form).

Indexes: `user_id`, `(user_id, collection_id)`, `(user_id, category)`,
`(user_id, next_review_at)` on progress, `(user_id, created_at)` on
attempts.

## 4. Integration plan (delta from the original brief)

- **Inbox**: skipped this pass (doesn't exist).
- **Today's Mission**: new `phrase_review` `MissionItemType`, additive to the
  existing check constraint and the pure `buildDailyMission` candidate list.
  Completion evidence = a real `kori_phrase_attempts` row or SRS grade
  recorded after mission creation, never "page opened."
- **Ask Hengo**: context-injection only, described above.
- **Progress/Statistics**: reuse `progressApi.logDuration("phrasebook", ms)`
  — zero schema changes needed for the breakdown chart; a Phrasebook-specific
  stats summary (cards learned/due/mastered, listening/speaking attempts,
  communication success rate, weakest situations) is computed from
  `kori_phrase_progress`/`kori_phrase_attempts` and shown on the Phrasebook
  landing page.
- **Korean Coach homepage**: no such page exists; the closest equivalent —
  `/practice` (the mission/practice hub) — gets a Phrasebook card alongside
  its existing Scenario/Message-generator cards.

## 5. Security & privacy notes

- Every new table: RLS on, `revoke all from anon`, single owner-only
  `for all to authenticated using/with check (auth.uid() = user_id)` policy.
- The speaking-evaluation AI route (`app/api/ai/phrasebook/evaluate`) uses
  `requireUser` + the caller's RLS-scoped `db` client to **re-fetch the
  phrase card server-side by id** — the client only ever sends `phraseId` +
  `transcript`; the recommended/alternative answers used for grading always
  come from the authenticated, RLS-scoped read, never from the request body.
  Saved phrase text is interpolated into the prompt as **quoted data**, not
  as instructions, and the model is told explicitly not to follow any
  instructions that appear inside it.
- No raw audio is ever stored or sent to the server — the browser's
  SpeechRecognition API produces text only.
- Feedback is generated by an LLM judging semantic/communicative success from
  a text transcript; it is never labeled or treated as pronunciation/acoustic
  analysis anywhere in code, copy, or tests.
- Rate-limited via the existing `structured` bucket in `lib/server/ai-limits.ts`.

## 6. Seed strategy (idempotency)

`lib/korean-phrasebook/seed.ts` holds the two curated packs as plain data
plus a pure `planSeedUpsert(existingCollections, existingCards, packs)`
function (unit tested) that:

- Matches existing rows by `source_key` (never re-derives identity from
  title text).
- Inserts a collection/card that doesn't exist yet.
- **Never** touches a card whose `is_user_edited` flag is true.
- On a `seed_version` bump, inserts only the cards that are new for that
  version (`seed_version` recorded per card); existing unedited cards are
  left alone unless their own content actually changed the pack defines
  going forward — the current two packs ship as `seed_version: 1`, so
  version-bump behavior is exercised by tests using synthetic v1→v2 fixtures
  rather than real content churn yet.
- `lib/api/phrasebook.ts`'s `ensureSeeded()` calls this plan and only ever
  performs additive inserts, never deletes or blind overwrites.

## 7. Implementation checklist

- [x] Audit + this document
- [x] Domain schemas (Zod) + seed pack data + seed planning logic + tests
- [x] Mastery/due/filter/search pure logic + tests
- [x] CSV/JSON import validation + dedup + tests
- [x] Supabase migration (tables, RLS, indexes, romanization pref, mission
      constraint)
- [x] `lib/api/phrasebook.ts` + barrel export
- [x] Romanization preference (unified onto Korean Coach prefs — see §2a)
- [x] AI evaluation route (`app/api/ai/phrasebook/evaluate`)
- [x] Mission engine `phrase_review` type + evidence check + practice-page link
- [x] Navigation entry + `/practice` homepage card
- [x] Ask Hengo context injection
- [x] Phrasebook pages (landing / collection / practice runner / new)
- [x] Activity logging
- [x] Tests, lint, typecheck, build

## 8. Deferred improvements (explicitly out of scope this pass)

- **Inbox integration** — no Inbox feature exists in this codebase; building
  one is a separate project.
- **Full retrieval-with-citations Ask Hengo tool** — shipped as lightweight
  system-prompt context injection instead; a real tool-call-based retrieval
  system (with per-result links back to the Phrasebook card) is future work.
- **Playwright e2e coverage** — no Playwright harness exists in this repo
  (no config, no auth fixtures); adding one is a prerequisite bigger than
  this feature. Covered instead by unit + component tests.
- **DOCX import** — intentionally not built; the brief's own seed data is the
  source of truth and JSON/CSV import covers the general case.
- **Per-card seed-version content diffing** — the planner supports adding new
  cards on a version bump; it does not attempt to reconcile changed text in
  an already-seeded, unedited card (that would need a content hash per field,
  left as future work if seed packs are revised).
