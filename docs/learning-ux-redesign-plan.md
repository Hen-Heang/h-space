# Hengo Learning — UI/UX redesign plan

- **Status:** Proposal, waiting for approval. No application code has changed.
- **Date:** 2026-11-02
- **Scope:** Frontend UI/UX only, in `apps/web`, for the Korean-learning routes.
- **Out of scope:** Supabase schema, RLS, auth, `app/api/ai/*` contracts, `lib/api/*` queries, the mission engine, SRS/mastery algorithms, Luyra, and the vault.

## How this was produced

- **Code audit (C):** Every learning route and its child components, hooks, and API calls were read. Findings cite `file:line` against `main` at `3a38c95`.
- **Visual check (V):** Production (`hengo.henheang.site`) was viewed in a signed-in desktop browser at about 1568×744, dark theme. Pages checked: `/learn`, `/practice`, `/vocab`, `/korean-coach`, `/phrasebook`, `/interview`.
  - The browser window couldn't be resized to phone width in this session, so **every mobile finding below is from code (C), not a screenshot**. Phase 1 starts with a real check at 375/430/768/1024/1440.
  - No recording, AI generation, grading, or other write action was triggered.
- **Inference (I):** A judgement that hasn't been checked in a running app.

---

## 1. Current learning experience and architecture

### 1.1 Where Learning sits in the shell

- The global nav (`lib/navigation.ts`) shows one **Learning** workspace that lands on `/learn`. On mobile it is the **Learn** tab.
- Every Korean route is registered in the `learn` nav section with `showInSidebar: false`. They stay reachable by URL, the Quick Switcher, and breadcrumbs, and they keep the Learn tab lit through `sectionId` matching.
- Learning has **no `workspaceTabs` entry**. Planner, Notes, Growth, and My Apps do. Once you leave `/learn`, the only way between Korean areas is the browser Back button, the breadcrumb, or the Quick Switcher. **(C)**
- `AppShell` renders the page's `h1` in the header (`Learning / Vocabulary`). Many learning pages render a second `h1`, either through `PageHero` (`components/app/page-hero.tsx:61`) or by hand. **(C, V)**

### 1.2 What already exists (do not rebuild)

| Capability                         | Where it lives                                                                               | Notes                                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personalized daily mission         | `lib/learning/mission-engine.ts`, `missionsApi`, `hooks/useDailyMission.ts`                  | Persisted once per Korea-calendar day in `kori_daily_missions`. Progress is re-checked against real evidence. Read by `/home`, `/practice`, and `/learn`. |
| Mission step display               | `lib/learning/mission-item-display.ts`                                                       | Labels, CTAs, hrefs.                                                                                                                                      |
| Skill groups                       | `lib/learning/skill-groups.ts`, `useSkillMastery`                                            | Five groups. "Not started" instead of a fabricated 0%.                                                                                                    |
| Vocabulary SRS                     | `useVocab`, `lib/srs.ts`, `components/vocab/ReviewSession.tsx` (1,892 lines)                 | Five modes: Cards, Quiz, Recall, Listen, Write. Again/Hard/Good/Easy grading. Sync status.                                                                |
| Review batch sizing                | `nextReviewBatchSize` (`lib/api`)                                                            | Used by the hub and the practice completion screen.                                                                                                       |
| Second daily plan (weekday topics) | `/practice/today` → `components/daily-study/DailyStudyPlanPage.tsx`                          | Separate system over `kori_daily_study_plans`. Not linked from the hub. Keep/merge is an open product decision (HENGO_SMART_LEARNING_PLAN.md, Session 2). |
| Voice coach                        | `/korean-coach/*`, `useAudioRecorder`, `koreanCoachApi`, `koreanCoachAiApi`, `CoachFeedback` | Mock mode exists: `KOREAN_COACH_MOCK_MODE`.                                                                                                               |
| Romanization preference            | `kori_korean_coach_preferences.romanization_mode` via `useRomanizationPreference`            | always / on-request / never. Phrasebook and Coach honor it. Foundations, Reading, Vocab, and Daily Study don't.                                           |
| Correction SRS                     | `CorrectionsReview` at `/chat?mode=corrections`                                              | Mission `correction_review` steps link here.                                                                                                              |
| Phrase SRS                         | `phrasebookApi`, `/phrasebook/practice?mode=learn\|listen\|speak\|review`                    |                                                                                                                                                           |
| Foundations progress               | `foundationsApi` plus localStorage `foundations-progress`                                    | Per-lesson `completed` + `progress%`.                                                                                                                     |
| Reading progress                   | `lib/reading-progress-store.ts`, `readingApi`                                                | Only area with not started / in progress / completed.                                                                                                     |
| Exam drill queue                   | `selectTodaysQueue`, `INTERVIEW_TIME_ZONE`, localStorage `koriai.interview.today:*`          |                                                                                                                                                           |
| TTS                                | `SpeakButton`, `getCachedAudioUrl`                                                           | Each call spends from the `tts` budget.                                                                                                                   |

### 1.3 Data each hub area reads today

```
/learn
 ├─ useSkillMastery()     → StudySkillSummary ("Your Korean", 5 bars)
 ├─ useDailyMission()     → StudyRecommendation ("Recommended next": first incomplete item)
 ├─ useVocabDueCount()    → "Review N more" once the mission is done
 └─ learningModules       → 7 equal module cards + "Also: Scenarios · Exam Prep · History"
```

---

## 2. Screen inventory and UX audit

Severity: **H** blocks or misleads the learner, or is a significant accessibility failure. **M** adds friction or inconsistency. **L** is polish.

### 2.1 Cross-cutting findings

| #   | Sev | Current behavior                                                                                                                                                                                                                                                  | Proposed improvement                                                                                                                                                                            | Learner benefit                                                            |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| X1  | H   | Most displayed Hangul lacks `lang="ko"`. Missing in all of Reading, Foundations, Daily Study, History, `/listening`, and the big terms in ReviewSession (one `lang` in 1,892 lines). `<html lang="en">`. (C)                                                      | A `KoreanText` primitive that always sets `lang="ko"`, `word-break: keep-all`, Korean line-height, and the Korean font stack.                                                                   | Correct screen-reader pronunciation, correct CJK font and line breaking.   |
| X2  | H   | Two `h1`s per page. The shell header has one, and `PageHero` or a hand-written heading adds another (vocab, phrasebook, reading, foundations, interview, listening, scenarios, history, coach pages, practice). (C, V)                                            | A learning page header with no `h1`: one description line, the page's single primary action, and optional inline stats.                                                                         | One clear title. Less vertical space before the work starts.               |
| X3  | H   | Study sessions are full-page scrolls. The main action (record, submit, next) sits under long content with no sticky action bar: Coach practice, CoachFeedback, `/listening`, the interview session. (C, I)                                                        | A `StudySession` layout: slim top bar (exit + progress), a centered content column, and a sticky bottom action bar that respects the safe area.                                                 | The main action is always reachable with a thumb. Less scrolling mid-task. |
| X4  | H   | Feedback and grading aren't announced. No `aria-live` in ReviewSession, CoachFeedback, `/listening` results, quiz results, or LessonRunner. Correctness is shown by color only. (C)                                                                               | A shared `FeedbackRegion` (`aria-live="polite"`, icon + text, not just color). Move focus to the feedback heading.                                                                              | Screen-reader and color-blind learners can use every drill.                |
| X5  | H   | Hand-built overlays (`fixed inset-0 z-[60]`) in ReviewSession have no `role="dialog"`, focus trap, Escape, or focus restore (`ReviewSession.tsx:1470,1656,1776`). (C)                                                                                             | Wrap them in a Radix `Dialog`/`Sheet` (already a dependency), keeping the internal content.                                                                                                     | Keyboard and screen-reader users can't get trapped or lost.                |
| X6  | M   | Accent colors drift: hub blue-600, practice violet, coach rose, `/listening` emerald, vocab green CTA, review grades hard-coded `#58cc02`. The brand `--primary` is violet `#6757f5`. (C, V)                                                                      | One accent (`--primary`) for primary actions. Semantic tokens for grading and feedback. Module hues only on small icons.                                                                        | Calm, consistent visuals. Color carries meaning.                           |
| X7  | M   | Leaving a session loses it silently: Coach "End session", interview "End session", Vocab quiz back, `/listening` "New Lesson", Daily Study mode change. (C)                                                                                                       | `ConfirmLeave` on destructive exits once any answer exists.                                                                                                                                     | No lost work.                                                              |
| X8  | M   | Romanization and translation controls are inconsistent. Always on (Foundations, ReviewSession, DailyPhraseCard), never present (Reading), or per item and unsaved (Phrasebook, Reading). The `on-request` preference has no reveal in CoachFeedback or retry. (C) | One `LanguageAids` control (Romanization · English) that reads `useRomanizationPreference`. Same placement on every Korean surface. Per-viewer translation default stored in localStorage only. | Learners choose their level of support once and get it everywhere.         |
| X9  | M   | Text at 9–11px for labels across vocab, history, script editor, and Daily Study. (C)                                                                                                                                                                              | Minimum 12px (`text-xs`) for any readable text. Uppercase eyebrows are 12px only.                                                                                                               | Readable on a phone at arm's length.                                       |
| X10 | M   | Learning has no local navigation once you leave `/learn`. (C)                                                                                                                                                                                                     | Add Learning tabs (see §3.2).                                                                                                                                                                   | You can move between Korean areas without going back to the hub.           |
| X11 | M   | Icon-only buttons have only `title`, no `aria-label`. Examples: `SpeakButton`, reading edit/delete/pin, script editor Clear/Copy/Download, `/listening` Play. (C)                                                                                                 | Visible-label or `aria-label` rule in shared components. `SpeakButton` gets `type="button"` and `aria-label`.                                                                                   | Screen-reader access. Fewer accidental form submits.                       |
| X12 | L   | Nested interactive elements: a button inside a link in `ReadingHome.tsx:438-479`, and `<Link><Button>` in `LessonRunner.tsx:396-403`. (C)                                                                                                                         | Make the card a sibling-actions layout.                                                                                                                                                         | Valid HTML and predictable keyboard focus.                                 |

### 2.2 Learning Hub `/learn`

| #   | Sev | Current behavior                                                                                                                                                                                                  | Proposed improvement                                                                                                                                                                                   | Benefit                                                           |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| H1  | H   | At 744px tall, the first view is the **Subjects** row and the **Your Korean** bars. The only personalized action, "Recommended next", is below the fold. While it loads, the skeleton is a large empty block. (V) | One **Continue** card first. Subjects move to a compact row at the bottom (repositioned, not deleted).                                                                                                 | The next step is the first thing you see.                         |
| H2  | M   | "Recommended next" reads "Review 1886 vocabulary cards · 15 min". The CTA then lands on `/vocab`, not in a review, and a session is only 20 cards. (V, C)                                                         | Show the batch: "Review 20 words · 1,886 due", using the existing `nextReviewBatchSize`. The CTA opens the review directly (`/vocab?review=session`, an existing param).                               | Honest, achievable framing. One tap to start.                     |
| H3  | M   | The Hub doesn't show today's plan or its progress, only the first incomplete step. `/home` and `/practice` show more. (C)                                                                                         | A compact **Today's plan** checklist from `mission.items` with `completed/total` and `estimatedMinutes`.                                                                                               | You see how much is left today.                                   |
| H4  | M   | Seven equal-weight module cards plus three "Also" text links. Nothing tells the learner which matters. (V)                                                                                                        | Four **quick-access** tiles: Speaking, Listening, Vocabulary, Phrases. Each shows a real count where one exists. Then a smaller **Library** list: Foundations, Reading, Scenarios, Exam Prep, History. | Clear priority. Less scanning.                                    |
| H5  | L   | "Your Korean" takes a full card with five bars, and a long caveat explains it isn't vocab mastery. (V)                                                                                                            | A compact 5-cell skill strip labelled "Practice score" with a hover/tap info note. "Not started" stays.                                                                                                | The same honest data in a quarter of the height.                  |
| H6  | L   | Desktop content uses less than 70% of the main column, and cards sit inside a narrow column. (V)                                                                                                                  | Two columns on desktop: Continue + plan on the left, quick access + skills on the right.                                                                                                               | Less scrolling on desktop.                                        |
| H7  | M   | Counts disagree across surfaces: Hub/Vocab say 1,886 due, the Practice step says "1596 words … came due for review today". (V) The cause is probably the mission's daily snapshot vs live due count (I).          | Label the source explicitly ("due now" vs "in today's plan"). Don't recompute.                                                                                                                         | Removes an apparent contradiction without changing any algorithm. |

### 2.3 Daily Practice `/practice` and `/practice/today`

| #   | Sev | Current behavior                                                                                                                                                                                                                                                                        | Proposed improvement                                                                                                                                                                                   | Benefit                               |
| --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| P1  | H   | The **daily-phrase loop**: the mission step links to `/vocab?tab=phrases` (`mission-item-display.ts:65`). There, "Get today's phrase" links to `/daily-phrase` (`vocab/page.tsx:301,324`), which redirects back to `/practice`. Today's phrase is never actually studied. (C, verified) | Render today's phrase **inline** on the Phrases tab with the existing `useDailyPhrase` + `DailyPhraseCard` (mark learned / add to flashcards). The `/daily-phrase` stub stays.                         | Removes a dead end in the daily loop. |
| P2  | H   | The vocab step links to `/vocab` (`mission-item-display.ts:63`), not `/vocab?review=session`, which the completion screen already uses. (C)                                                                                                                                             | Point the step at `?review=session`. This is a one-line href change on an existing param; flagged in §8.                                                                                               | One tap from plan to review.          |
| P3  | M   | Error state has no retry (`practice/page.tsx:103-109`), even though `refreshMission` exists.                                                                                                                                                                                            | `ErrorState` with Retry.                                                                                                                                                                               | Recovers without a reload.            |
| P4  | M   | The progress bar lacks `role="progressbar"`. Step changes aren't announced. Buttons are hand-styled `Link`s with copied violet classes. (C)                                                                                                                                             | Shared `StepProgress` and `Button` variants.                                                                                                                                                           | Accessibility and consistency.        |
| P5  | L   | Previews return `null` while loading, so the card height jumps. (C)                                                                                                                                                                                                                     | Fixed-height skeleton lines.                                                                                                                                                                           | No layout shift.                      |
| P6  | H   | `/practice/today` is a second "today" with its own streak, due count, and % complete. It has 6 card zones, duplicated stats (hero + summary grid), no `lang="ko"`, and romanization in 11px. (C)                                                                                        | **Don't merge (product decision).** Restyle as "Weekday study plan" in the Library, behind the same session layout. Remove the duplicated stat grid. Move the romanization toggle next to the content. | Less confusion about "which today".   |

### 2.4 Vocabulary `/vocab`

| #   | Sev | Current behavior                                                                                                                                      | Proposed improvement                                                                                                                                            | Benefit                                                     |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| V1  | H   | Five or more large cards before the first word: PageHero + 4 stats, Memory Lab, Core Korean 300, Essential Books, VocabStats, filters. (V, C)         | Order: header line → **Review card** (primary) → segmented **Library · Decks · Courses** → content. Core Korean 300 and Essential Books move under **Courses**. | The review is above the fold, and the tools stop competing. |
| V2  | H   | Stats repeated three times: hero, Memory Lab, VocabStats. (C)                                                                                         | Show due / saved / decks / avg strength once, inline in the review card. VocabStats moves into the Library filter header as a single line.                      | Less noise.                                                 |
| V3  | M   | Four "add" entry points and two kinds of "review" button. The per-deck green "Review this deck" competes with the main review. (C)                    | One **Add** button in the header (opens the existing `AddWordsDialog`). Deck review becomes a secondary outline button.                                         | One obvious place for each action.                          |
| V4  | H   | ReviewSession overlays aren't accessible dialogs, and feedback isn't announced (X4, X5). The quiz back button exits without confirming. (C)           | Wrap in `Dialog`, add `FeedbackRegion` and `ConfirmLeave`. Internal modes and grading stay untouched.                                                           | Accessibility and no lost sessions.                         |
| V5  | M   | Five mode buttons have `text-[11px]` labels that truncate on phones and don't set `aria-pressed`. Keyboard shortcuts (Space, 1–4) aren't visible. (C) | Mode picker as a 2-row grid on phones, `aria-pressed`, and a "Shortcuts" hint on pointer:fine devices.                                                          | Easier setup. Keyboard power use.                           |
| V6  | M   | Grade buttons use hard-coded hex colors, and the interval text is 11px. (C)                                                                           | Semantic tokens `--grade-again/hard/good/easy` with light/dark values. 12px intervals.                                                                          | Theme-consistent, readable.                                 |
| V7  | M   | Romanization is always shown on flashcards. (C)                                                                                                       | Honor `LanguageAids`.                                                                                                                                           | Less crutch for intermediate learners.                      |
| V8  | M   | The Phrases tab doesn't identify today's phrase (P1), and `DailyPhraseCard` lacks `lang="ko"`.                                                        | Today's phrase pinned at the top of the tab.                                                                                                                    |                                                             |
| V9  | L   | Deck close button is 28px. The relearning tally is explained only via `title`. (C)                                                                    | 44px target with an `after:` hit area. Visible caption.                                                                                                         |                                                             |

### 2.5 Korean Coach `/korean-coach/*`

| #   | Sev | Current behavior                                                                                                                                                                                | Proposed improvement                                                                                                                                                                         | Benefit                                     |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| C1  | H   | In practice, about 9 controls come before the record button (audio player, 3 speed chips, 2 icon buttons, transcript/hint/"I don't understand"). The recorder isn't sticky. (C, I on mobile)    | `StudySession` layout. The prompt card holds Korean, audio, and a single **Aids** row. **Record** sits in the sticky bottom bar.                                                             | Speaking is one tap away at all times.      |
| C2  | H   | In CoachFeedback, the next-step actions come after about 6 blocks. "Try Again" is always primary, even when the task was completed without important corrections (`CoachFeedback.tsx:185`). (C) | Sticky action bar. The primary action follows the outcome: Continue when `taskCompleted && !important`, otherwise Try again. The corrected sentence shows a **diff** against the transcript. | Faster loop. Retry only when it's worth it. |
| C3  | M   | Setup CTA says "Start listening" for a speaking session (`practice/[scenarioId]/page.tsx:407`). The privacy notice is shown three times. (C)                                                    | "Start speaking". One privacy line in setup.                                                                                                                                                 | Clear copy.                                 |
| C4  | M   | "End session" saves a summary with no confirmation, even after 0 attempts (L428). (C)                                                                                                           | `ConfirmLeave` when attempts > 0. Plain exit otherwise.                                                                                                                                      |                                             |
| C5  | M   | The mic-permission error is generic. Three separate toggles for text input. (C)                                                                                                                 | A permission-denied state with OS-specific re-enable steps and one "Type instead" link.                                                                                                      | Recovery without guessing.                  |
| C6  | M   | `processing` and `requesting-permission` aren't announced. Feedback appears without a focus move. (C)                                                                                           | `aria-live` status line in the action bar. Focus the feedback heading.                                                                                                                       |                                             |
| C7  | M   | `/korean-coach/listening` has **no in-app link**. The Coach "Listening" pill goes to `/listening`. (C, verified)                                                                                | Expose it as "Sentence dictation" in the Coach's secondary links, next to "Listening lessons" (`/listening`). Both routes unchanged.                                                         | Recovers a working feature.                 |
| C8  | M   | `/korean-coach/scenarios` (voice, static) and `/scenarios` (text chat, DB) are both called "Scenarios" and don't mention each other. (C)                                                        | Name them by mode: **Speak a scenario** (coach) and **Chat a scenario** (`/scenarios`), with one-line cross-links.                                                                           | Ends the IA confusion.                      |
| C9  | L   | Rose accent on the dashboard, primary elsewhere. Vocab meanings only in `title` tooltips. Romanization at `text-muted-foreground/65` italic. (C, V)                                             | Primary accent. Visible meanings on tap. AA-contrast romanization.                                                                                                                           |                                             |
| C10 | L   | A past session's page still says "Session complete / Useful progress". (C)                                                                                                                      | Show "Session · date" for history views.                                                                                                                                                     |                                             |

### 2.6 Listening `/listening`

| #   | Sev | Current behavior                                                                                                           | Proposed improvement                                                                                     | Benefit           |
| --- | --- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------- |
| L1  | H   | The transcript Korean has no `lang="ko"` (L307). Quiz options aren't a radio group. No `aria-live` on the result. (C)      | `KoreanText`, `ChoiceGroup` (radiogroup), `FeedbackRegion`.                                              | Accessible drill. |
| L2  | M   | Hero stats ("Audio: Normal + Slow") are filler. The topic picker and Generate share the page with the player and quiz. (C) | Setup → session → result, all on the same route and state (no URL change). Player sticky in the session. | Focus.            |
| L3  | M   | "New Lesson" throws away progress without confirming. `audio.play()` isn't caught. (C)                                     | `ConfirmLeave`. Error toast on playback failure.                                                         |                   |

### 2.7 Real-life Scenarios `/scenarios`

| #   | Sev | Current behavior                                                                                                                   | Proposed improvement                                                                    | Benefit             |
| --- | --- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------- |
| S1  | M   | The custom-topic CTA and every card CTA share the same label and the same blue fill. (C)                                           | The catalog is primary. "Custom topic" becomes a secondary input row below the filters. | Clear primary path. |
| S2  | M   | `<label>` without `htmlFor` (L102, L110). The empty-state copy suggests "your scenarios" but nothing on the page creates them. (C) | Fix labels. "No scenarios in this category."                                            |                     |

### 2.8 Phrasebook, Foundations, Reading (`/phrasebook?mode=…`)

| #   | Sev | Current behavior                                                                                                                                                                                                                    | Proposed improvement                                                                                                                                                                                                   | Benefit                           |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| B1  | H   | Tabs sit above a full PageHero, and "Phrasebook" is both the hub and a tab. Stats appear twice in Phrases: hero (70/70/0) plus a 5-tile mastery strip. (V)                                                                          | Rename the tab row **Phrases · Foundations · Reading** under a single header line. One stats line.                                                                                                                     | Clear hierarchy. Less repetition. |
| B2  | H   | No resume path. No Continue, no "next lesson" after passing (`LessonRunner.tsx:388-404`), and the Foundations track resets to Survival on return (`FoundationsHome.tsx:63`). (C)                                                    | `CourseProgress` header per track with a **Continue** button (the first incomplete lesson, derived from existing `completed`). "Next lesson" on pass. Remember the track in `sessionStorage`; the URL stays unchanged. | Lessons feel like a course.       |
| B3  | M   | Three status models and three visuals. Reading has not started / in progress / completed, Foundations has completed + %, Phrasebook has new / learning / mastered + due. Completed is blue in one place and emerald in another. (C) | One `StatusBadge` mapping: **New · In progress · Review due · Completed/Mastered**, with fixed colors. Data mapping only, no new fields.                                                                               | Recognizable states everywhere.   |
| B4  | M   | Learn mode never reaches completion (`LearnModeView.tsx:170`). "Practice again" may restart past the end (I). (C)                                                                                                                   | A completion screen for Learn. Reset the index on restart (local UI state only).                                                                                                                                       |                                   |
| B5  | M   | LessonRunner has no TTS, romanization is always on and uppercase, and there's no translation toggle. (C)                                                                                                                            | `SpeakButton` on each teach card (TTS-budgeted, so play only on tap) + `LanguageAids`.                                                                                                                                 |                                   |
| B6  | M   | Reading delete uses `window.confirm`. Reading error is a custom box. Pin is a `title`-only 28px button nested in a link. (C)                                                                                                        | AlertDialog, `ErrorState`, and a sibling pin button with `aria-label`.                                                                                                                                                 |                                   |
| B7  | L   | The pin icon is inverted (`PhraseCollectionCard.tsx:37`). Hard-coded review hex colors. The "Tap any word" hint is hidden on mobile, where it matters most. (C)                                                                     | Fix the icon, use grade tokens, show the hint on mobile.                                                                                                                                                               |                                   |
| B8  | L   | The tab state isn't re-derived on back/forward (`phrasebook/page.tsx:25`) (I).                                                                                                                                                      | Derive the tab from `useSearchParams` on every render. Same URLs.                                                                                                                                                      | Back button works as expected.    |

### 2.9 Exam Prep `/interview/*`

| #   | Sev | Current behavior                                                                                                                                 | Proposed improvement                                                                                                                                                                                             | Benefit                       |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| E1  | H   | Nine blocks above the only Start button. `StudyPack` is open by default (`interview/page.tsx:386-488`). (C, V)                                   | Order: exam header line (date · format · judged on) → **topic + mode + Start** card → drills row → collapsible Progress (trend, study plan, tips, study pack, all **collapsed**).                                | Start is above the fold.      |
| E2  | H   | Corrections have no diff (`CorrectionRetryPanel.tsx:85-130`). (C)                                                                                | `CorrectionDiff` (shared with Coach and History).                                                                                                                                                                | You see exactly what changed. |
| E3  | M   | Live session: Record, Manual Edit, Submit, and Finish are all full-width and look alike. "End session" wipes the session without confirming. (C) | Sticky bar: Record (primary) · Submit (appears after an answer) · overflow menu (Edit text, Finish & evaluate). `ConfirmLeave`.                                                                                  | Clear next step.              |
| E4  | M   | Phases aren't in the URL, so refresh or Back loses the session. (C)                                                                              | A `beforeunload` + in-app leave guard. **No new query params.**                                                                                                                                                  |                               |
| E5  | M   | Script editor: outline hidden below `lg`, 6+ controls above the page, icon-only buttons without labels, no `lang="ko"`. (C)                      | A mobile "Sections" sheet. Controls collapsed into one toolbar + overflow. Labels. `KoreanText` in read mode and `lang="ko"` on the textarea. Reading typography is already good (15/1.9 and 17/2.05) — keep it. |                               |
| E6  | L   | The speaking summary shows only 3 aggregate tiles. (C)                                                                                           | A per-question list from the attempt data already in state.                                                                                                                                                      |                               |

### 2.10 Learning History `/history`

| #   | Sev | Current behavior                                                                                                  | Proposed improvement                                                                                                           | Benefit                |
| --- | --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Y1  | H   | A fetch failure is swallowed into "No corrections yet" (`history/page.tsx:491`). (C)                              | `ErrorState` with Retry.                                                                                                       | No false "empty".      |
| Y2  | M   | The page shows **chat corrections only**, but it's titled Learning History. (C)                                   | Description line: "Corrections from AI Coach and manual checks". Links to Coach history and Exam results. The nav label stays. | Accurate expectations. |
| Y3  | M   | No diff, no `lang="ko"`, 9px labels, and collapsed rows clamp both lines to 1. (C)                                | `CorrectionDiff` in the expanded row. The collapsed row shows the corrected sentence only.                                     |                        |
| Y4  | M   | On mobile the calendar is below the whole list. Rating and sort chips look identical and lack `aria-pressed`. (C) | A compact streak strip at the top on mobile, with the calendar in a disclosure. Sort moves to a select.                        |                        |

---

## 3. Proposed information architecture

### 3.1 Principles

1. **One next step.** Every Learning surface leads with one primary action, chosen by existing data: the mission, SRS due counts, or course progress. No new ranking logic.
2. **Hub → area → session.** The three levels look different. In a session, the learner doesn't need to see the hub.
3. **Same words for the same states:** New · In progress · Review due · Completed.
4. **Routes are stable.** No route is renamed, removed, or given new required params.

### 3.2 Navigation

```
Learning (global nav, unchanged)
└─ /learn  Learning Hub
   ├─ Learning tabs (NEW visibility layer, same routes):
   │    Learning Hub(/learn) · Practice(/practice) · Vocabulary(/vocab) · Phrasebook(/phrasebook*) · Korean Coach(/korean-coach*) · Listening(/listening)
   │    (* = prefix match without search params, so ?mode=foundations|reading and /korean-coach/* keep their tab lit)
   ├─ Library (hub section + Quick Switcher):
   │    Foundations · Reading · Scenarios · Exam Prep · History · Weekday plan(/practice/today)
   └─ Session routes: tabs hidden, StudySession layout
        /vocab review overlay, /korean-coach/practice/[id], /korean-coach/listening,
        /phrasebook/practice, /learn/[lessonId], /interview (session phase), /interview/{speaking,listening,repeat} drills
```

- Implementation: add `workspaceTabs.learn` in `lib/navigation.ts`. That's the layer CLAUDE.md says to change for visibility. The registry, ids, and `sectionId` matching stay as they are.
- **Decided in Phase 1 (2026-11-02):** tabs added, and `apps/web/CLAUDE.md` updated. The tab labels are the registry labels, which are also the header titles, rather than the shorter names drafted above. `lib/navigation.test.ts` requires every tab to be the registry item itself, so relabelling would also rename the header and the Quick Switcher entry.

### 3.3 Area model

| Area        | Primary action (source)                                       | Secondary                                     | Tucked away                           |
| ----------- | ------------------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| Hub         | Continue (`mission` first incomplete item)                    | Today's plan, 4 quick tiles                   | Library, skills, other subjects       |
| Vocabulary  | Review N (`nextReviewBatchSize(dueCount)`)                    | Library search                                | Decks, Courses (Core 300, Books), Add |
| Phrases     | Review due phrases (existing due count)                       | Today's phrase, collections                   | Import, New Q&A                       |
| Foundations | Continue lesson (first incomplete in track)                   | Track switch                                  | —                                     |
| Reading     | Continue unit (first `in_progress`, else first `not_started`) | Category lists                                | New unit                              |
| Speaking    | Start recommended scenario (existing `recommendedScenario`)   | Other scenarios, sentence dictation, mistakes | History, preferences                  |
| Listening   | Start lesson for topic                                        | Topic select                                  | —                                     |
| Exam Prep   | Start interview/simulation                                    | Drills                                        | Progress, plan, tips, study pack      |
| History     | — (review list)                                               | Filters                                       | Calendar                              |

---

## 4. Page-by-page redesign specifications

### 4.1 Learning Hub (Phase 1)

**Content order, mobile:**

1. Learning tabs.
2. **Continue card**:
   - Eyebrow: "Continue · step 2 of 5"
   - Title: the item title, with the vocab batch reformatted per H2
   - Meta: type · minutes
   - Primary button
   - Uses the existing done state ("Today's practice is done" + optional "Review N more").
3. **Today's plan**: compact checklist of `mission.items` with a check / current / upcoming state per row. Each row links via `missionItemHref`; scenario rows go to `/practice`, as today.
4. **Quick access**, a 2×2 grid:
   - Speaking → `/korean-coach`
   - Listening → `/listening`
   - Vocabulary → `/vocab`, with "N due"
   - Phrases → `/phrasebook`, with "N due" if a cheap existing count is available; otherwise no number. Never a placeholder.
5. **Practice score**: 5 skill cells. "Not started" kept.
6. **Library** list: Foundations, Reading, Scenarios, Exam Prep, History, Weekday plan.
7. **Other subjects**: the existing `LearningSubjects` content as a compact row.

**Desktop (≥1024):** two columns, `[Continue + Today's plan] | [Quick access + Practice score]`, with Library and Other subjects full width below.

**States:**

- Loading: fixed-height skeletons per block.
- No mission (null): Continue becomes "Start today's practice" → `/practice`, which creates the mission.
- Mission error: inline retry.
- Skill data empty: the strip shows "Not started" for each group.

### 4.2 Daily Practice (Phase 2)

- Keep the stepper. Wrap it in `StudySession`:
  - Top bar: Exit to `/learn`, `StepProgress n/total`.
  - Content: StepCard.
  - Bottom bar: step CTA plus Previous/Next.
- Fix P1/P2/P3. Previews get stable skeletons.
- Completion screen kept. Buttons use shared variants.
- `/practice/today`: header line + single "Start next activity" + schedule list. Remove the summary grid (its numbers are already in the hero). Settings move into a "Plan settings" sheet. Romanization toggle → `LanguageAids`. `lang="ko"` everywhere.

### 4.3 Vocabulary (Phase 2)

- Header line: description · **Add** (opens `AddWordsDialog`).
- **Review card**:
  - Title "Review 20 words"
  - Meta "1,886 due · 2,110 saved · 70 decks · 24% avg strength"
  - Primary **Start review** (the existing launch with the default setup)
  - Secondary "Customize" (`?review=setup` behavior)
- The Words/Phrases tabs stay (`?tab=phrases` preserved).
- Inside Words, a segmented control: Library (search + filters + list) · Decks · Courses. This is local state, defaulting to Library. Existing anchors keep working (`#vocab-dictionary` stays on Library).
- ReviewSession, scoped by its size:
  - Replace the outer `fixed` wrappers with `Dialog`
  - Add `FeedbackRegion`, `ConfirmLeave`, grade tokens, the mode grid, and `KoreanText` on terms
  - **Don't** restructure the five card components' logic.

### 4.4 Korean Coach, Listening, Scenarios (Phase 3)

- Coach dashboard: keep the current one-card design (already good, V). Recolor to primary. Secondary links: Other scenarios · Sentence dictation · Listening lessons · Review mistakes.
- Practice: `StudySession` (see wireframe §5.3). Feedback uses `CorrectionDiff`, a collapsible "Why", and a sticky outcome-aware action bar. Mock-mode banner stays visible and shows from the start when the server reports mock.
- `/listening`: setup / session / result, sticky player, radiogroup quiz.
- `/scenarios`: catalog first, custom topic secondary, cross-link to Speak a scenario.

### 4.5 Phrasebook, Reading, Foundations (Phase 4)

- One header line under the existing `StudyModeTabs`. The PageHero for each mode is removed.
- **CourseProgress** (Foundations per track, Reading per category):
  - "n of m completed"
  - Thin bar
  - **Continue** button
  - Lesson/unit rows with `StatusBadge`
- **Lesson reader** (LessonRunner, Reading unit): see wireframe §5.5.
  - `KoreanText` at reader size (18–20px, line-height 1.8, max 38em)
  - `LanguageAids` in a sticky sub-bar
  - SpeakButton per sentence/card
  - A "Next lesson" CTA after a pass
- Phrasebook collection: Review due is primary. Learn / Listen / Speak are secondary chips in one neutral color.

### 4.6 Exam Prep and History (Phase 5)

- Exam hub: the order from E1. Session in `StudySession` with the sticky bar from E3. Results: score card → per-question accordion (`CorrectionDiff`) → "What to work on next" → trend.
- Script editor: toolbar consolidation, a mobile Sections sheet, `lang`, labels.
- History: E/Y fixes. Two-column desktop kept. Mobile streak strip.

---

## 5. Wireframes (low fidelity)

### 5.1 Learning Hub

```
DESKTOP ≥1024
┌ Learning / Learning Hub ─────────────────────────────────────────────────┐
│ [Today] Practice  Vocabulary  Phrases  Speaking  Listening               │
├──────────────────────────────────────┬───────────────────────────────────┤
│ CONTINUE · step 1 of 4               │ Quick access                      │
│ Review 20 words                      │ ┌─────────────┐ ┌─────────────┐   │
│ Vocabulary · 1,886 due · ~15 min     │ │🎙 Speaking   │ │🎧 Listening  │   │
│ [ Start review → ]                   │ └─────────────┘ └─────────────┘   │
│──────────────────────────────────────│ ┌─────────────┐ ┌─────────────┐   │
│ Today's plan              1/4 · 25m  │ │📖 Vocabulary │ │💬 Phrases    │   │
│ ✓ Daily phrase                       │ │   1,886 due  │ │   70 due     │   │
│ ● Review vocabulary        (current) │ └─────────────┘ └─────────────┘   │
│ ○ Listening: at the office           │ Practice score  ⓘ                 │
│ ○ Speaking scenario                  │ Spk 59 · Lis 79 · Voc 78 · Gr 71 ·│
│                                      │ Read —                            │
├──────────────────────────────────────┴───────────────────────────────────┤
│ Library  Foundations › Reading › Scenarios › Exam Prep › History › Plan  │
│ Other subjects  Software Engineering → Notes · AI Engineering (not set up)│
└──────────────────────────────────────────────────────────────────────────┘

MOBILE 375–430
┌ Learning Hub          ⚙ ┐
│ Today Practice Vocab ›  │  ← tabs scroll sideways
│┌───────────────────────┐│
││CONTINUE · 1 of 4      ││
││Review 20 words        ││
││1,886 due · ~15 min    ││
││[   Start review →   ]││
│└───────────────────────┘│
│ Today's plan    1/4 ▸   │  ← collapsible list
│┌──────────┐┌──────────┐ │
││Speaking  ││Listening │ │
│└──────────┘└──────────┘ │
│┌──────────┐┌──────────┐ │
││Vocab 1886││Phrases 70│ │
│└──────────┘└──────────┘ │
│ Practice score  ▸       │
│ Library  ▸              │
├─────────────────────────┤
│ Home Plan Learn Apps ⋯  │
└─────────────────────────┘
```

### 5.2 Vocabulary review

```
/vocab (MOBILE)                         REVIEW SESSION (Dialog, full screen on mobile)
┌ Vocabulary        [+ Add] ┐           ┌ ✕   Cards · 7/20    ●Synced ┐
│ Words | Phrases           │           │ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░  │
│┌─────────────────────────┐│           │                             │
││ Review 20 words         ││           │          안전                │ ← KoreanText 40px
││ 1,886 due · 2,110 saved ││           │        [an-jeon]            │ ← per LanguageAids
││ [   Start review    ]  ││           │           🔊                 │
││ Customize ›             ││           │                             │
│└─────────────────────────┘│           │      ( tap to reveal )      │
│ [Library] Decks  Courses  │           │                             │
│ 🔍 Search words…          │           │ aria-live: "Correct — Good" │
│ Filters ▾   24 of 2,110   │           ├─────────────────────────────┤
│ ─ 식물이  the plant       │           │ Again  Hard  Good  Easy     │ ← sticky, tokens
│ ─ 안건    agenda          │           │ <1m    6m    1d    4d       │   12px
└───────────────────────────┘           └─────────────────────────────┘
```

### 5.3 Speaking session (Korean Coach practice)

```
PROMPT                                   FEEDBACK
┌ ✕ End    Turn 2 of 5  ■■□□□ ┐          ┌ ✕ End    Turn 2 of 5  ■■□□□ ┐
│ Morning greeting · 동료와 아침 인사│          │ ▸ Question (collapsed)      │
│┌───────────────────────────┐│          │ Your answer                 │
││ 🔊 ▶ ───────── 0:04  1×   ││          │ 안녕하세요 오늘 일찍 왔어요    │
││ 좋은 아침이에요! 오늘 일찍     ││          │ Corrected                   │
││ 오셨네요?                    ││          │ 안녕하세요, 오늘 일찍         │
││ Aids: [Transcript][Hint][EN]││          │ 오셨네요 → 왔어요 ~~오셨~~    │ ← CorrectionDiff
│└───────────────────────────┘│          │ 🔊 Listen                    │
│ Retry target (if any)       │          │ ▸ Why this changed           │
│                             │          │ ▸ More natural version       │
├─────────────────────────────┤          ├─────────────────────────────┤
│        ( 🎙 Hold / Tap )      │          │ [ Try again ] [Continue →]  │ ← primary by outcome
│  Type instead · 0:00 / 1:00 │          │  Save to mistakes           │
└─────────────────────────────┘          └─────────────────────────────┘
States in bar: idle → requesting mic → recording (timer, Stop) → recorded (replay, Re-record, Send)
               → processing ("Transcribing…", aria-live) → error (permission help, Type instead)
```

### 5.4 Listening session

```
┌ ✕   Listening · Office small talk     ┐
│┌─────────────────────────────────────┐│  ← sticky player
││ ▶  ━━━━━━━━○──────  0:21 / 0:48  [1×][0.65×]││
│└─────────────────────────────────────┘│
│ Transcript ▸ (hidden until reveal)     │
│ Q1  What time is the meeting?          │
│   ( ) 2시    (•) 3시    ( ) 4시          │ ← radiogroup
│ Q2  …                                  │
├────────────────────────────────────────┤
│ 2 of 4 answered     [ Check answers ]  │
└────────────────────────────────────────┘
Result: "3 of 4 correct" (aria-live) → each question marked with icon+text → [Try again] [New lesson]
```

### 5.5 Lesson reader (Foundations lesson / Reading unit)

```
DESKTOP                                               MOBILE
┌ ← Survival · Lesson 4 of 12      ●●●●○○○○ ┐         ┌ ← Lesson 4/12   ●●●○ ┐
│ Aids: [Romanization ✓] [English ✓]   🔊 all│         │ [Rom ✓][EN ✓]        │ ← sticky sub-bar
│ ┌──────────────── max 38em ──────────────┐ │         │                      │
│ │ ① 저는 회사원이에요.               🔊      │ │         │ ① 저는 회사원이에요. 🔊 │
│ │    jeoneun hoesawon-ieyo                │ │         │  jeoneun hoesawon…   │
│ │    I am an office worker.               │ │         │  I am an office…     │
│ │ ② …                                     │ │         │ ② …                  │
│ └─────────────────────────────────────────┘ │         ├──────────────────────┤
│                     [ Start practice → ]   │         │ [ Start practice → ] │
└────────────────────────────────────────────┘         └──────────────────────┘
Result: score · "Passed" → [ Next lesson → ] (primary)  [Practice again]  [All lessons]
Course list rows: ✓ Completed · ● In progress 40% · ○ New   + [Continue lesson 4]
```

---

## 6. Shared design system and components

### 6.1 Tokens (`app/globals.css`, additive)

| Token                                   | Purpose          | Light / Dark (initial)      |
| --------------------------------------- | ---------------- | --------------------------- |
| `--grade-again`                         | SRS Again, wrong | red-600 / red-400           |
| `--grade-hard`                          | Hard             | amber-600 / amber-400       |
| `--grade-good`                          | Good, correct    | emerald-600 / emerald-400   |
| `--grade-easy`                          | Easy             | sky-600 / sky-400           |
| `--diff-insert-bg` / `--diff-delete-bg` | Correction diff  | emerald/red at 15–20% alpha |

All are checked to WCAG AA against `--card` in both themes before use.

The primary accent stays `--primary`. Per-module hues (`text-rose-500` and so on in the nav registry) stay on **icons only**.

**Korean type (`@layer utilities`):**

- `.ko` sets:
  - `word-break: keep-all`
  - `overflow-wrap: anywhere`
  - `line-height: 1.7`
  - `font-family: "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", var(--font-sans)`
- `.ko-display` is 2.25–2.5rem with line-height 1.25 (flashcard term).
- `.ko-reader` is 1.125rem (phone) / 1.25rem (≥sm), line-height 1.85, `max-width: 38em`.

### 6.2 Components (new ones live in `components/learn/ui/`; primitives stay generic)

| Component                   | Replaces / wraps                           | Notes                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LearnHeader`               | `PageHero` on learning pages               | No `h1`. Description + one primary action + optional inline stats. `PageHero` itself is untouched (other workspaces use it).                                                               |
| `LearnTabs`                 | —                                          | Thin wrapper over `WorkspaceTabs sectionId="learn"`.                                                                                                                                       |
| `KoreanText`                | Raw Hangul spans                           | Props: `as`, `size` (`body \| reader \| display`). Always `lang="ko"`.                                                                                                                     |
| `LanguageAids`              | Scattered romanization/translation toggles | Reads `useRomanizationPreference`. Translation default is per-viewer in localStorage (`koriai-learn-translation`, wrapped in try/catch). Renders `aria-pressed` toggles.                   |
| `AidText`                   | `RevealText`, always-on romanization       | Renders romanization/translation under Korean according to `LanguageAids`.                                                                                                                 |
| `StudySession`              | Ad-hoc session wrappers                    | Slots: `topBar` (exit, title, progress), `children`, `actionBar` (sticky, `env(safe-area-inset-bottom)`, hides under the soft keyboard via the shell's existing detection). Uses `100dvh`. |
| `StepProgress`              | Hand-built bars                            | `role="progressbar"`, `aria-valuenow/max`, label "Step n of m".                                                                                                                            |
| `FeedbackRegion`            | Color-only results                         | `aria-live="polite"`, icon + text, focus target.                                                                                                                                           |
| `CorrectionDiff`            | Side-by-side paragraphs                    | Pure `lib/learning/text-diff.ts` (syllable-level LCS, unit-tested). Display only. Falls back to plain text if the diff is too noisy (>60% changed).                                        |
| `StatusBadge` (learn)       | 3 different badge sets                     | `new \| in_progress \| review_due \| completed \| mastered`, mapping functions per domain in `lib/learning/status.ts` (tested).                                                            |
| `CourseProgress`            | Foundations/Reading headers                | `completed/total`, Continue href.                                                                                                                                                          |
| `ChoiceGroup`               | Plain button options                       | Radix-style radiogroup, keyboard arrows, result states.                                                                                                                                    |
| `GradeButtons`              | Hex-colored grade buttons                  | Token colors, interval captions, `1–4` key hints.                                                                                                                                          |
| `ConfirmLeave`              | Silent exits                               | `AlertDialog` + optional `beforeunload` while `dirty`.                                                                                                                                     |
| `ErrorState` / `EmptyState` | Mixed custom boxes                         | Wraps `ErrorBanner` with a Retry. A consistent empty layout.                                                                                                                               |

### 6.3 Interaction states each session component must define

Idle · loading (stable skeleton) · active · submitting · success · partial/needs-retry · error (with retry) · offline/unsaved (where sync exists) · empty · unauthorized (handled by the shell redirect; no extra UI) · completed.

### 6.4 Motion and responsiveness

- Keep `motion/react` entrance on the hub only, and respect `useReducedMotion`. No per-card animation inside sessions except the flashcard flip.
- Breakpoints to check: 375, 430 (iPhone 15 Pro Max), 768, 1024, 1440, plus landscape 932×430 (side insets).
- Touch targets ≥44px. Small chips get an `after:` hit area, per the existing convention.

---

## 7. Existing files likely to change

| Phase                                 | Files                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 (foundations, shipped with Phase 1) | `app/globals.css` (tokens, `.ko*`), new `components/learn/ui/{LearnHeader,LearnTabs,KoreanText,LanguageAids,AidText,StudySession,StepProgress,FeedbackRegion,ErrorState}.tsx`, `components/ui/SpeakButton.tsx` (`aria-label`, `type="button"`), new `lib/learning/status.ts` + test                                                                                                                                                |
| 1                                     | `app/(main)/learn/page.tsx`, `components/learn/{StudyRecommendation,StudySkillSummary,LearningModuleCard,LearningSubjects}.tsx`, new `components/learn/{ContinueCard,TodayPlanList,QuickAccessGrid,LibraryList}.tsx`, `lib/learning-modules.ts` (grouping only), `lib/navigation.ts` (`workspaceTabs.learn`), `components/layout/navigation-shell.test.tsx`, `apps/web/CLAUDE.md` (nav note)                                       |
| 2                                     | `app/(main)/practice/page.tsx`, `components/daily-study/*`, `lib/learning/mission-item-display.ts` (+ test, vocab href), `app/(main)/vocab/page.tsx`, `components/vocab/{ReviewSession,VocabDictionary,VocabDeck,VocabStats,DailyPhraseCard,CoreKoreanPanel,EssentialBooksPanel}.tsx`, new `components/learn/ui/{GradeButtons,ConfirmLeave}.tsx`                                                                                   |
| 3                                     | `app/(main)/korean-coach/{page,practice/[scenarioId]/page,listening/page,scenarios/page,session/[sessionId]/page}.tsx`, `components/korean-coach/{CoachFeedback,AudioRecorder,CoachAudioPlayer,SessionSummary}.tsx`, `components/korean-coach/coach-ui.test.tsx`, `app/(main)/listening/page.tsx`, `app/(main)/scenarios/page.tsx`, new `lib/learning/text-diff.ts` + test, `components/learn/ui/{CorrectionDiff,ChoiceGroup}.tsx` |
| 4                                     | `app/(main)/phrasebook/{page,[collectionId]/page,practice/page}.tsx`, `components/phrasebook/*` (Home, CollectionCard, LearnModeView, ReviewModeView, RevealText), `components/learn/{FoundationsHome,LessonRunner}.tsx`, `components/reading/ReadingHome.tsx`, `app/(main)/reading/[id]/page.tsx`                                                                                                                                 |
| 5                                     | `app/(main)/interview/{page,speaking/page,listening/page,repeat/page,script/page}.tsx`, `components/interview/{CorrectionRetryPanel,EvaluationSummary,ExamPracticeDashboard}.tsx`, `app/(main)/history/page.tsx`                                                                                                                                                                                                                   |

**Not touched in any phase:**

- `lib/api/**`
- `app/api/**`
- `supabase/**`
- `lib/learning/{mission-engine,mastery,corrections,skill-groups}.ts`
- `lib/srs.ts`
- `lib/server/**`
- auth (`lib/auth-store.ts`, `app/(auth)/**`)
- `apps/luyra/**`
- vault files

---

## 8. Risk and compatibility assessment

### 8.1 Routes and params that stay exactly as they are

- `/learn`, `/learn/[lessonId]`, `/learn/foundations` (→ redirect), `/learn/today` (→ `/practice/today`)
- `/practice`, `/practice/today`, `/daily-phrase` (→ `/practice`), `/mistakes` (→ `/chat?mode=corrections`)
- `/vocab?tab=phrases`, `/vocab?review=session|setup`, `#vocab-dictionary`
- `/phrasebook?mode=phrases|reading|foundations`, `/phrasebook/[collectionId]`, `/phrasebook/new?cardId=&collectionId=`, `/phrasebook/practice?mode=learn|listen|speak|review&collectionId=`
- `/reading` (→ redirect), `/reading/[id]` (Korean ids, `decodeURIComponent`), `/reading/new`, `/reading/[id]/edit`
- `/korean-coach/{,scenarios,practice/[scenarioId],session/[sessionId],listening,mistakes,history,preferences}`
- `/listening?topic=`, `/scenarios` → `/chat?prompt=`
- `/interview`, `/interview/{listening,repeat,script,speaking}`, `/history`
- localStorage keys: `foundations-progress`, `koriai-interview-script*`, `koriai.interview.today:*`, plus every `koriai*` key
- Nav ids and `NavSectionId`s

### 8.2 Behavior changes that need explicit approval

| ID  | Change                                                                                | Why it's a change                                                          | Recommendation                                                            |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| R1  | Add Learning tabs (`workspaceTabs.learn`)                                             | Reverses the documented "Learning navigates with its hub's cards" decision | Approve, or keep the hub-only nav and drop X10                            |
| R2  | Mission `vocab_review` href `/vocab` → `/vocab?review=session`                        | The step now opens the review directly                                     | Approve (uses an existing param)                                          |
| R3  | Phrases tab "Get today's phrase" renders inline instead of linking to `/daily-phrase` | Fixes the loop. The stub route stays                                       | Approve                                                                   |
| R4  | Exposing `/korean-coach/listening` in the Coach UI                                    | Makes an orphaned feature visible again                                    | Approve, or decide to retire it (not proposed)                            |
| R5  | `/practice/today` placement                                                           | Two "today" systems                                                        | Keep both, restyle, move to Library. Merge is a separate product decision |
| R6  | Remove duplicate stats (vocab hero, phrasebook strip, daily-study summary grid)       | Removes visible numbers. Each one still appears once                       | Approve                                                                   |

### 8.3 Technical risks

| Risk                                                          | Impact                      | Mitigation                                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ReviewSession is 1,892 lines and heavily used                 | Regressions in grading/sync | Change only the shell (Dialog, header, grade buttons, `KoreanText`). Add component tests for rate → `rateWord` calls and Escape/close confirm before editing. No logic moves.                                                                            |
| `coach-ui.test.tsx` asserts feedback order                    | Test break                  | Keep section order. The diff is added inside "Corrected". Update the test intentionally if collapsibles change the DOM.                                                                                                                                  |
| `navigation-shell.test.tsx`                                   | Tab layer change            | Add test cases: Learn tab active for `/phrasebook?mode=reading` and `/korean-coach/practice/x`.                                                                                                                                                          |
| Sticky action bars vs the mobile bottom nav and soft keyboard | Overlap                     | `StudySession` offsets for the bottom nav. Hide the bar while the keyboard is open (the shell already detects it). Manual checks at 375/430 and in landscape.                                                                                            |
| Removing `h1`s                                                | Screen-reader landmarks     | The shell header `h1` is the page title. Section `h2`s keep the outline. Verify with an axe check.                                                                                                                                                       |
| Diff on Korean text                                           | Misleading highlights       | Syllable-level diff + noise fallback. Unit tests with real correction pairs (no personal data).                                                                                                                                                          |
| AI and TTS cost during visual testing                         | Burns production credits    | Use `KOREAN_COACH_MOCK_MODE=true` locally for Coach. For `/listening`, `/interview`, and `/scenarios`, test with component tests that mock `lib/api` instead of generating content. Never auto-play TTS. No visual testing against production AI routes. |
| Count mismatch (H7)                                           | Confusion                   | Label only. Don't recompute or change the mission snapshot.                                                                                                                                                                                              |

### 8.4 Privacy and security

- No new network calls, endpoints, or tables. `connect-src` (`lib/csp.ts`) is unchanged.
- New localStorage values hold only UI preferences (translation default, last Foundations track in `sessionStorage`). Never learning content.
- Screenshots for PRs use test or demo data. No personal correction text in docs or Notion.

### 8.5 Rollback

Each phase is its own branch and PR with no data changes. Rolling back means reverting that PR. Phase 0 tokens and components are additive, so later phases can be reverted on their own.

---

## 9. Phased implementation plan

Each phase is one PR, waits for your approval to start, and ends with `pnpm lint`, `pnpm test`, `pnpm build`, and manual checks at the listed widths.

| Phase                                    | Scope                                                                                                                                                                                                                         | Size (est.) | Exit criteria                                                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Hub + local nav**                  | Phase 0 primitives (tokens, `.ko`, LearnHeader, KoreanText, StudySession skeleton, StepProgress, ErrorState, SpeakButton a11y), the new `/learn` layout, `workspaceTabs.learn` (if R1 is approved)                            | M           | Continue above the fold at 375×667 and 1440×800. Tabs light correctly for every learning route. Nav tests updated.                     |
| **2 — Vocabulary + Daily Practice**      | R2, R3, R6. Vocab reorder (review card, Library/Decks/Courses). ReviewSession shell a11y. GradeButtons. ConfirmLeave. `/practice` in StudySession. `/practice/today` restyle                                                  | L           | Review starts in ≤1 tap from the hub. Daily-phrase loop gone. Overlay is keyboard-operable (Tab trap, Esc confirms).                   |
| **3 — Coach, Listening, Scenarios**      | StudySession for Coach practice and `/korean-coach/listening`. Outcome-aware feedback actions. CorrectionDiff. Permission states. `/listening` setup/session/result. `/scenarios` hierarchy. R4. Naming (C8)                  | L           | Record is reachable without scrolling at 375px. Feedback is announced. Mock-mode label visible. Coach tests pass.                      |
| **4 — Phrasebook, Reading, Foundations** | Single header, StatusBadge mapping, CourseProgress + Continue, lesson reader typography + LanguageAids + TTS on tap, Next lesson, Learn-mode completion, a11y fixes (nesting, labels, confirm dialogs), tab back/forward sync | L           | Continue resumes the right lesson/unit. Status words are the same in all three. No nested interactive elements (axe).                  |
| **5 — Exam Prep, History, polish**       | Exam hub reorder, session action bar + leave guard, results breakdown with diff, script editor toolbar/mobile sections/labels/`lang`, History error state/diff/mobile streak strip. Final pass at all widths, both themes     | L           | Start above the fold. No silent session loss. History shows an error instead of a false empty state. Full responsive checklist passes. |

### Delivery notes

**Phase 1 (PR #46).** Learning tabs use the registry labels; see §3.2.

**Phase 2: where it differs from the plan above.**

- **R2/R3 shipped.**
  - `missionItemHref("vocab_review")` is now `/vocab?review=session`, so the Hub's own special case was removed.
  - The Phrases tab (`components/vocab/PhrasesTab.tsx`) shows today's phrase via `useDailyPhrase`. It mounts only while the tab is open, so `getToday` is no more eager than before. The `/daily-phrase` stub is unchanged, but nothing in `/vocab` links to it any more.
- **V2: correction.** `/practice/today`'s summary grid did **not** duplicate the top section. Topic, mode, streak, and this week appear only there, so it was compacted into one row, not removed.
  - On `/vocab`, the PageHero stats and the VocabStats card were removed. The batch and backlog are on the Memory Lab card, and mastered/average strength are in the library header.
- **V1:** the plan's "Library · Decks · Courses" became **Library · Courses**. The library _is_ the deck browser, so a separate Decks view would repeat it.
- **V5:** the plan's "Shortcuts" hint is per-button instead: key numbers on the grade buttons, flashcards only.
- **V7 deferred to Phase 4.** `useRomanizationPreference` defaults to `on-request`, so honoring it in flashcards would hide romanization for everyone who never set the preference. Ship it together with `LanguageAids`, which also needs a visible reveal.
- **The `StudySession` layout moved to Phase 3**, where recording needs the sticky action bar. `/practice` kept its stepper and Learning tabs, and got retry, progressbar semantics, an announced step counter, stable preview skeletons, and primary-token buttons.
- **ReviewSession:**
  - The three fullscreen screens are now a Radix Dialog (`LabOverlay`): focus trap and restore, Escape, an accessible name, and initial focus on the dialog so Space/Enter still flip the card.
  - A leave confirmation appears once anything is graded.
  - Answers are announced through `aria-live`.
  - Grade buttons use the `--grade-*` tokens.
  - Korean terms use `lang="ko"`.
  - Component tests: `components/vocab/ReviewSession.test.tsx`.

**Phase 3 was skipped at the owner's request.** Phase 4 shipped before it, so `StudySession` and `CorrectionDiff` still don't exist.

**Phase 4: what shipped and where it differs.**

- **Shared pieces:**
  - `lib/learning/course.ts` (tested) maps Foundations, Reading, and Phrasebook progress onto New / In progress / Review due / Completed / Mastered, and picks what Continue opens.
  - `components/learn/{StatusBadge,CourseProgress,LearnHeader,LanguageAids}.tsx`.
  - `hooks/useBrowserStorage.ts`: storage read through `useSyncExternalStore`, the same pattern as `useSidebarState`.
- **B8:** `/phrasebook` derives its mode from the URL on every render. Before, a link to plain `/phrasebook` while Reading was open changed the URL but kept showing Reading.
- **B1:** each mode's PageHero became one `LearnHeader` line.
  - Phrases: a review card is the primary action, and the counts appear once.
  - The Phrasebook home's error state no longer renders empty sections.
- **B2/B3:**
  - Foundations has a per-track `CourseProgress` with Continue, lesson rows with status badges, and the track remembered per tab in sessionStorage. The URL is unchanged.
  - Reading has `CourseProgress` with Continue and the same badges.
  - Phrase cards show "Review due" instead of a separate red "Due" badge.
- **Lesson reader:**
  - `LanguageAids` with the old defaults (romanization and English on); "never" hides romanization.
  - English hides example translations only. A card's meaning _is_ the lesson, so it stays visible.
  - `SpeakButton` on each card and example (TTS only on tap). "Next lesson" is the primary action after a pass.
  - `aria-live` feedback that names the right answer. The link-wrapped button is fixed.
  - **Deviation:** the aids bar is _not_ sticky. The shell's sticky header sits at `top-0` with a safe-area-dependent height, so a sticky sub-bar would hide under it.
- **Reading unit:**
  - The "Show all translations" choice is remembered (English only — units have no romanization data).
  - Delete uses an AlertDialog instead of `window.confirm`. Icon buttons have `aria-label`s.
  - `lang="ko"`, reader-size type (17–18px, 38em measure), the tap-to-look-up hint visible on phones, and quiz results in `role="status"`.
  - Reading Home's pin is now a sibling of the link.
- **B4:** Learn mode ends on Finish. Practice-again remounts the mode views at card 1. Review grades use `--grade-*`.
- **B7:** the collection card has one link (a stretched title) plus a sibling pin, and the pin icon shows the current state.
- **The collection page has one primary action:** Review due, or Learn when nothing is due.
- **V7 is still deferred:** vocabulary flashcards don't use `LanguageAids` yet. Phrasebook already honors the preference through `RevealText`.

---

## 10. Acceptance criteria and testing checklist

### 10.1 Global acceptance criteria

- [ ] No changes under `lib/api/**`, `app/api/**`, `supabase/**`, `lib/server/**`, auth, the mission engine, or SRS/mastery logic. Checked with `git diff --stat`.
- [ ] Every route and query param in §8.1 behaves as before (manual + e2e smoke).
- [ ] Every number shown comes from an existing hook or API result. No placeholder or fabricated values. Empty data shows "Not started" or nothing.
- [ ] Exactly one `h1` per page, from the shell header.
- [ ] All displayed Hangul is inside `KoreanText` or an element with `lang="ko"`.
- [ ] One primary button per screen state.
- [ ] Light and dark themes both reach WCAG AA contrast for text and grade/feedback colors.
- [ ] Keyboard: every session works without a mouse. Focus is visible. Dialogs trap focus and close on Esc (with leave-confirm when dirty).
- [ ] Screen reader: progress, recording status, feedback, and quiz results are announced.
- [ ] Touch targets ≥44px. No horizontal page scroll at 375px.
- [ ] Reduced motion respected.

### 10.2 Automated tests to add or update

- `lib/learning/text-diff.test.ts`: identical text, insertion, deletion, substitution, spacing-only changes, noise fallback.
- `lib/learning/status.test.ts`: the mapping for Foundations, Reading, Phrasebook, and Vocab.
- `lib/learning/mission-item-display.test.ts`: the `vocab_review` href (R2).
- `components/layout/navigation-shell.test.tsx`: Learning tabs active states (R1).
- Components (Vitest + Testing Library, `lib/api` mocked):
  - ContinueCard states (loading, null mission, next item, all done with/without backlog)
  - ReviewSession close-confirm and grade calls
  - FeedbackRegion announcement
  - ConfirmLeave
  - CoachFeedback outcome-aware primary action
  - ChoiceGroup keyboard navigation
- `coach-ui.test.tsx` kept green.
- Optional e2e (Playwright, local dev, test account): hub → vocab review start; phrasebook mode tabs + back button; lesson Continue.

### 10.3 Manual checklist per phase

- [ ] Widths 375, 430, 768, 1024, 1440, plus landscape 932×430, in **both themes**.
- [ ] States: loading, empty, error (simulate by going offline), populated, completed.
- [ ] iPhone Safari: sticky action bar with the bottom nav, soft keyboard open in recall/text input, safe-area insets.
- [ ] Coach with `KOREAN_COACH_MOCK_MODE=true` only. Mic allowed, denied, and missing.
- [ ] No production AI generation or TTS bulk use during testing.
- [ ] Record results honestly in the PR (passed / failed / not run).

---

## Open decisions for review

1. **R1:** Add Learning tabs, or keep hub-only navigation?
2. **R5:** Keep `/practice/today` as a Library item (recommended), or plan a merge with the mission flow later?
3. **R4:** Restore `/korean-coach/listening` as "Sentence dictation", or leave it hidden?
4. Accent: unify all learning primary actions on the brand violet `--primary` (recommended), or keep one hue per area?
