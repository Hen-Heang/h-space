"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { ArrowLeft, Check, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type {
  QuestionBankItem,
  QuestionDifficulty,
  QuestionPriority,
  QuestionProgress,
  QuestionProgressStatus,
} from "@/lib/interview-practice"
import { cn } from "@/lib/utils"

interface QuestionBankBrowserProps {
  questions: QuestionBankItem[]
  progress: Record<string, QuestionProgress>
  onBack: () => void
  onPractice: (questions: QuestionBankItem[]) => void
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function QuestionBankBrowser({
  questions,
  progress,
  onBack,
  onPractice,
}: QuestionBankBrowserProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase())
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "all">("all")
  const [category, setCategory] = useState("all")
  const [priority, setPriority] = useState<QuestionPriority | "all">("all")
  const [status, setStatus] = useState<QuestionProgressStatus | "all">("all")
  const [practiceState, setPracticeState] = useState<"all" | "practised" | "unpractised">("all")
  const [selected, setSelected] = useState<string[]>([])

  const categories = useMemo(
    () => [...new Set(questions.map((question) => question.category))].sort(),
    [questions],
  )
  const filtered = useMemo(
    () =>
      questions.filter((question) => {
        const itemProgress = progress[question.id]
        const itemStatus = itemProgress?.timesPracticed ? itemProgress.status : "new"
        const practised = (itemProgress?.timesPracticed ?? 0) > 0
        const haystack = [question.questionKo, question.questionEn, ...question.keywords]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
        return (
          (difficulty === "all" || question.difficulty === difficulty) &&
          (category === "all" || question.category === category) &&
          (priority === "all" || question.priority === priority) &&
          (status === "all" || itemStatus === status) &&
          (practiceState === "all" || (practiceState === "practised" ? practised : !practised)) &&
          (!deferredSearch || haystack.includes(deferredSearch))
        )
      }),
    [category, deferredSearch, difficulty, practiceState, priority, progress, questions, status],
  )

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const selectedQuestions = selected
    .map((id) => questions.find((question) => question.id === id))
    .filter((question): question is QuestionBankItem => Boolean(question))

  return (
    <div className="space-y-5 pb-28 sm:pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" onClick={onBack} className="-ml-3 rounded-xl">
            <ArrowLeft className="mr-2 size-4" />
            Back to practice
          </Button>
          <h2 className="mt-2 text-2xl font-bold text-foreground">Question Bank</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse all {questions.length} stable exam questions and start a focused drill.
          </p>
        </div>
        <Button
          onClick={() => onPractice(selectedQuestions)}
          disabled={selectedQuestions.length === 0}
          className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          Practice selected ({selectedQuestions.length})
        </Button>
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <label className="relative block">
            <span className="sr-only">Search Korean question or keyword</span>
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Korean text, English, or keyword"
              className="h-10 rounded-xl pl-9"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
            <label className="text-xs text-muted-foreground">
              Difficulty
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as QuestionDifficulty | "all")
                }
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="all">All</option>
                <option value="beginner">Beginner</option>
                <option value="normal">Normal</option>
                <option value="challenging">Challenging</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="all">All</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as QuestionPriority | "all")}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="all">All</option>
                <option value="must_practice">Must practise</option>
                <option value="recommended">Recommended</option>
                <option value="optional">Optional</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Progress
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as QuestionProgressStatus | "all")
                }
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="practicing">Practising</option>
                <option value="improving">Improving</option>
                <option value="strong">Strong</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              History
              <select
                value={practiceState}
                onChange={(event) => setPracticeState(event.target.value as typeof practiceState)}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="all">All</option>
                <option value="practised">Practised</option>
                <option value="unpractised">Unpractised</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        Showing {filtered.length} of {questions.length}
      </p>
      <div className="space-y-3">
        {filtered.map((question) => {
          const itemProgress = progress[question.id]
          const itemStatus = itemProgress?.timesPracticed ? itemProgress.status : "new"
          const isSelected = selected.includes(question.id)
          return (
            <Card
              key={question.id}
              className="rounded-2xl border-border shadow-sm [content-visibility:auto]"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(question.id)}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Remove" : "Add"} question from selected drill`}
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-border bg-background",
                    )}
                  >
                    {isSelected ? (
                      <Check className="size-4" />
                    ) : (
                      <span className="text-xs font-semibold">+</span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      lang="ko"
                      className="break-words text-lg font-semibold leading-relaxed text-foreground"
                    >
                      {question.questionKo}
                    </p>
                    {question.questionEn ? (
                      <details className="mt-1 text-sm text-muted-foreground">
                        <summary className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          Show English
                        </summary>
                        <p className="mt-1">{question.questionEn}</p>
                      </details>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{titleCase(question.difficulty)}</Badge>
                      <Badge variant="outline">{titleCase(question.priority)}</Badge>
                      <Badge variant="outline">{titleCase(itemStatus)}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:flex sm:flex-wrap sm:gap-5">
                      <span>Practised: {itemProgress?.timesPracticed ?? 0}</span>
                      <span>Average: {itemProgress?.avgScore?.toFixed(1) ?? "\u2014"}</span>
                      <span>
                        Last:{" "}
                        {itemProgress?.lastPracticedAt
                          ? new Date(itemProgress.lastPracticedAt).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                    {question.sampleAnswerKo ? (
                      <details className="mt-3 rounded-xl bg-muted/30 p-3 text-sm">
                        <summary className="cursor-pointer font-medium">Show sample answer</summary>
                        <p lang="ko" className="mt-2 leading-relaxed">
                          {question.sampleAnswerKo}
                        </p>
                        {question.sampleAnswerEn ? (
                          <p className="mt-2 text-muted-foreground">{question.sampleAnswerEn}</p>
                        ) : null}
                      </details>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPractice([question])}
                    className="hidden shrink-0 rounded-xl sm:inline-flex"
                  >
                    Practise
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onPractice([question])}
                  className="mt-4 h-10 w-full rounded-xl sm:hidden"
                >
                  Practise this question
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No questions match these filters. Clear one filter or try another keyword.
          </CardContent>
        </Card>
      ) : null}

      {selectedQuestions.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 pl-[max(1rem,env(safe-area-inset-left))] pr-[calc(5rem+env(safe-area-inset-right))] sm:hidden">
          <Button
            onClick={() => onPractice(selectedQuestions)}
            className="h-12 w-full rounded-xl bg-blue-600 text-white shadow-lg"
          >
            Practice selected ({selectedQuestions.length})
          </Button>
        </div>
      ) : null}
    </div>
  )
}
