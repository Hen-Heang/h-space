"use client"

import { createContext, useContext, useEffect, useRef, useState, type FC } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  AudioLines,
  SquarePen,
  Sparkles,
  Terminal,
  Briefcase,
  ChevronLeft,
  EllipsisVertical,
  Mic,
  Headphones,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  useThreadRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react"

import { Thread } from "@/components/assistant-ui/thread"
import { CorrectionCard } from "@/components/chat/CorrectionCard"
import { RealtimeVoicePanel } from "@/components/chat/RealtimeVoicePanel"
import { VoiceSessionReport } from "@/components/chat/VoiceSessionReport"
import { VoicePracticeSetup } from "@/components/chat/VoicePracticeSetup"
import { ShadowPractice } from "@/components/chat/ShadowPractice"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useChat } from "@/hooks/useChat"
import { useRealtimeVoice, type RealtimeVoicePhase } from "@/hooks/useRealtimeVoice"
import { vocabApi } from "@/lib/api"
import { DEFAULT_CORRECTION_POLICY } from "@/lib/realtime/correction-policy"
import {
  DEFAULT_CAPTION_MODE,
  DEFAULT_PACE,
  DEFAULT_PRACTICE_MODE,
  type VoicePracticeOptions,
} from "@/lib/realtime/voice-practice"
import { SHADOW_SENTENCES } from "@/lib/realtime/shadow-sentences"
import { CHAT_PRESETS } from "@/lib/chat-presets"
import type { ChatMessage } from "@/lib/types"
import type { TurnAnalysis } from "@/lib/ai/schemas/turn-analysis"
import { cn } from "@/lib/utils"

type Suggestion = {
  emoji: string
  label: string
  text: string
  // When true, the chip fills the composer (so the user can paste/append their
  // own text) instead of sending immediately — used for the "correct my writing" flow.
  prefill?: boolean
}

const GENERAL_SUGGESTIONS: Suggestion[] = [
  {
    emoji: "👋",
    label: "Greetings",
    text: "Teach me 5 everyday Korean greetings with pronunciation tips.",
  },
  {
    emoji: "✍️",
    label: "Beginner chat",
    text: "I'm a beginner. Give me a simple Korean conversation I can practice right now.",
  },
  {
    emoji: "🔤",
    label: "Grammar",
    text: "Explain the difference between 이/가 and 은/는 with short examples.",
  },
  {
    emoji: "🛠️",
    label: "Fix my writing",
    text: "Please correct my Korean and explain each change in English.\n\nMy text:\n",
    prefill: true,
  },
]

const TECHNICAL_SUGGESTIONS: Suggestion[] = [
  {
    emoji: "📝",
    label: "Fix my report",
    text: "Please correct my Korean writing and explain each change in English. Make it sound natural for a work report.\n\nMy text:\n",
    prefill: true,
  },
  {
    emoji: "💻",
    label: "PR Review",
    text: "How do I ask a colleague to review my Pull Request politely in Korean?",
  },
  {
    emoji: "📅",
    label: "Stand-up",
    text: "Help me prepare a short daily stand-up update in Korean: I finished the login bug and I'm starting the API integration today.",
  },
  {
    emoji: "🚀",
    label: "Deployment",
    text: "What are some common Korean terms used during a production deployment or system maintenance?",
  },
]

// Bridges ChatWindow state to the welcome screen and composer voice button
// rendered inside the assistant-ui Thread.
type HengoChatContextValue = {
  isTechnicalMode: boolean
  canInteract: boolean
  voice: {
    supported: boolean
    phase: RealtimeVoicePhase
    onToggle: () => void
  }
}

const HengoChatContext = createContext<HengoChatContextValue | null>(null)

function useHengoChat(): HengoChatContextValue {
  const value = useContext(HengoChatContext)
  if (!value) throw new Error("useHengoChat must be used inside ChatWindow")
  return value
}

// Maps the app's ChatMessage rows into assistant-ui's message shape; the
// correction/translation columns ride along as custom metadata so the thread
// can render the "Suggested Improvement" card.
function convertMessage(message: ChatMessage): ThreadMessageLike {
  return {
    id: message.id,
    role: message.role,
    content: [{ type: "text", text: message.content }],
    createdAt: new Date(message.createdAt),
    metadata: {
      custom: {
        correction: message.correction,
        translation: message.translation,
      },
    },
  }
}

function getAppendedText(message: AppendMessage): string {
  return message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("\n")
    .trim()
}

// Seeds the composer once when arriving via a deep link (e.g. dashboard
// "Correction" card → /chat?prompt=...) so the user lands ready to paste.
const ComposerSeeder: FC<{ text: string }> = ({ text }) => {
  const runtime = useThreadRuntime()
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current || !text) return
    seededRef.current = true
    runtime.composer.setText(text)
  }, [text, runtime])
  return null
}

// ── Empty-state welcome: presets + suggestion chips (rendered inside Thread) ──
const HengoWelcome: FC = () => {
  const { isTechnicalMode, canInteract, voice } = useHengoChat()
  const runtime = useThreadRuntime()
  const suggestions = isTechnicalMode ? TECHNICAL_SUGGESTIONS : GENERAL_SUGGESTIONS
  const voiceActionLabel = voice.phase === "connecting" ? "Connecting…" : "Start live conversation"

  function send(text: string) {
    if (!canInteract) return
    runtime.append({ role: "user", content: [{ type: "text", text }] })
  }

  function sendSuggestion(suggestion: Suggestion) {
    if (!canInteract) return
    if (suggestion.prefill) {
      runtime.composer.setText(suggestion.text)
      return
    }
    send(suggestion.text)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-7 py-6 sm:py-10"
    >
      <div className="w-full max-w-xl px-4 text-center">
        <div className="relative mx-auto mb-5 w-fit">
          <span className="absolute inset-0 scale-150 rounded-full bg-blue-500/10 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.35rem] bg-background shadow-xl shadow-blue-600/15 ring-1 ring-blue-500/20 sm:h-[4.5rem] sm:w-[4.5rem]">
            <Image src="/hengo-icon.png" alt="" width={72} height={72} className="h-full w-full" />
          </div>
          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-background bg-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        </div>

        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="rounded-full border border-primary/15 bg-primary/[0.07] px-2.5 py-1 text-xs font-semibold text-primary">
            AI Korean Coach
          </span>
          {isTechnicalMode && (
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              Developer mode
            </span>
          )}
        </div>

        <h2 className="text-balance text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
          {isTechnicalMode ? "Practice Korean for your workday" : "Speak Korean with confidence"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-pretty text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
          {isTechnicalMode
            ? "Rehearse meetings, code reviews, and everyday office conversations with a patient coach."
            : "Have a natural conversation, get gentle corrections, and keep going without breaking your flow."}
        </p>

        {voice.supported && (
          <Button
            type="button"
            size="lg"
            onClick={voice.onToggle}
            disabled={!canInteract}
            className="mt-5 h-12 min-w-52 rounded-full bg-primary px-6 text-sm text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Mic size={17} />
            {voiceActionLabel}
          </Button>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
          <span>Live subtitles</span>
          <span aria-hidden="true">·</span>
          <span>Gentle corrections</span>
          <span aria-hidden="true">·</span>
          <span>Hands-free turns</span>
        </div>
      </div>

      <div className="w-full max-w-3xl space-y-3 px-3 sm:px-4">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-xs font-bold text-foreground">Choose a conversation</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              Practice a situation you will actually use.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CHAT_PRESETS.map((preset, i) => (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              type="button"
              disabled={!canInteract}
              onClick={() => send(preset.prompt)}
              className="group flex min-h-[7.25rem] flex-col items-start rounded-2xl border border-border/70 bg-card/70 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-500/35 hover:bg-card hover:shadow-md disabled:opacity-40 active:translate-y-0 active:scale-[0.98]"
            >
              <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-muted/70 text-base ring-1 ring-border/50 transition-colors group-hover:bg-blue-500/10">
                {preset.emoji}
              </span>
              <span className="text-sm font-semibold leading-tight text-foreground/90 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                {preset.label}
              </span>
              <span className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-muted-foreground">
                {preset.description}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-2xl flex-wrap justify-center gap-2 px-4">
        {suggestions.map((s, i) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            type="button"
            disabled={!canInteract}
            onClick={() => sendSuggestion(s)}
            className="group flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3.5 py-1.5 text-left transition-all hover:border-blue-500/30 hover:bg-muted/60 disabled:opacity-40 active:scale-95"
          >
            <span className="text-xs">{s.emoji}</span>
            <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground">
              {s.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

const CompactHengoWelcome: FC = () => {
  const { isTechnicalMode, canInteract } = useHengoChat()
  const runtime = useThreadRuntime()
  const suggestions = isTechnicalMode ? TECHNICAL_SUGGESTIONS : GENERAL_SUGGESTIONS

  function handleSuggestion(suggestion: Suggestion) {
    if (!canInteract) return
    if (suggestion.prefill) {
      runtime.composer.setText(suggestion.text)
      return
    }
    runtime.append({ role: "user", content: [{ type: "text", text: suggestion.text }] })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-sm flex-col items-center px-3 py-5 text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
        What can I help with?
      </h2>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
        Ask about Korean, workplace communication, or a sentence you want corrected.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {suggestions.slice(0, 3).map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            disabled={!canInteract}
            onClick={() => handleSuggestion(suggestion)}
            className="min-h-10 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// Rendered inside AssistantRuntimeProvider so it can pull the thread runtime
// itself (same pattern as ComposerSeeder) rather than assume the shape of
// the outer useExternalStoreRuntime() object.
const TurnAnalysisBanner: FC<{
  analysis: TurnAnalysis
  originalText: string
  onDismiss: () => void
}> = ({ analysis, originalText, onDismiss }) => {
  const runtime = useThreadRuntime()
  return (
    <CorrectionCard
      analysis={analysis}
      originalText={originalText}
      onDismiss={onDismiss}
      onTryAgain={() => {
        runtime.composer.setText(originalText)
        onDismiss()
      }}
    />
  )
}

// ── Composer slot: opens the same realtime room as the main voice CTA ──
const MicButton: FC = () => {
  const { canInteract, voice } = useHengoChat()
  if (!voice.supported) return null

  const title =
    voice.phase === "connecting" ? "Connecting live voice" : "Start live Korean conversation"

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={voice.onToggle}
      disabled={!canInteract}
      title={title}
      aria-label={title}
      className={cn(
        "size-9 shrink-0 rounded-full transition-colors [@media(pointer:coarse)]:size-11",
        voice.phase === "connecting"
          ? "animate-pulse bg-primary text-primary-foreground"
          : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
      )}
    >
      <Mic size={18} />
    </Button>
  )
}

const THREAD_COMPONENTS = {
  Welcome: HengoWelcome,
  ComposerLeading: MicButton,
}

const COMPACT_THREAD_COMPONENTS = {
  Welcome: CompactHengoWelcome,
}

type ChatWindowProps = {
  title: string
  subtitle: string
  conversationId?: string
  initialMessages?: ChatMessage[]
  initialDraft?: string
  onNewChat?: () => void
  isStartingNewChat?: boolean
  // Fired once the conversation is auto-titled from its first message, so the
  // sidebar list can refetch and show the new title instead of the placeholder.
  onConversationTitled?: () => void
  // When rendered inside the AI workspace tabs, the surrounding mode bar already
  // provides the back button and safe-area top padding — so we drop ours here.
  embedded?: boolean
  // Compact mode is used by the global floating coach: its outer panel owns the
  // title bar, and the welcome state keeps only the highest-value prompts.
  compact?: boolean
  // Present only when this conversation is a scenario-practice session
  // (kori_conversations.scenario_id) — enables the "End scenario" evaluation
  // flow that gives the linked mission item real completion evidence.
  scenario?: { scenarioId: string; goal: string; title: string }
}

export function ChatWindow({
  title,
  subtitle,
  conversationId,
  initialMessages,
  initialDraft,
  onNewChat,
  isStartingNewChat,
  onConversationTitled,
  embedded = false,
  compact = false,
  scenario,
}: ChatWindowProps) {
  const {
    error,
    isLoadingMessages,
    isStreaming,
    messages,
    sendMessage,
    appendVoiceTurn,
    cancel,
    isTechnicalMode,
    setIsTechnicalMode,
    turnAnalysis,
    turnAnalysisOriginalText,
    dismissTurnAnalysis,
    scenarioTurnCount,
    scenarioResult,
    isEvaluatingScenario,
    evaluateScenario,
  } = useChat({ conversationId, initialMessages, onConversationTitled, scenario })

  useEffect(() => {
    if (!scenarioResult) return
    if (scenarioResult.taskCompleted) {
      toast.success(`Scenario complete — score ${scenarioResult.score}/100`, {
        description: scenarioResult.strengths[0],
      })
    } else {
      toast.info("Not quite there yet", {
        description: scenarioResult.improvements[0] ?? "Keep going and try ending again.",
      })
    }
  }, [scenarioResult])

  const router = useRouter()

  // Voice practice setup (Phase 5) — chosen in the setup sheet, applied to the
  // next live session.
  const [voiceSetupOpen, setVoiceSetupOpen] = useState(false)
  const [voiceOptions, setVoiceOptions] = useState<VoicePracticeOptions>({
    mode: DEFAULT_PRACTICE_MODE,
    correctionPolicy: DEFAULT_CORRECTION_POLICY,
    pace: DEFAULT_PACE,
    captionMode: DEFAULT_CAPTION_MODE,
  })
  const [shadowOpen, setShadowOpen] = useState(false)
  const [vocabState, setVocabState] = useState<"idle" | "saving" | "saved">("idle")

  const realtimeVoice = useRealtimeVoice({
    conversationId,
    technicalMode: isTechnicalMode,
    correctionPolicy: voiceOptions.correctionPolicy,
    pace: voiceOptions.pace,
    onTurnComplete: appendVoiceTurn,
  })
  const canInteract =
    Boolean(conversationId) && !isStreaming && !isLoadingMessages && !realtimeVoice.isActive

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning: isStreaming,
    isDisabled: !conversationId || isLoadingMessages || realtimeVoice.isActive,
    convertMessage,
    onNew: async (message: AppendMessage) => {
      const text = getAppendedText(message)
      if (text) await sendMessage(text)
    },
    onCancel: async () => {
      cancel()
    },
  })

  // Streaming errors used to render above the composer; the composer now lives
  // inside the Thread, so surface them as a toast instead.
  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  function handleVoiceToggle() {
    if (realtimeVoice.isActive) {
      realtimeVoice.stop()
    } else {
      // Open the setup sheet first (mode / corrections / pace / captions).
      setVoiceSetupOpen(true)
    }
  }

  function startVoiceWithOptions(options: VoicePracticeOptions) {
    setVoiceOptions(options)
    setVoiceSetupOpen(false)
    if (options.mode === "shadow") {
      setShadowOpen(true)
      return
    }
    const technical = options.mode === "developer"
    setIsTechnicalMode(technical)
    void realtimeVoice.start({
      correctionPolicy: options.correctionPolicy,
      pace: options.pace,
      technicalMode: technical,
    })
  }

  function closeReport() {
    realtimeVoice.dismissSessionReport()
    setVocabState("idle")
  }

  async function saveReportVocabulary() {
    const vocabulary = realtimeVoice.sessionReport?.vocabulary ?? []
    if (!vocabulary.length) return
    setVocabState("saving")
    try {
      for (const item of vocabulary) {
        await vocabApi.save({ category: "Speaking", term: item.korean, meaning: item.english })
      }
      setVocabState("saved")
    } catch {
      setVocabState("idle")
      toast.error("Could not save vocabulary")
    }
  }

  const coachStatus = realtimeVoice.isActive
    ? realtimeVoice.phase === "connecting"
      ? "Connecting live voice"
      : realtimeVoice.phase === "listening"
        ? "Listening to you"
        : realtimeVoice.phase === "thinking"
          ? "Thinking"
          : realtimeVoice.phase === "speaking"
            ? "Speaking live"
            : realtimeVoice.phase === "error"
              ? "Voice connection paused"
              : "Live voice ready"
    : subtitle

  const hengoContext: HengoChatContextValue = {
    isTechnicalMode,
    canInteract,
    voice: {
      supported: realtimeVoice.supported,
      phase: realtimeVoice.phase,
      onToggle: handleVoiceToggle,
    },
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <HengoChatContext.Provider value={hengoContext}>
        <div
          className={cn(
            "relative flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-hidden border-border/60 bg-card dark:bg-slate-950/40 dark:backdrop-blur-md",
            compact ? "border-0 shadow-none" : "shadow-2xl md:rounded-3xl md:border",
          )}
        >
          <AnimatePresence>
            {realtimeVoice.isActive && (
              <RealtimeVoicePanel
                phase={realtimeVoice.phase}
                turns={realtimeVoice.turns}
                userCaption={realtimeVoice.userCaption}
                assistantCaption={realtimeVoice.assistantCaption}
                error={realtimeVoice.error}
                isMuted={realtimeVoice.isMuted}
                model={realtimeVoice.model}
                learnerLevel={realtimeVoice.learnerLevel}
                speechRate={realtimeVoice.speechRate}
                scenarioTitle={realtimeVoice.scenarioTitle}
                liveCorrection={realtimeVoice.liveCorrection}
                captionMode={voiceOptions.captionMode}
                onToggleMute={realtimeVoice.toggleMute}
                onEnd={realtimeVoice.stop}
                onRetry={() => void realtimeVoice.start()}
                onDismissCorrection={realtimeVoice.dismissLiveCorrection}
              />
            )}
          </AnimatePresence>

          {/* Voice practice setup sheet, shadow mode, and post-session report. */}
          <VoicePracticeSetup
            open={voiceSetupOpen}
            onOpenChange={setVoiceSetupOpen}
            scenarioTitle={scenario?.title ?? null}
            defaults={voiceOptions}
            onStart={startVoiceWithOptions}
          />

          {shadowOpen && (
            <ShadowPractice sentences={SHADOW_SENTENCES} onClose={() => setShadowOpen(false)} />
          )}

          {realtimeVoice.sessionReport && (
            <VoiceSessionReport
              report={realtimeVoice.sessionReport}
              onClose={closeReport}
              onPracticeAgain={() => {
                closeReport()
                setVoiceSetupOpen(true)
              }}
              onReviewCorrections={() => {
                closeReport()
                router.push("/chat?mode=corrections")
              }}
              onStartRecommended={() => {
                const href = realtimeVoice.sessionReport?.recommendedPractice.href
                closeReport()
                if (href) router.push(href)
              }}
              onSaveVocabulary={saveReportVocabulary}
              vocabState={vocabState}
            />
          )}

          {/* ── Desktop/Mobile Optimized Header ── */}
          {!compact && (
            <div
              aria-hidden={realtimeVoice.isActive || undefined}
              inert={realtimeVoice.isActive || undefined}
              className={cn(
                "flex shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-background/80 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl sm:px-5",
                embedded ? "pt-3" : "pt-[max(0.75rem,env(safe-area-inset-top))]",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                {!embedded && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-ml-2 h-11 w-11 rounded-lg text-muted-foreground transition-colors active:scale-95 md:hidden"
                    onClick={() => router.push("/home")}
                    title="Back to home"
                    aria-label="Back to home"
                  >
                    <ChevronLeft size={24} strokeWidth={2.5} />
                  </Button>
                )}

                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-background shadow-sm ring-1 ring-blue-500/15">
                    <Image
                      src="/hengo-icon.png"
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full"
                    />
                  </div>
                  <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold leading-none tracking-tight text-foreground">
                      {title}
                    </h3>
                    <span className="hidden rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 sm:inline">
                      AI Coach
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        realtimeVoice.isActive ? "animate-pulse bg-blue-500" : "bg-emerald-500",
                      )}
                    />
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {coachStatus}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {scenario && scenarioTurnCount >= 3 && !scenarioResult?.taskCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void evaluateScenario()}
                    disabled={isEvaluatingScenario}
                    className="h-11 items-center gap-1.5 rounded-lg border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    {isEvaluatingScenario ? "Checking…" : "End scenario"}
                  </Button>
                )}
                {/* Technical Mode + Voice toggles — full controls on tablet/desktop */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTechnicalMode(!isTechnicalMode)}
                  className={cn(
                    "hidden h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors sm:flex",
                    isTechnicalMode
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-border/60 bg-background/50 text-muted-foreground",
                  )}
                >
                  {isTechnicalMode ? <Terminal size={14} /> : <Briefcase size={14} />}
                  <span>{isTechnicalMode ? "Dev Mode ON" : "General Mode"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVoiceToggle}
                  disabled={!realtimeVoice.supported || (!realtimeVoice.isActive && !canInteract)}
                  title={
                    realtimeVoice.isActive
                      ? "End live voice practice"
                      : "Start live Korean voice practice"
                  }
                  aria-pressed={realtimeVoice.isActive}
                  className={cn(
                    "h-11 min-w-11 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition-colors sm:px-3",
                    realtimeVoice.isActive
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border-border/70 bg-background text-muted-foreground hover:border-blue-500/30 hover:text-foreground",
                  )}
                >
                  {realtimeVoice.isActive ? <AudioLines size={14} /> : <Headphones size={14} />}
                  <span className="hidden sm:inline">
                    {realtimeVoice.isActive ? "Live voice" : "Practice speaking"}
                  </span>
                </Button>

                {onNewChat && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-11 w-11 rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 sm:flex"
                    onClick={onNewChat}
                    disabled={isStartingNewChat}
                    title="Start fresh"
                    aria-label="Start fresh chat"
                  >
                    <SquarePen size={16} strokeWidth={2.5} />
                  </Button>
                )}

                {/* Mobile: same controls collapsed into one menu so the narrow header isn't a wall of icons */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors active:scale-95 sm:hidden"
                      aria-label="Chat options"
                      title="Chat options"
                    >
                      <EllipsisVertical size={18} strokeWidth={2.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuCheckboxItem
                      checked={isTechnicalMode}
                      onCheckedChange={() => setIsTechnicalMode(!isTechnicalMode)}
                    >
                      {isTechnicalMode ? (
                        <Terminal size={14} className="mr-2" />
                      ) : (
                        <Briefcase size={14} className="mr-2" />
                      )}
                      Dev Mode (technical Korean)
                    </DropdownMenuCheckboxItem>
                    {onNewChat && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onNewChat} disabled={isStartingNewChat}>
                          <SquarePen size={14} className="mr-2" />
                          Start fresh chat
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          <AnimatePresence>
            {turnAnalysis && !realtimeVoice.isActive && (
              <TurnAnalysisBanner
                analysis={turnAnalysis}
                originalText={turnAnalysisOriginalText}
                onDismiss={dismissTurnAnalysis}
              />
            )}
          </AnimatePresence>

          {/* ── assistant-ui Thread: messages + composer ── */}
          <div
            className="relative min-h-0 flex-1"
            aria-hidden={realtimeVoice.isActive || undefined}
            inert={realtimeVoice.isActive || undefined}
          >
            {isLoadingMessages && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-card/60 backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 shadow-inner">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground">Syncing History</p>
              </div>
            )}
            <Thread components={compact ? COMPACT_THREAD_COMPONENTS : THREAD_COMPONENTS} />
            {initialDraft ? <ComposerSeeder text={initialDraft} /> : null}
          </div>
        </div>
      </HengoChatContext.Provider>
    </AssistantRuntimeProvider>
  )
}
