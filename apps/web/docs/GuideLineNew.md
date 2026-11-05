# Build a Full-Stack SaaS Application: Korean Developer AI Coach

## Vision

Create a modern AI-powered language learning platform specifically designed for foreign software engineers working in Korea.

The goal is not to teach textbook Korean.

The goal is to help users:

- Understand Korean coworkers
- Speak naturally in meetings
- Participate in daily standups
- Understand technical discussions
- Write professional Korean messages
- Improve listening comprehension
- Gain confidence in workplace communication

The platform should combine AI tutoring, workplace simulation, listening practice, speaking practice, vocabulary learning, and progress tracking.

---

# Target Users

Primary Users:

- Foreign software engineers working in Korea
- International students preparing for Korean tech jobs
- Foreign professionals working in Korean companies

Examples:

- Backend Developers
- Frontend Developers
- QA Engineers
- DevOps Engineers
- Product Managers

---

# Technology Stack

## Frontend

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Shadcn UI
- React Query (TanStack Query)
- React Hook Form
- Zod

## Backend

- Java 21
- Spring Boot 3
- Spring Security
- JWT Authentication
- Spring Data JPA
- PostgreSQL
- Flyway Migration

## AI Integration

- OpenAI API

Use AI for:

- Conversation simulation
- Grammar correction
- Workplace phrase explanation
- Message generation
- Pronunciation feedback
- Learning recommendations

## Infrastructure

- GitHub Actions

---

# Implementation Status (see README.md for the up-to-date route table)

This document is the original product vision/module list — kept for reference, not
re-synced module-by-module. Several modules below are already shipped under different
names/routes than originally specced:

- Module 2 (Vocabulary) → `/vocab` (decks, AI generation, textbook import, dictionary)
- Module 3/9 (AI Coach / Workplace Analyzer) → `/chat` (Chat / Analyze / Generate tabs)
- Module 4 (Daily Phrase) → `/daily-phrase`
- Module 5 (Message Generator) → the "Generate" tab in `/chat`
- Module 6 (Meeting Simulator) → `/scenarios` (roleplay scenarios that hand off into `/chat`)
- Module 10 (Flashcards/SRS) → `/vocab` review sessions, plus the "Corrections" tab in `/chat` (SRS review of past corrections; `/mistakes` redirects there)
- Module 11 (Progress Dashboard) → `/dashboard`
- Exam Prep (`/interview`) and Foundations (`/learn` — beginner Hangul/grammar tracks) and
  Dev Notes (`/notes` — a personal study knowledge library) are newer additions not in the
  original module list above.

Not yet built: Module 7 (Listening Practice — page exists at `/listening` but hidden from
nav), Module 8 (Speaking Practice), Module 12 (Achievements — page exists, hidden from nav).

---

# Application Modules

## Module 1: Authentication

Features:

- Register
- Login
- Logout
- Refresh Token
- Forgot Password
- Profile Management

User Profile:

- Name
- Country
- Native Language
- Korean Level
- Occupation
- Years of Experience
- Learning Goal

---

# Module 2: Vocabulary Learning System

Vocabulary Categories:

### Daily Life

Examples:

- 안녕하세요
- 감사합니다
- 죄송합니다

### Workplace

Examples:

- 회의
- 일정
- 보고
- 확인

### Developer Vocabulary

Examples:

- 배포
- 서버
- 데이터베이스
- API
- 프론트엔드
- 백엔드
- 오류

Vocabulary Data:

- Korean
- English Translation
- Khmer Translation
- Pronunciation
- Example Sentence
- Audio
- Difficulty Level

---

# Module 3: AI Workplace Korean Coach

User can ask:

"What does this sentence mean?"

"Correct my Korean."

"How would a Korean developer say this naturally?"

AI should:

- Explain meaning
- Explain grammar
- Explain politeness level
- Provide workplace examples
- Provide developer examples

---

# Module 4: Daily Phrase of the Day

Generate daily workplace expressions.

Example:

Phrase:

확인 후 말씀드리겠습니다.

Meaning:

I will check and get back to you.

Explain:

- When to use
- Formality level
- Similar expressions

Allow:

- Save phrase
- Add to flashcards
- Mark as learned

---

# Module 5: Workplace Message Generator

User enters:

"I finished the task."

AI generates:

작업 완료했습니다.

해당 작업 마무리했습니다.

작업 완료하였습니다.

Explain:

- Formality
- Natural usage
- Recommended situations

Categories:

- Reporting Progress
- Asking Questions
- Requesting Help
- Meeting Communication
- Deployment Updates
- Bug Reports

---

# Module 6: AI Meeting Simulator

Simulate real workplace conversations.

Scenarios:

### Daily Standup

AI:

어제 어떤 작업을 하셨나요?

User responds.

AI:

- Correct grammar
- Improve wording
- Score answer

---

### Code Review

AI:

이 코드 변경 이유를 설명해 주세요.

User responds.

AI evaluates.

---

### Deployment Discussion

AI:

오늘 배포 예정인가요?

User responds.

AI provides feedback.

---

### Sprint Planning

AI behaves like a Korean team lead.

---

# Module 7: Listening Practice

Generate workplace conversations.

Topics:

- Daily Standup
- Code Review
- Team Meeting
- Bug Discussion
- Deployment

Features:

- AI-generated audio
- Slow speed
- Normal speed
- Transcript
- Quiz

Track:

- Listening accuracy
- Completion rate

---

# Module 8: Speaking Practice

User records voice.

Workflow:

1. AI provides sentence.
2. User speaks.
3. Speech-to-text converts audio.
4. Compare expected sentence.
5. Generate score.

Feedback:

- Pronunciation
- Missing words
- Grammar mistakes

---

# Module 9: Real Workplace Korean Analyzer

User pastes:

- Slack messages
- KakaoTalk messages
- Meeting notes
- Team chat messages

Example:

담당자분께 전달드렸습니다.

AI explains:

- Literal meaning
- Natural meaning
- Business context
- Politeness level

This feature should be extremely detailed.

---

# Module 10: Flashcard Learning

Modes:

- Korean → English
- English → Korean
- Korean → Khmer
- Audio → Meaning

Implement Spaced Repetition System (SRS).

Difficulty:

- Easy
- Medium
- Hard

Review scheduling should adapt automatically.

---

# Module 11: Progress Dashboard

Display:

- Current Streak
- Weekly Learning Time
- Vocabulary Learned
- Listening Score
- Speaking Score
- Meeting Simulation Score
- AI Conversation Score

Charts:

- Daily Progress
- Weekly Progress
- Monthly Progress

---

# Module 12: Achievement System

Examples:

Beginner Survivor

Completed First Meeting

7-Day Streak

30-Day Streak

Deployment Expert

Code Review Master

Workplace Communication Expert

Provide XP system and learning levels.

---

# Database Design

Tables:

users

roles

user_profiles

vocabularies

vocabulary_categories

user_vocabularies

flashcards

flashcard_reviews

daily_phrases

learning_streaks

meeting_simulations

simulation_attempts

ai_conversations

listening_lessons

listening_attempts

speaking_attempts

message_analysis

achievements

user_achievements

notifications

study_sessions

---

# Backend Architecture

Use clean architecture.

Layers:

Controller

Service

Repository

Domain

DTO

Mapper

Security

Exception Handling

Validation

Implement:

- Global Exception Handler
- API Response Wrapper
- Logging
- Audit Fields
- Pagination
- Sorting
- Search

---

# Frontend Requirements

Use:

- Responsive Design
- Dark Mode
- Mobile First Design
- Clean Dashboard Layout
- Professional SaaS UI

Design System (keep every screen consistent):

- One radius — `rounded-2xl` for cards and inputs (no arbitrary radii)
- Calm elevation — borders + subtle `shadow-sm`; no heavy drop shadows or decorative glows
- `lucide-react` icons at `strokeWidth={2}`; a single blue accent on neutral surfaces, semantic colors only for status
- Typographic hierarchy — bold only for page titles and key numbers; semibold card titles; medium/muted labels; sentence case (no `uppercase tracking-wide` eyebrows)
- Icon-only controls where meaning is obvious (view toggles, pagination); text for primary actions and navigation
- Brand: **Hengo** — logo at `public/hengo-icon.png`

Pages:

Landing Page

Authentication

Dashboard

Vocabulary

Flashcards

Daily Phrase

AI Coach

Meeting Simulator

Listening Practice

Speaking Practice

Message Analyzer

Profile

Settings

---

# AI Prompt Engineering Requirements

Create specialized AI roles:

1. Korean Teacher
2. Workplace Korean Coach
3. Developer Korean Coach
4. Meeting Simulator
5. Pronunciation Evaluator

The AI should:

- Explain grammar simply
- Use workplace examples
- Use developer examples
- Focus on practical communication
- Avoid textbook-only explanations
- Teach natural Korean used in Korean companies

---

# MVP Roadmap

Phase 1

- Authentication
- Vocabulary System
- Flashcards
- Dashboard

Phase 2

- Daily Phrase
- AI Coach
- Message Generator

Phase 3

- Meeting Simulator
- Listening Practice

Phase 4

- Speaking Practice
- Pronunciation Feedback

Phase 5

- Achievements
- Gamification
- Learning Recommendations

---

# Success Metric

The user should become confident enough to:

- Participate in Korean daily standups
- Understand team meetings
- Explain technical work in Korean
- Communicate naturally with Korean coworkers
- Write professional workplace messages
- Improve listening and speaking ability for real-world software engineering work in Korea
