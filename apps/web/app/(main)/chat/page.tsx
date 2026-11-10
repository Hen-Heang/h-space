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
  Languages,
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useConversations } from "@/hooks/useConversations"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { chatApi, scenarioApi } from "@/lib/api"
import { aiModeHref, isAiMode, resolveAiMode, type AiMode } from "@/lib/chat-modes"
import { isNotesEnabled } from "@/lib/feature-flags"
import { ASK_HENGO_LABEL, aiCoachItem, askHengoItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

type ModeOption = { id: AiMode; label: string; icon: typeof MessageCircle }

// The two assistant modes, always visible as a switch at the top. "chat" is
// the default (bare /chat); "memory" is Search my workspace (?mode=memory).
const ASSISTANT_MODES: ModeOption[] = [
  { id: "chat", label: aiCoachItem.label, icon: MessageCircle },
  { id: "memory", label: askHengoItem.label, icon: BrainCircuit },
]

// Korean coaching tools — kept, with their ?mode= links, behind one menu so
// the two assistant modes stay the obvious choice.
const KOREAN_TOOLS: ModeOption[] = [
  { id: "analyze", label: "Analyze", icon: ScanText },
  { id: "generate", label: "Write", icon: Wand2 },
  { id: "corrections", label: "Review", icon: RotateCcw },
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

  // The URL is the mode's single source of truth, so a link to /chat (the
  // top bar's Ask Hengo) or /chat?mode=… always shows that mode, even when
  // the page is already open in another one. A ?prompt= deep link is a
  // chat request, so it always lands on General chat.
  const mode = resolveAiMode(searchParams)
  const activeTool = KOREAN_TOOLS.find((m) => m.id === mode)
  const ActiveToolIcon = activeTool?.icon

  const setMode = useCallback(
    (next: AiMode) => router.replace(aiModeHref(next), { scroll: false }),
    [router],
  )

  // One-shot: drop the consumed ?prompt=/?category=/?conversationId= params
  // (and any unknown ?mode=) so a refresh or shared link just names the mode.
  useEffect(() => {
    router.replace(aiModeHref(mode), { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          role="alert"
          className="app-surface flex max-w-sm flex-col items-center gap-4 p-8 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle aria-hidden="true" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Couldn&apos;t start a conversation
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{error}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", containerHeight)}>
      {/* ── Assistant bar: back · General chat | Search my workspace · Korean tools ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border/40 bg-background/75 px-3 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur-xl sm:px-5">
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

        {/* Phones: the assistant's name on the first row; the mode switch
            takes its own full-width row below so both labels stay readable. */}
        <p className="min-w-0 flex-1 truncate text-base font-semibold text-foreground sm:hidden">
          {ASK_HENGO_LABEL}
        </p>

        {/* The mode switch. Text labels on every width; the filled segment is
            the active mode (also announced via aria-pressed). */}
        <div className="order-last flex basis-full justify-center sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto">
          <div
            role="group"
            aria-label="Assistant mode"
            className="flex w-full items-center gap-0.5 rounded-lg border border-border bg-muted/35 p-1 sm:w-auto"
          >
            {ASSISTANT_MODES.map(({ id, label, icon: Icon }) => {
              const active = mode === id
              return (
                <Button
                  key={id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode(id)}
                  aria-pressed={active}
                  className={cn(
                    "relative min-h-11 flex-1 items-center gap-1.5 overflow-hidden rounded-md border-0 px-3 text-sm font-semibold shadow-none transition-colors active:scale-95 sm:flex-none sm:px-4",
                    active
                      ? "bg-transparent text-primary-foreground hover:bg-transparent hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="ai-mode-pill"
                      className="absolute inset-0 z-0 rounded-md bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  {/* Phones drop the icon and let the label wrap rather than
                      truncate it — the mode's name must stay readable. */}
                  <Icon
                    size={15}
                    aria-hidden="true"
                    className="relative z-10 hidden shrink-0 sm:block"
                  />
                  <span className="relative z-10 whitespace-normal text-center leading-tight sm:whitespace-nowrap">
                    {label}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Korean coaching tools (Analyze / Write / Review) — still one tap
            away and still linkable via ?mode=. Names the tool when one is
            open, so the active mode is always visible in this bar. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "min-h-11 shrink-0 gap-1.5 rounded-lg px-3 text-sm font-semibold",
                activeTool && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15",
              )}
            >
              {ActiveToolIcon ? (
                <ActiveToolIcon size={15} aria-hidden="true" />
              ) : (
                <Languages size={15} aria-hidden="true" />
              )}
              {activeTool ? (
                <>
                  <span className="sr-only">Korean tool: </span>
                  {activeTool.label}
                </>
              ) : (
                <>
                  {/* "Tools" on phones leaves room for the assistant's name;
                      the menu inside is headed "Korean tools". */}
                  <span className="sm:hidden">Tools</span>
                  <span className="hidden sm:inline">Korean tools</span>
                </>
              )}
              <ChevronDown size={15} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuLabel>Korean tools</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={activeTool?.id ?? ""}
              onValueChange={(value) => {
                if (isAiMode(value)) setMode(value)
              }}
            >
              {KOREAN_TOOLS.map(({ id, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={id} value={id} className="min-h-11">
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile chat-history trigger; keeps the segmented control centered. */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center md:hidden">
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
                subtitle={conversationId ? "Ask, draft, or brainstorm" : "Connecting…"}
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
                  {/* From md the shell header's h1 already names the mode, so
                      the visible title would say it twice. */}
                  <h2 className="text-xl font-semibold text-foreground md:sr-only">
                    {askHengoItem.label}
                  </h2>
                  {/* Keep in step with lib/server/memory-retrieval.ts — the
                      sources it actually reads. */}
                  <p className="mt-1 text-sm text-muted-foreground">
                    Searches your {isNotesEnabled() ? "saved notes, " : ""}inbox captures, and
                    journal entries, and also uses
                    your approved memories, goals, completed tasks, and logged activity. Answers
                    come only from these and link back to where they came from.
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
