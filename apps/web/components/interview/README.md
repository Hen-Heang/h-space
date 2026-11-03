# K-Specialist Speaking Exam — Guide & Process

Personal prep guide for the K-Specialist spoken Korean exam, matching what's built into the Exam Prep pages (`/interview` and `/interview/script`). This is the "why" and "how" behind those screens — the actual live data lives in `lib/study-plan.ts`, `lib/interview.ts`, and `lib/exam-strategy.ts`.

## Exam basics

> Updated for the **6th** K-Specialist cycle. The live dates and content are in `lib/study-plan.ts` (`EXAM_DATE`, `SCRIPT_DUE_DATE`) and `lib/interview.ts` (`INTERVIEW_TOPICS`); if this guide and the code disagree, the code wins. The topic id is still `"weather"` because it keys saved scripts and the question bank in Supabase — don't rename it.

- **Date:** Sat, Nov 28, 2026 · 13:00 KST (re-check the final notice; it also mentions 11/29)
- **Format:** Spoken Q&A only — self-introduction → topic introduction → Q&A
- **Topic:** 한국에 온 후 새로 생긴 습관/취미 — new habits and hobbies after coming to Korea
- **Script deadline:** Nov 20, 2026 — the written script must be finalized and submitted before the exam
- **Judged on:** Speaking, Pronunciation, Vocabulary, Confidence (4 criteria, scored out of 5 each)

## What the app's scores mean

Every score in Exam Prep comes from text: the browser's speech recognition turns your voice into a transcript, and the AI (or, for Listen & Repeat, a local word match) reads that transcript. **No feature analyzes your audio.** Pronunciation and Confidence are therefore rough signals — a misrecognized word may mean unclear pronunciation, or just a noisy room. The UI says this next to each score (`components/interview/ScoreHonestyNote.tsx`); keep that wording whenever a score is added or moved.

## The week-by-week process

The plan (`STUDY_WEEKS` in `lib/study-plan.ts`) runs week by week up to the exam in these phases:

1. **Baseline (Week 0)** — take one full mock to get a starting score, draft all 7 script sections roughly, start the daily routine.
2. **Foundation (Weeks 1–3)** — daily core routine, grammar points, rewrite two script sections per week, build listening reps.
3. **Speaking (Weeks 4–6)** — switch to daily _full_ mocks (5+ turns) with real scoring, drill your top mistakes, start memorizing script content (not just reading it).
4. **Polish** — tighten wording, fix weak pronunciation, handle off-script/follow-up questions, finalize and submit the script by the script deadline.
5. **Taper (Week 10)** — timed mocks under real conditions (no English, no notes), light review only, rest before exam day.

Each week's tasks and the live countdown are what `StudyPlanCard` and `ExamCountdownBanner` render — check off tasks there as you go; that state (plus any custom tasks you add) is saved per-device.

## The script

Eight sections, each with a Korean draft + English translation, memorized in this order (`scriptOutline` in `lib/interview.ts`):

1. 인사 및 주제 소개 — Greeting & topic intro
2. 교통 습관 — Transportation habits
3. 날씨 확인 습관 — Checking the weather
4. 분리배출과 요리 — Separating trash & cooking
5. 운동 취미 — New exercise hobbies
6. 친구와 새로운 곳 가기 — Friends & new places
7. 한국어 공부 습관 — Studying Korean
8. 마무리 — Conclusion

Write and edit this in `/interview/script` — it autosaves locally and syncs to your account. Its tabs are **Script**, **Q&A Prep** (draft answers to likely questions), **Read** (the whole script as one text), and **Listen & Repeat** (practice it out loud). Copy, Download, and Clear are in the "Script actions" menu. Deep links: `/interview/script?tab=repeat|qa|read`.

The shared question bank seeds in `supabase/seed/` (`kori_interview_questions.sql`, `kori_interview_questions_cambodia_experience.sql`) were written for the **5th-cycle weather topic**. They still load under the `"weather"` id, so expect some weather-only questions in the bank until a 6th-topic seed replaces them. Keep any new seed answers short (two or three sentences) and in step with the canonical script.

## Speaking strategy — the 9 rules

1. **Short is best** — 2–3 sentences, stop once your point is clear.
2. **Answer first, explain after** — direct answer, then one reason or example.
3. **Slow speaking wins** — speed doesn't score; clarity and calm do.
4. **Use easy words only** — common vocabulary, simple grammar.
5. **Pause before you answer** — a 1-second pause reads as confidence, not hesitation.
6. **Mistakes are OK** — don't over-apologize, keep going.
7. **Always show growth** — "처음에는 어려웠습니다" → "지금은 좋아졌습니다."
8. **Use safety sentences** — memorized fallback lines to buy time under pressure.
9. **Be honest, not perfect** — sincerity and effort score higher than fake fluency.

**Safety sentences to memorize:**

- 네, 질문 감사합니다. — Yes, thank you for the question.
- 천천히 말씀해 주시면 감사하겠습니다. — I would appreciate it if you could speak slowly.
- 한국어가 아직 부족해서 간단히 말씀드리겠습니다. — My Korean is still limited, so I'll keep it simple.
- 처음에는 어려웠습니다. / 지금은 좋아졌습니다. — At first it was difficult. / Now it's gotten better.

**Judges reward:** clear message, calm attitude, confidence, effort.
**Judges don't reward:** fancy words, long answers.

## Training plan by skill

| Skill         | Goal                        | Frequency                                  |
| ------------- | --------------------------- | ------------------------------------------ |
| Reading       | Read the topic smoothly     | Daily · 15–20 min                          |
| Listening     | Understand common questions | 3–4×/week · 20 min                         |
| Pronunciation | Clear sounds, not speed     | Daily · 10 min                             |
| Speaking      | Short, simple answers       | Daily · 15 min                             |
| Confidence    | Repetition + routine        | Weekly full simulation + daily consistency |

## Using the app to practice

- **Exam Prep home** (`/interview`) — four cards: Today's practice, Mock interview, My exam script, Progress. Everything else (question bank, listening practice, Q&A review, study plan, tips, study pack, vocabulary) is under "More practice & materials".
- **Mock Interview** (home → Mock interview; Practice or Exam Simulation) — an AI examiner asks one question at a time; answer by voice or typed text and get feedback after each turn. Finish a session to get a scorecard against the four exam criteria; scores build a trend over time.
- **Answer practice** (`/interview/speaking`, `components/interview/AnswerPracticeSession.tsx`) — one flow for every question: **Listen → Answer → Review → Retry**. Opens straight into Today's 5 (resuming at the first question not done today). Review is either an AI **check** (scored against the transcript, saved to `kori_interview_answers`, updates question progress) or a free **compare** with the bank's model answer. "Change questions" switches to weak questions, questions picked from the bank, or AI questions, and sets the level. State machine: `lib/answer-practice.ts`.
- **Listening practice** (`/interview/listening`) — the same session with the listening preset: the Korean text stays hidden until review, play limits and slow replay follow the listening level (Easy → Exam Mode), "Reveal & compare" comes first, and checked answers are saved as `listening_drill`.
- **Listen & Repeat** (My exam script → Listen & Repeat tab; `/interview/repeat` still works and shows the same practice, `components/interview/ListenRepeatPractice.tsx`) — the app speaks a sentence from your script (or a key phrase), the mic opens, you say it back, and the words the recognizer found are marked (`lib/repeat-drill.ts`, matched locally — no AI call). In the tab it practices the editor's live text; on the route it uses the newest saved copy. Without a working mic (or by choice) you type the sentence instead; that checks recall, not speaking.
- **My exam script** (`/interview/script`) — the Google-Docs-style editor for the 8-section script, Q&A prep, reading, and Listen & Repeat, described above.
- **ChatGPT Voice (optional)** (home → More, and after a mock interview's scorecard; `components/interview/ChatGptVoiceCard.tsx`, prompt in `lib/chatgpt-voice.ts`) — copies a role-play prompt (topic + question plan; your script only if you switch it on, with a preview of exactly what's shared) and opens chatgpt.com in a new tab. No API call and no new paid service: it uses your own ChatGPT account, and nothing said there is saved, scored, or synced back to H-Space.
- **Real-story Q&A review** (home → More) — curated Q&A with catch keywords (`lib/personal-exam-prep.ts`) plus your saved script (`useSavedScript`).
- **Study Pack** — vocabulary, key phrases, and likely questions for the weather topic, each with TTS playback.
- **Speaking Strategy card** — the rules, safety sentences, and training plan above, always available as a quick reference during a live session.

## Implementation notes

- **Session action bars** (`StickyActionBar`): on phones the main actions are `position: fixed` above the bottom nav, leaving room for the floating AI Assistant button, and only once there's an answer to act on. `position: sticky` doesn't work inside the app shell: `<main>` has `overflow-x-hidden`, which makes it a scroll container. Fixing that in the shell is a separate, app-wide decision (several other pages have sticky elements that would start sticking).
- **E2E against a dev server**: run the interview specs with `--workers=1`; several browsers in parallel overload `next dev` and time out.
