"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  BrainCircuit,
  ChevronDown,
  ChevronLeft,
  History,
  MessageCircle,
  PanelLeft,
  RotateCcw,
  ScanText,
  Settings2,
  Wand2,
} from "lucide-react"
import { motion } from "motion/react"

import { ChatWindow } from "@/components/chat/ChatWindow"
import { ConversationSidebar } from "@/components/chat/ConversationSidebar"
import { CorrectionsReview } from "@/components/chat/CorrectionsReview"
import { MessageAnalyzer } from "@/components/ai/MessageAnalyzer"
import { MessageGenerator } from "@/components/ai/MessageGenerator"
import { AskHengoChat } from "@/components/memory/AskHengoChat"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useConversations } from "@/hooks/useConversations"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { chatApi, scenarioApi } from "@/lib/api"
import { cn } from "@/lib/utils"

type AiMode = "chat" | "analyze" | "generate" | "corrections" | "memory"

const MODES: { id: AiMode; label: string; icon: typeof MessageCircle }[] = [
  { id: "chat", label: "Coach", icon: MessageCircle },
  { id: "analyze", label: "Analyze", icon: ScanText },
  { id: "generate", label: "Write", icon: Wand2 },
  { id: "corrections", label: "Review", icon: RotateCcw },
  { id: "memory", label: "My Data", icon: BrainCircuit },
]

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  )
}

function ChatPageContent() {
  useSessionTimer("chat")
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialDraft = searchParams.get("prompt") ?? undefined
  const initialCategory = searchParams.get("category") ?? undefined
  // Set by the Practice page's "Practice with AI Coach" scenario launcher —
  // resumes that specific (already scenario-tagged) conversation directly
  // instead of the usual "most recent or new" bootstrap.
  const deepLinkConversationId = searchParams.get("conversationId") ?? undefined

  // A ?prompt= deep link is a correction/chat request, so it always lands on Chat.
  const queryMode = searchParams.get("mode")
  const [mode, setMode] = useState<AiMode>(
    !initialDraft &&
      (queryMode === "analyze" ||
        queryMode === "generate" ||
        queryMode === "corrections" ||
        queryMode === "memory")
      ? (queryMode as AiMode)
      : "chat",
  )
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0]
  const CurrentModeIcon = currentMode.icon

  // Keep the URL in sync with the active mode, so refreshing, sharing a link,
  // or navigating via the sidebar's Chat/Analyze/Generate/Corrections links
  // all land on the right tab (and the one-shot ?prompt=/?category= deep-link
  // params get cleaned up once consumed above).
  useEffect(() => {
    const params = new URLSearchParams()
    if (mode !== "chat") params.set("mode", mode)
    const query = params.toString()
    router.replace(query ? `/chat?${query}` : "/chat", { scroll: false })
    // Intentionally mode-only: this reflects mode changes into the URL, it
    // shouldn't re-run when router identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const {
    conversations,
    isLoading: conversationsLoading,
    rename,
    remove,
    refresh,
  } = useConversations()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [bootstrapped, setBootstrapped] = useState(Boolean(deepLinkConversationId))
  const [error, setError] = useState("")
  const [scenarioContext, setScenarioContext] = useState<{
    scenarioId: string
    goal: string
    title: string
  } | null>(null)

  // Deep-linked scenario conversation: resume it directly, skip the normal
  // "most recent or new" bootstrap entirely.
  useEffect(() => {
    if (deepLinkConversationId) setConversationId(deepLinkConversationId)
    // Intentionally one-shot: only reacts to the initial query param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect whether the active conversation is scenario-tagged, so ChatWindow
  // can show the "End scenario" evaluation flow instead of the normal chat UI.
  useEffect(() => {
    if (!conversationId) {
      setScenarioContext(null)
      return
    }
    let active = true
    chatApi
      .getConversation(conversationId)
      .then((conv) => {
        if (!active || !conv.scenarioId) return
        return scenarioApi.getById(conv.scenarioId).then((scenario) => {
          if (active)
            setScenarioContext({
              scenarioId: scenario.id,
              goal: scenario.goal,
              title: scenario.title,
            })
        })
      })
      .catch(() => {
        if (active) setScenarioContext(null)
      })
    return () => {
      active = false
    }
  }, [conversationId])
  const [isStartingNewChat, setIsStartingNewChat] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  // Desktop rail collapse — persisted so it sticks across visits.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  useEffect(() => {
    if (window.localStorage.getItem("koriai-chat-sidebar-collapsed") === "1") {
      setSidebarCollapsed(true)
    }
  }, [])
  const toggleSidebar = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
    try {
      window.localStorage.setItem("koriai-chat-sidebar-collapsed", collapsed ? "1" : "0")
    } catch {
      /* storage unavailable */
    }
  }, [])

  // Resume the most recent conversation (or create one if the user has none, or
  // when arriving via a ?prompt deep link, which should land in a fresh chat).
  useEffect(() => {
    if (mode !== "chat" || conversationId !== null || conversationsLoading || bootstrapped) {
      return
    }
    setBootstrapped(true)
    if (conversations.length > 0 && !initialDraft) {
      setConversationId(conversations[0].id)
      return
    }
    chatApi
      .createConversation("General Practice", "FREE_CHAT")
      .then((data) => {
        setConversationId(data.id)
        void refresh()
      })
      .catch(() => setError("Failed to start conversation. Please refresh."))
  }, [
    mode,
    conversationId,
    conversationsLoading,
    bootstrapped,
    conversations,
    initialDraft,
    refresh,
  ])

  const startNewChat = useCallback(async () => {
    setIsStartingNewChat(true)
    setError("")
    try {
      const data = await chatApi.createConversation("General Practice", "FREE_CHAT")
      setConversationId(data.id)
      await refresh()
      setSheetOpen(false)
    } catch {
      setError("Failed to start a new conversation. Please try again.")
    } finally {
      setIsStartingNewChat(false)
    }
  }, [refresh])

  const selectConversation = useCallback((id: string) => {
    setConversationId(id)
    setSheetOpen(false)
  }, [])

  // Deleting the open chat drops back to bootstrap (resume next / create fresh).
  const handleDelete = useCallback(
    async (id: string) => {
      await remove(id)
      if (id === conversationId) {
        setConversationId(null)
        setBootstrapped(false)
      }
    },
    [remove, conversationId],
  )

  const sidebarProps = {
    conversations,
    isLoading: conversationsLoading,
    activeId: conversationId,
    onSelect: selectConversation,
    onNew: startNewChat,
    isStartingNew: isStartingNewChat,
    onRename: rename,
    onDelete: handleDelete,
  }

  // Full viewport on mobile (the shell hides its header here); on tablet and up
  // subtract the shell's sticky top bar so chat still fits without scrolling.
  // md: not lg: — the shell switches to rail + header at 768px.
  const containerHeight = "h-[100dvh] md:h-[calc(100dvh-3.6rem)] md:min-h-[36rem]"

  if (error && !conversationId && mode === "chat") {
    return (
      <div className={cn("flex items-center justify-center p-4", containerHeight)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm p-8 rounded-3xl border border-destructive/20 bg-destructive/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Connection Error</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">
              {error}
            </p>
          </div>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-500"
          >
            Try refreshing
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", containerHeight)}>
      {/* ── AI workspace mode bar (back + Chat / Analyze / Generate) ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-background/75 px-3 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur-xl sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/home")}
          aria-label="Back to home"
          className="h-11 w-11 rounded-lg text-muted-foreground active:scale-95"
        >
          <ChevronLeft size={22} />
        </Button>

        {/* Desktop: show history when the rail is collapsed */}
        {mode === "chat" && sidebarCollapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleSidebar(false)}
            aria-label="Show chat history"
            title="Show history"
            className="hidden h-11 w-11 rounded-lg text-muted-foreground active:scale-95 md:flex"
          >
            <PanelLeft size={20} />
          </Button>
        )}

        {/* Phones: one menu button naming the current mode. Five 44px modes
            don't fit between back and history at 320px, and a mode scrolled
            off the edge is a hidden mode. */}
        <div className="flex min-w-0 flex-1 justify-center sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 max-w-full gap-2 rounded-lg px-3 text-sm font-semibold"
              >
                <CurrentModeIcon size={16} aria-hidden="true" className="shrink-0" />
                <span className="sr-only">Mode: </span>
                <span className="truncate">{currentMode.label}</span>
                <ChevronDown size={16} aria-hidden="true" className="shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-48">
              <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(value) => setMode(value as AiMode)}
              >
                {MODES.map(({ id, label, icon: Icon }) => (
                  <DropdownMenuRadioItem key={id} value={id} className="min-h-11">
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* From sm: the segmented control, which fits. min-w-0 + its own
            sideways scroll keep it from ever pushing the history button off
            the screen. */}
        <div className="no-scrollbar hidden min-w-0 flex-1 items-center overflow-x-auto sm:flex">
          <div className="mx-auto flex min-w-max items-center gap-0.5 rounded-lg border border-border bg-muted/35 p-1">
            {MODES.map(({ id, label, icon: Icon }) => {
              const active = mode === id
              return (
                <Button
                  key={id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode(id)}
                  aria-current={active ? "true" : undefined}
                  aria-label={label}
                  className={cn(
                    "relative min-h-11 min-w-11 items-center gap-1.5 overflow-hidden rounded-lg border-0 px-2.5 text-xs font-semibold shadow-none transition-colors active:scale-95 sm:px-3.5",
                    active
                      ? "bg-transparent text-primary-foreground hover:bg-transparent hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="ai-mode-pill"
                      className="absolute inset-0 z-0 rounded-lg bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon size={14} className="relative z-10 shrink-0" />
                  {/* On phones only the active tab shows its label so the 4-mode
                      bar fits; every tab keeps its label from sm up. */}
                  <span className={cn("relative z-10", active ? "inline" : "hidden", "sm:inline")}>
                    {label}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Mobile chat-history trigger; keeps the segmented control centered. */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          {mode === "chat" && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Chat history"
                  className="h-11 w-11 rounded-lg text-muted-foreground active:scale-95 md:hidden"
                >
                  <History size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetTitle className="sr-only">Chat history</SheetTitle>
                <div className="h-full pt-10 pb-[env(safe-area-inset-bottom)]">
                  <ConversationSidebar {...sidebarProps} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* ── Active mode ── */}
      <div className="min-h-0 flex-1">
        {mode === "chat" ? (
          <div className="flex h-full min-h-0">
            {/* Desktop history rail (collapsible) */}
            {!sidebarCollapsed && (
              <aside className="hidden w-64 shrink-0 flex-col border-r border-border/40 bg-background/30 md:flex">
                <ConversationSidebar {...sidebarProps} onCollapse={() => toggleSidebar(true)} />
              </aside>
            )}

            <div className="min-w-0 flex-1">
              <ChatWindow
                key={conversationId ?? "new"}
                title="Hengo"
                subtitle={conversationId ? "Ready to practice Korean" : "Connecting…"}
                conversationId={conversationId ?? undefined}
                initialDraft={initialDraft}
                onNewChat={startNewChat}
                isStartingNewChat={isStartingNewChat}
                onConversationTitled={refresh}
                embedded
                scenario={scenarioContext ?? undefined}
              />
            </div>
          </div>
        ) : mode === "memory" ? (
          <div className="h-full overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-2xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Ask Hengo</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Answers come only from your own notes, journal, goals, and activity — never
                    invented. Every claim links back to where it came from.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href="/ask-hengo/memories">
                    <Settings2 size={14} />
                    Memories
                  </Link>
                </Button>
              </div>
              <AskHengoChat />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">
              {mode === "analyze" ? (
                <MessageAnalyzer />
              ) : mode === "corrections" ? (
                <CorrectionsReview onDone={() => setMode("chat")} />
              ) : (
                <MessageGenerator initialCategory={initialCategory} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
