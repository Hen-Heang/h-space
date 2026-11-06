import type { PhraseCardContentInput } from "./schemas"
import { WORK_FOCUS_CARDS } from "./work-seed"

// Curated seed data for the Phrasebook starter packs (two launch packs here,
// the "Korean for my work" pack in work-seed.ts), plus a pure,
// idempotent upsert planner (no Supabase here — lib/api/phrasebook.ts calls
// planSeedUpsert with rows it already fetched and only ever performs the
// additive inserts the plan describes).
//
// Romanization note: every question/answer romanization below was authored
// using standard Revised Romanization conventions by hand (the app has no
// server-side romanizer for arbitrary sentences — es-hangul's romanize() is
// only used for single vocab terms elsewhere). Per the brief's guidance to
// "document the item for human review instead of silently inserting
// obviously incorrect text," these are flagged here as AI-assisted and
// worth a native-speaker pass before being presented as authoritative —
// see docs/korean-phrasebook-implementation.md §8.

export interface PhraseSeedCard extends PhraseCardContentInput {
  sourceKey: string
}

export interface PhraseSeedCollection {
  sourceKey: string
  titleKo: string
  titleEn: string
  description: string
  category: string
  seedVersion: number
  cards: PhraseSeedCard[]
}

const WORKPLACE_CARDS: PhraseSeedCard[] = [
  {
    sourceKey: "workplace-current-work",
    category: "workplace",
    situation: "status-update",
    difficulty: "medium",
    question: {
      korean: "현재 어떤 작업을 하고 계신가요?",
      romanization: "hyeonjae eotteon jageobeul hago gyesin-gayo?",
      english: "What are you currently working on?",
      register: "formal",
    },
    questionVariants: [
      "지금 뭐 하고 계세요?",
      "지금 어떤 일을 하고 계세요?",
      "지금 무슨 일을 하고 계세요?",
    ],
    answers: [
      {
        korean: "저는 현재 API 개발을 하고 있습니다.",
        romanization: "jeoneun hyeonjae API gaebareul hago itseumnida.",
        english: "I am currently developing an API.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "지금은 버그를 수정하고 있습니다.",
        romanization: "jigeumeun beogeureul sujeonghago itseumnida.",
        english: "I am currently fixing a bug.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: 'Answer template: 현재 ___ 작업을 하고 있습니다. ("I am currently working on ___.")',
    vocabulary: [
      { korean: "현재", english: "currently" },
      { korean: "작업", english: "task / work" },
      { korean: "개발하다", english: "to develop" },
      { korean: "수정하다", english: "to fix / modify" },
    ],
    tags: ["standup", "status-update"],
  },
  {
    sourceKey: "workplace-completion-time",
    category: "workplace",
    situation: "deadline",
    difficulty: "medium",
    question: {
      korean: "언제까지 완료할 수 있을까요?",
      romanization: "eonjekkaji wallyohal su isseulkkayo?",
      english: "By when can it be completed?",
      register: "formal",
    },
    questionVariants: [
      "언제까지 끝낼 수 있어요?",
      "언제쯤 끝날 것 같아요?",
      "이 작업은 언제 완료될까요?",
    ],
    answers: [
      {
        korean: "오늘 안에 완료하겠습니다.",
        romanization: "oneul ane wallyohagesseumnida.",
        english: "I will complete it by the end of today.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "내일 오후 3시까지 완료할 예정입니다.",
        romanization: "naeil ohu se-sikkaji wallyohal yejeongimnida.",
        english: "I plan to complete it by 3 p.m. tomorrow.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "Don't promise a deadline unless you're confident. If blocked, add a short reason and give a new, realistic time instead.",
    vocabulary: [
      { korean: "완료하다", english: "to complete" },
      { korean: "마감", english: "deadline" },
      { korean: "예정", english: "plan / schedule" },
    ],
    tags: ["deadline", "planning"],
  },
  {
    sourceKey: "workplace-difficulties",
    category: "workplace",
    situation: "blocker",
    difficulty: "medium",
    question: {
      korean: "어려운 점이 있나요?",
      romanization: "eoryeoun jeomi issnayo?",
      english: "Are there any difficulties?",
      register: "formal",
    },
    questionVariants: [
      "혹시 어려운 부분이 있어요?",
      "모르는 부분이 있어요?",
      "막히는 부분이 있나요?",
    ],
    answers: [
      {
        korean: "네, 이 부분이 조금 어려운 것 같습니다. 혹시 여쭤봐도 될까요?",
        romanization:
          "ne, i bubuni jogeum eoryeoun geot gatseumnida. hoksi yeojjwobwado doelkkayo?",
        english: "Yes, this part seems a little difficult. May I ask you about it?",
        register: "formal",
        isRecommended: true,
        usageNote: "Use when you actually need help.",
      },
      {
        korean: "아니요, 지금은 크게 어려운 점은 없습니다. 감사합니다.",
        romanization: "aniyo, jigeumeun keuge eoryeoun jeomeun eopseumnida. gamsahamnida.",
        english: "No, there are no major difficulties at the moment. Thank you.",
        register: "formal",
        isRecommended: true,
        usageNote: "Use when things are genuinely going fine.",
      },
    ],
    vocabulary: [
      { korean: "어려운 점", english: "difficulty" },
      { korean: "막히는 부분", english: "blocked part" },
      { korean: "여쭤보다", english: "to ask (respectfully)" },
    ],
    tags: ["blocker", "help"],
  },
  {
    sourceKey: "workplace-offer-of-help",
    category: "workplace",
    situation: "help",
    difficulty: "medium",
    question: {
      korean: "도움이 필요하신가요?",
      romanization: "doumi pillyohasingayo?",
      english: "Do you need any help?",
      register: "formal",
    },
    questionVariants: [
      "도와드릴까요?",
      "혹시 도움이 필요하면 말씀해 주세요.",
      "제가 도와드릴 부분이 있을까요?",
    ],
    answers: [
      {
        korean: "네, 이 부분을 조금 도와주시면 감사하겠습니다.",
        romanization: "ne, i bubuneul jogeum dowajusimyeon gamsahagesseumnida.",
        english: "Yes, I would appreciate your help with this part.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "감사합니다. 우선 혼자 해보고, 필요하면 다시 말씀드리겠습니다.",
        romanization:
          "gamsahamnida. useon honja haebogo, pillyohamyeon dasi malsseumdeurigesseumnida.",
        english: "Thank you. I will try it myself first and let you know if I need help.",
        register: "formal",
        isRecommended: true,
      },
    ],
    vocabulary: [
      { korean: "도움", english: "help" },
      { korean: "도와드리다", english: "to help (honorific)" },
      { korean: "혼자", english: "alone" },
    ],
    tags: ["help"],
  },
  {
    sourceKey: "workplace-ownership",
    category: "workplace",
    situation: "ownership",
    difficulty: "medium",
    question: {
      korean: "이 작업은 누가 담당하나요?",
      romanization: "i jageobeun nuga damdanghanayo?",
      english: "Who is responsible for this task?",
      register: "formal",
    },
    questionVariants: [
      "지금 이 작업은 누가 담당하고 있나요?",
      "이 업무는 누가 맡고 있나요?",
      "이거 누가 하고 있어요?",
    ],
    answers: [
      {
        korean: "제가 담당하고 있습니다.",
        romanization: "jega damdanghago itseumnida.",
        english: "I am responsible for it.",
        register: "formal",
        isRecommended: true,
        usageNote: 'Note: this describes an ongoing role, not "I will take responsibility for it."',
      },
      {
        korean: "제가 맡고 있습니다.",
        romanization: "jega matgo itseumnida.",
        english: "I am in charge of it.",
        register: "formal",
        isRecommended: false,
      },
      {
        korean: "헨리님이 담당하고 있습니다.",
        romanization: "Henri-nimi damdanghago itseumnida.",
        english: "Henry is responsible for it.",
        register: "formal",
        isRecommended: false,
        usageNote:
          '님 here is a respectful name suffix, not a literal "Mr./Ms." title in every context.',
      },
    ],
    usageNote:
      'Do not translate 제가 담당하고 있습니다 as "I will take responsibility for it" — it describes an existing role.',
    vocabulary: [
      { korean: "담당하다", english: "to be in charge of" },
      { korean: "맡다", english: "to take charge of" },
      { korean: "업무", english: "task / duties" },
    ],
    tags: ["ownership"],
  },
  {
    sourceKey: "workplace-deadline-ask",
    category: "workplace",
    situation: "deadline",
    difficulty: "medium",
    question: {
      korean: "이 업무의 마감일이 언제인가요?",
      romanization: "i eommuui magamiri eonjeingayo?",
      english: "When is the deadline for this task?",
      register: "formal",
    },
    questionVariants: [
      "마감일이 언제예요?",
      "언제까지 끝내야 할까요?",
      "이 업무는 언제까지 완료해야 하나요?",
    ],
    answers: [
      {
        korean: "마감일은 이번 주 금요일입니다.",
        romanization: "magamireun ibeon ju geumyoirimnida.",
        english: "The deadline is this Friday.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "이번 주 금요일까지 완료하면 됩니다.",
        romanization: "ibeon ju geumyoilkkaji wallyohamyeon doemnida.",
        english: "It needs to be completed by this Friday.",
        register: "polite",
        isRecommended: false,
      },
    ],
    usageNote: "Spelling/spacing: write 이번 주 as two words, never 이번주.",
    vocabulary: [
      { korean: "마감일", english: "deadline" },
      { korean: "이번 주", english: "this week" },
      { korean: "금요일", english: "Friday" },
    ],
    tags: ["deadline"],
  },
  {
    sourceKey: "workplace-report-completion",
    category: "workplace",
    situation: "report",
    difficulty: "medium",
    question: {
      korean: "보고서 다 작성하셨어요?",
      romanization: "bogoseo da jakseonghasyeosseoyo?",
      english: "Have you finished writing the report?",
      register: "polite",
    },
    questionVariants: ["보고서 작성은 다 끝나셨어요?"],
    answers: [
      {
        korean: "네, 방금 완료했습니다.",
        romanization: "ne, banggeum wallyohaetseumnida.",
        english: "Yes, I just completed it.",
        register: "formal",
        isRecommended: true,
        usageNote: "Use when it's done.",
      },
      {
        korean: "네, 방금 다 끝냈어요.",
        romanization: "ne, banggeum da kkeutnaesseoyo.",
        english: "Yes, I just finished it.",
        register: "polite",
        isRecommended: false,
      },
      {
        korean: "아직 작성 중이고, 오후 3시까지 완료하겠습니다.",
        romanization: "ajik jakseong jungigo, ohu se-sikkaji wallyohagesseumnida.",
        english: "I am still working on it and will complete it by 3 p.m.",
        register: "formal",
        isRecommended: true,
        usageNote: "Use when it isn't finished yet.",
      },
    ],
    vocabulary: [
      { korean: "보고서", english: "report" },
      { korean: "작성하다", english: "to write / draft" },
      { korean: "완료하다", english: "to complete" },
    ],
    tags: ["report"],
  },
  {
    sourceKey: "workplace-todays-schedule",
    category: "workplace",
    situation: "schedule",
    difficulty: "medium",
    question: {
      korean: "오늘 일정이 어떻게 되세요?",
      romanization: "oneul iljeongi eotteoke doeseyo?",
      english: "What is your schedule today?",
      register: "formal",
    },
    questionVariants: [
      "오늘 업무 일정이 어떻게 돼요?",
      "오늘 일정 좀 알려 주세요.",
      "오늘 어떤 업무를 하실 예정인가요?",
    ],
    answers: [
      {
        korean: "오전에는 회의가 있고, 오후에는 개발 업무에 집중할 예정입니다.",
        romanization: "ojeoneneun hoeuiga itgo, ohueneun gaebal eommue jipjunghal yejeongimnida.",
        english:
          "I have a meeting in the morning, and I plan to focus on development work in the afternoon.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "오전 10시에는 상품팀과 회의가 있고, 오후에는 개발 업무에 집중할 예정입니다.",
        romanization:
          "ojeon yeol-sieneun sangpumtimgwa hoeuiga itgo, ohueneun gaebal eommue jipjunghal yejeongimnida.",
        english:
          "I have a meeting with the product team at 10 a.m., and I plan to focus on development work in the afternoon.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "Spelling: write 스케줄, never 스케쥴.",
    vocabulary: [
      { korean: "일정", english: "schedule" },
      { korean: "오전", english: "morning" },
      { korean: "오후", english: "afternoon" },
      { korean: "집중하다", english: "to focus" },
    ],
    tags: ["schedule", "standup"],
  },
  {
    sourceKey: "workplace-required-information",
    category: "workplace",
    situation: "requirements",
    difficulty: "medium",
    question: {
      korean: "필요한 정보는 다 받으셨나요?",
      romanization: "pillyohan jeongboneun da badeusyeonnayo?",
      english: "Have you received all the necessary information?",
      register: "formal",
    },
    questionVariants: [
      "필요한 내용은 다 확인하셨어요?",
      "더 필요한 정보는 없으실까요?",
      "업무에 필요한 자료는 모두 받으셨나요?",
    ],
    answers: [
      {
        korean: "네, 필요한 정보는 모두 확인했습니다.",
        romanization: "ne, pillyohan jeongboneun modu hwaginhaetseumnida.",
        english: "Yes, I checked all the necessary information.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "네, 모두 확인했고 지금은 더 필요한 정보가 없습니다.",
        romanization: "ne, modu hwaginhaetgo jigeumeun deo pillyohan jeongboga eopseumnida.",
        english:
          "Yes, I checked everything, and I do not need any additional information right now.",
        register: "formal",
        isRecommended: false,
      },
      {
        korean: "아직 API 명세가 필요합니다.",
        romanization: "ajik API myeongsega pillyohamnida.",
        english: "I still need the API specification.",
        register: "formal",
        isRecommended: true,
        usageNote: "Use when information is still missing.",
      },
    ],
    vocabulary: [
      { korean: "정보", english: "information" },
      { korean: "확인하다", english: "to check / confirm" },
      { korean: "명세", english: "specification" },
    ],
    tags: ["requirements"],
  },
  {
    sourceKey: "workplace-requesting-feedback",
    category: "workplace",
    situation: "feedback",
    difficulty: "medium",
    question: {
      korean: "피드백을 주실 수 있을까요?",
      romanization: "pideubaegeul jusil su isseulkkayo?",
      english: "Could you give me some feedback?",
      register: "formal",
    },
    questionVariants: [
      "혹시 이 부분에 대해 피드백을 해주실 수 있을까요?",
      "혹시 이거 검토해 주실 수 있을까요?",
      "이 부분을 한번 확인해 주실 수 있을까요?",
    ],
    answers: [
      {
        korean: "네, 확인 후 피드백 드리겠습니다.",
        romanization: "ne, hwagin hu pideubaek deurigesseumnida.",
        english: "Yes, I will review it and give you feedback.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "네, 확인해 보고 말씀드릴게요.",
        romanization: "ne, hwaginhae bogo malsseumdeurilgeyo.",
        english: "Yes, I will check it and let you know.",
        register: "polite",
        isRecommended: false,
      },
      {
        korean: "네, 확인해 보고 알려 드릴게요.",
        romanization: "ne, hwaginhae bogo allyeo deurilgeyo.",
        english: "Yes, I will check it and inform you.",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [
      { korean: "피드백", english: "feedback" },
      { korean: "검토하다", english: "to review" },
      { korean: "확인하다", english: "to check / confirm" },
    ],
    tags: ["feedback", "review"],
  },
]

const DAILY_CARDS: PhraseSeedCard[] = [
  {
    sourceKey: "daily-restaurant-ordering",
    category: "daily",
    situation: "restaurant",
    difficulty: "easy",
    question: {
      korean: "주문하시겠어요?",
      romanization: "jumunhasigesseoyo?",
      english: "Would you like to order?",
      register: "polite",
    },
    questionVariants: ["주문 도와드릴까요?"],
    answers: [
      {
        korean: "네, 김치찌개 하나 주세요.",
        romanization: "ne, gimchijjigae hana juseyo.",
        english: "Yes, one kimchi stew, please.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "김치찌개 하나 주시겠어요?",
        romanization: "gimchijjigae hana jusigesseoyo?",
        english: "Could I get one kimchi stew, please?",
        register: "polite",
        isRecommended: false,
      },
    ],
    usageNote:
      "A server will usually ask this as soon as you sit down or when you're ready to order.",
    vocabulary: [
      { korean: "주문하다", english: "to order" },
      { korean: "하나", english: "one (counter)" },
    ],
    tags: ["restaurant", "ordering"],
  },
  {
    sourceKey: "daily-convenience-store",
    category: "daily",
    situation: "convenience-store",
    difficulty: "easy",
    question: {
      korean: "이거 데워 드릴까요?",
      romanization: "igeo dewo deurilkkayo?",
      english: "Would you like me to heat this up?",
      register: "polite",
    },
    questionVariants: ["전자레인지에 데워 드릴까요?"],
    answers: [
      {
        korean: "네, 데워 주세요.",
        romanization: "ne, dewo juseyo.",
        english: "Yes, please heat it up.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "아니요, 괜찮아요.",
        romanization: "aniyo, gwaenchanayo.",
        english: "No, that's okay.",
        register: "polite",
        isRecommended: false,
      },
    ],
    usageNote: "Common when buying a ready meal (도시락) or fried food at a convenience store.",
    vocabulary: [{ korean: "데우다", english: "to heat up" }],
    tags: ["convenience-store"],
  },
  {
    sourceKey: "daily-taxi",
    category: "daily",
    situation: "taxi",
    difficulty: "easy",
    question: {
      korean: "어디로 가세요?",
      romanization: "eodiro gaseyo?",
      english: "Where are you headed?",
      register: "polite",
    },
    questionVariants: ["목적지가 어디세요?"],
    answers: [
      {
        korean: "영등포역으로 가 주세요.",
        romanization: "yeongdeungpo-yeogeuro ga juseyo.",
        english: "Please take me to Yeongdeungpo Station.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "영등포역까지 부탁드려요.",
        romanization: "yeongdeungpo-yeokkkaji butakdeuryeoyo.",
        english: "To Yeongdeungpo Station, please.",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [
      { korean: "가다", english: "to go" },
      { korean: "역", english: "station" },
    ],
    tags: ["taxi", "transportation"],
  },
  {
    sourceKey: "daily-directions",
    category: "daily",
    situation: "directions",
    difficulty: "easy",
    question: {
      korean: "네, 어디를 찾으세요?",
      romanization: "ne, eodireul chajeuseyo?",
      english: "Yes, what are you looking for?",
      register: "polite",
    },
    questionVariants: ["뭘 찾고 계세요?"],
    answers: [
      {
        korean: "화장실을 찾고 있어요. 어디에 있어요?",
        romanization: "hwajangsireul chatgo isseoyo. eodie isseoyo?",
        english: "I'm looking for the restroom. Where is it?",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "화장실이 어디 있는지 아세요?",
        romanization: "hwajangsiri eodi issneunji aseyo?",
        english: "Do you know where the restroom is?",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [
      { korean: "찾다", english: "to find / look for" },
      { korean: "화장실", english: "restroom" },
    ],
    tags: ["directions"],
  },
  {
    sourceKey: "daily-hospital",
    category: "daily",
    situation: "hospital",
    difficulty: "medium",
    question: {
      korean: "어디가 불편하세요?",
      romanization: "eodiga bulpyeonhaseyo?",
      english: "Where does it hurt? / What's bothering you?",
      register: "polite",
    },
    questionVariants: ["증상이 어떠세요?"],
    answers: [
      {
        korean: "어제부터 머리가 아프고 열이 나요.",
        romanization: "eojebuteo meoriga apeugo yeori nayo.",
        english: "I've had a headache and a fever since yesterday.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "머리가 많이 아파요.",
        romanization: "meoriga mani apayo.",
        english: "My head hurts a lot.",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [
      { korean: "불편하다", english: "to feel unwell / uncomfortable" },
      { korean: "열", english: "fever" },
    ],
    tags: ["hospital", "health"],
  },
  {
    sourceKey: "daily-weather",
    category: "daily",
    situation: "small-talk",
    difficulty: "easy",
    question: {
      korean: "오늘 날씨가 어때요?",
      romanization: "oneul nalssiga eottaeyo?",
      english: "How's the weather today?",
      register: "polite",
    },
    questionVariants: ["밖에 날씨 어때요?"],
    answers: [
      {
        korean: "오늘은 덥고 습해요.",
        romanization: "oneureun deopgo seupaeyo.",
        english: "It's hot and humid today.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "비가 많이 와요.",
        romanization: "biga mani wayo.",
        english: "It's raining a lot.",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [
      { korean: "날씨", english: "weather" },
      { korean: "습하다", english: "humid" },
    ],
    tags: ["small-talk", "weather"],
  },
  {
    sourceKey: "daily-weekend-plans",
    category: "daily",
    situation: "small-talk",
    difficulty: "easy",
    question: {
      korean: "이번 주말에 뭐 할 거예요?",
      romanization: "ibeon jumare mwo hal geoyeyo?",
      english: "What are you doing this weekend?",
      register: "polite",
    },
    questionVariants: ["주말에 뭐 하실 거예요?"],
    answers: [
      {
        korean: "한강에서 자전거를 탈 거예요.",
        romanization: "hangang-eseo jajeongeoreul tal geoyeyo.",
        english: "I'm going to ride a bike at the Han River.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "집에서 쉴 거예요.",
        romanization: "jibeseo swil geoyeyo.",
        english: "I'll rest at home.",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [
      { korean: "주말", english: "weekend" },
      { korean: "자전거", english: "bicycle" },
    ],
    tags: ["small-talk", "weekend"],
  },
  {
    sourceKey: "daily-public-transportation",
    category: "daily",
    situation: "transportation",
    difficulty: "easy",
    question: {
      korean: "어디까지 가세요?",
      romanization: "eodikkaji gaseyo?",
      english: "How far are you going?",
      register: "polite",
    },
    questionVariants: ["어느 역까지 가세요?"],
    answers: [
      {
        korean: "여의도역까지 가요.",
        romanization: "yeouido-yeokkkaji gayo.",
        english: "I'm going to Yeouido Station.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "다음 역에서 내려요.",
        romanization: "da-eum yeogeseo naeryeoyo.",
        english: "I'll get off at the next station.",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [{ korean: "역", english: "station" }],
    tags: ["transportation"],
  },
  {
    sourceKey: "daily-friend-catchup",
    category: "daily",
    situation: "small-talk",
    difficulty: "easy",
    question: {
      korean: "요즘 어떻게 지내요?",
      romanization: "yojeum eotteoke jinaeyo?",
      english: "How have you been these days?",
      register: "polite",
    },
    questionVariants: ["요즘 바빠요?"],
    answers: [
      {
        korean: "요즘 회사에서 일하면서 한국어를 공부해요.",
        romanization: "yojeum hoesaeseo ilhamyeonseo hangugeoreul gongbuhaeyo.",
        english: "These days I'm working at a company and studying Korean.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "네, 요즘 좀 바빠요.",
        romanization: "ne, yojeum jom bappayo.",
        english: "Yes, I'm a bit busy these days.",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [{ korean: "지내다", english: "to get by / spend time" }],
    tags: ["small-talk", "friends"],
  },
  {
    sourceKey: "daily-delivery-driver",
    category: "daily",
    situation: "delivery",
    difficulty: "medium",
    question: {
      korean: "건물 입구가 어디예요?",
      romanization: "geonmul ipguga eodiyeyo?",
      english: "Where is the building entrance?",
      register: "polite",
    },
    questionVariants: ["몇 층이세요?"],
    answers: [
      {
        korean: "오른쪽 입구로 오시고 문 앞에 놓아 주세요.",
        romanization: "oreunjjok ipguro osigo mun ape noa juseyo.",
        english: "Please come to the entrance on the right and leave it in front of the door.",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "3층이에요.",
        romanization: "sam-cheungieyo.",
        english: "It's the 3rd floor.",
        register: "polite",
        isRecommended: false,
      },
    ],
    vocabulary: [{ korean: "입구", english: "entrance" }],
    tags: ["delivery"],
  },
]

export const SEED_PACKS: PhraseSeedCollection[] = [
  {
    sourceKey: "workplace-essentials",
    titleKo: "직장에서 자주 사용하는 질문과 답변",
    titleEn: "Workplace Essentials",
    description:
      "Common Korean questions and answers for meetings, status updates, schedules, blockers, ownership and feedback.",
    category: "workplace",
    seedVersion: 1,
    cards: WORKPLACE_CARDS,
  },
  {
    sourceKey: "daily-life-essentials",
    titleKo: "한국 생활 필수 질문과 답변",
    titleEn: "Daily Life Essentials",
    description:
      "Everyday Korean questions and answers for restaurants, taxis, hospitals, and daily conversation.",
    category: "daily",
    seedVersion: 1,
    cards: DAILY_CARDS,
  },
  {
    sourceKey: "work-communication",
    titleKo: "개발 업무 소통",
    titleEn: "Korean for my work",
    description:
      "Short developer-work replies: confirm what you understood, scope and criteria, work status, test results, reviews, and business-rule words.",
    category: "workplace",
    seedVersion: 1,
    cards: WORK_FOCUS_CARDS,
  },
]

// ── Idempotent seed planning ────────────────────────────────────────────────

export interface ExistingSeedCollection {
  id: string
  sourceKey: string | null
  seedVersion: number
}

export interface ExistingSeedCard {
  id: string
  sourceKey: string | null
  isUserEdited: boolean
  /** seedContentKey() of the card's text, when the caller loaded it — lets a
   *  pack skip a card the learner already has under another key (an import,
   *  or a card they wrote themselves). */
  contentKey?: string
}

/** Question + recommended-answer text, normalized — same idea as the import
 *  dedup key (lib/korean-phrasebook/import.ts). */
export function seedContentKey(card: {
  question: { korean: string }
  answers: Array<{ korean: string; isRecommended?: boolean }>
}): string {
  const norm = (text: string) => text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim()
  const answer = card.answers.find((a) => a.isRecommended) ?? card.answers[0]
  return `${norm(card.question.korean)}::${norm(answer?.korean ?? "")}`
}

export interface SeedPlan {
  // Brand-new collections (with all their cards) to insert whole.
  collectionsToInsert: PhraseSeedCollection[]
  // Existing collections whose stored seed_version is behind the pack.
  collectionsToBumpVersion: Array<{ id: string; seedVersion: number }>
  // Cards belonging to an existing collection that don't exist yet — safe to
  // insert. Never includes a card whose sourceKey already exists, edited or
  // not (see docs/korean-phrasebook-implementation.md §6).
  cardsToInsert: Array<{ collectionId: string; card: PhraseSeedCard }>
}

/**
 * Pure planner: given what's already in the database, decides exactly what
 * additive inserts are needed to (re)apply the seed packs. Never plans an
 * update or delete — callers only ever execute inserts from this plan.
 */
export function planSeedUpsert(
  existingCollections: ExistingSeedCollection[],
  existingCards: ExistingSeedCard[],
  packs: PhraseSeedCollection[] = SEED_PACKS,
): SeedPlan {
  const collectionBySourceKey = new Map(
    existingCollections.filter((c) => c.sourceKey).map((c) => [c.sourceKey as string, c]),
  )
  const cardSourceKeys = new Set(
    existingCards.filter((c) => c.sourceKey).map((c) => c.sourceKey as string),
  )
  const cardContentKeys = new Set(
    existingCards.filter((c) => c.contentKey).map((c) => c.contentKey as string),
  )
  // A pack card is skipped when its key is taken, or when the learner already
  // has the same question + answer under another key. Never an update.
  const alreadyHave = (card: PhraseSeedCard) =>
    cardSourceKeys.has(card.sourceKey) || cardContentKeys.has(seedContentKey(card))

  const plan: SeedPlan = {
    collectionsToInsert: [],
    collectionsToBumpVersion: [],
    cardsToInsert: [],
  }

  for (const pack of packs) {
    const existingCollection = collectionBySourceKey.get(pack.sourceKey)

    if (!existingCollection) {
      const cards = pack.cards.filter((card) => !alreadyHave(card))
      plan.collectionsToInsert.push(cards.length === pack.cards.length ? pack : { ...pack, cards })
      continue
    }

    if (existingCollection.seedVersion < pack.seedVersion) {
      plan.collectionsToBumpVersion.push({
        id: existingCollection.id,
        seedVersion: pack.seedVersion,
      })
    }

    for (const card of pack.cards) {
      if (alreadyHave(card)) continue // already seeded, user-edited, or a duplicate — never touch it
      plan.cardsToInsert.push({ collectionId: existingCollection.id, card })
    }
  }

  return plan
}

const STARTER_PACK_KEYS = new Set(SEED_PACKS.map((pack) => pack.sourceKey))

/** True for the curated starter packs — not for other keyed collections such
 *  as the owner's "My work messages" (lib/korean-phrasebook/work.ts). */
export function isStarterPackKey(sourceKey: string | null | undefined): boolean {
  return sourceKey != null && STARTER_PACK_KEYS.has(sourceKey)
}

export function isSeedPlanEmpty(plan: SeedPlan): boolean {
  return (
    plan.collectionsToInsert.length === 0 &&
    plan.collectionsToBumpVersion.length === 0 &&
    plan.cardsToInsert.length === 0
  )
}
