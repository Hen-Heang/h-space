import { countdownLabel, type DateCountdown } from "@/lib/exam-prep-home"
import type { InterviewTopic } from "@/lib/interview"

/**
 * The Exam Prep home's one-line context: the topic, the exam date, and the
 * script deadline. Not a heading — the shell header renders the page's h1.
 */
export function ExamHomeHeader({
  topic,
  examLabel,
  exam,
  scriptDueLabel,
  scriptDue,
}: {
  topic: Pick<InterviewTopic, "labelKo" | "label">
  examLabel: string
  exam: DateCountdown
  scriptDueLabel: string
  scriptDue: DateCountdown
}) {
  return (
    <div className="space-y-1">
      <p lang="ko" className="break-keep text-lg font-semibold leading-snug text-foreground">
        {topic.labelKo}
      </p>
      <p className="text-xs text-muted-foreground sm:text-sm">{topic.label}</p>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">Exam {examLabel}</span> ·{" "}
          {countdownLabel(exam)}
        </span>
        {/* Separator only when both fit on one line; on phones they stack. */}
        <span aria-hidden="true" className="hidden sm:inline">
          ·
        </span>
        <span>
          <span className="font-medium text-foreground">Script due {scriptDueLabel}</span> ·{" "}
          {countdownLabel(scriptDue)}
        </span>
      </p>
    </div>
  )
}
