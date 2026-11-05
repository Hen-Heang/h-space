# Hengo Learning — UI/UX re-audit (2026-11-05)

- **Status:** Audit complete (code). Slice 1 implemented on `feat/learning-listening-slice`; everything else is a proposal.
- **Base:** `origin/main` at `07f969f`. The `/listening` files are identical there and on `49d7c53` (the phone-layout commit still in PR #90), so this slice doesn't depend on #90.
- **Relationship to the 2026-11-02 plan** (`docs/learning-ux-redesign-plan.md`): that plan's Phases 1, 2, 4 and 5 shipped. **Phase 3 (Korean Coach, Listening, Scenarios, `StudySession`) was skipped and is still entirely open.** This document re-checks every plan item against current code and adds what the plan missed. Item IDs (X1, H2, C4, …) refer to that plan.
- **Method:** a code read of every Learning route and its components (C), cited as `file:line` under `apps/web`. Visual evidence (V) is limited to `/listening` (see §6). No AI, TTS, recording or database write was triggered.

---

## 1. Coverage checklist

✅ verified in code · 👁 verified visually · ⬜ not verified · ⛔ blocked

| Area                          | Routes / functions                                                                                                                                    | Status                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Hub                           | `/learn`, Continue, Today's plan, quick access, Library, skills                                                                                       | ✅                                                                                              |
| Daily practice                | `/practice`, `/practice/today`, `/learn/today` (redirect), `/daily-phrase` (client redirect stub)                                                     | ✅                                                                                              |
| Vocabulary                    | `/vocab`, dictionary, AddWords (word/deck/textbook import), Core 300, Essential Books, decks, ReviewSession (cards/quiz/recall/listen/write), grading | ✅ — grading persistence checked via existing `ReviewSession.test.tsx`, not re-run against a DB |
| Phrasebook                    | `/phrasebook?mode=phrases`, `/phrasebook/new`, `/phrasebook/[collectionId]`, `/phrasebook/practice` Learn/Listen/Speak/Review                         | ✅                                                                                              |
| Foundations                   | `?mode=foundations`, `/learn/[lessonId]` (LessonRunner)                                                                                               | ✅                                                                                              |
| Reading                       | `?mode=reading`, `/reading/[id]`, `/reading/new`, `/reading/[id]/edit`                                                                                | ✅                                                                                              |
| Listening                     | `/listening` (topic, generate, player, transcript, quiz, result)                                                                                      | ✅ 👁 (synthetic data; 320/375/430/768/1024/1440 light, 375/1440 dark; 0px overflow)             |
| Korean Coach                  | dashboard, scenarios, practice, listening (dictation), mistakes, history, session, preferences; mic states; text fallback                             | ✅ — iOS mic/autoplay ⬜                                                                        |
| Exam Prep                     | `/interview` home, script, speaking, listening, repeat, question bank, mock interview, evaluation, ChatGPT Voice handoff, topic vocab, study pack     | ✅                                                                                              |
| Supporting                    | `/history`, `/mistakes` (redirect), `/scenarios`, `/study-packs/social-awareness`                                                                     | ✅                                                                                              |
| Responsive                    | 320/375/390/430/768/1024/1440, both themes                                                                                                            | ⬜ for every route except `/listening` (390 not captured)                                       |
| Production build              | `pnpm build`                                                                                                                                          | ⛔ `next/font` can't reach Google Fonts from this machine                                       |
| Screen reader / iPhone Safari | VoiceOver, safe-area, soft keyboard                                                                                                                   | ⬜ needs a device                                                                               |

---

## 2. Status of the 2026-11-02 plan items

**Resolved:** H1–H6, P1–P3, P5, V1–V6, V8, B1, B2, B4, B5, B7, B8, E1, E2, E6, Y1–Y3, X2 (no page `h1` left anywhere — `PageHero` now defaults to `h2`, so the plan's "Still `h1`: /listening, /scenarios" note is stale), X5, X9 (no text under 12px), X12.

**Partial:**

| ID                    | What's left                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1 `lang="ko"`        | Missing in VocabCard, VocabDeck, DailyPhraseCard similar expressions, ReviewSession (`:321,709,899,1137,1146`), VoicePractice, phrasebook Listen/Speak modes, PhraseCardListItem answer, reading `[id]` (`:366,545,673`), LessonRunner (`:394`), StudyPack, SpeakingTipsCard, AnalyticsCard, social-awareness, script editor section titles. `/listening` fixed in slice 1. |
| X4 announcements      | Not announced: vocab sentence score / listen reveal, phrasebook Listen/Speak/Review feedback, Coach feedback and recorder states, CorrectionRetryPanel result. `/listening` fixed in slice 1.                                                                                                                                                                               |
| X6 accent             | Hard-coded hex in ReviewSession (`#58cc02`, `#1cb0f6`, `#ffc800`) and ListeningModeView; emerald/violet/blue/indigo primaries in DailyPhraseCard, VocabCard, AddWord tabs, reading `[id]`, UnitEditor, EvaluationSummary, QuestionBankBrowser, StudyPack; rose on the Coach dashboard.                                                                                      |
| X7 leave guard        | `useLeaveGuard` is used only in Exam Prep. Missing for Coach practice/dictation, phrasebook editor, unit editor, lesson practice, AddWordsDialog draft, Daily Study mode change.                                                                                                                                                                                            |
| X8 language aids / V7 | Romanization still always on in ReviewSession (front face included) and DailyPhraseCard; phrasebook Speak ignores the preference; Coach `on-request` has no reveal.                                                                                                                                                                                                         |
| X10 tabs              | `/practice/today` has no Learning tabs and its header title ("Practice") doesn't match its Library name.                                                                                                                                                                                                                                                                    |
| X11 icon labels       | UnitEditor `title`-only buttons; generic "Remove" in the phrase editor; History clear-tag X; `ExamTimer`.                                                                                                                                                                                                                                                                   |
| H7 counts             | `/practice` prints the snapshot count unlabelled; `/practice/today` shows a third "Due review" number.                                                                                                                                                                                                                                                                      |
| P4, P6                | Practice CTAs still hand-styled links; `/practice/today` still has the slate-950 hero and one filled Start per pending activity.                                                                                                                                                                                                                                            |
| B3, B6                | Unit page draws its own "Completed" pill; Reading unit/edit fetch failures show "Unit not found." with no retry.                                                                                                                                                                                                                                                            |
| E3, E4, E5, Y4        | Sticky bar exists (`StickyActionBar`) but Record isn't in it; in-app links aren't guarded; script editor title input unlabeled; History calendar not in a disclosure. (The plan's "not done" notes for E3/E5 are partly stale — a bar and an overflow menu exist.)                                                                                                          |

**Open — all of Phase 3:** C1–C10, L1–L3 (L1/L3 fixed in slice 1), S1–S2, and X3 (`StudySession`).

---

## 3. New issues (not in the 2026-11-02 plan)

### High

| #   | Where                                                                                                           | Issue                                                                                                                                                                                                                                                                                                          | Fix                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | `components/interview/ExamTimer.tsx:38`, `app/(main)/interview/page.tsx:346-353`                                | **Cost/loop bug.** `onExpire` fires every second after time is up. If both the evaluate route and the chat-stream fallback fail, `endsAt` is never cleared, so the page makes **two AI calls about once a second** for as long as it stays open. It also scores an empty exam (manual Finish needs 4 answers). | Latch "expired" (or clear `endsAt`) before calling; skip scoring when nothing was answered; show a Retry button. Separate PR — exam session logic, not UI. |
| N2  | `AnswerPracticeSession.tsx:358`, `interview/page.tsx:274`, `ScoreHonestyNote.tsx:10`                            | **Typed answers get speaking/pronunciation scores**, and the disclaimer says "from the speech-recognition transcript" even when nothing was recorded.                                                                                                                                                          | Record recorded/typed per attempt (UI state), label typed attempts, hide Pronunciation/Confidence for them.                                                |
| N3  | `components/vocab/ReviewSession.tsx:291`                                                                        | The flashcard back face isn't hidden from assistive tech, so screen readers read the answer before the flip.                                                                                                                                                                                                   | `inert`/`aria-hidden` on the face not showing.                                                                                                             |
| N4  | `useVocab.ts:87` → `ContinueCard.tsx:185`; `VocabDictionary.tsx:502`; `learn/page.tsx:31`; `PhrasesTab.tsx:293` | **Errors render as false "empty" states**: "You're all caught up", "Start Your Collection", every skill "Not started", empty phrase history.                                                                                                                                                                   | Pass `error` through and show retry, as History already does (Y1).                                                                                         |
| N5  | `components/phrasebook/practice/SpeakingModeView.tsx:310-355`                                                   | Speak mode is a dead end when the mic is blocked or unsupported: error text only, mic button still enabled, no Skip, no typed fallback.                                                                                                                                                                        | Reuse `lib/mic-access` notice + Skip + text input.                                                                                                         |
| N6  | `components/korean-coach/AudioRecorder.tsx:63-75,224`                                                           | A failed **typed** Coach answer is silent: the error goes to the mic panel, which is hidden in text mode.                                                                                                                                                                                                      | Render the error in both modes.                                                                                                                            |
| N7  | `UnitEditor.tsx:57-59` (`FieldLabel` is a `<p>`), `phrasebook/new/page.tsx:42-46` (`<label>` without `htmlFor`) | Editor inputs have no accessible names.                                                                                                                                                                                                                                                                        | `Label htmlFor` + ids.                                                                                                                                     |
| N8  | `reading/[id]/page.tsx:683-706`                                                                                 | Reading quiz selection is colour-only (same defect as `/listening`, fixed there in slice 1).                                                                                                                                                                                                                   | Same native radio-group pattern.                                                                                                                           |

### Medium

- **Paid calls repeated or lost (cost):** Coach `saveAttempt` failure throws away the already-paid AI feedback, so a retry pays again (`korean-coach/practice/[scenarioId]/page.tsx:158-176`). `CoachAudioPlayer` caches by text+speed and clears on remount, so each speed change or Try Again re-buys TTS (`CoachAudioPlayer.tsx:60-65,96`).
- **Coach send error loses the recording** — only "Try microphone again" is offered (`AudioRecorder.tsx:276`).
- **Timer announces every second** (`AudioRecorder.tsx:166-171`, `aria-live` on the clock).
- **Hands-free mic can raise the permission prompt without a tap** (`interview/page.tsx:212-214`, `ListenRepeatPractice.tsx:231`).
- **"Choose questions & difficulty" doesn't open the bank**; the drill auto-starts and auto-plays (`TodayPracticeCard.tsx:321`, `AnswerPracticeSession.tsx:329-336`).
- **Silent failures:** script editor Save-as-version / Mark-active swallow errors and use `window.prompt`/`confirm` (`script/page.tsx:589,607`); phrase editor load failure shows a toast then a blank form (`phrasebook/new/page.tsx:108`).
- **Competing primaries:** `/vocab` Add words vs Start review; `/practice/today` one Start per activity; ReadingHome New unit vs Continue; unit page Save all vs Submit; SessionSummary; Exam live session Record vs Submit.
- **Practice "again" re-grades just-rated phrase cards** (`phrasebook/practice/page.tsx:369-376`).
- **Focus drops to `<body>`** after LessonRunner Next and phrasebook Reveal.
- **Practice modes don't share a layout** — vocab's five modes and phrasebook's four use different card styles, CTA colours, progress and action placement. This is the case for `StudySessionShell` (§5).
- **Mock mode labelled too late:** the Coach mock banner appears only after the first answer, and the player says "AI-generated voice" in mock/fallback mode.

### Low

`/korean-coach/listening` and `/study-packs/social-awareness` are linked from nowhere; `/mistakes` goes to chat corrections, not Coach mistakes; `/daily-phrase` is a client redirect that renders null; Coach "Continue conversation" on the last turn actually finishes; dictation's 3-replay limit only counts Replay; confetti fires on every exam result; `CorrectionDiff`'s English sr-only words sit inside `lang="ko"`; unused `SpeakingScoreCard`/`ExamCountdownBanner`; nested bordered cards in DailyPhraseCard, EssentialBooksPanel, LearnModeView, CoachFeedback, StudyPack; touch targets ≈32px in phrase list rows, script move/delete, History SpeakButton.

### Verified OK (worth keeping)

- No AI or TTS call fires without a tap anywhere in Coach/Listening/Scenarios; nothing auto-plays there.
- No UI claims pronunciation accuracy in Korean Coach: the schema's 0–100 scores aren't displayed, and the observation carries a disclaimer. (Exam Prep is the exception — N2.)
- Coach mic states exist for requesting, recording, recorded, processing, blocked, not found, busy and unsupported, and unsupported falls back to text automatically.

---

## 4. Navigation and information architecture

**Current:** six Learning tabs using full registry labels (Learning Hub · Practice · Vocabulary · Phrasebook · Korean Coach · Listening). Since `49d7c53` they wrap instead of scrolling, which by estimate is **two rows at 375px and two to three at 320px** (≈90–130px before content). Foundations, Reading, Scenarios, Exam Prep, History and the weekday plan are in the Hub's Library.

**Proposal (needs owner approval — it touches the shared shell):**

1. Below `sm`, `WorkspaceTabs` renders `shortLabel ?? label`. Learning short labels: **Hub · Practice · Vocab · Phrases · Coach · Listen** — fits one row at 375px, likely two at 320px. Header titles, Quick Switcher and breadcrumbs keep the full labels (they read `label`), so `navigation.test.ts`'s "tabs are registry items" rule still holds. Other workspaces are unaffected unless they set `shortLabel`.
2. Keep six destinations; don't add a More menu inside Learning. Everything else stays in the Hub's Library and the Quick Switcher.
3. Session routes (`/korean-coach/practice/*`, `/korean-coach/listening`, `/phrasebook/practice`, `/learn/[lessonId]`, interview drills) hide the tabs and use `StudySessionShell` (§5).
4. Name the two scenario surfaces by mode: **Speak a scenario** (`/korean-coach/scenarios`) and **Chat a scenario** (`/scenarios`), cross-linked (C8). Expose `/korean-coach/listening` as "Sentence dictation" (R4, still undecided).

No route, redirect, nav id, `NavSectionId` or query param changes.

---

## 5. Shared components

**Already exist (reuse, don't rebuild):** `LearnHeader` (no-h1 page header), `LanguageAids`, `StatusBadge`, `CourseProgress`, `CorrectionDiff` + `lib/learning/text-diff.ts`, `useLeaveGuard`, `StickyActionBar` (Exam Prep), `--grade-*` tokens (fills only — they're tuned for white text, so feedback _text_ still uses emerald/red pairs), `useBrowserStorage`.

**Still missing:**

| Component           | Purpose                                                                                                                                                                                                           | First consumers                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `StudySessionShell` | Top bar (exit + title + `role="progressbar"`), centred content column, sticky safe-area action bar that hides under the soft keyboard. Generalise Exam Prep's `StickyActionBar` rather than writing a second one. | Coach practice, `/korean-coach/listening`, phrasebook practice, LessonRunner |
| `KoreanText`        | `lang="ko"` + `break-keep` + Korean line-height, sizes `body/reader/display`. Closes X1 in one pass.                                                                                                              | Everywhere in X1                                                             |
| `ChoiceGroup`       | Native radio-group quiz options with text (not colour-only) result labels — the pattern slice 1 put in `/listening`.                                                                                              | Reading quiz (N8), vocab quiz, exam listening                                |
| `ConfirmLeave`      | AlertDialog + `useLeaveGuard` when dirty.                                                                                                                                                                         | X7 list                                                                      |
| `ErrorState`        | Error + Retry, never an empty state.                                                                                                                                                                              | N4                                                                           |

---

## 6. Slice 1 — `/listening` (implemented)

**Why first:** one route and one file, every change is presentational or a guard. It fixes a High a11y defect (L1, colour-only quiz) and a cost-adjacent one (L3: "New lesson" discarded answers and started a paid generation without asking).

**Changes (`app/(main)/listening/page.tsx`):**

- `PageHero` with filler stats ("Audio: Normal + Slow", "Format: Convo + Quiz") → one `LearnHeader` line (the speed info moved into the sentence).
- Accent: emerald → `--primary` via `Button` variants. "Generate lesson" is primary; once a lesson exists "New lesson" is outline, so Play/Submit lead.
- "New lesson" asks first (AlertDialog) when answers are picked but not submitted. Otherwise it starts straight away.
- Player: Play/Pause has an `aria-label`; Normal/Slow are `aria-pressed`; `audio.play()` rejection shows an error instead of a stuck "Pause".
- Transcript: toggle has `aria-expanded`/`aria-controls`; Korean lines are `lang="ko"`, 18px with relaxed leading and `break-keep`; one divided list instead of bordered boxes inside a card.
- Quiz: each question is a `fieldset`/`legend` of native radios (arrow keys, announced selection); "n of m answered" beside Submit; after scoring, "Correct answer" / "Your answer" text + icons, not colour alone; explanations on a neutral surface.
- Result: focus moves to the score card (named by the score), so it's announced and focus isn't lost when Submit disappears.
- `components/ui/chip-select.tsx`: chips expose `aria-pressed` (no visual change; benefits all ~10 consumers).

**Unchanged:** `listeningApi`, `ttsApi`, the AI route, grading, attempt persistence, the `?topic=` param, TTS only on tap with the in-flight de-dup.

**Tests:** `app/(main)/listening/page.test.tsx` (7 cases, `lib/api` mocked, synthetic lesson): no page `h1` + pressed topic; transcript reveal sets `lang="ko"` and never calls TTS; radio groups + Submit gating; submit order, text result labels, focus on score, answers locked; confirm on discard (cancel keeps answers, no generation); no confirm when nothing is lost; blocked playback shows an error.

**Rollback:** revert the commit. No data, route or API changes.

---

## 7. Proposed next slices (one PR each)

1. **Fix N1** (exam timer retry loop) — highest priority; small, with a test.
2. **Learning tabs short labels** (§4.1) — shell change, needs approval.
3. **`KoreanText` + X1 sweep** — mechanical, low risk.
4. **Errors that look empty (N4) + Reading quiz radios (N8) + editor labels (N7)**.
5. **`StudySessionShell`** generalised from `StickyActionBar`, adopted first by Coach practice (C1, C2, C4, C6) with `KOREAN_COACH_MOCK_MODE=true`.
6. **Coach cost fixes:** keep paid feedback on save failure; TTS cache by text + `playbackRate`.
7. **Phrasebook practice in the shell** + Speak-mode mic fallback (N5).
8. **ReviewSession mode consistency** (card style, CTA colour, hex → tokens) + N3 + V7 via `LanguageAids`.
9. **Exam Prep:** N2 recorded/typed labelling, primaries, leave guard for in-app links.
10. **Full responsive + dark sweep** of all Learning routes with the synthetic-data route sweep.

## Open decisions

1. §4.1 — short tab labels on phones (affects the shared `WorkspaceTabs`).
2. R4 — expose `/korean-coach/listening` as "Sentence dictation", or retire it.
3. R5 — `/practice/today` stays a Library item; merge with the mission flow is a separate decision.
4. `/study-packs/social-awareness` — link it from Exam Prep, or leave it URL-only.
