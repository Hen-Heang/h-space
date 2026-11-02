"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Ear,
  Eye,
  Headphones,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react"
import { motion } from "motion/react"

import { PageHero } from "@/components/app/page-hero"
import { AnswerInput } from "@/components/interview/AnswerInput"
import { LevelPicker } from "@/components/interview/LevelPicker"
import { ListeningRevealCard } from "@/components/interview/ListeningRevealCard"
import { QuestionAudioBar } from "@/components/interview/QuestionAudioBar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAnswerMode } from "@/hooks/useAnswerMode"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { interviewApi } from "@/lib/api"
import {
  buildDrillQueue,
  DRILL_SIZE,
  LISTENING_LEVELS,
  pickStyleExamples,
  toFallbackEnriched,
  type EnrichedDrillQuestion,
  type ListeningLevel,
} from "@/lib/interview-drills"

const LAST_SESSION_KEY = "kori.drill.listening.last"

interface DrillResult {
  question: EnrichedDrillQuestion
  answer: string
}

interface LastSession {
  finishedAt: string
  level: ListeningLevel
  total: number
  answered: number
}

function loadLastSession(): LastSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(LAST_SESSION_KEY)
    return raw ? (JSON.parse(raw) as LastSession) : null
  } catch {
    return null
  }
}

export default function ListeningDrillPage() {
  const { logActivity } = useLogActivity("interview")
  useSessionTimer("interview")

  const [phase, setPhase] = useState<"setup" | "loading" | "drill" | "summary">("setup")
  const [level, setLevel] = useState<ListeningLevel>("medium")
  const [items, setItems] = useState<EnrichedDrillQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [playsUsed, setPlaysUsed] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<DrillResult[]>([])
  const [usedFallback, setUsedFallback] = useState(false)
  const [isAddingMore, setIsAddingMore] = useState(false)
  const [lastSession, setLastSession] = useState<LastSession | null>(null)
  useScrollToTopOnChange(phase)

  // Continuous capture: the mic stays open across pauses until stopped.
  const speech = useSpeechRecognition({ lang: "ko-KR", continuous: true })
  const answerMode = useAnswerMode(speech)
  const cfg = LISTENING_LEVELS[level]
  const question = items[index]

  useEffect(() => {
    setLastSession(loadLastSession())
  }, [])

  async function startDrill() {
    setPhase("loading")
    setResults([])
    setIndex(0)
    setPlaysUsed(0)
    setRevealed(false)
    setUsedFallback(false)
    speech.reset()
    try {
      const { questions } = await interviewApi.drillQuestions({
        kind: "listening",
        count: DRILL_SIZE,
        complexityHint: cfg.complexityHint,
        styleExamples: pickStyleExamples(),
        avoid: [],
      })
      if (questions.length === 0) throw new Error("empty batch")
      setItems(questions)
    } catch {
      // AI unavailable — the static pool still makes a full drill; the reveal
      // just won't have word notes or a grammar note.
      setItems(buildDrillQueue().map(toFallbackEnriched))
      setUsedFallback(true)
    }
    setPhase("drill")
  }

  function reveal(withAnswer: boolean) {
    if (!question || revealed) return
    const answer = withAnswer
      ? (speech.status === "listening" ? speech.stop() : speech.transcript).trim()
      : ""
    if (!withAnswer && speech.status === "listening") speech.stop()
    setRevealed(true)
    setResults((prev) => [...prev, { question, answer }])
    void logActivity()
  }

  function nextQuestion() {
    speech.reset()
    setRevealed(false)
    setPlaysUsed(0)
    if (index + 1 >= items.length) {
      finishDrill()
      return
    }
    setIndex(index + 1)
  }

  function finishDrill() {
    const summary: LastSession = {
      finishedAt: new Date().toISOString(),
      level,
      total: results.length,
      answered: results.filter((r) => r.answer).length,
    }
    try {
      window.localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(summary))
    } catch {
      // ignore
    }
    setLastSession(summary)
    setPhase("summary")
  }

  // "More like this": append fresh questions and jump back into the drill at
  // the first new item. The avoid list keeps them from repeating this session.
  async function addSimilar() {
    setIsAddingMore(true)
    try {
      const { questions } = await interviewApi.drillQuestions({
        kind: "listening",
        count: 3,
        complexityHint: cfg.complexityHint,
        styleExamples: pickStyleExamples(),
        avoid: items.map((q) => q.ko),
      })
      if (questions.length > 0) {
        const startAt = items.length
        setItems((prev) => [...prev, ...questions])
        setIndex(startAt)
        setPlaysUsed(0)
        setRevealed(false)
        speech.reset()
        setPhase("drill")
      }
    } catch {
      // Route down — stay on the summary quietly.
    } finally {
      setIsAddingMore(false)
    }
  }

  // ── Setup ────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="space-y-6 pb-12 sm:space-y-8">
        <PageHero
          headingLevel="h2"
          eyebrow="Exam Prep · 듣기 드릴"
          title="Listening Drill"
          description="Audio only — understand the interviewer before you ever see the text. Listen, answer out loud, then reveal the transcript with word notes and grammar."
          stats={[
            { label: "Questions", value: String(DRILL_SIZE) },
            { label: "Format", value: "Audio first" },
            {
              label: "Last session",
              value: lastSession ? `${lastSession.answered}/${lastSession.total}` : "—",
            },
          ]}
          actions={
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-border bg-background px-4 font-bold hover:bg-accent"
            >
              <Link href="/interview">
                <ArrowLeft size={16} className="mr-2" /> Mock Interview
              </Link>
            </Button>
          }
        />

        <LevelPicker value={level} onChange={setLevel} />

        <div className="flex justify-center">
          <Button
            onClick={startDrill}
            className="h-14 w-full rounded-2xl bg-violet-600 px-10 text-base font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-95 sm:w-auto"
          >
            <Headphones size={20} className="mr-2" /> Start Listening Drill
          </Button>
        </div>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-violet-600" />
        <p className="text-sm font-bold text-muted-foreground">
          Preparing your {cfg.label.toLowerCase()} drill…
        </p>
      </div>
    )
  }

  // ── Summary ──────────────────────────────────────────────────────
  if (phase === "summary") {
    const answered = results.filter((r) => r.answer).length
    return (
      <div className="space-y-5 pb-12 sm:space-y-6">
        <PageHero
          headingLevel="h2"
          eyebrow={`Listening Drill · ${cfg.label} · Result`}
          title="Drill Complete"
          description="Replay anything you missed and read the transcripts aloud once — hearing it, then saying it, is what makes it stick."
          stats={[
            { label: "Questions", value: String(results.length) },
            { label: "Answered aloud", value: String(answered) },
            { label: "Level", value: cfg.label },
          ]}
        />

        {results.map((r, i) => (
          <ListeningRevealCard
            key={`${r.question.ko}-${i}`}
            question={r.question}
            showEnglish={cfg.showEnglishOnReveal}
            userAnswer={r.answer || undefined}
          />
        ))}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={addSimilar}
            disabled={isAddingMore}
            className="h-14 w-full rounded-2xl bg-violet-600 px-8 text-base font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-60 sm:w-auto"
          >
            {isAddingMore ? (
              <>
                <Loader2 size={20} className="mr-2 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Plus size={20} className="mr-2" /> Add 3 Similar Questions
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setPhase("setup")}
            className="h-14 w-full rounded-2xl border-border bg-background px-8 text-base font-bold hover:bg-accent active:scale-95 sm:w-auto"
          >
            <RotateCcw size={20} className="mr-2" /> New Drill
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-14 w-full rounded-2xl border-border bg-background px-8 text-base font-bold hover:bg-accent active:scale-95 sm:w-auto"
          >
            <Link href="/interview">
              <ArrowLeft size={20} className="mr-2" /> Back
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Drill ────────────────────────────────────────────────────────
  // Before reveal, the question exists ONLY as audio — no Korean text renders.
  return (
    <div className="space-y-5 pb-12 sm:space-y-6">
      <PageHero
        headingLevel="h2"
        eyebrow={`Listening Drill · ${cfg.label}`}
        title={`Question ${index + 1} of ${items.length}`}
        description="Listen carefully, then answer out loud — or just reveal if you only want to train comprehension."
        stats={[
          { label: "Question", value: `${index + 1}/${items.length}` },
          { label: "Level", value: cfg.label },
          { label: "Revealed", value: String(results.length) },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={finishDrill}
            className="h-10 rounded-xl border-border bg-background px-4 font-bold hover:bg-accent"
          >
            End drill
          </Button>
        }
      />

      {usedFallback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium leading-relaxed text-foreground/90">
            AI question generation is unavailable — drilling from the prepared question pool. Word
            notes and grammar tips are off for this session.
          </p>
        </motion.div>
      )}

      {/* Audio-only question */}
      <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
              <Ear size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Listen to the question</p>
              <p className="text-xs font-medium text-muted-foreground">
                {cfg.maxPlays === null
                  ? "Play it as many times as you need."
                  : `You get ${cfg.maxPlays} listen${cfg.maxPlays === 1 ? "" : "s"} — make ${cfg.maxPlays === 1 ? "it" : "them"} count.`}
              </p>
            </div>
          </div>
          <QuestionAudioBar
            text={question?.ko ?? ""}
            allowSlow={cfg.allowSlowReplay}
            maxPlays={cfg.maxPlays}
            playsUsed={playsUsed}
            onPlayed={() => setPlaysUsed((n) => n + 1)}
            onPlaybackEnded={() => {
              // Hands-free only when voice is the chosen, working path.
              if (!revealed && speech.status !== "listening" && answerMode.canAutoListen) {
                speech.start()
              }
            }}
            autoPlayOnMount
          />
        </CardContent>
      </Card>

      {revealed && question ? (
        <>
          <ListeningRevealCard
            question={question}
            showEnglish={cfg.showEnglishOnReveal}
            userAnswer={results[results.length - 1]?.answer || undefined}
          />
          <Button
            onClick={nextQuestion}
            className="h-12 w-full rounded-2xl bg-foreground px-6 text-sm font-bold text-background shadow-lg transition-all active:scale-95 sm:h-14"
          >
            {index + 1 >= items.length ? (
              <>
                <Award size={18} className="mr-2" /> See Session Summary
              </>
            ) : (
              <>
                <ArrowRight size={18} className="mr-2" /> Next Question
              </>
            )}
          </Button>
        </>
      ) : (
        <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <AnswerInput
              speech={speech}
              mode={answerMode}
              placeholder="Type what you'd answer — or what you heard…"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => reveal(true)}
                disabled={!speech.transcript.trim()}
                className="h-12 w-full rounded-2xl bg-violet-600 px-6 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-40 sm:h-14"
              >
                <Eye size={18} className="mr-2" /> Reveal & Compare
              </Button>
              <Button
                variant="outline"
                onClick={() => reveal(false)}
                className="h-12 w-full rounded-2xl border-border bg-background px-6 text-sm font-bold hover:bg-accent active:scale-95 sm:h-14"
              >
                Just Reveal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
