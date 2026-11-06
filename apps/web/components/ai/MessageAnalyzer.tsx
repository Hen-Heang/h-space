"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Activity,
  BookmarkPlus,
  Check,
  ChevronDown,
  Copy,
  Eye,
  Lightbulb,
  ScanText,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { PageHero } from "@/components/app/page-hero"
import { SaveToPhrasebookDialog } from "@/components/ai/analyzer/SaveToPhrasebookDialog"
import { ReplyAttempt, type ReplyAttemptInput } from "@/components/learn/work/ReplyAttempt"
import { ReplyFeedback, type ReplyFeedbackValue } from "@/components/learn/work/ReplyFeedback"
import { WorkContextSummary } from "@/components/learn/work/WorkContextSummary"
import { RevealText } from "@/components/phrasebook/RevealText"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ErrorBanner } from "@/components/ui/error-banner"
import { Label } from "@/components/ui/label"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useCopy } from "@/hooks/useCopy"
import { useLogActivity } from "@/hooks/useLogActivity"
import { useRomanizationPreference } from "@/hooks/useRomanizationPreference"
import { analyzerApi, correctionApi, getApiErrorMessage } from "@/lib/api"
import type { PartialAnalyzerResult } from "@/lib/api/learning"
import {
  SENSITIVE_KIND_LABEL,
  buildWorkCardDraft,
  detectSensitiveText,
  replaceSensitive,
} from "@/lib/korean-phrasebook/work"
import { containerVariants, itemVariants } from "@/lib/motion"
import type { MessageAnalysis } from "@/lib/types"
import { cn } from "@/lib/utils"

const sources = ["Slack", "KakaoTalk", "Meeting notes", "Team chat", "Other"]

const MAX_CHARS = 2000

const starterPrompts = [
  "담당자분께 전달드렸습니다. 확인 후 회신 부탁드립니다.",
  "이번 배포 건은 QA 끝나고 진행하는 게 좋을 것 같습니다.",
  "이 부분은 기존이랑 동일하게 처리해 주시면 됩니다. 확인 부탁드려요.",
  "해당 이슈는 제가 보고 있는데, 재현이 잘 안 되네요. 혹시 로그 공유 가능하실까요?",
]

/** Streamed partial → display shape. Missing fields stay empty, never invented. */
function viewFromPartial(partial: PartialAnalyzerResult | null): Partial<MessageAnalysis> {
  if (!partial) return {}
  const strings = (list?: Array<string | undefined>) =>
    (list ?? []).filter((v): v is string => typeof v === "string" && v.length > 0)
  return {
    mainPoint: partial.mainPoint ?? "",
    requiredAction: partial.requiredAction ?? "",
    conditions: strings(partial.conditions),
    deadline: partial.deadline ?? "",
    expectedResult: partial.expectedResult ?? "",
    unknowns: strings(partial.unknowns),
    clarifyingQuestion: partial.clarifyingQuestion ?? "",
  }
}

export function MessageAnalyzer() {
  const reduceMotion = useReducedMotion()
  const romanizationPreference = useRomanizationPreference()
  const [text, setText] = useState("")
  const [source, setSource] = useState<string | null>(null)
  const [saveHistory, setSaveHistory] = useState(false)
  const [result, setResult] = useState<MessageAnalysis | null>(null)
  const [partial, setPartial] = useState<PartialAnalyzerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showReply, setShowReply] = useState(false)
  const [practice, setPractice] = useState<ReplyFeedbackValue | null>(null)
  const [practiceBusy, setPracticeBusy] = useState(false)
  const [practiceError, setPracticeError] = useState("")
  const [practiceKey, setPracticeKey] = useState(0)
  const [saveOpen, setSaveOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { copied, copy } = useCopy(2000)
  const { logActivity } = useLogActivity("chat")

  // Leaving the page cancels an analysis in flight.
  useEffect(() => () => abortRef.current?.abort(), [])

  const findings = useMemo(() => detectSensitiveText(text), [text])
  const replaceable = findings.some((f) => f.replaceable)

  function resetResult() {
    setResult(null)
    setPartial(null)
    setShowReply(false)
    setPractice(null)
    setPracticeError("")
    setPracticeKey((k) => k + 1)
  }

  async function handleAnalyze() {
    const payload = text.trim()
    if (!payload || loading) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError("")
    resetResult()
    try {
      // `payload` is exactly what's in the editable box above — the preview
      // is the request body.
      const data = await analyzerApi.analyze(payload, source ?? undefined, setPartial, {
        signal: controller.signal,
        saveHistory,
      })
      if (controller.signal.aborted) return
      setResult(data)
      void logActivity()
    } catch (err) {
      if (controller.signal.aborted) return
      setError(getApiErrorMessage(err, "Failed to analyze the message. Please try again."))
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }

  function handleCancel() {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setPartial(null)
  }

  function handleClear() {
    handleCancel()
    setText("")
    setError("")
    resetResult()
  }

  async function checkPractice(input: ReplyAttemptInput) {
    if (!result) return
    setPracticeBusy(true)
    setPracticeError("")
    try {
      // Meaningful mistakes are saved to the correction notebook (deduped by
      // fingerprint) by correctionApi.check, like every manual check.
      const checked = await correctionApi.check(input.korean, {
        intendedMeaning: input.intendedMeaning,
        replyingTo: result.originalText,
      })
      setPractice({
        submitted: input.korean,
        meaningPreserved: input.intendedMeaning ? (checked.meaningPreserved ?? null) : null,
        meaningNote: checked.meaningNote ?? null,
        communicated: !checked.hasErrors || checked.rating >= 3,
        corrected: checked.correctedText,
        explanation: checked.explanation ?? null,
        pattern: checked.pattern ?? null,
        inputMethod: input.inputMethod,
      })
      setShowReply(true)
    } catch (err) {
      setPracticeError(getApiErrorMessage(err, "Couldn't check your reply. Please try again."))
    } finally {
      setPracticeBusy(false)
    }
  }

  const view: Partial<MessageAnalysis> = result ?? viewFromPartial(partial)
  const complete = result != null
  const reply = result?.recommendedReply
  const showRomanization = romanizationPreference !== "never"
  const hasWorkFields = Boolean(view.mainPoint || view.requiredAction)

  return (
    <motion.div
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={reduceMotion ? undefined : containerVariants}
      className="space-y-6 pb-12 sm:space-y-7"
    >
      <motion.div variants={reduceMotion ? undefined : itemVariants}>
        <PageHero
          eyebrow="Workplace Analyzer"
          title="Understand a work message"
          description="Paste a message from a coworker. See the main point and what you need to do first, then a short reply to practice, then the details."
          variant="compact"
        />
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="min-w-0 space-y-5">
          {/* ── Input: the editable box is exactly what gets sent ─────────── */}
          <section aria-labelledby="analyzer-input-heading" className="app-surface overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <ScanText aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <h2 id="analyzer-input-heading" className="text-base font-semibold text-foreground">
                  Message to analyze
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="size-11 text-muted-foreground hover:text-destructive"
                aria-label="Clear the message"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <div
              className="flex flex-wrap gap-2 border-b border-border/60 px-4 py-3 sm:px-5"
              role="group"
              aria-label="Where it came from (optional)"
            >
              {sources.map((s) => {
                const active = source === s
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSource(active ? null : s)}
                    className={cn(
                      "min-h-11 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s}
                  </button>
                )
              })}
            </div>

            <Label htmlFor="analyzer-text" className="sr-only">
              Korean message
            </Label>
            <Textarea
              id="analyzer-text"
              lang="ko"
              className="min-h-[160px] w-full resize-none rounded-none border-0 bg-transparent p-4 text-base leading-7 shadow-none focus-visible:ring-0 sm:min-h-[200px] sm:p-5"
              placeholder="예: 담당자분께 전달드렸습니다. 확인 후 회신 부탁드립니다."
              value={text}
              maxLength={MAX_CHARS}
              onChange={(e) => setText(e.target.value)}
              aria-describedby="analyzer-privacy"
            />

            {findings.length > 0 && (
              <div
                className="mx-4 mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:mx-5"
                role="status"
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <ShieldAlert aria-hidden="true" className="size-4 text-amber-600" />
                  This may include private details
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {findings.slice(0, 8).map((f) => (
                    <li
                      key={`${f.kind}:${f.match}`}
                      className="max-w-full truncate rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {SENSITIVE_KIND_LABEL[f.kind]}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {replaceable && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      onClick={() => setText(replaceSensitive(text))}
                    >
                      Replace with placeholders
                    </Button>
                  )}
                  {findings.some((f) => !f.replaceable) && (
                    <span className="text-xs text-muted-foreground">
                      Rewrite code or SQL in your own words.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3 border-t border-border/60 px-4 py-3 sm:px-5">
              <p id="analyzer-privacy" className="text-xs leading-relaxed text-muted-foreground">
                The text in the box is sent to H-Space&apos;s AI provider (OpenAI) to analyze it.
                Edit out names, links, IDs and code you don&apos;t want to share — the check above
                can miss things. Nothing is fetched from links.
              </p>
              <div className="flex items-center gap-2.5">
                <Switch
                  id="analyzer-history"
                  checked={saveHistory}
                  onCheckedChange={setSaveHistory}
                />
                <Label htmlFor="analyzer-history" className="text-sm font-normal text-foreground">
                  Keep this message in my analyzer history
                </Label>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  {text.trim().length}/{MAX_CHARS} characters
                </span>
                {loading ? (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="h-11 w-full sm:w-auto"
                  >
                    <Square aria-hidden="true" className="size-4" /> Stop
                  </Button>
                ) : (
                  <Button
                    onClick={() => void handleAnalyze()}
                    disabled={!text.trim()}
                    className="h-11 w-full sm:w-auto"
                  >
                    <Sparkles aria-hidden="true" className="size-4" /> Analyze message
                  </Button>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="space-y-2">
              <ErrorBanner>{error}</ErrorBanner>
              <Button
                variant="outline"
                onClick={() => void handleAnalyze()}
                disabled={!text.trim()}
              >
                Try again
              </Button>
            </div>
          )}

          {(loading || complete) && (
            <div className="space-y-5" aria-busy={loading}>
              {/* 1–2. Main point + what to do ─────────────────────────────── */}
              <section
                aria-labelledby="analysis-main-heading"
                className="app-surface space-y-4 p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2
                    id="analysis-main-heading"
                    className="text-base font-semibold text-foreground"
                  >
                    What it means
                  </h2>
                  {loading && (
                    <span
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      role="status"
                    >
                      <Activity aria-hidden="true" className="size-3.5 animate-pulse" /> Analyzing…
                    </span>
                  )}
                </div>
                {hasWorkFields ? (
                  <WorkContextSummary context={view} />
                ) : complete ? (
                  // A result from before the main-point fields existed.
                  <p className="text-base leading-7 text-foreground">{result?.naturalMeaning}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Reading the message…</p>
                )}
              </section>

              {complete && result && (
                <>
                  {/* 3. My reply ─────────────────────────────────────────── */}
                  {reply?.korean && (
                    <section
                      aria-labelledby="analysis-reply-heading"
                      className="app-surface space-y-3 p-4 sm:p-5"
                    >
                      <h2
                        id="analysis-reply-heading"
                        className="text-base font-semibold text-foreground"
                      >
                        My reply
                      </h2>
                      {showReply ? (
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              lang="ko"
                              className="min-w-0 break-keep text-lg font-semibold leading-8 text-foreground [overflow-wrap:anywhere]"
                            >
                              {reply.korean}
                            </p>
                            <div className="flex shrink-0 gap-1.5">
                              <SpeakButton
                                text={reply.korean}
                                className="size-11"
                                title="Listen to the reply"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="size-11"
                                onClick={() => copy(reply.korean, 0)}
                                aria-label={copied === 0 ? "Copied" : "Copy the reply"}
                              >
                                {copied === 0 ? (
                                  <Check aria-hidden="true" className="size-4" />
                                ) : (
                                  <Copy aria-hidden="true" className="size-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {showRomanization && (
                            <RevealText
                              label="romanization"
                              value={reply.romanization}
                              initiallyVisible={romanizationPreference === "always"}
                              textClassName="text-sm italic text-muted-foreground"
                            />
                          )}
                          <p className="text-sm text-muted-foreground">{reply.english}</p>
                          <p className="text-xs text-muted-foreground">
                            {reply.register === "formal"
                              ? "합니다체 — formal and polite"
                              : "해요체 — polite"}{" "}
                            · AI-suggested, check it says what you mean.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Try writing your own reply below first — or look now.
                          </p>
                          <Button
                            variant="outline"
                            className="h-11"
                            onClick={() => setShowReply(true)}
                          >
                            <Eye aria-hidden="true" className="size-4" /> Show the suggested reply
                          </Button>
                        </div>
                      )}
                    </section>
                  )}

                  {/* 4. Useful language ──────────────────────────────────── */}
                  {(result.usefulLanguage?.length ?? 0) > 0 && (
                    <section
                      aria-labelledby="analysis-language-heading"
                      className="app-surface p-4 sm:p-5"
                    >
                      <h2
                        id="analysis-language-heading"
                        className="text-base font-semibold text-foreground"
                      >
                        Useful language
                      </h2>
                      <ul className="mt-3 divide-y divide-border/60">
                        {result.usefulLanguage!.map((item) => (
                          <li
                            key={item.korean}
                            className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p lang="ko" className="text-base font-semibold text-foreground">
                                {item.korean}
                              </p>
                              <p className="text-sm text-foreground">{item.english}</p>
                              {item.note && (
                                <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                              )}
                            </div>
                            <SpeakButton
                              text={item.korean.replace(/~/g, "")}
                              className="size-11 shrink-0"
                              title={`Listen to ${item.korean}`}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* 5. Practice this ────────────────────────────────────── */}
                  <section
                    aria-labelledby="analysis-practice-heading"
                    className="app-surface space-y-3 p-4 sm:p-5"
                  >
                    <div>
                      <h2
                        id="analysis-practice-heading"
                        className="text-base font-semibold text-foreground"
                      >
                        Practice this
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Write a 1–3 sentence reply. Add what you mean in English and the check keeps
                        your meaning — it won&apos;t turn “I will test” into “I tested”.
                      </p>
                    </div>
                    {practice ? (
                      <>
                        <ReplyFeedback value={practice} />
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => {
                            setPractice(null)
                            setPracticeKey((k) => k + 1)
                          }}
                        >
                          Try another reply
                        </Button>
                      </>
                    ) : (
                      <ReplyAttempt
                        key={practiceKey}
                        onSubmit={checkPractice}
                        busy={practiceBusy}
                      />
                    )}
                    {practiceError && (
                      <p role="alert" className="text-sm font-medium text-destructive">
                        {practiceError}
                      </p>
                    )}
                  </section>

                  {/* Save ─────────────────────────────────────────────────── */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      className="h-11"
                      onClick={() => setSaveOpen(true)}
                      disabled={!reply?.korean}
                    >
                      <BookmarkPlus aria-hidden="true" className="size-4" /> Save to Phrasebook
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      You&apos;ll review the card before anything is saved.
                    </p>
                  </div>

                  {/* 6. Details (collapsed) ──────────────────────────────── */}
                  <Collapsible className="app-surface">
                    <CollapsibleTrigger className="group flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5">
                      Details: translation, grammar and politeness
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-5 border-t border-border/60 p-4 sm:p-5">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-muted-foreground">Original</p>
                          <SpeakButton
                            text={result.originalText}
                            className="size-11 shrink-0"
                            title="Listen to the message"
                          />
                        </div>
                        <p
                          lang="ko"
                          className="break-keep text-base leading-7 text-foreground [overflow-wrap:anywhere]"
                        >
                          {result.originalText}
                        </p>
                        {showRomanization && result.messageRomanization && (
                          <RevealText
                            label="romanization"
                            value={result.messageRomanization}
                            initiallyVisible={romanizationPreference === "always"}
                            className="mt-1"
                            textClassName="text-sm italic text-muted-foreground"
                          />
                        )}
                      </div>
                      <dl className="grid gap-4 text-sm sm:grid-cols-2">
                        <DetailItem label="Literal translation" value={result.literalMeaning} />
                        <DetailItem label="Natural meaning" value={result.naturalMeaning} />
                        <DetailItem
                          label="Likely interpretation (not stated)"
                          value={result.businessContext}
                        />
                        <DetailItem label="Politeness" value={result.politenessLevel} />
                        <DetailItem label="Tone" value={result.tone} />
                        <DetailItem
                          label="Source"
                          value={`${result.source ?? "Not set"} · ${saveHistory && result.id ? "kept in history" : "not saved"}`}
                        />
                      </dl>
                      {result.breakdown.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Key phrases</p>
                          <ul className="mt-2 space-y-2">
                            {result.breakdown.map((item, i) => (
                              <li
                                key={`${item.fragment}-${i}`}
                                className="rounded-lg border border-border p-3"
                              >
                                <p className="text-sm">
                                  <span lang="ko" className="font-semibold text-foreground">
                                    {item.fragment}
                                  </span>{" "}
                                  <span className="text-muted-foreground">— {item.meaning}</span>
                                </p>
                                {item.note && (
                                  <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.suggestedReplies.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Other replies</p>
                          <ul className="mt-2 space-y-2">
                            {result.suggestedReplies.map((alt, i) => (
                              <li
                                key={`${alt.korean}-${i}`}
                                className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
                              >
                                <div className="min-w-0">
                                  <p lang="ko" className="text-base text-foreground">
                                    {alt.korean}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {alt.english}
                                    {alt.formality && ` · ${alt.formality}`}
                                  </p>
                                </div>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-11 shrink-0"
                                  onClick={() => copy(alt.korean, i + 1)}
                                  aria-label={copied === i + 1 ? "Copied" : "Copy this reply"}
                                >
                                  {copied === i + 1 ? (
                                    <Check aria-hidden="true" className="size-4" />
                                  ) : (
                                    <Copy aria-hidden="true" className="size-4" />
                                  )}
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Side: how to use + samples ──────────────────────────────────── */}
        <aside className="space-y-5" aria-label="Help">
          <section className="app-surface p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lightbulb aria-hidden="true" className="size-4 text-primary" /> How it works
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Paste one message and remove anything private.</li>
              <li>Read the main point and what you need to do.</li>
              <li>Try your own reply, then compare with the suggestion.</li>
              <li>Save it to practice in today&apos;s plan.</li>
            </ol>
            <Link
              href="/phrasebook/practice?mode=work"
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Practice work replies →
            </Link>
          </section>

          <section className="px-1">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Try a sample
            </h2>
            <div className="grid gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  lang="ko"
                  onClick={() => setText(prompt)}
                  className="min-h-11 rounded-xl border border-border bg-card p-3 text-left text-sm leading-relaxed text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {saveOpen && result && (
        <SaveToPhrasebookDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          initialDraft={buildWorkCardDraft(result, { sourceLabel: source })}
        />
      )}
    </motion.div>
  )
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 leading-relaxed text-foreground">{value}</dd>
    </div>
  )
}
