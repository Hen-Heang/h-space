"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Headphones,
  MessageCircleQuestion,
  PencilLine,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { useSavedScript } from "@/hooks/useExamPrepHome"
import { INTERVIEW_TOPICS } from "@/lib/interview"
import { PERSONAL_EXAM_QA } from "@/lib/personal-exam-prep"

/**
 * Real-story Q&A (curated reference) plus the learner's own script. The Script
 * tab reads the script editor's newest copy — device or account — so it never
 * disagrees with what the learner wrote; blank sections show the drafted text.
 */
export function PersonalExamReviewCard() {
  const [mode, setMode] = useState<"script" | "qa">("qa")
  const topic = INTERVIEW_TOPICS[0]
  const saved = useSavedScript(topic.id)
  const scriptSections = (topic.scriptOutline ?? [])
    .map((section, index) => {
      const savedText = saved.snapshot?.sections[section.id] ?? ""
      const text = savedText.trim() ? savedText : (topic.scriptSeed?.[section.id] ?? "")
      return { id: section.id, title: `${index}. ${section.titleKo}`, text }
    })
    .filter((section) => section.text.trim())
  const [openQuestion, setOpenQuestion] = useState<string | null>(PERSONAL_EXAM_QA[0]?.id ?? null)

  return (
    <Card className="rounded-2xl border-blue-500/25 bg-card shadow-sm">
      <CardContent className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-blue-500/10 text-blue-700 dark:text-blue-300">
                Main Exam Review
              </Badge>
              <Badge variant="outline">Formal 합니다/습니다</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Real-story Q&A + question catcher
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Do not memorize every word. Catch 1–2 keywords, choose the matching real story, and
              answer in 2–3 short formal sentences.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-auto">
            <Button
              type="button"
              variant={mode === "qa" ? "default" : "outline"}
              onClick={() => setMode("qa")}
              className="h-10 rounded-xl px-4 font-semibold"
            >
              <MessageCircleQuestion className="mr-2 size-4" /> Q&A
            </Button>
            <Button
              type="button"
              variant={mode === "script" ? "default" : "outline"}
              onClick={() => setMode("script")}
              className="h-10 rounded-xl px-4 font-semibold"
            >
              <BookOpenText className="mr-2 size-4" /> Script
            </Button>
          </div>
        </div>

        {mode === "qa" ? (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
                <Headphones className="size-4 text-amber-600" /> Listening rule
              </div>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-base">
                Catch the yellow words first. Example: “차이점 / 어떻게 달라요” → 한국=습도·비,
                캄보디아=햇빛·기온.
              </p>
            </div>

            {PERSONAL_EXAM_QA.map((item, index) => {
              const isOpen = openQuestion === item.id
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-background/60 p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-700 dark:text-blue-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            lang="ko"
                            className="break-words text-base font-semibold leading-7 text-foreground sm:text-lg sm:leading-8"
                          >
                            {item.question}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {item.catchKeywords.map((keyword) => (
                              <Badge
                                key={keyword}
                                className="border-amber-500/20 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <SpeakButton text={item.question} className="shrink-0" title="질문 듣기" />
                      </div>

                      <button
                        type="button"
                        onClick={() => setOpenQuestion(isOpen ? null : item.id)}
                        className="mt-3.5 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {isOpen ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                        {isOpen ? "답변 숨기기" : "질문 표현 + 답변 보기"}
                      </button>

                      {isOpen ? (
                        <div className="mt-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              You may hear
                            </p>
                            <ul className="mt-1.5 space-y-1.5 text-sm leading-6 text-muted-foreground sm:text-base">
                              {item.questionVariants.map((variant) => (
                                <li key={variant} lang="ko">
                                  • {variant}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl bg-muted/40 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                lang="ko"
                                className="text-base font-medium leading-7 text-foreground sm:leading-8"
                              >
                                {item.answer}
                              </p>
                              <SpeakButton
                                text={item.answer}
                                className="shrink-0"
                                title="답변 듣기"
                              />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {item.answerKeywords.map((keyword) => (
                                <Badge
                                  key={keyword}
                                  variant="outline"
                                  className="text-xs font-medium"
                                >
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {item.note ? (
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                              {item.note}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {saved.snapshot?.updatedAt
                  ? "Your script from the editor, as last saved."
                  : "Your drafted script — edit it in My exam script."}
                {saved.syncFailed && " Showing this device's copy."}
              </p>
              <Button asChild variant="outline" size="sm" className="h-10 shrink-0">
                <Link href="/interview/script">
                  <PencilLine aria-hidden="true" /> Edit script
                </Link>
              </Button>
            </div>
            {scriptSections.map((section) => (
              <div
                key={section.id}
                className="rounded-xl border border-border bg-background/60 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {section.title}
                    </p>
                    <p
                      lang="ko"
                      className="mt-2 whitespace-pre-line text-base font-medium leading-8 text-foreground"
                    >
                      {section.text}
                    </p>
                  </div>
                  <SpeakButton text={section.text} className="shrink-0" title="이 부분 듣기" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
