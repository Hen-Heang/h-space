// ── Vocabulary (SRS flashcards) ─────────────────────────────────────────────

export interface VocabCard {
  id: string;
  category: string;
  term: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  exampleTranslation: string | null;
  tags: string[];
  mastery: number; // 0-100
  nextReview: string; // ISO timestamp
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  createdAt: string;
  updatedAt: string;
}

export type MasteryFilter = "all" | "weak" | "learning" | "mastered";
export type VocabSortOrder = "alpha" | "mastery-asc" | "mastery-desc" | "due";

export interface VocabStats {
  total: number;
  weak: number;
  learning: number;
  mastered: number;
  averageMastery: number;
}

// ── Daily study plan ─────────────────────────────────────────────────────────

export type DailyStudyMode = "busy" | "normal" | "office";
export type DailyActivityStatus = "pending" | "active" | "completed" | "skipped";
export type DailyStudyCategory = "workplace" | "daily-life";
export type DailyStudyDifficulty = "beginner" | "beginner-plus";

export type DailyActivityType = "review" | "shadowing" | "vocabulary" | "roleplay" | "correction_retry";

export interface DailyStudyExpression {
  id: string;
  korean: string;
  romanization: string;
  english: string;
  usageNote: string;
  example: string;
  exampleRomanization: string;
  exampleEnglish: string;
  difficulty: DailyStudyDifficulty;
  category: DailyStudyCategory;
}

export interface DailyStudyDialogueLine {
  speaker: string;
  korean: string;
  romanization: string;
  english: string;
}

export interface DailySpokenQuestion {
  id: string;
  korean: string;
  romanization: string;
  english: string;
  hint: string;
  modelAnswer: string;
  category: DailyStudyCategory;
  register: "해요체" | "합니다체";
}

export interface DailyStudyContent {
  reviewCards: DailyStudyExpression[];
  usefulWords: DailyStudyExpression[];
  practicalExpressions: DailyStudyExpression[];
  dialogue: {
    title: string;
    situation: string;
    lines: DailyStudyDialogueLine[];
  };
  roleplay: {
    scenario: string;
    learnerRole: string;
    coachRole: string;
  };
  spokenQuestions: DailySpokenQuestion[];
  realWorldMission: string;
  reflectionPrompt: string;
}

export interface DailyStudyActivity {
  id: string;
  type: DailyActivityType;
  title: string;
  description: string;
  plannedStart: string;
  estimatedMinutes: number;
  completedSeconds: number;
  status: DailyActivityStatus;
  skipReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DailyStudyPlan {
  id: string;
  studyDate: string;
  mode: DailyStudyMode;
  topicKey: string;
  topicLabel: string;
  activities: DailyStudyActivity[];
  content: DailyStudyContent;
  reflection: string;
  missionResult: string;
  totalFocusSeconds: number;
  createdAt: string;
  updatedAt: string;
}
