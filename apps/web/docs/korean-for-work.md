# Korean for my work — implementation record

A focus inside Hengo Learning for workplace Korean: understand a work message,
find the required action, reply in 1–3 polite sentences, save the useful parts,
and practice them in today's plan. It **connects existing pieces** (analyzer,
Phrasebook, corrections, SRS, Today's Mission, TTS, speech hook) rather than
adding a new course or a seventh Learning destination.

Built 2026-11-06 on `feat/work-korean-focus`. All examples here are generic and
written for this app.

## What the learner can do

1. **Analyzer** (`/chat?mode=analyze`) — paste a message. The editable box is
   exactly what's sent to the AI. Likely-private fragments (links, emails, IPs,
   phone/ID numbers, tokens, ticket IDs, SQL) are flagged, and one click swaps
   them for placeholders. This is a convenience, not complete redaction, and
   the UI says so. Results are main-point first:
   1. What it means — the main point, then what to do: action, conditions,
      deadline ("Not stated" when absent), expected result, and unknowns with a
      clarifying question.
   2. My reply — one short 해요체/합니다체 reply, hidden until asked for.
   3. Useful language — 3–5 items.
   4. Practice this — the learner writes their own reply, optionally with an
      English "what I mean".
   5. Details, collapsed — literal and natural translation, "likely
      interpretation (not stated)", politeness, tone, key phrases, other
      replies, source.

   **Save to Phrasebook** opens an editable draft and nothing is written until
   **Save card**. The message is saved as _quoted_ if unchanged and as
   _paraphrased_ once edited. The reply is always _AI-suggested_.

2. **Phrasebook** (`/phrasebook`) — search stays visible. Categories are chips
   with readable labels. Situation and Difficulty moved into a searchable
   **Filters** popover (desktop) or bottom sheet (phones, under 1024px), with an
   active count, removable chips and Clear all. Stored keys don't change; only
   the labels (`lib/korean-phrasebook/labels.ts`). A new starter pack, **Korean
   for my work**, has 25 cards; saved messages go to the learner's private **My
   work messages** collection.
3. **Work-message practice** (`/phrasebook/practice?mode=work[&phraseId=]`) —
   the situation and "why this is useful" come first. Then listen at 0.75× or
   1× (never autoplay), reveal the text if needed, and check understanding.
   The reply can be typed, or spoken and then corrected. Feedback checks
   meaning first and is always labelled as text-based, never a pronunciation
   score. The model reply stays hidden until the learner has tried or asks.
4. **Learning Hub** (`/learn`) — a compact **Korean for my work** card (analyze
   a message, practice replies). With the goal set to _Workplace Korean_,
   Today's plan includes one work-message step. The review backlog stays
   visible as secondary text ("N words are due in total…").

## Data ownership and contracts

Learning data stays in **Supabase under RLS**, reached through the existing
token bridge. No h-space-api change was needed: Learning is phase 4 of the
Spring migration plan and hasn't started.

| Data                                           | Where                                                        | Notes                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Saved work message + reply + 3–5 vocab         | `kori_phrase_cards` (one row)                                | `source_key = capture-<hash(message, reply)>`, collection `source_key = user-work-messages` |
| Comprehension notes, provenance, private label | `kori_phrase_cards.work_context / provenance / source_label` | migration `20261106120000_work_korean_focus.sql`                                            |
| Reply attempts (mission evidence)              | `kori_phrase_attempts`                                       | `practice_mode = speak`, `input_method = text \| voice`                                     |
| Meaningful mistakes                            | `kori_corrections`                                           | existing fingerprint dedup (`user_id, fingerprint` unique)                                  |
| Work step                                      | `kori_daily_mission_items.item_type = work_message`          | same migration widens the check                                                             |
| Raw analyzed text                              | **not stored** by default                                    | `kori_analyzer_history` only when "Keep this message in my analyzer history" is on          |

**API changes (additive, backward compatible):**

- `/api/ai/analyzer` output adds `mainPoint`, `requiredAction`, `conditions`,
  `deadline`, `expectedResult`, `unknowns`, `clarifyingQuestion`,
  `recommendedReply`, `usefulLanguage` and `messageRomanization`.
  - All earlier fields are unchanged.
  - `MessageAnalysis` makes the new fields optional, so old history rows still
    render.
  - The schema and size caps (`finalizeAnalysis`) are in
    `lib/ai/schemas/analyzer.ts`.
  - The client validates `done` and treats partials as display-only.
- `/api/ai/phrasebook/evaluate` input takes optional `intendedMeaning` and
  `inputMethod`, and the output adds `meaningPreserved` and `pattern`.
- `/api/ai/corrections/check` input takes optional `intendedMeaning` and
  `replyingTo`, and the output adds `meaningPreserved`, `meaningNote` and
  `pattern`.
- `jsonAiRoute` and the analyzer stream no longer forward provider error text,
  only our own validation messages.

## Security and privacy

- **Authorization is unchanged.**
  - `requireUser` gives a per-request RLS client and no service-role key is
    used.
  - The "own phrase cards" policy covers the new columns.
  - The existing `kori_phrase_check_card_ownership` trigger rejects a
    `collection_id` owned by someone else.
  - Evaluate looks the card up through RLS, so another user's card returns 400.
- **Prompt injection.**
  - Learner text goes into `userDataBlock()` (`lib/server/ai.ts`), which strips
    any `user_data` tag inside the text.
  - The system prompt says the message is data and that the model has no
    tools, and none are passed.
  - Links are never fetched, and the source label is plain text, so there's no
    SSRF path.
- **Logging.** Usage rows hold metadata only, never message text, and route
  tests assert this.
- **Idempotency.**
  - Save uses a deterministic capture key plus the unique index, so double
    clicks, retries and concurrent saves end with one card.
  - Seeding skips cards already present by key _or_ by question + answer text.
  - Mistakes dedupe by fingerprint.
  - A failed attempt save offers "Save attempt again" without re-grading.

## Mission behaviour

`buildDailyMission` (`lib/learning/mission-engine.ts`) remains the only
priority calculation.

- **When the step is added.** With `learningGoal === "workplace"` and at least
  one work card, the engine adds one `work_message` step (5 min).
- **Which card.** Never-practiced cards come first, then the one practiced
  longest ago. Ties use a stable hash of the date.
- **Order and budget.** The step is weighted first. Due reviews share the rest
  of the minute budget, at least 2 minutes each, keeping the most overdue
  cards. The backlog itself is untouched.
- **Goal slot.** The step takes the goal slot unless an exam is active.
- **Plans don't change mid-day.** Missions persist per (user, Seoul day). A
  focus change applies to the **next** day's plan, and today's isn't
  regenerated.
- **Completion evidence.** A graded reply (`kori_phrase_attempts`,
  `speak` + `task_completed`) to the referenced card since the mission was
  created. Opening the page or pressing Play doesn't count.
- **Removed card.** If the referenced card is deleted or archived, any graded
  reply that day counts.
- **Before the migration.** The `work_message` insert fails the old check
  (`23514`), so `missionsApi` rebuilds the plan without the work step and the
  mission still gets its items.

## Migration, rollout and rollback

1. Apply `supabase/migrations/20261106120000_work_korean_focus.sql`
   (owner-approved, shared Orbit database). It's additive and can go before or
   after the deploy: without it, card inserts retry without the new columns
   (notes are folded into the usage note), and seeded cards read their notes
   from the pack.
2. Deploy `apps/web`. There are no new env vars.
3. Rollback: revert the web change. Optionally run the commented rollback block
   at the end of the migration (delete `work_message` items, restore the old
   check, drop three columns). Saved cards keep working without the columns.

## Five-minute code walkthrough

1. **Capture** — `components/ai/MessageAnalyzer.tsx`.
   - `detectSensitiveText` and `replaceSensitive` (`lib/korean-phrasebook/work.ts`)
     run on the textarea, and the textarea value is the payload.
   - `analyzerApi.analyze(text, source, onPartial, { signal, saveHistory })`
     (`lib/api/learning.ts`) streams SSE.
2. **Analysis** — `app/api/ai/analyzer/route.ts`.
   - Auth, then the rate limit, then zod.
   - The prompt is built from `ANALYZER_RULES`, with the message in
     `userDataBlock`.
   - `streamObject` sends partials, then `finalizeAnalysis` caps the result
     before `done`.
3. **Saved phrase** — `buildWorkCardDraft`, then the editable
   `SaveToPhrasebookDialog`, then `draftToCardContent` (the same card schema as
   every other card), then `phrasebookApi.saveWorkCapture` (find or create the
   collection, then insert with the capture key; a 23505 means it's already
   saved).
4. **Practice** — `WorkMessageModeView`.
   - `ReplyAttempt` binds the textarea to the speech hook's transcript, so
     dictation can be corrected before grading.
   - The reply goes to `phrasebookApi.evaluateSpeaking(id, text, { intendedMeaning, inputMethod })`,
     then `recordAttempt`, which is the mission evidence.
   - Mistakes go to `kori_corrections`.
5. **Review** — `missionsApi.getOrCreateToday`, then `buildDailyMission` with
   `workMessageCandidates`, then `refreshProgress` checks the attempt. Phrase
   SRS review keeps using `phrasebookApi.rate`.

## Tests

- **Unit**
  - `lib/korean-phrasebook/{work,work-seed,filters,seed}.test.ts`
  - `lib/ai/schemas/analyzer.test.ts`
  - `lib/learning/mission-engine.test.ts` (work focus block)
- **Persistence (in-memory Supabase fakes)**
  - `lib/api/phrasebook-work.test.ts` — idempotent save, concurrent save,
    cross-user isolation, pre-migration fallback.
  - `lib/api/missions-work.test.ts` — persistence, the `23514` fallback, and
    evidence rules.
- **Routes**
  - `app/api/ai/analyzer/route.test.ts` — injection containment, no tools,
    generic errors, 400/401/429.
  - `app/api/ai/phrasebook/evaluate/route.test.ts` — tense/commitment rule,
    RLS miss is 400.
- **Components**
  - `components/phrasebook/PhraseFilters.test.tsx`
  - `components/learn/work/ReplyAttempt.test.tsx` — typed fallback, no mic
    request on load.
- **Browser (all network mocked)** — `tests/e2e/work-korean.e2e.ts` at 390,
  430, 1280 and 1440px, light and dark. The run command is in the file header.

The deterministic tests prove structure and rules, not that every model
output is good Korean. Review a sample of real outputs by hand.

## Known limitations

- **Speech** — browser speech recognition (Chrome/Edge/Android) is used for
  dictation only. No audio is stored, and there's no pronunciation or acoustic
  scoring.
- **Sources** — capture is manual paste or the existing import. There's no
  chat-tool or task-system crawling, and links are never fetched.
- **AI output** — the main point, unknowns and replies come from a model. The
  prompts forbid inventing deadlines or completion claims, but outputs still
  need the learner's judgement. Romanization in the starter pack and AI drafts
  needs a native-speaker check.
- **Mission refresh** — a focus change applies from the next day's plan;
  there's no "regenerate today" action.
- **Evidence** — one graded reply completes the work step. The "Check my
  understanding" step is a self-check and isn't graded or stored.
