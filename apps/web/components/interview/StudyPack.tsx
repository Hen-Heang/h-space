"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Eye,
  Headphones,
  MessageCircleQuestion,
  Quote,
  Sparkles,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { SpeakButton } from "@/components/ui/SpeakButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { InterviewTopic, PhraseEntry, PracticeQuestion, VocabEntry } from "@/lib/interview"
import { cn } from "@/lib/utils"

// Topic course for the chosen exam prompt. The three tabs deliberately mirror
// the practice loop: learn the words, build a short answer, then recognize the
// same questions by ear before moving to the full drills.
export function StudyPack({
  topic,
  defaultOpen = false,
}: {
  topic: InterviewTopic
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [vocabLevel, setVocabLevel] = useState<"core" | "stretch">("core")
  const prep = topic.prep
  if (!prep) return null

  const coreVocabulary = prep.vocabulary.filter((item) => item.priority === "core")
  const stretchVocabulary = prep.vocabulary.filter((item) => item.priority !== "core")
  const visibleVocabulary = vocabLevel === "core" ? coreVocabulary : stretchVocabulary
  const modelQuestions = prep.sampleQuestions.filter((question) => question.answerKo)

  return (
    <Card className="rounded-[1.8rem] border-border bg-card shadow-xl dark:bg-slate-900/40 sm:rounded-[2.2rem]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-5 text-left sm:px-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <BookOpen size={20} strokeWidth={2.5} />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Exam Topic Course</CardTitle>
            <p className="text-xs font-medium text-muted-foreground">
              Core vocabulary, short model answers, and audio-first questions.
            </p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="border-t border-border/80 pt-6">
              <Tabs defaultValue="vocabulary" className="gap-5">
                <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted/70 p-1">
                  <TabsTrigger
                    value="vocabulary"
                    className="h-10 rounded-xl text-xs font-bold sm:text-sm"
                  >
                    <BookOpen /> Vocabulary
                  </TabsTrigger>
                  <TabsTrigger
                    value="speaking"
                    className="h-10 rounded-xl text-xs font-bold sm:text-sm"
                  >
                    <Quote /> Speaking
                  </TabsTrigger>
                  <TabsTrigger
                    value="listening"
                    className="h-10 rounded-xl text-xs font-bold sm:text-sm"
                  >
                    <Headphones /> Listening
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="vocabulary" className="space-y-5">
                  <PracticeIntro
                    tone="amber"
                    title="Final script vocabulary"
                    text="Master these 18 words first. They match your final interview script. Open the Stretch deck only after you can say the Core examples without reading."
                  />

                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1 sm:w-fit sm:min-w-80">
                    <DeckButton
                      active={vocabLevel === "core"}
                      onClick={() => setVocabLevel("core")}
                      label={`Core · ${coreVocabulary.length}`}
                    />
                    <DeckButton
                      active={vocabLevel === "stretch"}
                      onClick={() => setVocabLevel("stretch")}
                      label={`Stretch · ${stretchVocabulary.length}`}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleVocabulary.map((item) => (
                      <VocabCard key={item.term} item={item} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="speaking" className="space-y-7">
                  <PracticeIntro
                    tone="blue"
                    title="Build a 2–3 sentence answer"
                    text="Answer the question directly, add one reason or personal example, then stop. Shadow each model once and replace its details with your real experience."
                  />

                  {prep.answerFrames && prep.answerFrames.length > 0 && (
                    <section>
                      <SectionLabel icon={<Sparkles size={13} strokeWidth={3} />} color="blue">
                        Six reusable answer frames
                      </SectionLabel>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {prep.answerFrames.map((frame) => (
                          <div
                            key={frame.label}
                            className="rounded-2xl border border-border bg-accent/5 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-foreground">{frame.label}</p>
                              <Badge variant="outline" className="rounded-lg text-[10px]">
                                {frame.useFor}
                              </Badge>
                            </div>
                            <p className="mt-3 font-bold leading-relaxed text-blue-600 dark:text-blue-400">
                              {frame.patternKo}
                            </p>
                            <p className="mt-1 text-xs font-medium text-muted-foreground">
                              {frame.patternEn}
                            </p>
                            <div className="mt-3 flex items-start justify-between gap-2 rounded-xl bg-background/80 p-3">
                              <div>
                                <p className="text-sm font-bold leading-relaxed">
                                  {frame.exampleKo}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                  {frame.exampleEn}
                                </p>
                              </div>
                              <SpeakButton
                                text={frame.exampleKo}
                                className="shrink-0"
                                title="Hear the model sentence"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <SectionLabel
                      icon={<MessageCircleQuestion size={13} strokeWidth={3} />}
                      color="blue"
                    >
                      Model Q&amp;A · {modelQuestions.length} answers
                    </SectionLabel>
                    <div className="mt-3 space-y-3">
                      {modelQuestions.map((question, index) => (
                        <SpeakingAnswerCard
                          key={question.ko}
                          question={question}
                          number={index + 1}
                        />
                      ))}
                    </div>
                  </section>

                  <section>
                    <SectionLabel icon={<Quote size={13} strokeWidth={3} />} color="emerald">
                      Key phrases
                    </SectionLabel>
                    <div className="mt-3 space-y-2">
                      {prep.keyPhrases.map((entry) => (
                        <PhraseRow key={entry.ko} entry={entry} />
                      ))}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="listening" className="space-y-5">
                  <PracticeIntro
                    tone="violet"
                    title="Hear the question before you read it"
                    text="Play each card once, say the words you recognized, and answer aloud. Reveal the transcript only after your attempt."
                  />

                  <Button
                    asChild
                    className="h-11 w-full rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-700 sm:w-auto"
                  >
                    <Link href="/interview/listening">
                      <Headphones size={17} className="mr-2" /> Open listening practice
                    </Link>
                  </Button>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {prep.sampleQuestions.map((question, index) => (
                      <ListeningQuestionCard
                        key={question.ko}
                        question={question}
                        number={index + 1}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {prep.sources && prep.sources.length > 0 && (
                <section className="mt-8 border-t border-border pt-6">
                  <SectionLabel icon={<ExternalLink size={13} strokeWidth={3} />} color="slate">
                    Research basis
                  </SectionLabel>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">
                    The exam format and personal topic come from your prep document. Weather,
                    health, culture, and learning vocabulary were checked against these external
                    references.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {prep.sources.map((source) => (
                      <a
                        key={`${source.publisher}-${source.title}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group rounded-2xl border border-border bg-accent/5 p-3 transition-colors hover:bg-accent/20"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {source.publisher}
                            </p>
                            <p className="mt-1 text-sm font-bold leading-snug text-foreground">
                              {source.title}
                            </p>
                          </div>
                          <ExternalLink
                            size={14}
                            className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                          />
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {source.usedFor}
                        </p>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function PracticeIntro({
  tone,
  title,
  text,
}: {
  tone: "amber" | "blue" | "violet"
  title: string
  text: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "amber" && "border-amber-500/20 bg-amber-500/5",
        tone === "blue" && "border-blue-500/20 bg-blue-500/5",
        tone === "violet" && "border-violet-500/20 bg-violet-500/5",
      )}
    >
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

function DeckButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 rounded-xl px-3 text-xs font-bold transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  )
}

function VocabCard({ item }: { item: VocabEntry }) {
  return (
    <div className="rounded-2xl border border-border bg-accent/5 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-foreground">{item.term}</p>
            {item.priority === "core" && (
              <Badge className="rounded-md border-0 bg-amber-500/10 px-1.5 py-0 text-[9px] text-amber-700 dark:text-amber-400">
                CORE
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{item.meaning}</p>
        </div>
        <SpeakButton text={item.term} className="shrink-0" />
      </div>
      {item.exampleKo && (
        <div className="mt-3 flex items-start justify-between gap-2 border-t border-border/70 pt-3">
          <div>
            <p className="text-sm font-bold leading-relaxed text-foreground">{item.exampleKo}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.exampleEn}</p>
          </div>
          <SpeakButton
            text={item.exampleKo}
            className="shrink-0"
            title="Hear the example sentence"
          />
        </div>
      )}
    </div>
  )
}

function SpeakingAnswerCard({ question, number }: { question: PracticeQuestion; number: number }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="rounded-2xl border border-border bg-accent/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-[11px] font-bold text-blue-600">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold leading-relaxed text-foreground">{question.ko}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{question.en}</p>
            </div>
            <SpeakButton
              text={question.ko}
              className="shrink-0"
              title="Hear the interview question"
            />
          </div>

          {question.keywords && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {question.keywords.map((keyword) => (
                <Badge key={keyword} variant="outline" className="rounded-lg text-[10px] font-bold">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            className="mt-3 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
          >
            {revealed ? "Hide model answer" : "Try aloud, then show model answer"}
          </button>

          {revealed && question.answerKo && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-background p-3">
              <div>
                <p className="text-sm font-bold leading-relaxed text-foreground">
                  {question.answerKo}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {question.answerEn}
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Shadow once, then replace the details with your real answer.
                </p>
              </div>
              <SpeakButton
                text={question.answerKo}
                className="shrink-0"
                title="Hear the model answer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ListeningQuestionCard({
  question,
  number,
}: {
  question: PracticeQuestion
  number: number
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">
            Question {number} · Audio only
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Listen once and answer before revealing.
          </p>
        </div>
        <SpeakButton
          text={question.ko}
          className="h-10 w-10 shrink-0 bg-violet-500/10 text-violet-600 hover:bg-violet-500/20"
          title="Play the hidden question"
        />
      </div>

      {revealed ? (
        <div className="mt-4 border-t border-violet-500/15 pt-3">
          <p className="font-bold leading-relaxed text-foreground">{question.ko}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{question.en}</p>
          {question.keywords && (
            <p className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-400">
              Listen for: {question.keywords.join(" · ")}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-violet-500/20 py-5 text-center text-xs font-bold text-muted-foreground">
          Transcript hidden
        </div>
      )}

      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:underline dark:text-violet-400"
      >
        <Eye size={13} /> {revealed ? "Hide transcript" : "Reveal transcript"}
      </button>
    </div>
  )
}

function SectionLabel({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode
  color: "amber" | "emerald" | "blue" | "slate"
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-md",
          color === "amber" && "bg-amber-500/10 text-amber-600",
          color === "emerald" && "bg-emerald-500/10 text-emerald-600",
          color === "blue" && "bg-blue-500/10 text-blue-600",
          color === "slate" && "bg-slate-500/10 text-slate-600 dark:text-slate-400",
        )}
      >
        {icon}
      </span>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {children}
      </p>
    </div>
  )
}

function PhraseRow({ entry }: { entry: PhraseEntry }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-accent/5 px-3 py-3">
      <div className="min-w-0">
        <p className="font-bold leading-snug text-foreground">{entry.ko}</p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">{entry.en}</p>
      </div>
      <SpeakButton text={entry.ko} className="mt-0.5 shrink-0" />
    </div>
  )
}
