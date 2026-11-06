import type { PhraseProvenance, WorkContext } from "@/lib/korean-phrasebook/schemas"

export type MessageRole = "assistant" | "user" | "system"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  correction?: string
  translation?: string
  createdAt: string
}

export interface VocabItem {
  id: string
  category: string
  term: string
  meaning: string
  pronunciation?: string
  example?: string
  exampleTranslation?: string
  difficultyLevel?: "Easy" | "Medium" | "Hard"
  mastery: number
  nextReview: string
  tags: string[]
  easeFactor: number
  intervalDays: number
  repetitions: number
  lapses: number
}

export interface Scenario {
  id: string
  title: string
  category: string
  level: "Beginner" | "Intermediate" | "Advanced"
  summary: string
  goal: string
}

export interface ScenarioDetail extends Scenario {
  introMessage?: string
}

export interface ProgressPoint {
  day: string
  minutes: number
  accuracy: number
}

export interface SimilarExpression {
  phrase: string
  meaning: string
}

export interface DailyPhrase {
  id: string
  date: string
  phrase: string
  meaning: string
  romanization?: string
  whenToUse?: string
  formality?: string
  similarExpressions: SimilarExpression[]
  learned: boolean
}

export interface MessageVariation {
  korean: string
  romanization?: string
  formality?: string
  situation?: string
}

export interface GeneratedMessages {
  intent: string
  category?: string
  variations: MessageVariation[]
  note?: string
}

export interface TranscriptLine {
  speaker: string
  korean: string
  english: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

export interface ListeningLesson {
  id: string
  topic: string
  title: string
  level: string
  lines: TranscriptLine[]
  quiz: QuizQuestion[]
  createdAt?: string
}

export interface ListeningAttemptResult {
  lessonId: string
  score: number
  total: number
  accuracy: number
  results: boolean[]
}

export interface ListeningAttemptRecord extends ListeningAttemptResult {
  id: string
  createdAt: string
}

export interface Achievement {
  code: string
  title: string
  description: string
  icon: string
  category: string
  xp: number
  unlocked: boolean
  unlockedAt?: string | null
}

export interface LevelInfo {
  level: number
  name: string
  totalXp: number
  xpIntoLevel: number
  xpForNextLevel: number | null
  nextLevelName: string | null
}

export interface AchievementSummary {
  level: LevelInfo
  unlockedCount: number
  totalCount: number
  achievements: Achievement[]
}

export interface DashboardStats {
  streakDays: number
  weeklyMinutes: number
  wordsSaved: number
  correctionsThisWeek: number
  dailyGoalProgress: number
  reviewsToday: number
  correctionsToday: number
  dueReviews: number
}

export interface FeatureActivity {
  feature: string
  totalMinutes: number
  sessionCount: number
}

export interface Conversation {
  id: string
  userId: string
  scenarioId?: string | null
  title: string
  conversationType: string
  modelUsed: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: string
  content: string
  corrections?: string | null
  tokensUsed: number
  createdAt: string
}

export interface AnalysisBreakdownItem {
  fragment: string
  meaning: string
  note: string
}

export interface SuggestedReply {
  korean: string
  english: string
  formality: string
}

export interface SentenceChallengeResponse {
  cardId: string
  term: string
  meaning: string
  challengePrompt: string
  contextHint: string
  exampleAnswer: string
}

export interface SentenceCheckResponse {
  score: number
  correct: boolean
  feedback: string
  correctedSentence: string
  betterAlternative: string
  grammarNote: string
}

// ── Foundations (basics + grammar) ──────────────────────────────────────────
// Three beginner tracks: "survival" teaches Level-0 phrases you need on day one
// (greetings, ordering, emergencies); "alphabet" teaches Hangul (자음/모음 →
// syllables); "grammar" teaches sentence patterns (particles, 요-form, tenses,
// numbers, irregular verbs).
export type LearnTrack = "survival" | "alphabet" | "grammar"

export type LessonLevel = "Intro" | "Beginner" | "Elementary"

// One lesson as shown in the track list (no teaching/practice payload).
export interface LessonSummary {
  id: string
  track: LearnTrack
  order: number
  title: string
  subtitle: string
  level: LessonLevel
  estimatedMinutes: number
  completed: boolean
  // 0–100, % of this lesson's exercises answered correctly on the best attempt.
  progress: number
}

// A teaching card shown before practice. The same shape serves both tracks:
// alphabet → `hangul` is a jamo/syllable, `meaning` is its sound; grammar →
// `hangul` is the pattern/headword, `meaning` is the rule it expresses.
export interface LessonCard {
  hangul: string
  romanization?: string
  meaning: string
  example?: string
  exampleTranslation?: string
  note?: string
}

// A single practice item. "multiple-choice" reveals the right option;
// "type-answer" expects a short typed string (e.g. the romanization).
export interface LessonExercise {
  id: string
  type: "multiple-choice" | "type-answer"
  prompt: string
  options?: string[]
  answerIndex?: number
  answer?: string
  explanation?: string
}

// Full lesson payload for the runner: intro + teaching cards + practice.
export interface LessonDetail extends LessonSummary {
  intro: string
  cards: LessonCard[]
  exercises: LessonExercise[]
}

export interface LessonAttemptResult {
  lessonId: string
  score: number
  total: number
  accuracy: number
  completed: boolean
  results: boolean[]
}

export interface CorrectionReview {
  id: string
  originalText: string
  correctedText: string
  /** More natural phrasing than `correctedText`'s minimal fix, when they differ. */
  naturalVersion?: string
  explanation?: string
  grammarPoints: string[]
  errorCategory?: string
  severity?: "minor" | "important"
  /** How many times this same mistake (by fingerprint) has recurred. */
  occurrenceCount: number
  mastery: number
  nextReviewDate: string
  easeFactor: number
  intervalDays: number
  repetitions: number
  lapses: number
}

export interface PracticeToday {
  userLevel: string
  dueVocabCount: number
  dueVocabSample: VocabItem[]
  dueCorrectionsCount: number
  dueCorrectionsSample: CorrectionReview[]
  dailyPhrase: DailyPhrase
  suggestedScenario: ScenarioDetail
  suggestedMessageCategory: string
  suggestedListeningTopic: string
}

export interface MessageAnalysis {
  id: string
  source?: string | null
  originalText: string
  literalMeaning: string
  naturalMeaning: string
  businessContext: string
  politenessLevel: string
  tone: string
  breakdown: AnalysisBreakdownItem[]
  suggestedReplies: SuggestedReply[]
  modelUsed: string
  createdAt: string
  // Main-point-first fields (2026-11-06). Optional: older history rows and a
  // response from before the change don't have them — render what's there.
  mainPoint?: string
  requiredAction?: string
  conditions?: string[]
  deadline?: string
  expectedResult?: string
  unknowns?: string[]
  clarifyingQuestion?: string
  recommendedReply?: { korean: string; romanization: string; english: string; register: string }
  usefulLanguage?: Array<{ korean: string; english: string; note: string }>
  messageRomanization?: string
}

// ── Recovery (urge/trigger tracking) ────────────────────────────────────────
// App-facing names are "Recovery*"; the underlying Supabase tables are still
// kori_focus_* (pre-dates the Growth-workspace rename, holds live user data —
// not worth a data migration for a naming change). See lib/api/recovery.ts.
export interface RecoveryHabit {
  id: string
  label: string
  replacementBehavior?: string
  trackingMode: TrackingMode
  recoveryStatement?: string
  reasons: string[]
  baseline?: RecoveryBaseline
  personalLimit?: number
  onboardingCompletedAt?: string
  startedAt: string
  active: boolean
  createdAt: string
}

export type TrackingMode =
  "abstinence" | "frequency_reduction" | "time_reduction" | "personal_limit" | "awareness"

export interface RecoveryBaseline {
  approximateFrequency?: number
  frequencyPeriod?: "day" | "week" | "month"
  commonTime?: string
  commonLocation?: string
  commonDevice?: string
  commonEmotion?: string
  affectedAreas?: string[]
}

/** RecoveryHabit is the persisted target record retained for compatibility. */
export type RecoveryTarget = RecoveryHabit

export interface RecoveryTrigger {
  id: string
  label: string
  category: TriggerCategory
  createdAt: string
}

export type TriggerCategory =
  | "emotion"
  | "time"
  | "location"
  | "device"
  | "content_source"
  | "situation"
  | "sleep"
  | "stress"
  | "social_connection"
  | "previous_activity"

export type RecoveryEventKind = "moment" | "slip" | "win"

export interface RecoveryEvent {
  id: string
  habitId: string
  occurredAt: string
  kind: RecoveryEventKind
  intensity?: number
  triggerId?: string
  emotion?: string
  location?: string
  device?: string
  situation?: string
  previousActivity?: string
  sleepQuality?: number
  stressLevel?: number
  actionTaken?: string
  healthyActionCompleted?: boolean
  rodeOut?: boolean
  note?: string
  resolvedAt?: string
  createdAt: string
}

export type UrgeIntensity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type UrgeEvent = RecoveryEvent
export type LapseEvent = RecoveryEvent & { kind: "slip" }

export interface CopingAction {
  id: string
  label: string
  category: "environment" | "movement" | "learning" | "focus" | "sleep" | "connection" | "custom"
  href?: string
  preferred?: boolean
}

export interface RecoveryPlan {
  id: string
  habitId: string
  ifText: string
  thenText: string
  sourceEventId?: string
  mastery: number
  nextReview: string
  easeFactor: number
  intervalDays: number
  repetitions: number
  lapses: number
  active: boolean
  reminderEnabled: boolean
  createdAt: string
}

export type DailyCheckInPeriod = "morning" | "evening" | "minimal"

export interface DailyCheckIn {
  id: string
  habitId: string
  date: string
  period: DailyCheckInPeriod
  mood?: string
  sleepQuality?: number
  energy?: number
  stress?: number
  riskLevel?: number
  importantGoal?: string
  protectionAction?: string
  intention?: string
  currentUrge?: number
  strongestUrge?: number
  copingStrategy?: string
  healthyHabitsCompleted: string[]
  targetOccurred?: boolean
  lesson?: string
  win?: string
  nextAction?: string
  createdAt: string
  updatedAt: string
}

export type ProtectionStatus = "not_set" | "planned" | "active" | "needs_improvement"

export interface ProtectionItem {
  id: string
  habitId: string
  category: "phone" | "computer" | "daily_environment"
  label: string
  status: ProtectionStatus
  preferredAction: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface WeeklyReview {
  id: string
  habitId: string
  weekStart: string
  statistics: Record<string, number | string | null>
  summary?: string
  experiment?: string
  aiSummary?: string
  aiConsentAt?: string
  createdAt: string
  updatedAt: string
}

export interface RecoveryPrivacySettings {
  lockEnabled: boolean
  discreetNotifications: boolean
  customNotificationText?: string
  quietHoursStart?: string
  quietHoursEnd?: string
  morningReminder: boolean
  eveningReminder: boolean
  riskTimeReminder: boolean
  bedtimeReminder: boolean
  weeklyReviewReminder: boolean
  aiConsent: boolean
  updatedAt?: string
}

export interface RecoveryMomentumFactor {
  key: "check_ins" | "managed_urges" | "healthy_actions" | "honest_reflections" | "fast_returns"
  label: string
  points: number
  maximum: number
  explanation: string
}

export interface RecoveryDashboardSummary {
  currentStreak: number
  bestStreak: number
  recoveryDaysThisMonth: number
  urgesManaged: number
  healthyActionsCompleted: number
  checkInConsistency: number
  momentum: number
  momentumFactors: RecoveryMomentumFactor[]
  averageUrgeIntensity: number | null
  highestRiskWindow: { startHour: number; endHour: number; count: number } | null
  averageReturnHours: number | null
}

// ── Habits (generic identity-based habit tracking) ──────────────────────────
export type HabitCategory =
  | "exercise"
  | "reading"
  | "meditation"
  | "sleep"
  | "water"
  | "study"
  | "coding"
  | "deep_work"
  | "walking"
  | "custom"

export interface Habit {
  id: string
  label: string
  category: HabitCategory
  identityStatement?: string
  active: boolean
  startedAt: string
  createdAt: string
}

export interface HabitCheckIn {
  id: string
  habitId: string
  date: string
  completed: boolean
  note?: string
  createdAt: string
}

// ── Phrasebook ───────────────────────────────────────────────────────────────

// 반말 (casual) is deliberately excluded — Phrasebook only covers workplace
// and daily-life register a foreign professional actually needs, and 해요체
// is polite, not casual (see lib/korean-phrasebook/schemas.ts for the rule).
export type PhraseRegister = "formal" | "polite"

export type PhraseDifficulty = "easy" | "medium" | "hard"

// "new" | "learning" | "mastered" mirrors the vocab mastery bands in
// lib/vocab-review.ts (weak<50 / learning 50-79 / mastered>=80) so Due/New/
// Learning/Mastered read the same way across features.
export type PhraseState = "new" | "learning" | "mastered"

export interface PhraseQuestionContent {
  korean: string
  romanization: string
  english: string
  register: PhraseRegister
}

export interface PhraseAnswerContent {
  korean: string
  romanization: string
  english: string
  register: PhraseRegister
  usageNote?: string
  isRecommended: boolean
}

export interface PhraseVocabularyItem {
  korean: string
  english: string
}

export interface PhraseCollection {
  id: string
  userId: string
  sourceKey: string | null
  titleKo: string
  titleEn: string
  description: string | null
  category: string
  seedVersion: number
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface PhraseCard {
  id: string
  userId: string
  collectionId: string
  sourceKey: string | null
  category: string
  situation: string
  difficulty: PhraseDifficulty
  question: PhraseQuestionContent
  questionVariants: string[]
  answers: PhraseAnswerContent[]
  usageNote: string | null
  vocabulary: PhraseVocabularyItem[]
  tags: string[]
  position: number
  active: boolean
  isUserEdited: boolean
  /** Optional "Korean for my work" comprehension notes (null when absent or before migration 20261106120000). */
  workContext: WorkContext | null
  /** Where the Korean came from — null for cards created before provenance existed. */
  provenance: PhraseProvenance | null
  /** Private owner-typed label ("team chat"); never fetched or shown publicly. */
  sourceLabel: string | null
  createdAt: string
  updatedAt: string
}

export interface PhraseProgress {
  phraseId: string
  state: PhraseState
  repetitions: number
  intervalDays: number
  easeFactor: number
  lapses: number
  mastery: number
  attemptCount: number
  successfulCount: number
  lastGrade: ReviewRatingLike | null
  lastReviewedAt: string | null
  nextReviewAt: string
  mastered: boolean
}

// Duplicated as a string union (not imported) to keep lib/types.ts free of a
// dependency on lib/srs.ts — callers that need the real type import
// ReviewRating from lib/srs directly; this is just the on-the-wire shape.
export type ReviewRatingLike = "AGAIN" | "HARD" | "GOOD" | "EASY"

export type PhrasePracticeMode = "learn" | "listen" | "speak" | "review"

export type PhraseInputMethod = "voice" | "text" | "manual"

export interface PhraseAttemptFeedback {
  recognizedTranscript: string
  communicationSuccess: boolean
  correctedSentence: string
  naturalAlternative: string
  explanation: string
  vocabulary: PhraseVocabularyItem[]
  retryWords: string[]
  /** Work-reply practice only: did the reply keep the intended meaning? */
  meaningPreserved?: boolean | null
  /** Work-reply practice only: one reusable grammar pattern. */
  pattern?: string | null
}

export interface PhraseAttempt {
  id: string
  phraseId: string
  practiceMode: PhrasePracticeMode
  inputMethod: PhraseInputMethod
  transcript: string | null
  feedback: PhraseAttemptFeedback | null
  hintUsed: boolean
  transcriptRevealed: boolean
  taskCompleted: boolean
  createdAt: string
}

export interface PhraseCardWithProgress extends PhraseCard {
  progress: PhraseProgress | null
}

export interface PhrasebookStats {
  cardsLearned: number
  cardsDue: number
  cardsMastered: number
  listeningAttempts: number
  speakingAttempts: number
  successfulCommunicationRate: number
  mostDifficultSituations: Array<{ situation: string; failureCount: number }>
  workplaceActivityCount: number
  dailyActivityCount: number
}
