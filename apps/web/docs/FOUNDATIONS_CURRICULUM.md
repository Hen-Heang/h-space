# Foundations Curriculum Audit

Last reviewed: 2026-09-03

## Outcome

Hengo Foundations now has an active authored curriculum of 35 lessons:

- 3 Survival lessons
- 8 Alphabet lessons
- 24 Grammar lessons

The original 29-lesson seed remains unchanged so existing lesson IDs and saved learner progress stay stable. A six-lesson Core Korean extension is composed additively by `lib/foundations-curriculum.ts`.

The earlier curriculum expansion completed the essential reading sequence before moving deeper into grammar. It added:

1. More vowels and y sounds
2. Aspirated and tense consonants
3. Compound vowels
4. Final consonants (받침) and the seven representative final sounds
5. Liaison and common connected-speech changes
6. Locations, existence, destinations, and the distinction between 에 and 에서

The 2026-09-03 Core Korean batch fills practical beginner gaps that matter for daily life and a Korean workplace:

1. Korean word classes and dictionary-form awareness
2. Question words and demonstratives
3. Native/Sino-Korean numbers and high-frequency counters
4. Dates, clock time, weekdays, ranges, and deadlines
5. Honorifics, humble verbs, and polite/formal speech levels
6. Reusable workplace politeness patterns for requests, updates, uncertainty, and follow-up

Existing lesson IDs are preserved. The new lessons continue the grammar sequence as `grammar-19` through `grammar-24`, so `kori_foundation_progress` remains backward-compatible without a schema migration.

## Content Model

Foundations uses a hybrid authored-content model:

- `lib/foundations-data.ts` — original stable 29-lesson seed
- `lib/foundations-core-korean.ts` — additive Core Korean lessons
- `lib/foundations-curriculum.ts` — active combined curriculum used by the UI
- Supabase `kori_foundation_progress` — per-user completion/progress only

This keeps canonical teaching content versioned and reviewable in Git while learner progress stays server-backed and synchronized across devices.

## Source Basis

The lesson text, examples, and exercises in this repository are original. These official resources were used to choose scope, sequence topics, and fact-check Korean forms:

- [King Sejong Institute online curriculum](https://www.iksi.or.kr/lms/main/curriculum.do) — beginner Levels 1–2 and practical communication goals.
- [King Sejong Institute Foundation learning materials](https://www.ksif.or.kr/com/cmm/EgovContentView.do?menuNo=20102200) — official introductory Hangul, pronunciation, beginner, practical, and business Korean materials.
- [Practical Korean 1](https://nuri.iksi.or.kr/front/cms/contents/layout2/learningsejong2022/detail.do?csCmsContentsType=CMS_CONTENTS_TYPE%3A%3ACMS_EBOOK&csCmsMastrSeq=15358&menuSn=664) — early beginner sequence for places, actions, numbers, existence, shopping, food, dates, time, experience, and daily situations.
- [Sejong Korean 1B](https://nuri.iksi.or.kr/front/cms/contents/layout2/learningsejong/detail.do?csCmsMastrSeq=15205&menuSn=649) — beginner progression into location, direction, travel, health, ability, and giving.
- [National Institute of Korean Language: Hangeul composition](https://www.korean.go.kr/eng_hangeul/principle/001.html) — 19 initial consonants, 21 medial vowels, and initial/medial/final syllable structure.
- [National Institute of Korean Language: consonant principles](https://www.korean.go.kr/eng_hangeul/principle/002.html) — plain, aspirated, and tense consonant groups.
- [Standard Korean pronunciation rules](https://korean.go.kr/kornorms/m/m_regltn.do?regltn_code=0002) — representative final sounds and sound-change rules.

## Next Content Priorities

The next content batch should prioritize practice depth rather than adding another large grammar catalog:

1. Short listening drills for the new numbers/time/honorific lessons
2. Directions and transportation situations
3. Weather, clothing, health, and pharmacy situations
4. Workplace listening/speaking tasks that reuse the new politeness patterns
5. Phrasebook expansion for developer communication and office small talk
6. A curated Core Korean vocabulary view that reuses existing vocabulary before inserting duplicates

Audio or recorded model pronunciation should be preferred for sound contrast and connected speech; text-only romanization is not sufficient for reliable pronunciation training.

## Validation

- `lib/foundations-data.test.ts` protects the original curriculum structure and Hangul coverage.
- `lib/foundations-core-korean.test.ts` protects the additive Core Korean sequence, unique IDs, practical topic coverage, and exercise validity.
- The active curriculum version includes both the base version and Core Korean extension version so React Query does not reuse stale lesson caches after a content update.
