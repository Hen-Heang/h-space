"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Lightbulb, Loader2, Mic, PencilLine, RotateCcw, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { Textarea } from "@/components/ui/textarea"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { aiPost } from "@/lib/api/ai-client"
import type {
  DailySpeakingAttempt,
  DailySpeakingFeedback,
  DailyStudyPlan,
} from "@/lib/daily-study-plan"
import { dailySpeakingFeedbackSchema } from "@/lib/daily-study-plan-schemas"

export function VoicePractice({
  plan,
  onAttempt,
  onFinished,
}: {
  plan: DailyStudyPlan
  onAttempt: (attempt: DailySpeakingAttempt) => void
  onFinished: () => void
}) {
  const completedIds = useMemo(
    () =>
      new Set(
        plan.attempts
          .filter((attempt) => attempt.successfulRetry)
          .map((attempt) => attempt.questionId),
      ),
    [plan.attempts],
  )
  const firstIncomplete = plan.content.spokenQuestions.findIndex(
    (question) => !completedIds.has(question.id),
  )
  const [index, setIndex] = useState(firstIncomplete < 0 ? 0 : firstIncomplete)
  const [feedback, setFeedback] = useState<DailySpeakingFeedback | null>(null)
  const [retryOf, setRetryOf] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState("")
  const speech = useSpeechRecognition({ lang: "ko-KR", continuous: true })
  const question = plan.content.spokenQuestions[index]

  useEffect(() => {
    speech.reset()
    setFeedback(null)
    setRetryOf(null)
    setShowHint(false)
    setShowAnswer(false)
    setError("")
    // reset is intentionally stable for this question transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  async function evaluate() {
    const answer = speech.transcript.trim()
    if (!answer || !question) {
      setError("Record an answer or type the transcript before checking it.")
      return
    }
    setEvaluating(true)
    setError("")
    try {
      const raw = await aiPost<unknown>("/daily-study-plan/correct", {
        question: question.korean,
        questionMeaning: question.english,
        answer,
        topic: plan.topicLabel,
        register: question.register,
        retryOf,
      })
      const result = dailySpeakingFeedbackSchema.parse(raw)
      const isRetry = retryOf !== null
      const successfulRetry = isRetry && result.communicationSuccessful
      const attempt: DailySpeakingAttempt = {
        id: crypto.randomUUID(),
        questionId: question.id,
        transcript: answer,
        feedback: result,
        retryOf,
        successfulRetry,
        createdAt: new Date().toISOString(),
      }
      onAttempt(attempt)
      setFeedback(result)
      if (!isRetry) setRetryOf(result.correctedAnswer)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check the answer. Try again.")
    } finally {
      setEvaluating(false)
    }
  }

  function stopRecording() {
    speech.stop()
  }

  function prepareRetry() {
    speech.reset()
    setFeedback(null)
    setError("")
  }

  function nextQuestion() {
    if (index >= plan.content.spokenQuestions.length - 1) {
      onFinished()
      return
    }
    setIndex((current) => current + 1)
  }

  if (!question) return null
  const latestAttempt = plan.attempts.filter((attempt) => attempt.questionId === question.id).at(-1)
  const questionComplete = latestAttempt?.successfulRetry ?? false

  return (
    <section aria-labelledby="voice-practice-title" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="voice-practice-title" className="font-semibold">
            Voice role-play
          </h3>
          <p className="text-xs text-muted-foreground">
            Question {index + 1} of {plan.content.spokenQuestions.length} · {question.register}
          </p>
        </div>
        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
          {completedIds.size}/5 retried
        </span>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-xs font-medium text-muted-foreground">
          {plan.content.roleplay.scenario}
        </p>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-keep text-xl font-semibold leading-snug [overflow-wrap:anywhere]">
              {question.korean}
            </p>
            {plan.romanizationVisible && (
              <p className="mt-1 break-words text-xs text-blue-600 dark:text-blue-400">
                {question.romanization}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">{question.english}</p>
          </div>
          <SpeakButton
            text={question.korean}
            instructions="Speak slowly and clearly in natural Korean."
            playbackRate={0.85}
            className="min-h-11 min-w-11 shrink-0"
            title="Play the Korean question slowly"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowHint(true)}>
          <Lightbulb size={15} className="mr-1.5" /> Hint
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!showHint}
          onClick={() => setShowAnswer(true)}
        >
          Show model answer
        </Button>
      </div>
      {showHint && (
        <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          {question.hint}
        </p>
      )}
      {showAnswer && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-muted p-3">
          <p className="break-keep text-sm font-medium [overflow-wrap:anywhere]">
            {question.modelAnswer}
          </p>
          <SpeakButton text={question.modelAnswer} className="min-h-10 min-w-10 shrink-0" />
        </div>
      )}

      {!speech.supported && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-200">
          Speech recognition is unavailable in this browser. You can still type or edit the
          transcript below.
        </p>
      )}
      {(speech.error || error) && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {speech.error || error}
        </p>
      )}

      {!feedback && (
        <div className="space-y-3">
          <label
            htmlFor="daily-voice-transcript"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <PencilLine size={15} /> Transcript (editable)
          </label>
          <Textarea
            id="daily-voice-transcript"
            value={speech.transcript}
            onChange={(event) => speech.setTranscript(event.target.value)}
            placeholder="Your Korean transcript will appear here. You can correct speech-recognition mistakes."
            className="min-h-24 resize-y text-base"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              type="button"
              variant={speech.status === "listening" ? "destructive" : "outline"}
              disabled={!speech.supported || evaluating}
              onClick={speech.status === "listening" ? stopRecording : speech.start}
              className="min-h-11"
            >
              {speech.status === "listening" ? (
                <Square size={16} className="mr-2" />
              ) : (
                <Mic size={16} className="mr-2" />
              )}
              {speech.status === "listening" ? "Stop" : "Record"}
            </Button>
            <Button
              type="button"
              disabled={evaluating || !speech.transcript.trim()}
              onClick={evaluate}
              className="min-h-11"
            >
              {evaluating && <Loader2 size={16} className="mr-2 animate-spin" />}
              {retryOf ? "Check retry" : "Check answer"}
            </Button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2
              className={feedback.communicationSuccessful ? "text-emerald-600" : "text-amber-600"}
              size={20}
            />
            <div>
              <p className="text-sm font-semibold">
                {feedback.communicationSuccessful ? "Meaning understood" : "Try the meaning again"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{feedback.shortExplanation}</p>
            </div>
          </div>
          <FeedbackLine label="You said" value={feedback.originalAnswer} />
          <FeedbackLine label="Corrected answer" value={feedback.correctedAnswer} speak />
          <FeedbackLine label="Natural alternative" value={feedback.naturalAlternative} speak />
          <p className="text-xs text-muted-foreground">
            Feedback covers grammar, meaning, vocabulary and naturalness from the transcript. It is
            not a pronunciation score.
          </p>
          {!questionComplete ? (
            <Button type="button" onClick={prepareRetry} className="w-full min-h-11">
              <RotateCcw size={16} className="mr-2" /> Repeat the complete corrected answer
            </Button>
          ) : (
            <Button type="button" onClick={nextQuestion} className="w-full min-h-11">
              {index === 4 ? "Finish speaking mission" : "Next question"}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

function FeedbackLine({
  label,
  value,
  speak = false,
}: {
  label: string
  value: string
  speak?: boolean
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-1 break-keep text-sm font-medium [overflow-wrap:anywhere]">{value}</p>
        </div>
        {speak && <SpeakButton text={value} className="min-h-10 min-w-10 shrink-0" />}
      </div>
    </div>
  )
}
