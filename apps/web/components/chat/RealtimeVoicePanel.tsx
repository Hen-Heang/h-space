"use client"

import Image from "next/image"
import { memo, useEffect, useRef, useState, type FC } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import {
  AudioLines,
  Captions,
  Lightbulb,
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  RealtimeVoicePhase,
  RealtimeVoiceTurn,
  VoiceCorrection,
} from "@/hooks/useRealtimeVoice"
import { translateApi } from "@/lib/api"
import { pickPrimaryMistake } from "@/lib/realtime/correction-policy"
import {
  englishAllowed,
  koreanCaptionsVisible,
  type CaptionMode,
} from "@/lib/realtime/voice-practice"
import { cn } from "@/lib/utils"

const WAVE_BARS = [18, 30, 22, 38, 26, 34, 19] as const

type RealtimeVoicePanelProps = {
  phase: RealtimeVoicePhase
  turns: RealtimeVoiceTurn[]
  userCaption: string
  assistantCaption: string
  error: string | null
  isMuted: boolean
  model: string | null
  learnerLevel: string | null
  speechRate: number | null
  scenarioTitle: string | null
  liveCorrection: VoiceCorrection | null
  captionMode: CaptionMode
  onToggleMute: () => void
  onEnd: () => void
  onRetry: () => void
  onDismissCorrection: () => void
}

// A single compact, non-disruptive correction card surfaced mid-session.
const LIVE_CORRECTION_DISMISS_MS = 9000

const CorrectionNotice: FC<{ correction: VoiceCorrection; onDismiss: () => void }> = ({
  correction,
  onDismiss,
}) => {
  const mistake = pickPrimaryMistake(correction.analysis)
  const suggestion = mistake?.corrected ?? correction.analysis.naturalVersion

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, LIVE_CORRECTION_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [correction.itemId, onDismiss])

  if (!suggestion) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-3 w-full max-w-2xl rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-left"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-200">
          <Lightbulb size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200/90">
            더 자연스럽게
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-white" lang="ko">
            {suggestion}
          </p>
          {mistake?.explanation && (
            <p className="mt-1 text-xs font-medium leading-relaxed text-amber-100/80">
              {mistake.explanation}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss correction"
          className="shrink-0 rounded-full p-1 text-amber-200/70 transition-colors hover:bg-amber-400/15 hover:text-amber-100"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  )
}

const PHASE_COPY: Record<RealtimeVoicePhase, { label: string; detail: string }> = {
  idle: { label: "Voice practice", detail: "Ready" },
  connecting: { label: "Connecting", detail: "Opening a secure live audio session…" },
  listening: { label: "듣고 있어요", detail: "Your turn — speak naturally and take your time" },
  thinking: { label: "생각하고 있어요", detail: "Hengo is responding to what you said" },
  speaking: { label: "이야기하고 있어요", detail: "You can interrupt naturally at any time" },
  error: { label: "Connection paused", detail: "The live session needs your attention" },
}

function latestTurnText(turns: RealtimeVoiceTurn[], role: RealtimeVoiceTurn["role"]): string {
  for (let index = turns.length - 1; index >= 0; index--) {
    if (turns[index].role === role) return turns[index].text
  }
  return ""
}

function formatLearnerLevel(level: string | null): string {
  if (!level) return "Adapting level"
  return level.charAt(0) + level.slice(1).toLowerCase()
}

function formatSpeechPace(rate: number | null): string {
  if (rate === null) return "Adaptive pace"
  if (rate <= 0.9) return "Slow pace"
  if (rate <= 0.96) return "Clear pace"
  return "Natural pace"
}

// English subtitle for the Korean caption. Only *completed* assistant turns are
// translated (the caller passes the finished turn, not the streaming caption),
// so each turn triggers at most one request instead of one per word. A stale
// request whose caption has already been superseded is discarded, results are
// cached, and failures are silent — the Korean caption is primary.
const TRANSLATE_SETTLE_MS = 300

function useLiveTranslation(korean: string, enabled: boolean): string {
  const text = korean.trim()
  const [english, setEnglish] = useState("")
  const cacheRef = useRef(new Map<string, string>())

  useEffect(() => {
    if (!enabled || !text) return
    const cached = cacheRef.current.get(text)
    if (cached !== undefined) {
      setEnglish(cached)
      return
    }

    // Cancels the effect: a newer caption (or captions turned off) supersedes an
    // in-flight request, so its result is ignored rather than flashing stale EN.
    let cancelled = false
    let retryTimer: number | null = null

    const translate = async (retriesLeft: number) => {
      try {
        const en = await translateApi.toEnglish(text)
        if (cancelled) return
        cacheRef.current.set(text, en)
        setEnglish(en)
      } catch {
        if (!cancelled && retriesLeft > 0) {
          retryTimer = window.setTimeout(() => void translate(retriesLeft - 1), 1500)
        }
      }
    }

    const timer = window.setTimeout(() => void translate(1), TRANSLATE_SETTLE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
  }, [text, enabled])

  return enabled && text ? english : ""
}

export const RealtimeVoicePanel = memo(function RealtimeVoicePanel({
  phase,
  turns,
  userCaption,
  assistantCaption,
  error,
  isMuted,
  model,
  learnerLevel,
  speechRate,
  scenarioTitle,
  liveCorrection,
  captionMode,
  onToggleMute,
  onEnd,
  onRetry,
  onDismissCorrection,
}: RealtimeVoicePanelProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const [englishRevealed, setEnglishRevealed] = useState(false)
  const copy = PHASE_COPY[phase]
  const latestAssistant = latestTurnText(turns, "assistant")
  const latestUser = latestTurnText(turns, "user")

  const showKorean = koreanCaptionsVisible(captionMode)
  // "ko_en" always shows English; "tap" reveals it on demand; others never.
  const englishOn = englishAllowed(captionMode) && (captionMode === "ko_en" || englishRevealed)

  // Only the streaming caption or the last *completed* assistant turn is shown;
  // translation runs on the completed turn only, so it fires once per turn.
  const assistantTranscript = assistantCaption || latestAssistant
  const visibleAssistantCaption =
    assistantTranscript ||
    (phase === "connecting"
      ? "잠시만 기다려 주세요…"
      : "안녕하세요! 오늘은 어떤 이야기를 해 볼까요?")
  const visibleUserCaption = userCaption || latestUser
  const assistantEnglish = useLiveTranslation(
    latestAssistant,
    englishOn && phase !== "connecting" && phase !== "error",
  )

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const previousFocus = previousFocusRef.current
    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow
    const backgroundElements = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement => element instanceof HTMLElement && element !== panel,
      )
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      }))

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    for (const { element } of backgroundElements) {
      element.inert = true
      element.setAttribute("aria-hidden", "true")
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEnd()
    }
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
      for (const { element, inert, ariaHidden } of backgroundElements) {
        element.inert = inert
        if (ariaHidden === null) element.removeAttribute("aria-hidden")
        else element.setAttribute("aria-hidden", ariaHidden)
      }
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onEnd])

  return createPortal(
    <motion.section
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="dark fixed inset-0 z-[9999] flex h-[100dvh] w-screen min-h-0 flex-col overflow-hidden bg-slate-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Live Korean voice practice"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(37,99,235,0.3),transparent_34%),radial-gradient(circle_at_15%_85%,rgba(14,165,233,0.14),transparent_34%),linear-gradient(to_bottom,#0f172a,#020617)]" />

      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:flex-nowrap sm:px-6 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 text-xs font-bold uppercase tracking-[0.14em] text-blue-100 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live Korean
          </span>
          <span className="hidden items-center gap-1.5 text-xs font-semibold text-slate-400 lg:flex">
            <Captions size={13} />
            KO · EN captions
          </span>
          {scenarioTitle && (
            <span className="flex h-8 max-w-[45vw] items-center gap-1.5 truncate rounded-full border border-blue-300/20 bg-blue-400/10 px-3 text-xs font-bold text-blue-100">
              <Sparkles size={12} className="shrink-0" />
              <span className="truncate">{scenarioTitle}</span>
            </span>
          )}
        </div>

        <div className="order-3 flex w-full justify-center sm:order-none sm:w-auto sm:shrink-0">
          <span className="flex h-8 items-center rounded-full border border-blue-300/15 bg-blue-400/10 px-3 text-xs font-bold text-blue-100 sm:text-xs">
            {formatLearnerLevel(learnerLevel)} · {formatSpeechPace(speechRate)}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEnd}
          autoFocus
          className="h-9 rounded-full border border-white/10 bg-white/[0.07] px-3.5 text-xs font-bold text-white hover:bg-white/15 hover:text-white"
        >
          <PhoneOff size={14} />
          End
        </Button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-4 pt-5 sm:px-8 sm:pt-8">
        <div className="flex w-full max-w-4xl flex-col items-center">
          <div className="relative mb-4 sm:mb-6">
            {(phase === "speaking" || phase === "listening") && (
              <>
                <motion.span
                  className="absolute -inset-4 rounded-full border border-blue-400/25"
                  animate={{ scale: [1, 1.16, 1], opacity: [0.5, 0.08, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.span
                  className="absolute -inset-8 rounded-full border border-blue-400/10"
                  animate={{ scale: [1.05, 1.2, 1.05], opacity: [0.35, 0.04, 0.35] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </>
            )}
            <div
              className={cn(
                "relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.75rem] border bg-slate-900 shadow-2xl shadow-blue-500/25 sm:h-24 sm:w-24 sm:rounded-[2rem]",
                phase === "error" ? "border-red-400/40" : "border-blue-300/30",
              )}
            >
              <Image
                src="/hengo-icon.png"
                alt=""
                width={96}
                height={96}
                className="h-full w-full"
                priority
              />
            </div>
            <span
              className={cn(
                "absolute -right-1 -bottom-1 h-5 w-5 rounded-full border-4 border-slate-950",
                phase === "error"
                  ? "bg-red-400"
                  : phase === "connecting"
                    ? "bg-amber-400"
                    : "bg-emerald-400",
              )}
            />
          </div>

          <div className="mb-4 text-center">
            <div className="flex items-center justify-center gap-2">
              {phase === "connecting" || phase === "thinking" ? (
                <LoaderCircle size={16} className="animate-spin text-blue-300" />
              ) : phase === "speaking" ? (
                <AudioLines size={17} className="text-blue-300" />
              ) : (
                <Mic size={16} className="text-blue-300" />
              )}
              <p className="text-xs font-bold text-blue-100">{copy.label}</p>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-400 sm:text-xs">
              {copy.detail}
            </p>
          </div>

          {(phase === "speaking" || phase === "listening") && (
            <div className="mb-5 flex h-10 items-center justify-center gap-1" aria-hidden="true">
              {WAVE_BARS.map((height, index) => (
                <motion.span
                  key={`${height}-${index}`}
                  className={cn(
                    "w-1 rounded-full",
                    phase === "speaking" ? "bg-blue-400" : "bg-emerald-400/80",
                  )}
                  animate={{ height: [8, height, 8] }}
                  transition={{
                    duration: 0.72 + index * 0.04,
                    repeat: Infinity,
                    delay: index * 0.07,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          )}

          <div className="w-full max-w-3xl rounded-[1.5rem] border border-white/10 bg-white/[0.065] px-5 py-5 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl sm:rounded-[2rem] sm:px-8 sm:py-7">
            <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
              <Captions size={13} />
              Hengo · live subtitle
            </div>
            {showKorean ? (
              <p
                className="text-balance text-[1.3rem] font-semibold leading-[1.55] tracking-[-0.025em] text-white sm:text-[1.75rem] sm:leading-[1.5]"
                lang="ko"
                aria-live="polite"
                aria-atomic="false"
              >
                {visibleAssistantCaption}
                {phase === "speaking" && (
                  <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-blue-300 align-middle" />
                )}
              </p>
            ) : (
              <p className="text-xs font-medium text-slate-400">
                Captions off — listening practice. Hengo is{" "}
                {phase === "speaking" ? "speaking" : "here"}.
              </p>
            )}
            {assistantEnglish && (
              <p
                className="mx-auto mt-3 max-w-2xl text-pretty border-t border-white/[0.08] pt-3 text-xs font-medium leading-relaxed text-blue-200/85 sm:text-base"
                lang="en"
                aria-live="polite"
              >
                <span className="mr-1.5 rounded bg-blue-400/15 px-1 py-px align-[1px] text-xs font-bold uppercase tracking-wider text-blue-200">
                  EN
                </span>
                {assistantEnglish}
              </p>
            )}
            {captionMode === "tap" && !englishRevealed && latestAssistant && (
              <button
                type="button"
                onClick={() => setEnglishRevealed(true)}
                className="mx-auto mt-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-blue-200 transition-colors hover:bg-white/12"
              >
                <Captions size={12} />
                Show English
              </button>
            )}
          </div>

          {showKorean && (
            <div className="mt-3 min-h-16 w-full max-w-2xl rounded-2xl border border-white/[0.07] bg-black/15 px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300/80">
                You · live subtitle
              </p>
              <p
                className="mt-1 text-sm font-medium leading-relaxed text-slate-200 sm:text-base"
                lang="ko"
                aria-live="polite"
              >
                {visibleUserCaption ||
                  (phase === "listening"
                    ? "한국어로 편하게 말해 보세요…"
                    : "Your words will appear here as you speak")}
              </p>
            </div>
          )}

          <AnimatePresence>
            {liveCorrection && (
              <CorrectionNotice
                key={liveCorrection.itemId}
                correction={liveCorrection}
                onDismiss={onDismissCorrection}
              />
            )}
          </AnimatePresence>

          {turns.length > 1 && (
            <div className="mt-4 w-full max-w-2xl rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 text-left">
              <p className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Recent transcript
              </p>
              <div className="max-h-28 space-y-2 overflow-y-auto pr-1">
                {turns.slice(-4).map((turn) => (
                  <div
                    key={turn.id}
                    className="flex gap-2 text-xs leading-relaxed sm:text-xs"
                  >
                    <span
                      className={cn(
                        "w-10 shrink-0 font-bold",
                        turn.role === "assistant" ? "text-blue-300" : "text-emerald-300",
                      )}
                    >
                      {turn.role === "assistant" ? "Hengo" : "You"}
                    </span>
                    <span className="text-slate-300" lang="ko">
                      {turn.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div
              className="mt-4 w-full max-w-xl rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-center"
              role="alert"
            >
              <p className="text-xs font-semibold leading-relaxed text-red-100">{error}</p>
              {phase === "error" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onRetry}
                  className="mt-3 h-8 rounded-full bg-white px-3 text-xs font-bold text-slate-950 hover:bg-slate-100"
                >
                  <RotateCcw size={13} />
                  Try again
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="relative z-10 flex shrink-0 flex-col items-center gap-2 border-t border-white/[0.06] bg-black/10 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onToggleMute}
            disabled={phase === "connecting" || phase === "error"}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            className={cn(
              "h-12 w-12 rounded-full border text-white hover:text-white",
              isMuted
                ? "border-amber-400/30 bg-amber-400/15 hover:bg-amber-400/20"
                : "border-white/10 bg-white/[0.08] hover:bg-white/15",
            )}
          >
            {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={onEnd}
            aria-label="End voice practice"
            className="h-14 w-14 rounded-full bg-red-500 text-white shadow-lg shadow-red-950/40 hover:bg-red-400"
          >
            <PhoneOff size={21} />
          </Button>
        </div>
        <p className="text-center text-xs font-medium text-slate-500">
          AI-generated voice · {model ? model.replace(/^gpt-/, "") : "secure realtime session"}
        </p>
      </footer>
    </motion.section>,
    document.body,
  )
})
