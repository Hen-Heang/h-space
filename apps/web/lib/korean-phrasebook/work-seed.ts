import type { WorkContext } from "./schemas"
import type { PhraseSeedCard } from "./seed"
import { WORK_FOCUS_TAG } from "./work"

// "Korean for my work" starter pack — generic developer-work Q&A, written
// for this app. Nothing here is quoted from a real workplace: no company
// names, people, task IDs, internal SQL or rules. Each card is a coworker's
// line (question) and a short reply (answer) in 해요체 or 합니다체.
//
// Six cards also carry a workContext — they're the message-comprehension
// exercises the work-reply practice and Today's Mission use: understand the
// main point and required action, keep unknowns unknown, then reply.
//
// The cards deliberately don't repeat Workplace Essentials (status, deadline,
// blocker help, ownership, schedule, completion report, feedback request):
// they cover confirming understanding, scope and criteria, work states,
// test evidence, review, business-rule words (이상/초과, 보류/반려, 재시도/
// 재처리) and a three-sentence work diary.
//
// Romanization follows pronunciation-based Revised Romanization, like the
// launch packs, and was written by hand with AI assistance — worth a
// native-speaker pass (docs/korean-phrasebook-implementation.md §8).

function ctx(partial: Partial<WorkContext> & Pick<WorkContext, "mainPoint">): WorkContext {
  return {
    requiredAction: "",
    conditions: [],
    deadline: "",
    expectedResult: "",
    unknowns: [],
    clarifyingQuestion: "",
    whyUseful: "",
    ...partial,
  }
}

const base = {
  category: "workplace",
  questionVariants: [] as string[],
  provenance: "curated" as const,
}

export const WORK_FOCUS_CARDS: PhraseSeedCard[] = [
  {
    ...base,
    sourceKey: "work-confirm-understanding",
    situation: "confirm-understanding",
    difficulty: "medium",
    question: {
      korean: "요구사항 문서 확인하셨나요?",
      romanization: "yogusahang munseo hwaginhasyeonnayo?",
      english: "Did you check the requirements document?",
      register: "polite",
    },
    answers: [
      {
        korean: "네, 확인했습니다. 제가 이해한 내용이 맞는지 확인 부탁드립니다.",
        romanization:
          "ne, hwaginhaetseumnida. jega ihaehan naeyong-i manneunji hwagin butakdeurimnida.",
        english: "Yes, I checked it. Please check whether I understood it correctly.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "아직 다 못 봤습니다. 오늘 오전 중으로 확인하겠습니다.",
        romanization: "ajik da mot bwatseumnida. oneul ojeon jung-euro hwaginhagetseumnida.",
        english: "I haven't read all of it yet. I'll check it this morning.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "Pattern: ~는지 확인 부탁드립니다 — “please check whether ~”. Send your understanding in 1–2 sentences before you start coding.",
    vocabulary: [
      { korean: "요구사항", english: "requirements" },
      { korean: "문서", english: "document" },
      { korean: "이해하다", english: "to understand" },
      { korean: "내용", english: "content, what it says" },
    ],
    tags: [WORK_FOCUS_TAG, "requirements"],
  },
  {
    ...base,
    sourceKey: "work-confirm-criterion",
    situation: "confirm-criterion",
    difficulty: "medium",
    question: {
      korean: "집계 기준을 바꿔 주세요. 성공 건과 대기 건만 포함하고, 실패 건은 제외해 주세요.",
      romanization:
        "jipgye gijuneul bakkwo juseyo. seonggong geon-gwa daegi geonman pohamhago, silpae geoneun jeoehae juseyo.",
      english:
        "Please change the counting criterion. Include only successful and pending items, and exclude failed ones.",
      register: "polite",
    },
    answers: [
      {
        korean: "성공한 건과 대기 중인 건만 포함하면 될까요? 실패한 건은 집계에서 제외하겠습니다.",
        romanization:
          "seonggonghan geon-gwa daegi jung-in geonman pohamhamyeon doelkkayo? silpaehan geoneun jipgye-eseo jeoehagetseumnida.",
        english:
          "So I should include only successful and pending items? I'll exclude failed items from the count.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "네, 성공과 대기 상태만 집계되도록 수정하겠습니다.",
        romanization: "ne, seonggong-gwa daegi sangtaeman jipgyedoedorok sujeonghagetseumnida.",
        english: "OK, I'll change it so only successful and pending statuses are counted.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "Pattern: ~만 포함하다 / ~는 제외하다 — “include only ~ / exclude ~”. Repeat the criterion back before changing the query.",
    vocabulary: [
      { korean: "집계", english: "count, tally" },
      { korean: "기준", english: "criterion" },
      { korean: "포함하다", english: "to include" },
      { korean: "제외하다", english: "to exclude" },
      { korean: "대기", english: "pending, waiting" },
    ],
    tags: [WORK_FOCUS_TAG, "criteria"],
    workContext: ctx({
      mainPoint: "Change how items are counted.",
      requiredAction: "Change the counting criterion.",
      conditions: ["Include successful items", "Include pending items", "Exclude failed items"],
      expectedResult: "The count contains only successful and pending items.",
      unknowns: ["Which screen or report uses this count"],
      clarifyingQuestion: "이 집계는 어느 화면에서 사용되나요?",
      whyUseful:
        "Counting rules appear in most data tasks — confirm them before you change a query.",
    }),
  },
  {
    ...base,
    sourceKey: "work-confirm-scope",
    situation: "confirm-scope",
    difficulty: "medium",
    question: {
      korean: "이번 작업은 조회 조건만 바꾸면 돼요. 화면은 건드리지 마세요.",
      romanization:
        "ibeon jageobeun johoe jogeonman bakkumyeon dwaeyo. hwamyeoneun geondeuriji maseyo.",
      english:
        "For this task you only need to change the query conditions. Don't touch the screen.",
      register: "polite",
    },
    answers: [
      {
        korean:
          "이번 작업은 조회 조건만 변경하는 것이 맞나요? 화면 수정은 범위에서 제외하겠습니다.",
        romanization:
          "ibeon jageobeun johoe jogeonman byeongyeonghaneun geosi mannayo? hwamyeon sujeong-eun beomwi-eseo jeoehagetseumnida.",
        english:
          "So this task only changes the query conditions, right? I'll keep screen changes out of scope.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "네, 작업하기 전에 범위를 한 번 더 확인하겠습니다.",
        romanization: "ne, jageophagi jeone beomwireul han beon deo hwaginhagetseumnida.",
        english: "OK, I'll double-check the scope before I start.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "Pattern: ~하기 전에 — “before ~ing”. Words like 만 (only) and 마세요 (don't) set the scope.",
    vocabulary: [
      { korean: "조회", english: "lookup, query" },
      { korean: "조건", english: "condition" },
      { korean: "범위", english: "scope" },
      { korean: "건드리다", english: "to touch, to change" },
    ],
    tags: [WORK_FOCUS_TAG, "scope"],
    workContext: ctx({
      mainPoint: "Change only the query conditions and leave the screen alone.",
      requiredAction: "Change the query conditions.",
      conditions: ["Do not change the screen"],
      expectedResult: "Only the query conditions change.",
      unknowns: ["Which query conditions should change"],
      clarifyingQuestion: "어떤 조회 조건을 변경하면 될까요?",
      whyUseful: "Scope limits tell you what NOT to change — easy to miss when listening.",
    }),
  },
  {
    ...base,
    sourceKey: "work-clarify-criterion",
    situation: "requirement-clarification",
    difficulty: "medium",
    question: {
      korean: "이 부분은 알아서 처리해 주세요.",
      romanization: "i bubuneun araseo cheorihae juseyo.",
      english: "Please handle this part however you think best.",
      register: "polite",
    },
    answers: [
      {
        korean: "네, 알겠습니다. 다만 이 부분은 어떤 기준으로 처리하면 될까요?",
        romanization:
          "ne, algetseumnida. daman i bubuneun eotteon gijuneuro cheorihamyeon doelkkayo?",
        english: "Understood. But what criterion should I use for this part?",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "기존 방식과 같은 기준으로 처리하면 될까요?",
        romanization: "gijon bangsikgwa gateun gijuneuro cheorihamyeon doelkkayo?",
        english: "Should I use the same criterion as the existing approach?",
        register: "polite",
        isRecommended: false,
      },
    ],
    usageNote: "Pattern: ~기준으로 ~면 될까요? — “should I do it by ~ criterion?”",
    vocabulary: [
      { korean: "알아서", english: "using your own judgment" },
      { korean: "처리하다", english: "to handle, to process" },
      { korean: "다만", english: "but, however" },
      { korean: "기존", english: "existing" },
    ],
    tags: [WORK_FOCUS_TAG, "clarify"],
    workContext: ctx({
      mainPoint: "You're asked to handle a part yourself.",
      requiredAction: "Handle “this part”.",
      unknowns: ["What “this part” refers to", "Which criterion to use"],
      clarifyingQuestion: "이 부분은 어떤 기준으로 처리하면 될까요?",
      whyUseful: "알아서 gives you freedom but no criterion — one short question beats guessing.",
    }),
  },
  {
    ...base,
    sourceKey: "work-ask-repetition",
    situation: "ask-repetition",
    difficulty: "easy",
    question: {
      korean: "그럼 그 건은 다음 주 배포 전까지 정리해 주시고요.",
      romanization: "geureom geu geoneun daeum ju baepo jeonkkaji jeongnihae jusigoyo.",
      english: "Then please sort that item out before next week's deployment.",
      register: "polite",
    },
    answers: [
      {
        korean: "죄송하지만 조금만 천천히 다시 말씀해 주시겠어요?",
        romanization: "joesonghajiman jogeumman cheoncheonhi dasi malsseumhae jusigesseoyo?",
        english: "Sorry, could you say that again a little more slowly?",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "죄송합니다. 그 건이 어떤 작업인지 다시 한번 말씀해 주실 수 있을까요?",
        romanization:
          "joesonghamnida. geu geoni eotteon jageobinji dasi hanbeon malsseumhae jusil su isseulkkayo?",
        english: "Sorry — could you tell me again which task “that item” is?",
        register: "polite",
        isRecommended: false,
      },
    ],
    usageNote: "Asking again is normal and polite. 말씀하다 is the honorific “to speak”.",
    vocabulary: [
      { korean: "천천히", english: "slowly" },
      { korean: "말씀하다", english: "to speak (honorific)" },
      { korean: "배포", english: "deployment" },
      { korean: "정리하다", english: "to sort out, to organize" },
    ],
    tags: [WORK_FOCUS_TAG, "meeting"],
    workContext: ctx({
      mainPoint: "Finish sorting out an item before next week's deployment.",
      requiredAction: "Sort out “that item”.",
      conditions: ["Before next week's deployment"],
      deadline: "Before next week's deployment",
      unknowns: ["Which item “그 건” means"],
      clarifyingQuestion: "그 건이 어떤 작업인지 다시 말씀해 주실 수 있을까요?",
      whyUseful:
        "In meetings 그 건 points back to something said earlier — ask when you've lost track.",
    }),
  },
  {
    ...base,
    sourceKey: "work-explain-screen",
    situation: "explain-screen",
    difficulty: "medium",
    question: {
      korean: "이 화면은 어떤 기능을 하는 화면이에요?",
      romanization: "i hwamyeoneun eotteon gineung-eul haneun hwamyeon-ieyo?",
      english: "What does this screen do?",
      register: "polite",
    },
    answers: [
      {
        korean: "이 화면은 처리 상태와 이력을 확인하는 화면입니다.",
        romanization: "i hwamyeoneun cheori sangtaewa iryeogeul hwaginhaneun hwamyeon-imnida.",
        english: "This screen is for checking processing status and history.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "사용자가 요청 목록을 조회하고 상세 내용을 확인하는 화면입니다.",
        romanization:
          "sayongjaga yocheong mongnogeul johoehago sangse naeyong-eul hwaginhaneun hwamyeon-imnida.",
        english: "It's where users look up the request list and check the details.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "Pattern: ~하는 화면입니다 — explain what the screen is FOR, not only its name.",
    vocabulary: [
      { korean: "기능", english: "function" },
      { korean: "처리 상태", english: "processing status" },
      { korean: "이력", english: "history, log" },
      { korean: "상세", english: "detail" },
    ],
    tags: [WORK_FOCUS_TAG, "screen"],
  },
  {
    ...base,
    sourceKey: "work-describe-change",
    situation: "describe-change",
    difficulty: "medium",
    question: {
      korean: "이번에 뭘 수정하셨어요?",
      romanization: "ibeone mwol sujeonghasyeosseoyo?",
      english: "What did you change this time?",
      register: "polite",
    },
    answers: [
      {
        korean: "실패한 건이 집계에 포함되지 않도록 조건을 수정했습니다.",
        romanization: "silpaehan geoni jipgye-e pohamdoeji antorok jogeoneul sujeonghaetseumnida.",
        english: "I changed the condition so failed items aren't included in the count.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "중복된 데이터가 조회되지 않도록 쿼리를 수정했습니다.",
        romanization: "jungbokdoen deiteoga johoedoeji antorok kworireul sujeonghaetseumnida.",
        english: "I changed the query so duplicate data isn't returned.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "Pattern: ~지 않도록 ~했습니다 — “I did ~ so that ~ doesn't happen”.",
    vocabulary: [
      { korean: "~지 않도록", english: "so that ~ doesn't" },
      { korean: "포함되다", english: "to be included" },
      { korean: "중복", english: "duplicate" },
      { korean: "수정하다", english: "to change, to fix" },
    ],
    tags: [WORK_FOCUS_TAG, "change"],
  },
  {
    ...base,
    sourceKey: "work-unchanged-behavior",
    situation: "unchanged-behavior",
    difficulty: "medium",
    question: {
      korean: "기존 기능에 영향은 없나요?",
      romanization: "gijon gineung-e yeonghyang-eun eomnayo?",
      english: "There's no impact on existing features?",
      register: "polite",
    },
    answers: [
      {
        korean: "네, 기존 응답 형식과 화면 문구는 그대로 유지했습니다.",
        romanization:
          "ne, gijon eungdap hyeongsikgwa hwamyeon munguneun geudaero yujihaetseumnida.",
        english: "Right — I kept the existing response format and screen messages unchanged.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "변경한 조건 외에는 기존 동작과 동일합니다.",
        romanization: "byeongyeonghan jogeon oeeneun gijon dongjakgwa dongilhamnida.",
        english: "Apart from the changed condition, it behaves the same as before.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "네 agrees with a negative question: “영향은 없나요?” → “네, (없습니다)” means “right, there's none”. Pattern: ~는 그대로 유지했습니다.",
    vocabulary: [
      { korean: "영향", english: "impact, effect" },
      { korean: "그대로", english: "as it is" },
      { korean: "유지하다", english: "to keep, to maintain" },
      { korean: "동일하다", english: "to be the same" },
    ],
    tags: [WORK_FOCUS_TAG, "change"],
  },
  {
    ...base,
    sourceKey: "work-report-blocker",
    situation: "blocker-delay",
    difficulty: "hard",
    question: {
      korean: "작업 진행은 어떻게 되고 있어요?",
      romanization: "jageop jinhaeng-eun eotteoke doego isseoyo?",
      english: "How is the work going?",
      register: "polite",
    },
    answers: [
      {
        korean: "DB 연결은 되지만 쿼리 실행 중 타임아웃이 발생합니다. 원인을 확인하고 있습니다.",
        romanization:
          "DB yeongyeoreun doejiman kwori silhaeng jung taimausi balsaenghamnida. wonineul hwaginhago itseumnida.",
        english: "The DB connection works, but query execution times out. I'm checking the cause.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "테스트 데이터가 없어서 진행이 막혀 있습니다. 데이터를 받을 수 있을까요?",
        romanization:
          "teseuteu deiteoga eopseoseo jinhaeng-i makyeo itseumnida. deiteoreul badeul su isseulkkayo?",
        english: "I'm blocked because there's no test data. Could I get some?",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "A short blocker report: what works · what fails · what you're doing next.",
    vocabulary: [
      { korean: "연결", english: "connection" },
      { korean: "실행", english: "execution" },
      { korean: "발생하다", english: "to occur" },
      { korean: "막히다", english: "to be blocked" },
    ],
    tags: [WORK_FOCUS_TAG, "blocker"],
  },
  {
    ...base,
    sourceKey: "work-ongoing-check",
    situation: "work-status",
    difficulty: "medium",
    question: {
      korean: "이슈 원인 찾으셨어요?",
      romanization: "isyu wonin chajeusyeosseoyo?",
      english: "Did you find the cause of the issue?",
      register: "polite",
    },
    answers: [
      {
        korean: "아직 원인을 확인하고 있습니다. 확인되는 대로 공유드리겠습니다.",
        romanization:
          "ajik wonineul hwaginhago itseumnida. hwagindoeneun daero gong-yudeurigetseumnida.",
        english: "I'm still checking the cause. I'll share as soon as I find out.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "네, 원인을 찾았습니다. 수정 후 다시 공유드리겠습니다.",
        romanization: "ne, wonineul chajatseumnida. sujeong hu dasi gong-yudeurigetseumnida.",
        english: "Yes, I found the cause. I'll update you after fixing it.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "확인했습니다 (done) · 확인하고 있습니다 (in progress) · 확인하겠습니다 (will do) — say the one that is true. Pattern: ~는 대로 공유드리겠습니다.",
    vocabulary: [
      { korean: "원인", english: "cause" },
      { korean: "~는 대로", english: "as soon as ~" },
      { korean: "공유드리다", english: "to share (humble)" },
    ],
    tags: [WORK_FOCUS_TAG, "status"],
  },
  {
    ...base,
    sourceKey: "work-planned-status",
    situation: "work-status",
    difficulty: "medium",
    question: {
      korean: "그 기능은 개발 끝났어요?",
      romanization: "geu gineung-eun gaebal kkeunnasseoyo?",
      english: "Is development of that feature finished?",
      register: "polite",
    },
    answers: [
      {
        korean: "아직 개발 중입니다. 내일까지 로컬 테스트를 마칠 예정입니다.",
        romanization:
          "ajik gaebal jung-imnida. naeilkkaji rokeol teseuteureul machil yejeong-imnida.",
        english: "It's still in development. I plan to finish local testing by tomorrow.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "네, 개발은 완료했고 테스트는 아직 진행 중입니다.",
        romanization: "ne, gaebareun wallyohaetgo teseuteuneun ajik jinhaeng jung-imnida.",
        english: "Yes, development is done, but testing is still in progress.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "예정입니다 (planned) · 진행 중입니다 (in progress) · 완료했습니다 (done).",
    vocabulary: [
      { korean: "예정", english: "plan, scheduled" },
      { korean: "진행 중", english: "in progress" },
      { korean: "완료", english: "completed" },
      { korean: "마치다", english: "to finish" },
    ],
    tags: [WORK_FOCUS_TAG, "status"],
  },
  {
    ...base,
    sourceKey: "work-test-evidence",
    situation: "test-evidence",
    difficulty: "medium",
    question: {
      korean: "테스트는 어디까지 해 보셨어요?",
      romanization: "teseuteuneun eodikkaji hae bosyeosseoyo?",
      english: "How far did you get with testing?",
      register: "polite",
    },
    answers: [
      {
        korean: "정상 케이스와 경계값 테스트를 확인했습니다.",
        romanization: "jeongsang keiseuwa gyeonggyekkap teseuteureul hwaginhaetseumnida.",
        english: "I checked the normal cases and the boundary-value tests.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "로컬에서 정상 케이스만 확인했고, 예외 케이스는 아직 확인하지 못했습니다.",
        romanization:
          "rokeoreseo jeongsang keiseuman hwaginhaetgo, yeoe keiseuneun ajik hwaginhaji motaetseumnida.",
        english:
          "Locally I've only checked the normal cases; I haven't checked the exception cases yet.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "Say what you actually tested — 정상 (normal), 경계값 (boundary), 예외 (exception).",
    vocabulary: [
      { korean: "정상", english: "normal" },
      { korean: "경계값", english: "boundary value" },
      { korean: "예외", english: "exception" },
      { korean: "로컬", english: "local (environment)" },
    ],
    tags: [WORK_FOCUS_TAG, "testing"],
  },
  {
    ...base,
    sourceKey: "work-request-review",
    situation: "request-review",
    difficulty: "easy",
    question: {
      korean: "수정 끝나면 알려 주세요.",
      romanization: "sujeong kkeunnamyeon allyeo juseyo.",
      english: "Let me know when the fix is done.",
      register: "polite",
    },
    answers: [
      {
        korean: "수정 후 로컬 테스트까지 완료했습니다. 리뷰 부탁드립니다.",
        romanization: "sujeong hu rokeol teseuteukkaji wallyohaetseumnida. ribyu butakdeurimnida.",
        english: "I've finished the changes and local testing. Please review them.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "수정은 완료했지만 테스트는 진행 중입니다. 테스트가 끝나면 리뷰 요청드리겠습니다.",
        romanization:
          "sujeong-eun wallyohaetjiman teseuteuneun jinhaeng jung-imnida. teseuteuga kkeunnamyeon ribyu yocheongdeurigetseumnida.",
        english:
          "The fix is done but testing is in progress. I'll request a review when it's finished.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "Pattern: ~까지 완료했습니다 — “finished up to and including ~”.",
    vocabulary: [
      { korean: "완료하다", english: "to complete" },
      { korean: "리뷰", english: "review" },
      { korean: "부탁드리다", english: "to ask (politely)" },
      { korean: "요청", english: "request" },
    ],
    tags: [WORK_FOCUS_TAG, "review"],
  },
  {
    ...base,
    sourceKey: "work-ask-completion",
    situation: "request-review",
    difficulty: "medium",
    question: {
      korean: "이 건은 이제 끝난 거죠?",
      romanization: "i geoneun ije kkeunnan geojyo?",
      english: "This item is finished now, right?",
      register: "polite",
    },
    answers: [
      {
        korean: "개발은 완료했고 지금 리뷰 요청 상태입니다. 리뷰가 끝난 후 완료로 처리하면 될까요?",
        romanization:
          "gaebareun wallyohaetgo jigeum ribyu yocheong sangtae-imnida. ribyuga kkeunnan hu wallyoro cheorihamyeon doelkkayo?",
        english:
          "Development is done and it's waiting for review. Should I mark it complete after the review?",
        register: "formal",
        isRecommended: true,
      },
    ],
    usageNote:
      "개발 완료 (built) ≠ 테스트 완료 (tested) ≠ 리뷰 요청 (review requested) ≠ 리뷰 통과 (review passed). Say exactly which stage you're at.",
    vocabulary: [
      { korean: "개발 완료", english: "development finished" },
      { korean: "리뷰 요청", english: "review requested" },
      { korean: "리뷰 통과", english: "review passed" },
      { korean: "처리하다", english: "to mark, to handle" },
    ],
    tags: [WORK_FOCUS_TAG, "review"],
  },
  {
    ...base,
    sourceKey: "work-respond-feedback",
    situation: "code-review-feedback",
    difficulty: "medium",
    question: {
      korean: "리뷰 코멘트 남겼어요. 변수명 좀 바꿔 주세요.",
      romanization: "ribyu komenteu namgyeosseoyo. byeonsumyeong jom bakkwo juseyo.",
      english: "I left review comments. Please change the variable names.",
      register: "polite",
    },
    answers: [
      {
        korean: "감사합니다. 피드백을 반영해서 다시 확인하겠습니다.",
        romanization: "gamsahamnida. pidebaegeul banyeonghaeseo dasi hwaginhagetseumnida.",
        english: "Thank you. I'll apply the feedback and check again.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "확인했습니다. 수정 반영 후 다시 리뷰 요청드리겠습니다.",
        romanization:
          "hwaginhaetseumnida. sujeong banyeong hu dasi ribyu yocheongdeurigetseumnida.",
        english: "Got it. I'll request another review after applying the changes.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "수정하다 = change it · 반영하다 = apply requested changes · 검토하다 = review, consider · 검증하다 = verify it works.",
    vocabulary: [
      { korean: "반영하다", english: "to apply (feedback)" },
      { korean: "코멘트", english: "comment" },
      { korean: "변수명", english: "variable name" },
      { korean: "검토하다", english: "to review, to look over" },
    ],
    tags: [WORK_FOCUS_TAG, "review"],
    workContext: ctx({
      mainPoint: "A reviewer left comments and wants variable names changed.",
      requiredAction: "Rename the variables mentioned in the review comments.",
      expectedResult: "Updated code with the requested names.",
      unknowns: ["Which variables — the comments have the details"],
      whyUseful: "Review requests are short; read the comments before you reply.",
    }),
  },
  {
    ...base,
    sourceKey: "work-update-estimate",
    situation: "update-estimate",
    difficulty: "medium",
    question: {
      korean: "오늘 안에 가능할까요?",
      romanization: "oneul ane ganeunghalkkayo?",
      english: "Is it possible by today?",
      register: "polite",
    },
    answers: [
      {
        korean: "추가 확인이 필요해서 예상 완료 시간을 다시 공유드리겠습니다.",
        romanization:
          "chuga hwagini piryohaeseo yesang wallyo siganeul dasi gong-yudeurigetseumnida.",
        english:
          "I need to check a few more things, so I'll update you on the expected completion time.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "네, 오늘 오후 5시까지 가능할 것 같습니다.",
        romanization: "ne, oneul ohu daseot-sikkaji ganeunghal geot gatseumnida.",
        english: "Yes, I think it'll be possible by 5 p.m. today.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "Don't promise a time you aren't sure of — 다시 공유드리겠습니다 buys time honestly.",
    vocabulary: [
      { korean: "추가", english: "additional" },
      { korean: "예상", english: "expected" },
      { korean: "가능하다", english: "to be possible" },
    ],
    tags: [WORK_FOCUS_TAG, "estimate"],
  },
  {
    ...base,
    sourceKey: "work-check-meaning",
    situation: "check-meaning",
    difficulty: "easy",
    question: {
      korean: "작성한 문장을 보여 주세요.",
      romanization: "jakseonghan munjang-eul boyeo juseyo.",
      english: "Show me the sentence you wrote.",
      register: "polite",
    },
    answers: [
      {
        korean: "제가 의도한 뜻은 이렇습니다. 이 표현이 맞을까요?",
        romanization: "jega uidohan tteuseun ireosseumnida. i pyohyeoni majeulkkayo?",
        english: "This is what I meant to say. Is this expression right?",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "이 문장이 자연스러운지 확인해 주실 수 있을까요?",
        romanization: "i munjang-i jayeonseureounji hwaginhae jusil su isseulkkayo?",
        english: "Could you check whether this sentence sounds natural?",
        register: "polite",
        isRecommended: false,
      },
    ],
    usageNote:
      "Share your intended meaning with the sentence, so the correction keeps what you meant.",
    vocabulary: [
      { korean: "의도하다", english: "to intend" },
      { korean: "뜻", english: "meaning" },
      { korean: "표현", english: "expression" },
      { korean: "자연스럽다", english: "to be natural" },
    ],
    tags: [WORK_FOCUS_TAG, "writing"],
  },
  {
    ...base,
    sourceKey: "work-bug-report",
    situation: "bug-report",
    difficulty: "hard",
    question: {
      korean: "어떤 문제가 있었어요?",
      romanization: "eotteon munjega isseosseoyo?",
      english: "What was the problem?",
      register: "polite",
    },
    answers: [
      {
        korean: "같은 조건으로 두 번 조회하면 결과가 중복으로 나옵니다. 예상 결과는 한 건입니다.",
        romanization:
          "gateun jogeoneuro du beon johoehamyeon gyeolgwaga jungbogeuro naomnida. yesang gyeolgwaneun han geonimnida.",
        english:
          "When I query twice with the same condition, the result is duplicated. The expected result is one item.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "로그인 후 목록 화면에서 오류가 재현됩니다.",
        romanization: "rogeuin hu mongnok hwamyeon-eseo oryuga jaehyeondoemnida.",
        english: "The error reproduces on the list screen after logging in.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "Bug report: steps · 예상 결과 (expected) · 실제 결과 (actual).",
    vocabulary: [
      { korean: "재현되다", english: "to be reproduced" },
      { korean: "예상 결과", english: "expected result" },
      { korean: "실제 결과", english: "actual result" },
      { korean: "오류", english: "error" },
    ],
    tags: [WORK_FOCUS_TAG, "bug"],
  },
  {
    ...base,
    sourceKey: "work-test-failure",
    situation: "test-failure",
    difficulty: "medium",
    question: {
      korean: "테스트 결과는 어때요?",
      romanization: "teseuteu gyeolgwaneun eottaeyo?",
      english: "How are the test results?",
      register: "polite",
    },
    answers: [
      {
        korean: "경계값 케이스 하나가 실패했습니다. 원인을 확인한 후에 다시 공유드리겠습니다.",
        romanization:
          "gyeonggyekkap keiseu hanaga silpaehaetseumnida. wonineul hwaginhan hue dasi gong-yudeurigetseumnida.",
        english: "One boundary-value case failed. I'll update you after checking the cause.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "회귀 테스트까지 모두 통과했습니다.",
        romanization: "hoegwi teseuteukkaji modu tonggwahaetseumnida.",
        english: "Everything passed, including the regression tests.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "Pattern: ~한 후에 — “after ~ing”.",
    vocabulary: [
      { korean: "실패하다", english: "to fail" },
      { korean: "통과하다", english: "to pass" },
      { korean: "회귀 테스트", english: "regression test" },
    ],
    tags: [WORK_FOCUS_TAG, "testing"],
  },
  {
    ...base,
    sourceKey: "work-boundary-rule",
    situation: "business-rule",
    difficulty: "hard",
    question: {
      korean: "금액이 10,000원 이상인 경우만 대상에 포함하고, 10,000원 미만은 제외해 주세요.",
      romanization:
        "geumaegi man won isang-in gyeong-uman daesang-e pohamhago, man won mimaneun jeoehae juseyo.",
      english:
        "Include only cases where the amount is 10,000 won or more, and exclude amounts under 10,000 won.",
      register: "polite",
    },
    answers: [
      {
        korean: "네, 10,000원은 포함하고 9,999원까지는 제외하면 될까요?",
        romanization:
          "ne, man woneun pohamhago gucheon-gubaek-gusipgu wonkkajineun jeoehamyeon doelkkayo?",
        english: "So 10,000 won is included and anything up to 9,999 won is excluded?",
        register: "polite",
        isRecommended: true,
      },
      {
        korean: "이상은 기준값을 포함하고, 초과는 포함하지 않는 것으로 이해했습니다.",
        romanization:
          "isang-eun gijunkkapseul pohamhago, chogwaneun pohamhaji anneun geoseuro ihaehaetseumnida.",
        english: "I understand that 이상 includes the boundary value and 초과 doesn't.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "10,000원 이상 = 10,000 and up (included) · 10,000원 초과 = from 10,001 · 이하 includes the number · 미만 doesn't. Pattern: ~인 경우.",
    vocabulary: [
      { korean: "이상", english: "or more (≥)" },
      { korean: "초과", english: "more than (>)" },
      { korean: "이하", english: "or less (≤)" },
      { korean: "미만", english: "less than (<)" },
      { korean: "대상", english: "target, what's covered" },
    ],
    tags: [WORK_FOCUS_TAG, "criteria"],
    workContext: ctx({
      mainPoint: "Only amounts of 10,000 won or more count.",
      requiredAction: "Include amounts of 10,000 won or more and exclude amounts below it.",
      conditions: ["10,000 won or more: include", "Under 10,000 won: exclude"],
      expectedResult: "Exactly 10,000 won is included.",
      whyUseful: "이상/초과 and 이하/미만 decide whether the boundary number itself counts.",
    }),
  },
  {
    ...base,
    sourceKey: "work-hold-or-reject",
    situation: "business-rule",
    difficulty: "medium",
    question: {
      korean: "이 요청은 보류된 거예요, 반려된 거예요?",
      romanization: "i yocheong-eun boryudoen geoyeyo, ballyeodoen geoyeyo?",
      english: "Was this request put on hold, or rejected?",
      register: "polite",
    },
    answers: [
      {
        korean: "반려가 아니라 보류입니다. 추가 자료를 받은 후에 다시 진행할 예정입니다.",
        romanization:
          "ballyeoga anira boryuimnida. chuga jaryoreul badeun hue dasi jinhaenghal yejeong-imnida.",
        english: "It's on hold, not rejected. We plan to continue after receiving more material.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "반려되었습니다. 사유를 확인하고 수정해서 다시 요청하겠습니다.",
        romanization:
          "ballyeodoeeotseumnida. sayureul hwaginhago sujeonghaeseo dasi yocheonghagetseumnida.",
        english: "It was rejected. I'll check the reason, revise it and request again.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "보류 = paused, may continue later · 반려 = sent back, needs changes before resubmitting.",
    vocabulary: [
      { korean: "보류", english: "on hold" },
      { korean: "반려", english: "rejected, sent back" },
      { korean: "사유", english: "reason" },
      { korean: "자료", english: "material, data" },
    ],
    tags: [WORK_FOCUS_TAG, "status"],
  },
  {
    ...base,
    sourceKey: "work-retry-or-reprocess",
    situation: "business-rule",
    difficulty: "hard",
    question: {
      korean: "전송 실패한 건은 어떻게 해요?",
      romanization: "jeonsong silpaehan geoneun eotteoke haeyo?",
      english: "What do we do with items whose transmission failed?",
      register: "polite",
    },
    answers: [
      {
        korean:
          "오류 유형에 따라 처리하겠습니다. 일시적인 오류는 재시도하고, 데이터 문제는 수정 후 재처리하겠습니다.",
        romanization:
          "oryu yuhyeong-e ttara cheorihagetseumnida. ilsijeogin oryuneun jaesidohago, deiteo munjeneun sujeong hu jaecheorihagetseumnida.",
        english:
          "I'll handle them by error type: retry temporary errors, and reprocess data problems after fixing them.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "실패 사유를 먼저 확인한 후에 재처리 여부를 말씀드리겠습니다.",
        romanization:
          "silpae sayureul meonjeo hwaginhan hue jaecheori yeobureul malsseumdeurigetseumnida.",
        english: "I'll check the failure reason first, then tell you whether to reprocess.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote:
      "재시도 = send the same request again · 재처리 = run the processing again, usually after fixing data. Pattern: ~에 따라.",
    vocabulary: [
      { korean: "전송", english: "transmission" },
      { korean: "재시도", english: "retry" },
      { korean: "재처리", english: "reprocessing" },
      { korean: "일시적", english: "temporary" },
      { korean: "여부", english: "whether (or not)" },
    ],
    tags: [WORK_FOCUS_TAG, "status"],
  },
  {
    ...base,
    sourceKey: "work-duplicates",
    situation: "business-rule",
    difficulty: "medium",
    question: {
      korean: "중복 건은 어떻게 처리했어요?",
      romanization: "jungbok geoneun eotteoke cheorihaesseoyo?",
      english: "How did you handle duplicates?",
      register: "polite",
    },
    answers: [
      {
        korean: "같은 기준으로 중복된 건은 한 건만 집계되도록 처리했습니다.",
        romanization:
          "gateun gijuneuro jungbokdoen geoneun han geonman jipgyedoedorok cheorihaetseumnida.",
        english: "Items duplicated under the same criterion are now counted only once.",
        register: "formal",
        isRecommended: true,
      },
      {
        korean: "중복 데이터가 존재하는 경우 최신 건만 남기도록 했습니다.",
        romanization:
          "jungbok deiteoga jonjaehaneun gyeong-u choesin geonman namgidorok haetseumnida.",
        english: "When duplicate data exists, I keep only the latest item.",
        register: "formal",
        isRecommended: false,
      },
    ],
    usageNote: "Pattern: ~도록 처리했습니다 — “I handled it so that ~”.",
    vocabulary: [
      { korean: "존재하다", english: "to exist" },
      { korean: "최신", english: "latest" },
      { korean: "남기다", english: "to leave, to keep" },
    ],
    tags: [WORK_FOCUS_TAG, "criteria"],
  },
  {
    ...base,
    sourceKey: "work-before-after",
    situation: "describe-change",
    difficulty: "medium",
    question: {
      korean: "수정 전후 차이를 설명해 주세요.",
      romanization: "sujeong jeonhu chaireul seolmyeonghae juseyo.",
      english: "Please explain the difference before and after the change.",
      register: "polite",
    },
    answers: [
      {
        korean: "수정 전에는 실패 건도 포함됐지만, 수정 후에는 성공 건만 포함됩니다.",
        romanization:
          "sujeong jeoneneun silpae geondo pohamdwaetjiman, sujeong hueneun seonggong geonman pohamdoemnida.",
        english:
          "Before the change, failed items were included too; now only successful items are.",
        register: "formal",
        isRecommended: true,
      },
    ],
    usageNote: "Pattern: 수정 전에는 ~, 수정 후에는 ~ — before/after in one sentence.",
    vocabulary: [
      { korean: "전후", english: "before and after" },
      { korean: "차이", english: "difference" },
      { korean: "설명하다", english: "to explain" },
    ],
    tags: [WORK_FOCUS_TAG, "change"],
  },
  {
    ...base,
    sourceKey: "work-diary",
    situation: "work-diary",
    difficulty: "hard",
    question: {
      korean: "오늘 업무 일지를 세 문장으로 써 보세요.",
      romanization: "oneul eommu iljireul se munjang-euro sseo boseyo.",
      english: "Write today's work diary in three sentences.",
      register: "polite",
    },
    answers: [
      {
        korean:
          "오늘은 집계 조건을 수정했습니다. 테스트 중 경계값 오류를 발견해서 원인을 확인했습니다. 내일은 수정 사항을 반영하고 리뷰를 요청하겠습니다.",
        romanization:
          "oneureun jipgye jogeoneul sujeonghaetseumnida. teseuteu jung gyeonggyekkap oryureul balgyeonhaeseo wonineul hwaginhaetseumnida. naeireun sujeong sahang-eul banyeonghago ribyureul yocheonghagetseumnida.",
        english:
          "Today I changed the counting condition. During testing I found a boundary-value error and checked the cause. Tomorrow I'll apply the fixes and request a review.",
        register: "formal",
        isRecommended: true,
      },
    ],
    usageNote:
      "Three sentences: what I did (~했습니다) · what happened or what I learned · what I'll do next (~하겠습니다).",
    vocabulary: [
      { korean: "업무 일지", english: "work diary" },
      { korean: "발견하다", english: "to find, to discover" },
      { korean: "수정 사항", english: "changes, fixes" },
    ],
    tags: [WORK_FOCUS_TAG, "writing"],
  },
]

/** Comprehension notes by card source key — lets seeded cards keep their
 *  work context even before the work_context column exists. */
export const WORK_CONTEXT_BY_SOURCE_KEY: ReadonlyMap<string, WorkContext> = new Map(
  WORK_FOCUS_CARDS.filter((card) => card.workContext).map((card) => [
    card.sourceKey,
    card.workContext as WorkContext,
  ]),
)
