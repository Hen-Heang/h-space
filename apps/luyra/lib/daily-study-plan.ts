import type {
  DailyActivityType,
  DailyStudyActivity,
  DailyStudyContent,
  DailyStudyExpression,
  DailyStudyMode,
  DailySpokenQuestion,
} from "@/types/learning";

// Pure content/schedule generator, ported verbatim from Hengo's
// lib/daily-study-plan.ts. Deliberately deterministic and AI-free: the topic
// and every expression/question below are static content rotated by weekday
// and date, not generated per request. Roleplay/correction_retry activities
// keep their slot in the schedule but are self-practiced (read the model
// answer aloud) rather than run through a live AI voice coach, since
// Milestone 5 defers Korean Coach/Interview.

export interface WeekdayTopic {
  key: string;
  label: string;
  shortLabel: string;
  category: "workplace" | "daily-life" | "mixed";
}

export const WEEKDAY_TOPICS: readonly WeekdayTopic[] = [
  { key: "work-responsibilities", label: "Current work, responsibilities and task description", shortLabel: "Current work", category: "workplace" },
  { key: "help-clarification", label: "Asking for help and clarification", shortLabel: "Help & clarification", category: "workplace" },
  { key: "progress-deadlines", label: "Progress, deadlines and blockers", shortLabel: "Progress & blockers", category: "workplace" },
  { key: "meetings-feedback", label: "Meetings, schedules and feedback", shortLabel: "Meetings & feedback", category: "workplace" },
  { key: "workplace-test", label: "Weekly workplace conversation test", shortLabel: "Workplace test", category: "workplace" },
  { key: "real-life-mission", label: "Real-life mission: shopping, restaurant, café or transport", shortLabel: "Real-life mission", category: "daily-life" },
  { key: "weekly-review", label: "Weekly mistake review and light speaking practice", shortLabel: "Weekly review", category: "mixed" },
] as const;

export const MODE_LABELS: Record<DailyStudyMode, string> = {
  busy: "Busy Day",
  normal: "Normal Day",
  office: "Office Study Day",
};

export const MODE_TOTAL_MINUTES: Record<DailyStudyMode, number> = {
  busy: 30,
  normal: 60,
  office: 120,
};

type ActivityTemplate = Omit<DailyStudyActivity, "id" | "completedSeconds" | "status" | "skipReason" | "startedAt" | "completedAt">;

const MODE_SCHEDULES: Record<DailyStudyMode, ActivityTemplate[]> = {
  busy: [
    { type: "review", title: "Review previous mistakes", description: "Review five due expressions and meaningful mistakes.", plannedStart: "19:00", estimatedMinutes: 10 },
    { type: "shadowing", title: "Listening & shadowing", description: "Read today's dialogue aloud, then repeat each line.", plannedStart: "19:10", estimatedMinutes: 10 },
    { type: "roleplay", title: "Spoken practice", description: "Answer today's five spoken questions aloud, then compare with the model answer.", plannedStart: "19:20", estimatedMinutes: 10 },
  ],
  normal: [
    { type: "review", title: "Focused review", description: "Review five due expressions and previous mistakes.", plannedStart: "19:00", estimatedMinutes: 10 },
    { type: "shadowing", title: "Listening & shadowing", description: "Read the practical dialogue aloud three times.", plannedStart: "19:10", estimatedMinutes: 15 },
    { type: "vocabulary", title: "Words & useful expressions", description: "Learn five useful words and three practical expressions.", plannedStart: "19:25", estimatedMinutes: 10 },
    { type: "roleplay", title: "Role-play practice", description: "Practice a workplace or daily-life scenario one question at a time.", plannedStart: "19:35", estimatedMinutes: 15 },
    { type: "correction_retry", title: "Reflection", description: "Review today's spoken questions again and record a short reflection.", plannedStart: "19:50", estimatedMinutes: 10 },
  ],
  office: [
    { type: "review", title: "Due expressions & mistakes", description: "Review five due expressions and yesterday's meaningful mistakes.", plannedStart: "09:00", estimatedMinutes: 20 },
    { type: "shadowing", title: "Three-dialogue shadowing block", description: "Read the dialogue aloud three times, focusing on rhythm.", plannedStart: "10:30", estimatedMinutes: 25 },
    { type: "vocabulary", title: "Five high-frequency words", description: "Learn five words you can use at work or in daily life today.", plannedStart: "13:00", estimatedMinutes: 15 },
    { type: "roleplay", title: "Workplace role-play", description: "Answer one practical question at a time and use formal 합니다체.", plannedStart: "15:00", estimatedMinutes: 30 },
    { type: "correction_retry", title: "Questions & Korean diary", description: "Answer five questions, then record a short Korean diary.", plannedStart: "17:20", estimatedMinutes: 30 },
  ],
};

const REVIEW_CARDS: DailyStudyExpression[] = [
  expression("review-progress", "진행 상황이 어떻게 되나요?", "jinhaeng sanghwang-i eotteoke doenayo?", "How is the progress going?", "Use this to ask for a concise status update.", "현재 진행 상황을 공유해 주세요.", "hyeonjae jinhaeng sanghwang-eul gongyuhae juseyo.", "Please share the current progress.", "workplace"),
  expression("review-deadline", "언제까지 완료할 수 있나요?", "eonjekkaji wallyohal su innayo?", "By when can you complete it?", "A neutral workplace deadline question.", "내일 오후까지 완료할 수 있습니다.", "naeil ohukkaji wallyohal su itsseumnida.", "I can complete it by tomorrow afternoon.", "workplace"),
  expression("review-help", "도움이 필요하신가요?", "doumi piryohasin-gayo?", "Do you need help?", "Polite and suitable for a coworker.", "네, 이 부분을 확인해 주시면 좋겠습니다.", "ne, i bubuneul hwaginhae jusimyeon joketsseumnida.", "Yes, I would appreciate it if you checked this part.", "workplace"),
  expression("review-repeat", "이 부분을 다시 설명해 주시겠어요?", "i bubuneul dasi seolmyeonghae jusigesseoyo?", "Could you explain this part again?", "Use when you need clarification without sounding abrupt.", "죄송하지만 한 번만 더 설명해 주세요.", "joesonghajiman han beonman deo seolmyeonghae juseyo.", "Sorry, but please explain it one more time.", "workplace"),
  expression("review-direction", "이 근처에 지하철역이 있어요?", "i geuncheoe jihacheol-yeogi isseoyo?", "Is there a subway station nearby?", "A polite everyday directions question.", "네, 저쪽으로 곧장 가세요.", "ne, jeojjogeuro gotjang gaseyo.", "Yes, go straight that way.", "daily-life"),
];

const USEFUL_WORDS: DailyStudyExpression[] = [
  expression("word-task", "작업", "jageop", "task / work item", "Common in technical status updates.", "현재 로그인 작업을 하고 있습니다.", "hyeonjae rogeuin jageobeul hago itsseumnida.", "I am currently working on the login task.", "workplace"),
  expression("word-requirement", "요구사항", "yogusahang", "requirement", "Use for product or technical requirements.", "요구사항을 다시 확인했습니다.", "yogusahang-eul dasi hwaginhaetsseumnida.", "I checked the requirements again.", "workplace"),
  expression("word-blocker", "문제", "munje", "problem / issue", "Beginner-friendly word for an issue or blocker.", "지금 작은 문제가 하나 있습니다.", "jigeum jageun munjega hana itsseumnida.", "There is one small issue now.", "workplace"),
  expression("word-schedule", "일정", "iljeong", "schedule", "Use for meetings, deadlines, and plans.", "회의 일정을 확인해 주세요.", "hoeui iljeong-eul hwaginhae juseyo.", "Please check the meeting schedule.", "workplace"),
  expression("word-receipt", "영수증", "yeongsujeung", "receipt", "Useful at a shop, restaurant, or pharmacy.", "영수증 주세요.", "yeongsujeung juseyo.", "Please give me the receipt.", "daily-life"),
];

const PRACTICAL_EXPRESSIONS: DailyStudyExpression[] = [
  expression("expression-current", "현재 어떤 작업을 하고 계신가요?", "hyeonjae eotteon jageobeul hago gyesin-gayo?", "What task are you currently working on?", "Formal workplace question for a stand-up or check-in.", "저는 현재 API 오류를 수정하고 있습니다.", "jeoneun hyeonjae API oryureul sujeonghago itsseumnida.", "I am currently fixing an API error.", "workplace"),
  expression("expression-confirm", "요구사항을 확인하셨나요?", "yogusahang-eul hwaginhasyeonnayo?", "Did you check the requirements?", "Polite confirmation question; avoid using it with a blaming tone.", "네, 문서와 디자인을 모두 확인했습니다.", "ne, munseowa dijain-eul modu hwaginhaetsseumnida.", "Yes, I checked both the document and design.", "workplace"),
  expression("expression-pay", "카드로 계산할게요.", "kadeuro gyesanhalgeyo.", "I'll pay by card.", "Natural polite phrase at a restaurant or convenience store.", "봉투도 하나 주세요.", "bongtudo hana juseyo.", "Please give me a bag too.", "daily-life"),
];

const WORKPLACE_QUESTIONS: DailySpokenQuestion[] = [
  question("q-current", "현재 어떤 작업을 하고 계신가요?", "hyeonjae eotteon jageobeul hago gyesin-gayo?", "What are you currently working on?", "Start with: 저는 현재 ___을/를…", "저는 현재 결제 API를 개발하고 있습니다.", "workplace", "합니다체"),
  question("q-deadline", "언제까지 완료할 수 있나요?", "eonjekkaji wallyohal su innayo?", "By when can you complete it?", "Use a time + 까지 완료할 수 있습니다.", "내일 오후 세 시까지 완료할 수 있습니다.", "workplace", "합니다체"),
  question("q-progress", "진행 상황이 어떻게 되나요?", "jinhaeng sanghwang-i eotteoke doenayo?", "How is the progress going?", "Say a percentage or what is finished.", "현재 팔십 퍼센트 정도 완료했습니다.", "workplace", "합니다체"),
  question("q-problem", "문제가 있나요?", "munjega innayo?", "Is there a problem?", "Start with 네, ___ 문제가 있습니다 or 아니요.", "네, 테스트 환경에 작은 문제가 있습니다.", "workplace", "합니다체"),
  question("q-help", "도움이 필요하신가요?", "doumi piryohasin-gayo?", "Do you need help?", "Answer yes/no, then give one short reason.", "네, 로그를 확인하는 데 도움이 필요합니다.", "workplace", "합니다체"),
  question("q-requirements", "요구사항을 확인하셨나요?", "yogusahang-eul hwaginhasyeonnayo?", "Did you check the requirements?", "Start with 네, 확인했습니다.", "네, 요구사항을 모두 확인했습니다.", "workplace", "합니다체"),
  question("q-meeting", "회의는 몇 시에 시작하나요?", "hoe-uineun myeot sie sijakhanayo?", "What time does the meeting start?", "Use ___시에 시작합니다.", "회의는 오후 두 시에 시작합니다.", "workplace", "합니다체"),
  question("q-explain", "이 부분을 다시 설명해 주시겠어요?", "i bubuneul dasi seolmyeonghae jusigesseoyo?", "Could you explain this part again?", "Acknowledge politely, then offer to explain.", "네, 예시와 함께 다시 설명드리겠습니다.", "workplace", "합니다체"),
];

const DAILY_QUESTIONS: DailySpokenQuestion[] = [
  question("q-restaurant", "주문하시겠어요?", "jumunhasigesseoyo?", "Would you like to order?", "Say the dish + 주세요.", "비빔밥 하나 주세요.", "daily-life", "해요체"),
  question("q-store", "봉투 필요하세요?", "bongtu piryo-haseyo?", "Do you need a bag?", "Answer 네/아니요 + 주세요/괜찮아요.", "네, 작은 봉투 하나 주세요.", "daily-life", "해요체"),
  question("q-directions", "어디로 가세요?", "eodiro gaseyo?", "Where are you going?", "Say the place + 에 가요.", "서울역에 가요.", "daily-life", "해요체"),
  question("q-pharmacy", "어디가 아프세요?", "eodiga apeuseyo?", "Where does it hurt?", "Say ___이/가 아파요.", "목이 아프고 기침이 나요.", "daily-life", "해요체"),
  question("q-delivery", "택배를 어디에 놓을까요?", "taekbaereul eodie no-eulkkayo?", "Where should I leave the delivery?", "Use 문 앞에 놓아 주세요.", "문 앞에 놓아 주세요.", "daily-life", "해요체"),
  question("q-weather", "오늘 날씨가 어때요?", "oneul nalssiga eottaeyo?", "How is the weather today?", "Use 춥다, 덥다, 좋다, 비가 오다.", "오늘은 조금 춥지만 날씨가 좋아요.", "daily-life", "해요체"),
  question("q-weekend", "주말에 뭐 할 거예요?", "jumare mwo hal geoyeyo?", "What will you do this weekend?", "Use ___을/를 할 거예요.", "친구를 만나고 한국어를 공부할 거예요.", "daily-life", "해요체"),
  question("q-transport", "어느 역에서 내리세요?", "eoneu yeogeseo naeriseyo?", "Which station are you getting off at?", "Use ___역에서 내려요.", "강남역에서 내려요.", "daily-life", "해요체"),
];

function expression(
  id: string,
  korean: string,
  romanization: string,
  english: string,
  usageNote: string,
  example: string,
  exampleRomanization: string,
  exampleEnglish: string,
  category: "workplace" | "daily-life"
): DailyStudyExpression {
  return { id, korean, romanization, english, usageNote, example, exampleRomanization, exampleEnglish, difficulty: "beginner", category };
}

function question(
  id: string,
  korean: string,
  romanization: string,
  english: string,
  hint: string,
  modelAnswer: string,
  category: "workplace" | "daily-life",
  register: "해요체" | "합니다체"
): DailySpokenQuestion {
  return { id, korean, romanization, english, hint, modelAnswer, category, register };
}

function rotate<T>(items: readonly T[], offset: number): T[] {
  if (items.length === 0) return [];
  const normalized = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalized), ...items.slice(0, normalized)];
}

export function topicForWeekday(day: number): WeekdayTopic {
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new Error("Weekday must be an integer from 0 (Sunday) to 6 (Saturday)");
  }
  const mondayFirstIndex = day === 0 ? 6 : day - 1;
  return WEEKDAY_TOPICS[mondayFirstIndex];
}

export function topicForDate(date: Date, timeZone = "Asia/Seoul"): WeekdayTopic {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return topicForWeekday(index);
}

export function generateModeSchedule(mode: DailyStudyMode): DailyStudyActivity[] {
  return MODE_SCHEDULES[mode].map((template, index) => ({
    ...template,
    id: `${mode}-${template.type}-${index + 1}`,
    completedSeconds: 0,
    status: "pending",
    skipReason: null,
    startedAt: null,
    completedAt: null,
  }));
}

export function buildDailyStudyContent(topicKey: string, studyDate: string): DailyStudyContent {
  const topicIndex = Math.max(0, WEEKDAY_TOPICS.findIndex((topic) => topic.key === topicKey));
  const numericDate = Number(studyDate.replaceAll("-", "")) || 0;
  const dailyFirst = topicKey === "real-life-mission";
  const workplace = rotate(WORKPLACE_QUESTIONS, topicIndex + numericDate);
  const daily = rotate(DAILY_QUESTIONS, topicIndex + numericDate);
  const spokenQuestions = dailyFirst
    ? [daily[0], daily[1], workplace[0], daily[2], workplace[1]]
    : [workplace[0], workplace[1], daily[0], workplace[2], daily[1]];

  const topic = WEEKDAY_TOPICS[topicIndex] ?? WEEKDAY_TOPICS[0];
  const missions: Record<string, string> = {
    "work-responsibilities": "Give one real 30-second Korean update about the task you are working on today.",
    "help-clarification": "Ask one coworker or shop employee a short clarification question in Korean.",
    "progress-deadlines": "Say your current progress, one blocker, and a realistic completion time aloud.",
    "meetings-feedback": "Confirm one meeting time or repeat one piece of feedback in Korean.",
    "workplace-test": "Complete all five workplace questions without reading the model answers first.",
    "real-life-mission": "Use one Korean sentence while shopping, ordering, travelling, or visiting a café.",
    "weekly-review": "Retry your three most useful corrected answers and say a two-sentence Korean diary.",
  };

  return {
    reviewCards: rotate(REVIEW_CARDS, topicIndex).slice(0, 5),
    usefulWords: rotate(USEFUL_WORDS, topicIndex).slice(0, 5),
    practicalExpressions: rotate(PRACTICAL_EXPRESSIONS, topicIndex).slice(0, 3),
    dialogue: {
      title: topic.shortLabel,
      situation: topic.category === "daily-life" ? "At a café before work" : "A short team status check",
      lines:
        topic.category === "daily-life"
          ? [
              { speaker: "직원", korean: "주문하시겠어요?", romanization: "jumunhasigesseoyo?", english: "Would you like to order?" },
              { speaker: "나", korean: "아이스 아메리카노 한 잔 주세요.", romanization: "aiseu amerikano han jan juseyo.", english: "One iced Americano, please." },
              { speaker: "직원", korean: "매장에서 드세요?", romanization: "maejangeseo deuseyo?", english: "Will you have it here?" },
              { speaker: "나", korean: "아니요, 가지고 갈게요.", romanization: "aniyo, gajigo galgeyo.", english: "No, I'll take it to go." },
            ]
          : [
              { speaker: "팀장", korean: "진행 상황이 어떻게 되나요?", romanization: "jinhaeng sanghwang-i eotteoke doenayo?", english: "How is the progress going?" },
              { speaker: "나", korean: "현재 팔십 퍼센트 정도 완료했습니다.", romanization: "hyeonjae palsip peosenteu jeongdo wallyohaetsseumnida.", english: "It is about 80 percent complete." },
              { speaker: "팀장", korean: "문제가 있나요?", romanization: "munjega innayo?", english: "Is there a problem?" },
              { speaker: "나", korean: "작은 문제가 있지만 오늘 안에 해결하겠습니다.", romanization: "jageun munjega itjiman oneul ane haegyeolhagetsseumnida.", english: "There is a small issue, but I will resolve it today." },
            ],
    },
    roleplay: {
      scenario: topic.label,
      learnerRole: topic.category === "daily-life" ? "A customer handling a simple errand" : "A software engineer giving a clear update",
      coachRole: topic.category === "daily-life" ? "A polite Korean staff member" : "A Korean team lead",
    },
    spokenQuestions,
    realWorldMission: missions[topicKey] ?? missions["work-responsibilities"],
    reflectionPrompt: "Write 1-3 short lines: What felt easy? What will you repeat tomorrow?",
  };
}

export function calculateDailyProgress(activities: DailyStudyActivity[]): {
  percentage: number;
  completedCount: number;
  skippedCount: number;
  focusedMinutes: number;
  plannedMinutes: number;
} {
  const completedCount = activities.filter((activity) => activity.status === "completed").length;
  const skippedCount = activities.filter((activity) => activity.status === "skipped").length;
  const focusedSeconds = activities.reduce((total, activity) => total + Math.max(0, activity.completedSeconds), 0);
  const plannedMinutes = activities.reduce((total, activity) => total + activity.estimatedMinutes, 0);
  return {
    percentage: activities.length === 0 ? 0 : Math.round((completedCount / activities.length) * 100),
    completedCount,
    skippedCount,
    focusedMinutes: Math.floor(focusedSeconds / 60),
    plannedMinutes,
  };
}

export function nextStudyActivity(activities: DailyStudyActivity[]): DailyStudyActivity | null {
  return activities.find((activity) => activity.status === "active") ?? activities.find((activity) => activity.status === "pending") ?? null;
}

export type { DailyActivityType };
