// Mock-interview ("Exam Prep") domain logic for the K-Specialist Korean
// interview (제6회). The interview is self-introduction → topic intro → Q&A, so this trains
// the live loop: hear a question, answer aloud, get judged on speaking,
// pronunciation, vocabulary, and confidence.
//
// The examiner is driven entirely through the existing chat-streaming backend
// (chatApi), so no new endpoint is required. We inject the instructions into
// the message text, the same approach useChat uses for language/dev-mode.

import { INTERVIEW_MODES, type InterviewModeConfig } from "./interview-modes"
import type { UnexpectedQuestion } from "./interview-unexpected"

export type InterviewTopicId = "weather" | "workplace-qa"

export interface VocabEntry {
  term: string
  meaning: string
  /** The smaller pass-first deck is shown before optional stretch vocabulary. */
  priority?: "core" | "stretch"
  /** Short topic sentence so the learner meets the word in context. */
  exampleKo?: string
  exampleEn?: string
}

export interface PhraseEntry {
  ko: string
  en: string
}

export interface PracticeQuestion extends PhraseEntry {
  /** A short 2–3 sentence response to shadow, then personalize. */
  answerKo?: string
  answerEn?: string
  /** The minimum content words to recall before revealing the model answer. */
  keywords?: string[]
}

export interface AnswerFrame {
  label: string
  useFor: string
  patternKo: string
  patternEn: string
  exampleKo: string
  exampleEn: string
}

export interface PrepSource {
  publisher: string
  title: string
  url: string
  usedFor: string
}

/** Optional curated study material shown alongside a topic. */
export interface InterviewPrep {
  vocabulary: VocabEntry[]
  keyPhrases: PhraseEntry[]
  sampleQuestions: PracticeQuestion[]
  answerFrames?: AnswerFrame[]
  sources?: PrepSource[]
}

/** One section of the prepared script the candidate submits before the exam. */
export interface ScriptSection {
  id: string
  titleKo: string
  titleEn: string
  /** Korean guidance on what to write in this section. */
  hint: string
}

export interface InterviewTopic {
  id: InterviewTopicId
  /** English label for the picker. */
  label: string
  /** Korean label as it appears on the exam announcement. */
  labelKo: string
  /** One-line English description of the angle to prepare. */
  description: string
  difficulty: "Easy–Medium" | "Medium" | "Hard"
  /** Marks the topic recommended for this candidate's level. */
  recommended?: boolean
  /** Extra context handed to the examiner so questions stay on-topic. */
  examinerBrief: string
  /** Curated vocab / phrases / likely questions to drill daily. */
  prep?: InterviewPrep
  /** Outline for the written script submitted before the exam. */
  scriptOutline?: ScriptSection[]
  /**
   * The candidate's own drafted script, keyed by `scriptOutline` section id.
   * Any section left empty in the editor falls back to this text on load;
   * whatever the candidate has actually written (locally or in their account)
   * always wins.
   */
  scriptSeed?: Record<string, string>
  /**
   * English translation of the script, keyed by section id. Shown in the
   * editor as an editable reference under each Korean section; used as the
   * default whenever the candidate hasn't saved their own English text.
   */
  scriptSeedEn?: Record<string, string>
}

// Section-by-section scaffold for the script the candidate writes and submits.
// Mirrors the examiner's question arc so practice and the written script align.
// Section ids are new for the 제6회 topic so an old saved script (keyed by the
// previous sections' ids) never overrides the new seed text.
const HABITS_SCRIPT_OUTLINE: ScriptSection[] = [
  {
    id: "opening",
    titleKo: "인사 및 주제 소개",
    titleEn: "Greeting & topic intro",
    hint: "간단히 인사하고 오늘 이야기할 주제를 소개하세요. 예: 오늘은 한국에 온 후 새로 생긴 습관과 취미에 대해 말씀드리겠습니다.",
  },
  {
    id: "transport",
    titleKo: "교통 습관",
    titleEn: "Transportation habits",
    hint: "캄보디아에서의 교통(오토바이, 차)과 한국에서의 교통(걷기, 버스, 지하철)을 비교하세요. '처음에는 ~, 하지만 지금은 ~' 표현이 유용합니다.",
  },
  {
    id: "weather-check",
    titleKo: "날씨 확인 습관",
    titleEn: "Checking the weather",
    hint: "밖에 나가기 전에 날씨를 확인하는 습관과 그 이유(비, 눈, 추위 → 우산, 옷 준비)를 이야기하세요.",
  },
  {
    id: "recycling-cooking",
    titleKo: "분리배출과 요리",
    titleEn: "Separating trash & cooking",
    hint: "쓰레기 분리배출(음식물 쓰레기, 재활용)과 음식 습관(배달 → 직접 요리)이 어떻게 달라졌는지 이야기하세요.",
  },
  {
    id: "exercise",
    titleKo: "운동 취미",
    titleEn: "New exercise hobbies",
    hint: "예전 취미(배구, 축구)와 지금 취미(산책, 조깅, 자전거)를 비교하세요. 여의도공원, 한강 같은 실제 장소와 느낌을 넣어 보세요.",
  },
  {
    id: "friends-travel",
    titleKo: "친구와 새로운 곳 가기",
    titleEn: "Friends & new places",
    hint: "한국에서 만난 친구들과 가 본 곳(수원, 대전, 부산)을 이야기하세요. 'V-아/어 봤어요' 표현을 써 보세요.",
  },
  {
    id: "korean-study",
    titleKo: "한국어 공부 습관",
    titleEn: "Studying Korean",
    hint: "왜 한국어를 매일 공부하는지, 처음에 어려웠던 점과 지금 달라진 점을 이야기하세요.",
  },
  {
    id: "closing",
    titleKo: "마무리",
    titleEn: "Conclusion",
    hint: "작은 변화들이 나에게 어떤 의미인지 정리하고, 앞으로의 다짐으로 마무리하세요. 예: 감사합니다.",
  },
]

// The candidate's final interview script (Notion: "K-Specialist 6th — Henry",
// FINAL INTERVIEW SCRIPT), in formal -습니다 style, split into the outline
// sections above. Notion's one weather + recycling sentence is split across
// those two sections; the home station is left out on purpose (public repo).
const HABITS_SCRIPT_SEED: Record<string, string> = {
  opening:
    "안녕하십니까. 히엉입니다.\n\n오늘은 한국에 온 후 새로 생긴 습관과 취미에 대해 말씀드리겠습니다.\n\n한국에 온 지 거의 1년이 되었습니다. 그동안 제 생활에 여러 가지 새로운 습관이 생겼습니다.",
  transport:
    "캄보디아에서는 밖에 갈 때 보통 오토바이나 차를 이용했습니다. 하지만 한국에서는 걸어서 출근하고, 멀리 갈 때는 버스나 지하철을 이용합니다.\n\n저는 지하철 5호선을 자주 이용합니다. 처음에는 지하철 노선과 환승이 어려웠지만, 지금은 혼자서도 서울의 여러 곳에 갈 수 있습니다.",
  "weather-check": "또 밖에 나가기 전에 날씨를 확인합니다.",
  "recycling-cooking":
    "그리고 쓰레기를 버릴 때는 분리배출도 신경 씁니다.\n\n한국에 처음 왔을 때는 한국 음식에 익숙하지 않아서 직접 요리를 시작했습니다. 지금은 김치찌개도 만들 수 있고, 한국 음식에도 많이 익숙해졌습니다.",
  exercise:
    "두 번째는 운동입니다.\n\n한국에 온 후에는 산책, 조깅, 자전거 타기를 더 자주 하게 되었습니다. 퇴근 후나 주말에는 여의도공원에서 걷거나 조깅을 하고, 한강에서는 자전거를 탑니다.\n\n운동을 하고 나면 기분이 상쾌하고 스트레스도 줄어드는 것 같습니다.",
  "friends-travel":
    "세 번째는 새로운 곳에 가 보는 것입니다.\n\n올해 설날에는 한국에 사는 캄보디아 친구들과 수원에 갔습니다. 수원 화성행궁을 구경하고, 캄보디아 식당에서 놈반쪽도 같이 먹었습니다.\n\n친구들과 명절을 보내면서 새로운 곳도 경험할 수 있어서 특히 기억에 남았습니다.",
  "korean-study":
    "마지막으로 한국어 공부도 중요한 습관이 되었습니다.\n\n회사와 일상생활에서 한국어가 필요해서 매일 조금씩 공부하고 있습니다. 특히 회사에서는 한국어 문서를 읽거나 동료들의 말을 이해해야 할 때가 있습니다.\n\n처음에는 듣기와 말하기가 많이 어려웠지만, 지금은 예전보다 조금 더 잘 이해할 수 있게 되었습니다.",
  closing:
    "이런 작은 변화들 덕분에 혼자 할 수 있는 일이 많아졌고, 한국 생활에도 더 잘 적응하게 되었습니다.\n\n앞으로도 좋은 습관을 계속 유지하고, 한국에서 새로운 경험을 더 많이 해 보고 싶습니다.\n\n감사합니다.",
}

// English translation of the final script, section by section, mirroring
// HABITS_SCRIPT_SEED's paragraphing.
const HABITS_SCRIPT_SEED_EN: Record<string, string> = {
  opening:
    "Hello. I am Hieng.\n\nToday, I would like to talk about the new habits and hobbies I developed after coming to Korea.\n\nIt has been almost one year since I came to Korea. During that time, I have developed several new habits.",
  transport:
    "In Cambodia, I usually used a motorbike or a car when I went out. But in Korea, I walk to work, and when I go somewhere far, I take the bus or subway.\n\nI often take subway Line 5. At first, the subway lines and transfers were difficult, but now I can go to many places in Seoul by myself.",
  "weather-check": "I also check the weather before I go outside.",
  "recycling-cooking":
    "And when I throw away trash, I pay attention to separating it.\n\nWhen I first came to Korea, I was not used to Korean food, so I started cooking for myself. Now I can even make kimchi stew, and I have become much more used to Korean food.",
  exercise:
    "The second is exercise.\n\nAfter coming to Korea, I started walking, jogging, and cycling more often. After work or on weekends, I walk or jog at Yeouido Park, and I ride a bicycle along the Han River.\n\nAfter exercising, I feel refreshed and my stress seems to go down.",
  "friends-travel":
    "The third is visiting new places.\n\nThis Seollal, I went to Suwon with Cambodian friends who live in Korea. We looked around Hwaseong Haenggung and ate nom banh chok together at a Cambodian restaurant.\n\nIt was especially memorable because I could spend the holiday with friends and experience a new place.",
  "korean-study":
    "Lastly, studying Korean has also become an important habit.\n\nI need Korean at work and in daily life, so I study a little every day. At work especially, there are times when I need to read Korean documents or understand what my coworkers say.\n\nAt first, listening and speaking were very difficult, but now I can understand a little better than before.",
  closing:
    "Thanks to these small changes, I can do many more things by myself, and I have adapted better to life in Korea.\n\nI want to keep these good habits and have many more new experiences in Korea.\n\nThank you.",
}

const HABITS_ANSWER_FRAMES: AnswerFrame[] = [
  {
    label: "Started to / came to",
    useFor: "What changed after coming to Korea",
    patternKo: "한국에 온 후 ___게 되었어요.",
    patternEn: "After coming to Korea, I started to ___.",
    exampleKo: "한국에 온 후 많이 걷게 되었어요.",
    exampleEn: "After coming to Korea, I started walking a lot.",
  },
  {
    label: "Before vs. now",
    useFor: "Comparing Cambodia and Korea",
    patternKo: "___기 전에는 ___았/었어요. 하지만 지금은 ___아요/어요.",
    patternEn: "Before ___, I ___. But now I ___.",
    exampleKo: "한국에 오기 전에는 지하철을 이용하지 않았어요. 하지만 지금은 매일 이용해요.",
    exampleEn: "Before coming to Korea, I didn't use the subway. But now I use it every day.",
  },
  {
    label: "Show adaptation",
    useFor: "Reflection and confidence",
    patternKo: "처음에는 ___았/었어요. 하지만 지금은 ___아요/어요.",
    patternEn: "At first ___. But now ___.",
    exampleKo: "처음에는 지하철이 어려웠어요. 하지만 지금은 혼자서도 잘 이용해요.",
    exampleEn: "At first the subway was hard. But now I use it well even by myself.",
  },
  {
    label: "While doing",
    useFor: "Describing a hobby",
    patternKo: "___(으)면서 ___아요/어요.",
    patternEn: "I ___ while ___.",
    exampleKo: "자전거를 타면서 한강을 봐요.",
    exampleEn: "I look at the Han River while riding my bicycle.",
  },
  {
    label: "Either / or",
    useFor: "What you usually do",
    patternKo: "___거나 ___아요/어요.",
    patternEn: "I ___ or ___.",
    exampleKo: "주말에는 걷거나 조깅을 해요.",
    exampleEn: "On weekends, I walk or jog.",
  },
  {
    label: "Tried / experienced",
    useFor: "Places and experiences",
    patternKo: "___에 가 봤어요. ___아서/어서 좋았어요.",
    patternEn: "I have been to ___. It was nice because ___.",
    exampleKo: "부산에 가 봤어요. 바다를 볼 수 있어서 좋았어요.",
    exampleEn: "I have been to Busan. It was nice because I could see the sea.",
  },
]

// Expected questions with short model answers (Notion: "Henry Q&A — 새
// 습관/취미 예상 질문" + TOP 5). Answer first, then one reason or example —
// the 1–3 sentence shape the B-grade target asks for. Answers use formal
// -습니다 style to match the final script; the questions keep the examiner's -요.
const HABITS_MODEL_QUESTIONS: PracticeQuestion[] = [
  {
    ko: "왜 이 주제를 선택했어요?",
    en: "Why did you choose this topic?",
    answerKo:
      "한국에 온 후 제 생활이 많이 달라졌기 때문입니다. 새로 생긴 습관과 취미가 많아서 이 주제를 선택했습니다.",
    answerEn:
      "Because my life changed a lot after coming to Korea. I chose this topic because I have many new habits and hobbies.",
    keywords: ["생활", "달라지다", "습관과 취미"],
  },
  {
    ko: "한국에 온 후 새로 생긴 습관은 뭐예요?",
    en: "What new habits did you develop after coming to Korea?",
    answerKo: "걸어서 출근하고, 날씨를 확인하고, 쓰레기를 분리배출하는 습관이 생겼습니다.",
    answerEn:
      "I got into the habits of walking to work, checking the weather, and separating my trash.",
    keywords: ["걸어서 출근", "날씨 확인", "분리배출"],
  },
  {
    ko: "캄보디아에 있을 때와 교통 습관이 어떻게 달라졌어요?",
    en: "How have your transportation habits changed since Cambodia?",
    answerKo:
      "캄보디아에서는 오토바이나 차를 많이 이용했습니다. 한국에서는 걸어서 출근하고, 멀리 갈 때는 버스나 지하철을 이용합니다.",
    answerEn:
      "In Cambodia, I used a motorbike or a car a lot. In Korea, I walk to work, and when I go far, I take the bus or subway.",
    keywords: ["오토바이", "걸어서", "지하철"],
  },
  {
    ko: "지하철을 처음 이용했을 때 어땠어요?",
    en: "What was it like when you first used the subway?",
    answerKo:
      "처음에는 노선과 환승이 어려웠습니다. 하지만 지금은 혼자서도 서울의 여러 곳에 갈 수 있습니다.",
    answerEn:
      "At first, the lines and transfers were difficult. But now I can go to many places in Seoul by myself.",
    keywords: ["노선", "환승", "혼자서도"],
  },
  {
    ko: "왜 밖에 나가기 전에 날씨를 확인해요?",
    en: "Why do you check the weather before going out?",
    answerKo:
      "한국은 계절에 따라 날씨 변화가 크기 때문입니다. 그래서 우산이나 옷을 미리 준비합니다.",
    answerEn:
      "Because the weather in Korea changes a lot with the seasons. So I prepare an umbrella or clothes in advance.",
    keywords: ["계절", "날씨 변화", "미리 준비"],
  },
  {
    ko: "쓰레기 버리는 습관은 어떻게 달라졌어요?",
    en: "How did your habit of throwing away trash change?",
    answerKo:
      "예전에는 많이 나누지 않았습니다. 지금은 음식물 쓰레기와 재활용을 확인해서 따로 버립니다.",
    answerEn:
      "Before, I didn't separate it much. Now I check food waste and recycling separately before throwing them away.",
    keywords: ["음식물 쓰레기", "재활용", "따로"],
  },
  {
    ko: "한국에 와서 요리를 자주 해요?",
    en: "Do you cook often since coming to Korea?",
    answerKo:
      "네, 처음에는 한국 음식에 익숙하지 않아서 직접 요리를 시작했습니다. 지금은 김치찌개도 만들 수 있습니다.",
    answerEn:
      "Yes. At first I wasn't used to Korean food, so I started cooking for myself. Now I can even make kimchi stew.",
    keywords: ["익숙하지 않다", "직접 요리", "김치찌개"],
  },
  {
    ko: "한국에 온 후 새로 생긴 취미는 뭐예요?",
    en: "What new hobbies did you pick up after coming to Korea?",
    answerKo: "산책, 조깅, 자전거 타기를 더 자주 하게 되었습니다. 가끔 수영도 합니다.",
    answerEn: "I started walking, jogging, and cycling more often. Sometimes I also swim.",
    keywords: ["산책", "조깅", "자전거"],
  },
  {
    ko: "왜 산책을 자주 하게 되었어요?",
    en: "Why did you start walking often?",
    answerKo: "건강에도 좋고, 스트레스도 줄일 수 있어서 시작했습니다.",
    answerEn: "I started because it's good for my health and it reduces stress.",
    keywords: ["건강", "스트레스", "시작하다"],
  },
  {
    ko: "어디에서 자주 운동해요?",
    en: "Where do you usually exercise?",
    answerKo: "퇴근 후나 주말에 여의도공원에서 걷거나 조깅을 합니다. 한강에서는 자전거를 탑니다.",
    answerEn:
      "After work or on weekends, I walk or jog at Yeouido Park. I ride a bicycle along the Han River.",
    keywords: ["여의도공원", "퇴근 후", "한강"],
  },
  {
    ko: "왜 한강에서 자전거 타는 것을 좋아해요?",
    en: "Why do you like riding a bicycle along the Han River?",
    answerKo: "경치가 좋고 기분이 상쾌하기 때문입니다. 그래서 시간이 있으면 자전거를 타러 갑니다.",
    answerEn: "The scenery is nice and I feel refreshed. So when I have time, I go cycling.",
    keywords: ["경치", "상쾌하다", "시간이 있으면"],
  },
  {
    ko: "운동을 하고 나면 기분이 어때요?",
    en: "How do you feel after exercising?",
    answerKo: "기분이 상쾌하고 스트레스도 줄어드는 것 같습니다.",
    answerEn: "I feel refreshed, and my stress seems to go down.",
    keywords: ["상쾌하다", "스트레스", "줄어들다"],
  },
  {
    ko: "주말에는 보통 뭐 해요?",
    en: "What do you usually do on weekends?",
    answerKo: "공원에서 산책하거나 새로운 곳을 구경합니다. 가끔 사진도 찍습니다.",
    answerEn: "I go to the park or look around new places. Sometimes I also take photos.",
    keywords: ["공원", "새로운 곳", "사진"],
  },
  {
    ko: "한국에서 새로운 친구를 만났어요?",
    en: "Have you made new friends in Korea?",
    answerKo:
      "네, 한국에 사는 캄보디아 친구들을 새로 만났습니다. 쉬는 날에는 같이 새로운 곳에 가기도 합니다.",
    answerEn:
      "Yes, I met new Cambodian friends who live in Korea. On days off, we sometimes go to new places together.",
    keywords: ["캄보디아 친구", "쉬는 날", "새로운 곳"],
  },
  {
    ko: "친구들과 어디에 가 봤어요?",
    en: "Where have you been with your friends?",
    answerKo:
      "올해 설날에 친구들과 수원에 갔습니다. 화성행궁을 구경하고 캄보디아 식당에서 놈반쪽도 먹었습니다.",
    answerEn:
      "This Seollal, I went to Suwon with friends. We looked around Hwaseong Haenggung and ate nom banh chok at a Cambodian restaurant.",
    keywords: ["설날", "수원", "화성행궁"],
  },
  {
    ko: "한국어 공부도 습관이 되었어요?",
    en: "Has studying Korean become a habit too?",
    answerKo: "네, 회사와 일상생활에서 필요해서 매일 조금씩 공부하고 있습니다.",
    answerEn: "Yes, I need it at work and in daily life, so I study a little every day.",
    keywords: ["회사", "일상생활", "매일 조금씩"],
  },
  {
    ko: "한국어 공부는 어떻게 하고 있어요?",
    en: "How are you studying Korean?",
    answerKo:
      "매일 조금씩 공부하고, 회사에서는 한국어 문서를 읽거나 동료들의 말을 이해하려고 노력합니다.",
    answerEn:
      "I study a little every day, and at work I try to read Korean documents and understand my coworkers.",
    keywords: ["매일 조금씩", "한국어 문서", "동료"],
  },
  {
    ko: "한국어에서 가장 어려운 것은 뭐예요?",
    en: "What is the hardest thing about Korean?",
    answerKo:
      "저는 듣기와 말하기가 가장 어렵습니다. 하지만 지금은 예전보다 조금 더 잘 이해할 수 있게 되었습니다.",
    answerEn:
      "Listening and speaking are the hardest for me. But now I can understand a little more than before.",
    keywords: ["듣기", "말하기", "예전보다"],
  },
  {
    ko: "한국에 와서 가장 많이 달라진 점은 뭐예요?",
    en: "What has changed the most since you came to Korea?",
    answerKo: "혼자 할 수 있는 일이 많아졌습니다. 그리고 한국 생활에도 더 잘 적응하게 되었습니다.",
    answerEn: "I can do many more things by myself, and I have adapted better to life in Korea.",
    keywords: ["혼자", "많아지다", "적응하다"],
  },
  {
    ko: "이 습관 중에서 가장 좋은 습관은 뭐예요?",
    en: "Which of these habits is the best one?",
    answerKo: "운동하는 습관이 가장 좋다고 생각합니다. 건강에도 좋고 기분 전환도 됩니다.",
    answerEn:
      "I think exercising is the best habit. It's good for my health and refreshes my mood.",
    keywords: ["운동", "건강", "기분 전환"],
  },
  {
    ko: "앞으로 계속 유지하고 싶은 습관은 뭐예요?",
    en: "Which habits do you want to keep in the future?",
    answerKo: "운동과 한국어 공부를 계속하고 싶습니다. 둘 다 제 생활에 도움이 됩니다.",
    answerEn: "I want to keep exercising and studying Korean. Both help my life.",
    keywords: ["운동", "한국어 공부", "유지하다"],
  },
]

// Curated study material for the chosen exam topic (Notion: "07 — 면접 핵심
// 단어·어휘·표현"). Core words carry a short sentence from the script for
// recall/shadowing; the rest stay available as stretch vocabulary.
const HABITS_PREP: InterviewPrep = {
  vocabulary: (
    [
      {
        term: "습관",
        meaning: "habit",
        priority: "core",
        exampleKo: "새로운 습관이 생겼어요.",
        exampleEn: "I developed a new habit.",
      },
      {
        term: "취미",
        meaning: "hobby",
        priority: "core",
        exampleKo: "새로운 취미도 생겼어요.",
        exampleEn: "I also got a new hobby.",
      },
      {
        term: "생활",
        meaning: "daily life",
        priority: "core",
        exampleKo: "제 생활이 많이 달라졌어요.",
        exampleEn: "My daily life changed a lot.",
      },
      {
        term: "교통",
        meaning: "transportation",
        priority: "core",
        exampleKo: "한국에서는 대중교통을 많이 이용해요.",
        exampleEn: "In Korea, I use public transportation a lot.",
      },
      {
        term: "노선",
        meaning: "route / line",
        priority: "core",
        exampleKo: "처음에는 지하철 노선이 복잡했어요.",
        exampleEn: "At first, the subway lines were complicated.",
      },
      {
        term: "날씨",
        meaning: "weather",
        priority: "core",
        exampleKo: "밖에 나가기 전에 날씨를 꼭 확인해요.",
        exampleEn: "I always check the weather before going out.",
      },
      {
        term: "분리배출",
        meaning: "waste separation",
        priority: "core",
        exampleKo: "또 하나는 쓰레기 분리배출이에요.",
        exampleEn: "Another one is separating trash.",
      },
      {
        term: "재활용",
        meaning: "recycling",
        priority: "core",
        exampleKo: "음식물 쓰레기와 재활용을 따로 버려요.",
        exampleEn: "I throw away food waste and recycling separately.",
      },
      {
        term: "요리",
        meaning: "cooking",
        priority: "core",
        exampleKo: "요즘은 가끔 집에서 직접 요리해요.",
        exampleEn: "These days I sometimes cook at home myself.",
      },
      {
        term: "산책",
        meaning: "a walk",
        priority: "core",
        exampleKo: "퇴근 후에 여의도공원에서 산책을 해요.",
        exampleEn: "After work, I take a walk at Yeouido Park.",
      },
      {
        term: "조깅",
        meaning: "jogging",
        priority: "core",
        exampleKo: "주말에는 걷거나 조깅을 해요.",
        exampleEn: "On weekends, I walk or jog.",
      },
      {
        term: "자전거",
        meaning: "bicycle",
        priority: "core",
        exampleKo: "한강에서 자전거 타는 것을 정말 좋아해요.",
        exampleEn: "I really love riding a bicycle along the Han River.",
      },
      {
        term: "운동",
        meaning: "exercise",
        priority: "core",
        exampleKo: "운동을 하고 나면 기분이 좋아요.",
        exampleEn: "I feel good after exercising.",
      },
      {
        term: "경험",
        meaning: "experience",
        priority: "core",
        exampleKo: "이런 작은 변화들이 좋은 경험이 되었어요.",
        exampleEn: "These small changes became a good experience.",
      },
      {
        term: "이용하다",
        meaning: "to use",
        priority: "core",
        exampleKo: "멀리 갈 때는 버스나 지하철을 이용해요.",
        exampleEn: "When I go far, I use the bus or subway.",
      },
      {
        term: "확인하다",
        meaning: "to check",
        priority: "core",
        exampleKo: "버리기 전에 꼭 확인해요.",
        exampleEn: "I always check before throwing things away.",
      },
      {
        term: "준비하다",
        meaning: "to prepare",
        priority: "core",
        exampleKo: "우산이나 옷을 미리 준비해요.",
        exampleEn: "I prepare an umbrella or clothes in advance.",
      },
      {
        term: "적응하다",
        meaning: "to adapt",
        priority: "core",
        exampleKo: "한국 생활에 조금씩 적응하고 있어요.",
        exampleEn: "I'm adapting to life in Korea little by little.",
      },
      {
        term: "유지하다",
        meaning: "to maintain, keep up",
        priority: "core",
        exampleKo: "앞으로도 좋은 습관을 계속 유지하고 싶어요.",
        exampleEn: "I want to keep up these good habits in the future.",
      },
      { term: "지하철", meaning: "subway" },
      { term: "버스", meaning: "bus" },
      { term: "출근하다", meaning: "to go to work" },
      { term: "퇴근 후", meaning: "after work" },
      { term: "우산", meaning: "umbrella" },
      { term: "음식물 쓰레기", meaning: "food waste" },
      { term: "헷갈리다", meaning: "to be confusing" },
      { term: "환경", meaning: "environment" },
      { term: "배달", meaning: "delivery" },
      { term: "배구", meaning: "volleyball" },
      { term: "축구", meaning: "football / soccer" },
      { term: "상쾌하다", meaning: "to feel refreshed" },
      { term: "한국어 공부", meaning: "studying Korean" },
      { term: "일상생활", meaning: "everyday life" },
      { term: "걷다", meaning: "to walk" },
      { term: "버리다", meaning: "to throw away" },
      { term: "나누다", meaning: "to separate, divide" },
      { term: "타다", meaning: "to ride" },
      { term: "만나다", meaning: "to meet" },
      { term: "가 보다", meaning: "to have been (somewhere)" },
      { term: "배우다", meaning: "to learn" },
      { term: "익숙해지다", meaning: "to get used to" },
      { term: "독립적이다", meaning: "to be independent" },
      { term: "규칙적으로", meaning: "regularly" },
      { term: "처음에는", meaning: "at first" },
      { term: "하지만 지금은", meaning: "but now" },
      { term: "자주", meaning: "often" },
      { term: "가끔", meaning: "sometimes" },
      { term: "조금씩", meaning: "little by little" },
      { term: "직접", meaning: "by myself, directly" },
      { term: "미리", meaning: "in advance" },
      { term: "혼자서도", meaning: "even by myself" },
      { term: "특히", meaning: "especially" },
      { term: "꽤", meaning: "quite, pretty" },
    ] satisfies VocabEntry[]
  ).map((entry): VocabEntry => ({ priority: "stretch", ...entry })),
  keyPhrases: [
    {
      ko: "한국에 온 후 제 생활이 많이 달라졌어요.",
      en: "My life changed a lot after coming to Korea.",
    },
    {
      ko: "작은 습관들이 생기면서 더 독립적이고 건강하게 생활하게 되었어요.",
      en: "As small habits formed, I came to live more independently and healthily.",
    },
    { ko: "저는 보통 ___해요.", en: "I usually ___." },
    { ko: "처음에는 조금 어려웠어요.", en: "At first it was a little difficult." },
    { ko: "하지만 지금은 많이 익숙해졌어요.", en: "But now I've gotten quite used to it." },
    { ko: "제 경험으로는 ___이 좋아요.", en: "In my experience, ___ is good." },
    { ko: "___ 때문에 시작했어요.", en: "I started because of ___." },
    { ko: "그래서 지금도 계속하고 있어요.", en: "So I'm still doing it now." },
    { ko: "앞으로도 계속 유지하고 싶어요.", en: "I want to keep it up in the future." },
    { ko: "한국에 온 후 산책을 꽤 자주 해요.", en: "Since coming to Korea, I walk quite often." },
    {
      ko: "죄송하지만, 한 번만 다시 말씀해 주시겠습니까?",
      en: "Sorry, could you say that one more time?",
    },
    { ko: "조금 천천히 말씀해 주시겠습니까?", en: "Could you speak a little more slowly?" },
    { ko: "잠시만 생각해 보겠습니다.", en: "Let me think for a moment." },
    {
      ko: "한국에 온 후 새로 생긴 습관에 대해서 말씀하시는 건가요?",
      en: "Are you asking about the new habits I developed after coming to Korea?",
    },
    {
      ko: "그 부분은 잘 모르겠습니다. 대신 제 경험을 말씀드려도 될까요?",
      en: "I don't know that part well. May I talk about my experience instead?",
    },
  ],
  answerFrames: HABITS_ANSWER_FRAMES,
  sampleQuestions: [
    ...HABITS_MODEL_QUESTIONS,
    // Universal follow-ups the examiner reuses after any answer.
    { ko: "왜요?", en: "Why?" },
    { ko: "언제부터 시작했어요?", en: "When did you start?" },
    { ko: "얼마나 자주 해요?", en: "How often do you do it?" },
    { ko: "누구와 같이 해요?", en: "Who do you do it with?" },
    { ko: "가장 기억에 남는 경험은 뭐예요?", en: "What is your most memorable experience?" },
    { ko: "처음에는 어땠어요?", en: "What was it like at first?" },
    { ko: "지금은 어떻게 달라졌어요?", en: "How is it different now?" },
    { ko: "그 경험에서 무엇을 배웠어요?", en: "What did you learn from that experience?" },
    // Everyday probes: the same meaning asked in different words.
    { ko: "어디에서 일해요?", en: "Where do you work?" },
    { ko: "회사에서는 무슨 일을 해요?", en: "What do you do at your company?" },
    {
      ko: "요즘 회사에서 어떤 일을 하고 있어요?",
      en: "What work are you doing at the company these days?",
    },
  ],
  sources: [
    {
      publisher: "국립국어원",
      title: "한국어기초사전",
      url: "https://krdict.korean.go.kr/eng",
      usedFor: "Learner-friendly Korean meanings, example usage, and pronunciation reference",
    },
  ],
}

// Curated study material for common workplace status-check Q&A: daily
// stand-up style questions about current work, deadlines, difficulties,
// and meeting/report follow-ups. Source: team-shared prep docs
// ("회의에서 자주 사용하는 표현" / "자주 묻는 질문과 답변").
const WORKPLACE_QA_PREP: InterviewPrep = {
  vocabulary: [
    { term: "작업", meaning: "task, work" },
    { term: "진행하다", meaning: "to proceed, to carry out" },
    { term: "완료하다", meaning: "to complete" },
    { term: "마감일", meaning: "deadline" },
    { term: "끝내다", meaning: "to finish" },
    { term: "어려운 점", meaning: "difficulty, hard part" },
    { term: "도와주다", meaning: "to help" },
    { term: "담당하다", meaning: "to be in charge of" },
    { term: "맡다", meaning: "to take on, to be responsible for" },
    { term: "보고서", meaning: "report" },
    { term: "작성하다", meaning: "to write, to draft" },
    { term: "일정", meaning: "schedule" },
    { term: "회의", meaning: "meeting" },
    { term: "정보", meaning: "information" },
    { term: "확인하다", meaning: "to check, to confirm" },
    { term: "피드백", meaning: "feedback" },
    { term: "검토하다", meaning: "to review" },
    { term: "버그를 수정하다", meaning: "to fix a bug" },
    { term: "업무", meaning: "work, duties" },
    { term: "집중하다", meaning: "to focus" },
  ],
  keyPhrases: [
    { ko: "현재 API 개발을 진행하고 있습니다.", en: "I am currently developing the API." },
    { ko: "지금은 버그를 수정하고 있습니다.", en: "I am fixing a bug." },
    { ko: "오늘 안에 완료하겠습니다.", en: "I will complete it by today." },
    { ko: "내일까지 완료할 예정입니다.", en: "I plan to complete it by tomorrow." },
    { ko: "네, 조금 어려운 부분이 있습니다.", en: "Yes, there are some difficult parts." },
    { ko: "아니요, 현재는 없습니다.", en: "No, there aren't any at the moment." },
    { ko: "네, 조금 도와주시면 감사하겠습니다.", en: "Yes, I would appreciate your help." },
    { ko: "괜찮습니다. 혼자 해보겠습니다.", en: "It's okay. I'll try to do it myself." },
    { ko: "제가 담당하고 있습니다.", en: "I am responsible for it." },
    { ko: "마감일은 이번 주 금요일이에요.", en: "The deadline is this Friday." },
    { ko: "네, 방금 완료했습니다.", en: "I just finished it a moment ago." },
    {
      ko: "오전에는 회의가 있고 오후에는 개발 업무를 할 예정입니다.",
      en: "I have a meeting in the morning, and in the afternoon I will work on development tasks.",
    },
    {
      ko: "네, 필요한 정보는 모두 확인했습니다.",
      en: "I have checked all the necessary information.",
    },
    { ko: "네, 확인 후 피드백 드리겠습니다.", en: "Sure. I'll review it and give you feedback." },
  ],
  sampleQuestions: [
    { ko: "현재 어떤 작업을 하고 계신가요?", en: "What are you currently working on?" },
    { ko: "언제까지 완료할 수 있을까요?", en: "When can it be completed?" },
    { ko: "어려운 점이 있나요?", en: "Are there any difficulties?" },
    { ko: "도움이 필요하신가요?", en: "Do you need any help?" },
    { ko: "이 작업은 누가 담당하나요?", en: "Who is responsible for this task?" },
    { ko: "마감일이 언제예요?", en: "When is the deadline?" },
    { ko: "보고서 다 작성하셨어요?", en: "Have you finished your report?" },
    { ko: "오늘 일정이 어떻게 되세요?", en: "What is your schedule for today?" },
    { ko: "필요한 정보는 다 받으셨나요?", en: "Have you received all the necessary information?" },
    { ko: "피드백 주실 수 있을까요?", en: "Could you give me some feedback?" },
  ],
}

export const INTERVIEW_TOPICS: InterviewTopic[] = [
  {
    // The id stays "weather" (it keys saved scripts and the question bank in
    // Supabase); the content is the 제6회 topic.
    id: "weather",
    label: "New habits and hobbies I developed after coming to Korea",
    labelKo: "한국에 온 후 새로 생긴 습관/취미",
    description:
      "Talk about how daily life changed in Korea — transport, weather, trash, cooking, exercise, friends, and Korean study.",
    difficulty: "Easy–Medium",
    recommended: true,
    examinerBrief: [
      "The candidate is from Cambodia, has lived in Korea for almost a year, and works as a software developer. The interview flow is: self-introduction → topic introduction → Q&A.",
      "Target is a B grade: understand the question and answer right away in 1–3 short sentences. Use simple, everyday Korean.",
      "Follow this natural question arc, one question per turn, going a little deeper each time:",
      "1) Why they chose the topic and what changed after coming to Korea (습관, 취미, 생활이 달라지다).",
      "2) Transportation: motorbike/car in Cambodia vs walking to work, bus, subway in Korea (노선, 처음에는 어려웠다).",
      "3) Checking the weather before going out (비, 눈, 추위, 우산, 옷을 미리 준비하다).",
      "4) Separating trash (분리배출, 음식물 쓰레기, 재활용, 환경) and cooking at home instead of delivery (직접 요리하다).",
      "5) New hobbies: walking, jogging, cycling at 여의도공원 and 한강 — why, how often, how it feels (상쾌하다, 스트레스).",
      "6) New Cambodian friends and trips (수원, 대전, 부산 — 가 보다).",
      "7) Studying Korean every day — why, what is hardest (듣기, 말하기), how it changed.",
      "8) Reflection: what changed most, the best habit, which habits to keep (독립적이다, 건강하다, 유지하다).",
      "Reuse universal follow-ups (왜요? 언제부터? 얼마나 자주? 누구와? 가장 기억에 남는 경험?) and occasionally rephrase the same question in different words, as real examiners do. Mix in everyday probes about work and life in Korea.",
    ].join("\n"),
    prep: HABITS_PREP,
    scriptOutline: HABITS_SCRIPT_OUTLINE,
    scriptSeed: HABITS_SCRIPT_SEED,
    scriptSeedEn: HABITS_SCRIPT_SEED_EN,
  },
  {
    id: "workplace-qa",
    label: "Workplace status Q&A & meeting expressions",
    labelKo: "업무 현황 질문과 답변 및 회의 표현",
    description:
      "Practice the everyday questions a manager or teammate asks in Korean: current task, deadlines, difficulties, and report/meeting follow-ups.",
    difficulty: "Easy–Medium",
    examinerBrief: [
      "The candidate is a software developer in a Korean workplace. Play the role of a manager or teammate doing a quick daily check-in, one question per turn.",
      "Draw questions from this natural arc, going a little deeper each time:",
      "1) What are they currently working on (작업, 진행하다, 개발, 버그 수정).",
      "2) When can it be completed (마감일, 완료하다, 끝내다, 일정).",
      "3) Any difficulties or blockers (어려운 점, 도와주다, 도움이 필요하다).",
      "4) Who owns/is responsible for a task (담당하다, 맡다).",
      "5) Follow-ups on reports, meetings, and feedback (보고서, 작성하다, 회의, 피드백, 검토하다, 정보를 확인하다).",
      "Keep questions short, natural, and workplace-appropriate; encourage concise status-update style answers.",
    ].join("\n"),
    prep: WORKPLACE_QA_PREP,
  },
]

export function getInterviewTopic(id: string): InterviewTopic {
  return INTERVIEW_TOPICS.find((topic) => topic.id === id) ?? INTERVIEW_TOPICS[0]
}

// ── Q&A preparation ───────────────────────────────────────────────────────
// The exam is spoken Q&A, so beyond the written script the candidate drafts an
// answer to each likely question. Answers are keyed by item id and ride in the
// same `values` map the script uses, so they autosave + sync with no new wiring.

export interface QAItem {
  id: string
  questionKo: string
  questionEn: string
}

/** Likely exam questions for the topic, seeded as the starting Q&A list. */
export function getSeedQA(topic: InterviewTopic): QAItem[] {
  return (topic.prep?.sampleQuestions ?? []).map((q, i) => ({
    id: `qa-seed-${i}`,
    questionKo: q.ko,
    questionEn: q.en,
  }))
}

/**
 * Renders the Q&A section of the exportable document. Skips items with neither a
 * question nor an answer so blank rows don't clutter what the mentor receives.
 */
export function buildQADocument(items: QAItem[], answers: Record<string, string>): string {
  const blocks: string[] = []
  for (const item of items) {
    const question = item.questionKo.trim()
    const answer = (answers[item.id] ?? "").trim()
    if (!question && !answer) continue
    if (question) blocks.push(`Q: ${question}`)
    blocks.push(answer ? `A: ${answer}` : "A: (작성 예정)")
    blocks.push("")
  }
  return blocks.join("\n").trim()
}

/**
 * Assembles the written sections into one submittable document, skipping empty
 * sections, with a Korean heading per section.
 */
export function buildScriptDocument(
  topic: InterviewTopic,
  values: Record<string, string>,
  /** Candidate-added sections, appended after the fixed exam outline. */
  extraSections: { id: string; title: string }[] = [],
): string {
  const blocks: string[] = [topic.labelKo, ""]

  const sections = [
    ...(topic.scriptOutline ?? []).map((s) => ({ id: s.id, titleKo: s.titleKo })),
    ...extraSections.map((s) => ({ id: s.id, titleKo: s.title.trim() || "Untitled" })),
  ]

  for (const section of sections) {
    const text = (values[section.id] ?? "").trim()
    if (!text) continue
    blocks.push(`【 ${section.titleKo} 】`, text, "")
  }

  return blocks.join("\n").trim()
}

// Markers the examiner must use so we can split each turn into feedback,
// the Korean question (for TTS), and an English translation (for the
// candidate, who is still building listening comprehension).
const FEEDBACK_TAG = "[FEEDBACK]"
const QUESTION_KO_TAG = "[QUESTION_KO]"
const QUESTION_EN_TAG = "[QUESTION_EN]"

// Per-mode response contract. Practice keeps the full three-tag turn; exam is
// Korean-only — no feedback, no translation — like the real interviewer.
function responseFormatRules(mode: InterviewModeConfig): string {
  if (!mode.showFeedback && !mode.showEnglish) {
    return [
      "Reply ONLY in this exact format, nothing before or after:",
      QUESTION_KO_TAG,
      "<exactly ONE interview question in natural spoken Korean>",
      "Do NOT include feedback, English, or translations of any kind.",
    ].join("\n")
  }
  return [
    "Reply ONLY in this exact format, nothing before or after:",
    FEEDBACK_TAG,
    "<one or two short sentences of English feedback on the candidate's PREVIOUS answer — comment on vocabulary, grammar, and confidence, and when useful give a more natural way to say it. For the very first turn, write: Let's begin — relax and answer naturally.>",
    QUESTION_KO_TAG,
    "<exactly ONE interview question in natural spoken Korean>",
    QUESTION_EN_TAG,
    "<a plain English translation of that question>",
  ].join("\n")
}

/**
 * The kickoff message sent as the first turn of the conversation. It sets up
 * the examiner persona and asks for the first question. Defaults keep the old
 * one-argument call (and its tests) behaving exactly as before.
 */
export function buildInterviewSystemPrompt(
  topic: InterviewTopic,
  mode: InterviewModeConfig = INTERVIEW_MODES.practice,
  unexpected: UnexpectedQuestion[] = [],
): string {
  const unexpectedBlock =
    unexpected.length > 0
      ? [
          "- Roughly every 2-3 questions, break from the topic and ask ONE unexpected everyday interview question, adapted naturally in your own words (do not read verbatim):",
          ...unexpected.map((q) => `  · ${q.ko}`),
          "  Return to the topic arc afterwards.",
        ]
      : []

  return [
    "You are a Korean-language interviewer for the K-Specialist (케이 스페셜리스트) Korean speaking exam.",
    "This is a spoken Q&A interview — there is no presentation. You ask one question at a time and the candidate answers out loud.",
    `Interview topic: ${topic.labelKo} (${topic.label}).`,
    topic.examinerBrief,
    "Rules:",
    "- Ask ONE question per turn, but NEVER move to a new sub-topic after only one question.",
    "- After every answer, probe it at least once with a natural follow-up before advancing the arc. Use probes like: 왜 그렇게 생각합니까? / 예를 들어 설명해 주세요 / 조금 더 자세히 말해 주세요 / 그때 기분이 어땠습니까?",
    "- If the answer is short or vague, dig into it; if it is detailed, challenge one detail.",
    ...unexpectedBlock,
    "- Keep questions short and clearly spoken, suitable for an intermediate learner.",
    "- The candidate is evaluated on speaking ability, pronunciation, vocabulary, and confidence.",
    mode.showFeedback
      ? "- Be encouraging but honest in your feedback."
      : "- Stay formal and neutral, like a real examiner. Give no feedback during the interview.",
    "",
    responseFormatRules(mode),
    "",
    "Begin the interview now with your first question.",
  ].join("\n")
}

/**
 * Wraps the candidate's spoken answer for the next turn, with a light reminder
 * to keep the examiner on-format (models drift over long chats).
 */
export function buildAnswerMessage(
  answer: string,
  mode: InterviewModeConfig = INTERVIEW_MODES.practice,
): string {
  const reminder = mode.showFeedback
    ? "[Give brief feedback on that answer, then ask the next question. Use the required format.]"
    : "[Ask the next question in the required format. No feedback, no English.]"
  return `${answer.trim()}\n\n${reminder}`
}

export interface ExaminerTurn {
  feedback: string
  questionKo: string
  questionEn: string
}

/**
 * Parses a completed examiner reply into its sections. Tolerant of missing
 * tags — falls back to treating the whole text as the Korean question so the
 * UI never ends up blank if the model ignores the format.
 */
export function parseExaminerTurn(raw: string): ExaminerTurn {
  const text = (raw ?? "").trim()

  const feedback = extractSection(text, FEEDBACK_TAG, [QUESTION_KO_TAG, QUESTION_EN_TAG])
  const questionKo = extractSection(text, QUESTION_KO_TAG, [QUESTION_EN_TAG])
  const questionEn = extractSection(text, QUESTION_EN_TAG, [])

  if (!questionKo && !questionEn && !feedback) {
    return { feedback: "", questionKo: text, questionEn: "" }
  }

  return {
    feedback,
    questionKo: questionKo || text,
    questionEn,
  }
}

// ── End-of-session evaluation ────────────────────────────────────────────
// After the Q&A the candidate can ask for an overall verdict. The examiner
// already has the full conversation, so we just switch it out of the per-turn
// question format and into a one-off scorecard keyed to the four official exam
// criteria (speaking, pronunciation, vocabulary, confidence).

const SCORES_TAG = "[SCORES]"
const SUMMARY_TAG = "[SUMMARY]"
const ADVICE_TAG = "[ADVICE]"

/** The four official K-Specialist criteria, in the order the exam lists them. */
export const EVALUATION_CRITERIA = [
  "Speaking",
  "Pronunciation",
  "Vocabulary",
  "Confidence",
] as const

export interface EvaluationScore {
  label: string
  score: number
  max: number
}

export interface InterviewEvaluation {
  scores: EvaluationScore[]
  summary: string
  advice: string[]
}

// Richer end-of-session analysis from the structured evaluate route
// (app/api/ai/interview/evaluate). All values are ESTIMATED from the
// speech-recognition transcript — there is no audio analysis.

export interface InterviewGrammarIssue {
  issue: string
  example: string
  fix: string
}

export interface InterviewAnalytics {
  fillerNotes: string
  avgSentenceLengthWords: number
  vocabRangeNotes: string
  grammarIssues: InterviewGrammarIssue[]
  wordsToPractice: string[]
}

/** The evaluate route's per-criterion scores, keyed by criterion. */
export interface CriterionScores {
  speaking: number
  pronunciation: number
  vocabulary: number
  confidence: number
}

/**
 * Maps the evaluate route's keyed scores into the ordered EvaluationScore list
 * the scorecard UI and history already consume, clamped to 1–5.
 */
export function toEvaluationScores(scores: CriterionScores): EvaluationScore[] {
  const byLabel: Record<(typeof EVALUATION_CRITERIA)[number], number> = {
    Speaking: scores.speaking,
    Pronunciation: scores.pronunciation,
    Vocabulary: scores.vocabulary,
    Confidence: scores.confidence,
  }
  return EVALUATION_CRITERIA.map((label) => ({
    label,
    score: Math.max(1, Math.min(5, Math.round(byLabel[label]))),
    max: 5,
  }))
}

/**
 * Final-turn message that ends the interview and asks for a scorecard instead
 * of another question. Sent on the same conversation, so the model judges the
 * whole transcript it already has.
 */
export function buildEvaluationPrompt(): string {
  return [
    "The interview is now over. Do NOT ask another question.",
    "Evaluate the candidate's overall spoken performance across the whole interview, judging the four official exam criteria on a 1–5 scale.",
    "Reply ONLY in this exact format, nothing before or after:",
    SCORES_TAG,
    "Speaking: <1-5>",
    "Pronunciation: <1-5>",
    "Vocabulary: <1-5>",
    "Confidence: <1-5>",
    SUMMARY_TAG,
    "<two or three sentences of honest, encouraging English feedback on the overall performance>",
    ADVICE_TAG,
    "- <one short, actionable tip in English>",
    "- <one short, actionable tip in English>",
    "- <one short, actionable tip in English>",
  ].join("\n")
}

/**
 * Parses the scorecard reply. Tolerant of formatting drift: missing scores are
 * dropped, and any bullet style (-, •, *, or 1.) is accepted for the advice.
 */
export function parseEvaluation(raw: string): InterviewEvaluation {
  const text = (raw ?? "").trim()

  const scoresBlock = extractSection(text, SCORES_TAG, [SUMMARY_TAG, ADVICE_TAG])
  const summary = extractSection(text, SUMMARY_TAG, [ADVICE_TAG])
  const adviceBlock = extractSection(text, ADVICE_TAG, [])

  const scores: EvaluationScore[] = []
  for (const line of scoresBlock.split("\n")) {
    // Match "Label: 4" or "Label: 4/5" (the "/5" is optional).
    const match = line.match(/^\s*(.+?)\s*[:：]\s*(\d+)\s*(?:\/\s*(\d+))?/)
    if (!match) continue
    const max = match[3] ? Number(match[3]) : 5
    const score = Math.max(0, Math.min(max, Number(match[2])))
    scores.push({ label: match[1].trim(), score, max })
  }

  const advice = adviceBlock
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)

  return { scores, summary, advice }
}

function extractSection(text: string, startTag: string, endTags: string[]): string {
  const startIndex = text.indexOf(startTag)
  if (startIndex === -1) {
    return ""
  }

  const contentStart = startIndex + startTag.length
  let contentEnd = text.length

  for (const endTag of endTags) {
    const endIndex = text.indexOf(endTag, contentStart)
    if (endIndex !== -1 && endIndex < contentEnd) {
      contentEnd = endIndex
    }
  }

  return text.slice(contentStart, contentEnd).trim()
}
