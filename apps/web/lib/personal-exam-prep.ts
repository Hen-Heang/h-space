export interface PersonalExamQA {
  id: string
  question: string
  questionVariants: string[]
  catchKeywords: string[]
  answer: string
  answerKeywords: string[]
  note?: string
}
// The main script itself lives in lib/interview.ts (HABITS_SCRIPT_SEED, the
// script editor's draft); the review card reads the learner's saved copy.

// Catch → Understand → Short Answer → Follow-up. Answers stay at 1–3 short
// sentences and reuse the script's wording so memorized Q&A never conflicts
// with it. Variants train hearing the same question phrased differently.
export const PERSONAL_EXAM_QA: PersonalExamQA[] = [
  {
    id: "why-topic",
    question: "왜 이 주제를 선택했어요?",
    questionVariants: [
      "이 주제를 선택한 이유가 뭐예요?",
      "왜 습관과 취미를 주제로 정했어요?",
      "이 주제를 왜 선택하셨어요?",
    ],
    catchKeywords: ["왜", "주제", "선택", "이유"],
    answer:
      "한국에 온 후 제 생활이 많이 달라졌기 때문이에요. 새로 생긴 습관과 취미가 많아서 이 주제를 선택했어요.",
    answerKeywords: ["생활이 달라짐", "새 습관·취미", "선택"],
  },
  {
    id: "new-habits",
    question: "한국에 온 후 새로 생긴 습관은 뭐예요?",
    questionVariants: [
      "한국에 와서 어떤 습관이 생겼어요?",
      "한국 생활에서 새로 시작한 것이 있어요?",
    ],
    catchKeywords: ["한국에 온 후", "새로 생긴", "습관"],
    answer: "걸어서 출근하고, 날씨를 확인하고, 쓰레기를 나눠서 버리는 습관이 생겼어요.",
    answerKeywords: ["걸어서 출근", "날씨 확인", "분리배출"],
  },
  {
    id: "transport",
    question: "캄보디아에 있을 때와 교통 습관이 어떻게 달라졌어요?",
    questionVariants: [
      "캄보디아에서는 어떻게 출근했어요?",
      "한국에서는 보통 무엇을 타고 다녀요?",
      "지하철을 처음 이용했을 때 어땠어요?",
    ],
    catchKeywords: ["캄보디아", "교통", "차이", "지하철", "처음"],
    answer:
      "캄보디아에서는 오토바이나 차를 많이 이용했어요. 한국에서는 걸어서 출근하고, 멀리 갈 때는 버스나 지하철을 이용해요. 처음에는 노선이 복잡했지만 지금은 혼자서도 잘 다녀요.",
    answerKeywords: ["오토바이·차", "걸어서", "버스·지하철", "처음에는 복잡"],
  },
  {
    id: "weather-check",
    question: "왜 밖에 나가기 전에 날씨를 확인해요?",
    questionVariants: ["날씨를 자주 확인해요?", "외출하기 전에 무엇을 확인해요?"],
    catchKeywords: ["왜", "날씨", "확인", "나가기 전"],
    answer: "비가 오거나 많이 추울 수 있어서 확인해요. 그래서 우산이나 옷을 미리 준비할 수 있어요.",
    answerKeywords: ["비·추위", "우산·옷", "미리 준비"],
  },
  {
    id: "recycling",
    question: "쓰레기 버리는 습관은 어떻게 달라졌어요?",
    questionVariants: ["분리배출은 어렵지 않았어요?", "한국의 쓰레기 버리는 방법은 어때요?"],
    catchKeywords: ["쓰레기", "분리배출", "달라졌", "어렵"],
    answer:
      "예전에는 많이 나누지 않았어요. 처음에는 조금 헷갈렸지만, 지금은 음식물 쓰레기와 재활용을 따로 확인해서 버려요.",
    answerKeywords: ["예전에는 안 나눔", "헷갈림", "음식물·재활용 따로"],
  },
  {
    id: "cooking",
    question: "한국에 와서 요리를 자주 해요?",
    questionVariants: ["집에서 밥을 해 먹어요?", "음식 습관은 어떻게 바뀌었어요?"],
    catchKeywords: ["요리", "자주", "음식 습관"],
    answer:
      "매일 하지는 않지만 가끔 직접 요리해요. 예전에는 배달을 많이 했지만, 이제는 간단한 음식은 혼자 만들 수 있어요.",
    answerKeywords: ["가끔 직접", "예전엔 배달", "간단한 음식"],
  },
  {
    id: "new-hobby",
    question: "한국에 온 후 새로 생긴 취미는 뭐예요?",
    questionVariants: [
      "요즘 무엇을 하면서 쉬어요?",
      "왜 산책을 자주 하게 되었어요?",
      "어디에서 자주 운동해요?",
    ],
    catchKeywords: ["취미", "산책", "운동", "어디"],
    answer:
      "산책, 조깅, 자전거 타기를 좋아하게 되었어요. 퇴근 후나 주말에 여의도공원에서 자주 걷고, 건강에도 좋고 스트레스도 줄일 수 있어서 좋아요.",
    answerKeywords: ["산책·조깅·자전거", "여의도공원", "건강·스트레스"],
  },
  {
    id: "han-river",
    question: "왜 한강에서 자전거 타는 것을 좋아해요?",
    questionVariants: ["운동을 하고 나면 기분이 어때요?", "한강에 자주 가요?"],
    catchKeywords: ["왜", "한강", "자전거", "기분"],
    answer: "경치가 좋고 기분이 상쾌해요. 운동을 하고 나면 조금 피곤하지만 기분은 좋아요.",
    answerKeywords: ["경치", "상쾌", "피곤하지만 좋음"],
  },
  {
    id: "friends-travel",
    question: "친구들과 어디에 가 봤어요?",
    questionVariants: [
      "한국에서 새로운 친구를 만났어요?",
      "주말에는 보통 뭐 해요?",
      "한국에서 여행해 본 곳이 있어요?",
    ],
    catchKeywords: ["친구", "어디", "주말", "여행"],
    answer:
      "한국에 사는 캄보디아 친구들을 새로 만났어요. 쉬는 날에는 같이 수원, 대전, 부산 같은 곳에 가 봤어요.",
    answerKeywords: ["캄보디아 친구", "쉬는 날", "수원·대전·부산"],
  },
  {
    id: "korean-study",
    question: "한국어 공부는 어떻게 하고 있어요?",
    questionVariants: ["한국어 공부도 습관이 되었어요?", "한국어에서 가장 어려운 것은 뭐예요?"],
    catchKeywords: ["한국어", "어떻게", "공부", "가장 어려운"],
    answer:
      "회사와 일상생활에서 필요해서 매일 조금씩 공부해요. 듣기와 말하기가 가장 어렵지만, 지금은 예전보다 조금 더 이해할 수 있어요.",
    answerKeywords: ["매일 조금씩", "듣기·말하기", "예전보다 이해"],
  },
  {
    id: "biggest-change",
    question: "한국에 와서 가장 많이 달라진 점은 뭐예요?",
    questionVariants: ["이 습관 중에서 가장 좋은 습관은 뭐예요?", "한국 생활로 무엇을 배웠어요?"],
    catchKeywords: ["가장", "달라진 점", "좋은 습관", "배웠"],
    answer:
      "혼자 할 수 있는 일이 많아졌어요. 그리고 운동하는 습관이 생겨서 더 건강하게 생활하게 되었어요.",
    answerKeywords: ["혼자 할 수 있는 일", "운동 습관", "건강"],
  },
  {
    id: "keep-habits",
    question: "앞으로 계속 유지하고 싶은 습관은 뭐예요?",
    questionVariants: ["앞으로 한국에서 무엇을 하고 싶어요?"],
    catchKeywords: ["앞으로", "유지", "하고 싶"],
    answer:
      "운동과 한국어 공부를 계속하고 싶어요. 그리고 한국에서 새로운 경험도 많이 해 보고 싶어요.",
    answerKeywords: ["운동", "한국어 공부", "새로운 경험"],
  },
  {
    id: "recovery",
    question: "질문을 못 들었을 때는 어떻게 말해요?",
    questionVariants: ["질문이 어려울 때는요?"],
    catchKeywords: ["못 들었", "어려울 때"],
    answer: "죄송하지만, 한 번만 다시 말씀해 주시겠습니까? 잠시만 생각해 보겠습니다.",
    answerKeywords: ["다시 말씀해 주시겠습니까", "잠시만 생각"],
    note: "Emergency lines — not a question the examiner asks, but say them without hesitating.",
  },
]
