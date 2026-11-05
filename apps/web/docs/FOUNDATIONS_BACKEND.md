# Foundations module — backend contract

The frontend `Foundations` module (`/learn`) is built and works today against a
local curated seed (`lib/foundations-data.ts`) with a localStorage progress
mirror. To make it real, implement these endpoints in the Spring Boot backend.
The frontend already calls them first and only falls back to the seed when they
error, so wiring them in requires **no frontend change**.

> Reminder: every response is wrapped in the standard envelope. The frontend
> unwraps `r.data.data`, so return your payload under `data`.

Base path: `/api/foundations` (the axios client already prefixes `/api`).

---

## Endpoints

### 1. List lessons in a track

```
GET /foundations/lessons?track=alphabet|grammar
```

Returns the track's lessons, ordered by `order`, each carrying the **current
user's** progress.

Response `data`: `LessonSummary[]`

```jsonc
[
  {
    "id": "alpha-1",
    "track": "alphabet", // "alphabet" | "grammar"
    "order": 1,
    "title": "Basic Vowels",
    "subtitle": "The six core vowels of Hangul",
    "level": "Intro", // "Intro" | "Beginner" | "Elementary"
    "estimatedMinutes": 6,
    "completed": false, // best attempt passed (accuracy >= 60)
    "progress": 0, // 0–100, best-attempt accuracy
  },
]
```

### 2. Get one lesson (teaching content + practice)

```
GET /foundations/lessons/{id}
```

Response `data`: `LessonDetail` (`LessonSummary` + the fields below)

```jsonc
{
  "id": "alpha-1",
  "track": "alphabet",
  "order": 1,
  "title": "Basic Vowels",
  "subtitle": "The six core vowels of Hangul",
  "level": "Intro",
  "estimatedMinutes": 6,
  "completed": false,
  "progress": 0,

  "intro": "Korean vowels are built from simple strokes...",
  "cards": [
    {
      "hangul": "ㅏ",
      "romanization": "a", // optional
      "meaning": "like 'a' in father",
      "example": "아", // optional
      "exampleTranslation": "ah", // optional
      "note": "...", // optional
    },
  ],
  "exercises": [
    {
      "id": "alpha-1-e1",
      "type": "multiple-choice", // "multiple-choice" | "type-answer"
      "prompt": "Which vowel makes the 'a' sound?",
      "options": ["ㅓ", "ㅏ", "ㅜ", "ㅡ"], // multiple-choice only
      "answerIndex": 1, // multiple-choice only
      "answer": "i", // type-answer only (expected string)
      "explanation": "ㅏ is the open 'a' sound.", // optional
    },
  ],
}
```

**Hybrid content:** `intro` + `cards` are the curated, stable skeleton (seed them
from `lib/foundations-data.ts`). `exercises` may be authored OR AI-generated
per request — the existing `vocabApi.generate` / `listeningApi.generate` AI flow
is the model to follow. Either way the shape above is all the frontend needs.

> Security note: do **not** send `answerIndex` / `answer` to the client if you
> want to prevent answer-peeking. The current UI uses them for instant feedback;
> if you'd rather grade server-side only, omit them here and the runner can be
> adjusted to defer feedback to the `/complete` response. (Say the word and I'll
> switch the runner to that mode.)

### 3. Submit an attempt

```
POST /foundations/lessons/{id}/complete
Body: { "answers": [1, "ma", 2] }
```

`answers` aligns **by index** with `exercises`: an option index (number) for
`multiple-choice`, the typed string for `type-answer`.

Grade server-side, persist the attempt, update streak/XP, and return:

Response `data`: `LessonAttemptResult`

```jsonc
{
  "lessonId": "alpha-1",
  "score": 2,
  "total": 3,
  "accuracy": 67, // round(score/total * 100)
  "completed": true, // accuracy >= 60 (the pass threshold)
  "results": [true, false, true],
}
```

Grading rules (match the frontend fallback in `useFoundations.gradeLocally`):

- multiple-choice: `answer === exercise.answerIndex`
- type-answer: `trim().toLowerCase()` equality against `exercise.answer`
- pass threshold: `accuracy >= 60`

---

## Database tables

Reuses the existing `study_sessions` / `learning_streaks` so completions feed the
dashboard and streak automatically — call the same activity-logging path the
other modules use on a passed attempt.

```
foundation_lessons
  id (pk)                varchar   -- e.g. "alpha-1" (stable, human-readable)
  track                  varchar   -- "alphabet" | "grammar"
  lesson_order           int
  title                  varchar
  subtitle               varchar
  level                  varchar   -- "Intro" | "Beginner" | "Elementary"
  estimated_minutes      int
  intro                  text
  + audit fields (created_at, updated_at)

foundation_lesson_cards
  id (pk)                bigserial
  lesson_id (fk)         varchar -> foundation_lessons.id
  card_order             int
  hangul                 varchar
  romanization           varchar   null
  meaning                varchar
  example                varchar   null
  example_translation    varchar   null
  note                   text      null

foundation_lesson_exercises   -- omit if exercises are AI-generated on the fly
  id (pk)                varchar   -- e.g. "alpha-1-e1"
  lesson_id (fk)         varchar -> foundation_lessons.id
  exercise_order         int
  type                   varchar   -- "multiple-choice" | "type-answer"
  prompt                 text
  options                jsonb     null   -- string[] for multiple-choice
  answer_index           int       null
  answer                 varchar   null
  explanation            text      null

foundation_attempts
  id (pk)                bigserial
  user_id (fk)           bigint -> users.id
  lesson_id (fk)         varchar -> foundation_lessons.id
  score                  int
  total                  int
  accuracy               int
  completed              boolean
  answers                jsonb     -- the submitted answers, for review/analytics
  created_at             timestamp
  -- derive LessonSummary.completed / .progress from the user's BEST attempt
```

`LessonSummary.completed` = `EXISTS(best attempt with completed = true)`;
`LessonSummary.progress` = `MAX(accuracy)` over the user's attempts (0 if none).

---

## Frontend touch-points (for reference)

| Concern                      | File                                 |
| ---------------------------- | ------------------------------------ |
| API calls                    | `lib/api/foundations.ts`             |
| Types (DTO shapes)           | `lib/types.ts` (Foundations section) |
| Data hook + grading fallback | `hooks/useFoundations.ts`            |
| Curated seed                 | `lib/foundations-data.ts`            |
| List UI                      | `app/(main)/learn/page.tsx`          |
| Lesson runner                | `components/learn/LessonRunner.tsx`  |

When the endpoints go live, remove the local seed fallback only if you want to
force backend-only data — otherwise it stays as a harmless offline safety net,
consistent with how other modules in this repo degrade.
