"use client"

import Image from "next/image"
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/follow-up-suggestions"
import { MarkdownText } from "@/components/assistant-ui/markdown-text"
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning"
import { ToolFallback } from "@/components/assistant-ui/tool-fallback"
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/tool-group"
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button"
import { Button } from "@/components/ui/button"
import { SpeakButton } from "@/components/ui/SpeakButton"
import {
  CHAT_VOICE,
  CHAT_VOICE_INSTRUCTIONS,
  extractKoreanForSpeech,
  parseVoiceSubtitles,
} from "@/lib/chat-voice"
import { cn } from "@/lib/utils"
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  type ToolCallMessagePartComponent,
  useAuiState,
} from "@assistant-ui/react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  Languages,
  MoreHorizontalIcon,
  SquareIcon,
} from "lucide-react"
import {
  createContext,
  useContext,
  type ComponentType,
  type FC,
  type PropsWithChildren,
} from "react"

export type ThreadGroupPart = MessagePrimitive.GroupedParts.GroupPart

/**
 * Optional component overrides for the thread. `AssistantMessage` and
 * `Welcome` replace whole sections; the remaining slots override how the
 * assistant message renders tool calls and part groups. Tool UIs registered
 * by name (toolkit `render`, `useAssistantDataUI`) take precedence over
 * `ToolFallback`.
 */
export type ThreadComponents = {
  AssistantMessage?: ComponentType | undefined
  Welcome?: ComponentType | undefined
  /** Rendered above the composer, inside the sticky footer (e.g. a live-transcript banner). */
  ComposerHeader?: ComponentType | undefined
  /** Rendered at the start of the composer action row (e.g. a mic button). */
  ComposerLeading?: ComponentType | undefined
  ToolFallback?: ToolCallMessagePartComponent | undefined
  ToolGroup?: ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>> | undefined
  ReasoningGroup?: ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>> | undefined
}

export type ThreadProps = {
  components?: ThreadComponents | undefined
}

const EMPTY_COMPONENTS: ThreadComponents = {}

const ThreadComponentsContext = createContext<ThreadComponents>(EMPTY_COMPONENTS)

// Startup exposes a loading placeholder thread; treat it as a new chat so
// the composer mounts centered. Loads after startup keep the docked layout.
const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 && (!s.thread.isLoading || s.threads.isLoading)

export const Thread: FC<ThreadProps> = ({ components = EMPTY_COMPONENTS }) => {
  const isEmpty = useAuiState(isNewChatView)

  return (
    <ThreadComponentsContext.Provider value={components}>
      <ThreadRoot isEmpty={isEmpty} />
    </ThreadComponentsContext.Provider>
  )
}

const ThreadRoot: FC<{ isEmpty: boolean }> = ({ isEmpty }) => {
  const { Welcome = ThreadWelcome } = useContext(ThreadComponentsContext)

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "46rem",
        ["--composer-bg" as string]:
          "color-mix(in oklab, var(--color-muted) 24%, var(--color-background))",
        ["--composer-radius" as string]: "1.5rem",
        ["--composer-padding" as string]: "8px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-3 pt-4 sm:px-5",
            isEmpty && "justify-center",
          )}
        >
          <AuiIf condition={isNewChatView}>
            <Welcome />
          </AuiIf>

          <div
            data-slot="aui_message-group"
            className="mb-12 flex flex-col gap-y-5 empty:hidden sm:gap-y-6"
          >
            <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter
            className={cn(
              "aui-thread-viewport-footer bg-background flex flex-col gap-3 overflow-visible pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-5",
              !isEmpty &&
                "sticky bottom-0 mt-auto rounded-t-(--composer-radius) border-t border-border/40 bg-background/95 pt-3 shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.35)] backdrop-blur-xl",
            )}
          >
            <ThreadScrollToBottom />
            <ThreadFollowupSuggestions />
            <Composer />
            <AuiIf condition={(s) => isNewChatView(s) && s.composer.isEmpty}>
              <ThreadSuggestions />
            </AuiIf>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  )
}

const ThreadMessage: FC = () => {
  const { AssistantMessage: AssistantMessageComponent = AssistantMessage } =
    useContext(ThreadComponentsContext)
  const role = useAuiState((s) => s.message.role)
  const isEditing = useAuiState((s) => s.message.composer.isEditing)

  if (isEditing) return <EditComposer />
  if (role === "user") return <UserMessage />
  return <AssistantMessageComponent />
}

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-14 z-10 size-11 self-center rounded-full p-0 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  )
}

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200">
        How can I help you today?
      </h1>
    </div>
  )
}

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-4">
      <ThreadPrimitive.Suggestions>{() => <ThreadSuggestionItem />}</ThreadPrimitive.Suggestions>
    </div>
  )
}

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors"
        >
          <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1" />
          <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 empty:hidden" />
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  )
}

const Composer: FC = () => {
  const { ComposerHeader } = useContext(ThreadComponentsContext)

  return (
    <div className="aui-composer-wrapper flex w-full flex-col gap-2">
      {ComposerHeader ? <ComposerHeader /> : null}
      <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
        <div
          data-slot="aui_composer-shell"
          className="border-border/70 focus-within:border-blue-500/40 focus-within:ring-4 focus-within:ring-blue-500/[0.06] dark:border-muted-foreground/15 dark:focus-within:border-blue-500/40 flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) shadow-[0_8px_30px_-18px_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.05)] transition-[border-color,box-shadow] focus-within:shadow-[0_10px_34px_-18px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none"
        >
          <ComposerPrimitive.Input
            placeholder="Write or speak in Korean…"
            className="aui-composer-input caret-primary placeholder:text-muted-foreground/45 max-h-40 min-h-11 w-full resize-none bg-transparent px-3 py-1.5 text-base font-medium outline-none"
            rows={1}
            enterKeyHint="send"
            aria-label="Chat message"
          />
          <ComposerAction />
        </div>
      </ComposerPrimitive.Root>
      <p className="aui-composer-disclaimer text-muted-foreground/70 text-center text-[10px] font-medium sm:text-[11px]">
        Tap Korean words for meaning · Hengo can make mistakes.
      </p>
    </div>
  )
}

const ComposerAction: FC = () => {
  const { ComposerLeading } = useContext(ThreadComponentsContext)

  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {ComposerLeading ? <ComposerLeading /> : <span />}
      </div>
      <div className="flex items-center gap-1.5">
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send message"
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send size-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 [@media(pointer:coarse)]:size-11"
              aria-label="Send message"
            >
              <ArrowUpIcon className="aui-composer-send-icon size-4.5" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-cancel size-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 [@media(pointer:coarse)]:size-11"
              aria-label="Stop generating"
            >
              <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  )
}

// correction/translation ride along on ChatMessage rows (see ChatWindow's
// convertMessage) so the coach's "Suggested Improvement" card survives the move
// to assistant-ui message parts.
type MessageCustomMeta = {
  correction?: string
  translation?: string
}

const CorrectionCard: FC = () => {
  const custom = useAuiState((s) => s.message.metadata?.custom as MessageCustomMeta | undefined)
  if (!custom?.correction) return null

  return (
    <div className="fade-in slide-in-from-bottom-1 animate-in mt-3 overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] shadow-sm duration-200">
      <div className="flex items-center gap-2 border-b border-amber-500/10 bg-amber-500/5 px-4 py-2.5">
        <CheckCircle2 size={14} className="text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
        <p className="text-[12px] font-bold tracking-wide text-amber-700 uppercase dark:text-amber-300">
          Suggested Improvement
        </p>
      </div>
      <div className="p-4">
        <div className="text-[15px] leading-relaxed font-bold text-amber-900 dark:text-amber-100">
          {custom.correction}
        </div>
        {custom.translation && (
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-white/50 p-3 dark:bg-black/30">
            <Languages size={14} className="mt-0.5 shrink-0 text-amber-600/60" />
            <p className="text-[13px] leading-relaxed font-medium text-amber-800/80 italic dark:text-amber-200/70">
              {custom.translation}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Reads the message's text so the existing TTS pipeline (SpeakButton → ttsApi)
// can pronounce a reply from the assistant-ui action bar.
const MessageSpeakButton: FC = () => {
  const text = useAuiState((s) =>
    s.message.content
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("\n")
      .trim(),
  )
  const spokenText = extractKoreanForSpeech(text)
  if (!spokenText) return null
  return (
    <SpeakButton
      text={spokenText}
      voice={CHAT_VOICE}
      instructions={CHAT_VOICE_INSTRUCTIONS}
      title="Hear the Korean reply"
      className="inline-flex size-8 items-center justify-center rounded-md p-0 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    />
  )
}

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  )
}

// Voice-mode replies (Korean + labelled EN/RR/FIX lines) render as spoken
// Korean with a subtitle block underneath, instead of the raw labelled text.
// Anything that doesn't match the voice format falls back to markdown.
const AssistantText: FC<{ text: string }> = ({ text }) => {
  const subtitles = parseVoiceSubtitles(text)
  if (!subtitles) return <MarkdownText />

  return (
    <div className="space-y-2.5">
      <p className="text-[17px] font-medium leading-relaxed text-foreground">{subtitles.korean}</p>
      {(subtitles.en || subtitles.rr) && (
        <div className="space-y-1 rounded-xl border border-border/50 bg-muted/40 px-3.5 py-2.5">
          {subtitles.en && (
            <p className="text-[13px] font-medium leading-snug text-muted-foreground">
              <span className="mr-1.5 rounded bg-blue-500/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-blue-700 align-[2px] dark:text-blue-300">
                EN
              </span>
              {subtitles.en}
            </p>
          )}
          {subtitles.rr && (
            <p className="text-[12px] italic leading-snug text-muted-foreground/70">
              {subtitles.rr}
            </p>
          )}
        </div>
      )}
      {subtitles.fix && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            More natural
          </p>
          <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground/90">
            {subtitles.fix}
          </p>
        </div>
      )}
    </div>
  )
}

const AssistantMessage: FC = () => {
  const {
    ToolFallback: ToolFallbackComponent = ToolFallback,
    ToolGroup,
    ReasoningGroup,
  } = useContext(ThreadComponentsContext)

  const ACTION_BAR_PT = "pt-1.5"
  // Keep the action bar inside the contained root's paint box, then cancel its reserved space in flow.
  const ACTION_BAR_HEIGHT = `min-h-7.5 ${ACTION_BAR_PT}`

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative -mb-7.5 flex gap-3 pb-7.5 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-blue-500/15">
        <Image src="/hengo-icon.png" alt="" width={32} height={32} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[11px] font-bold text-foreground/80">Hengo</span>
          <span className="rounded-full bg-blue-500/[0.08] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
            AI Coach
          </span>
        </div>
        <div
          data-slot="aui_assistant-message-content"
          className="text-foreground leading-relaxed wrap-break-word"
        >
          <MessagePrimitive.GroupedParts
            groupBy={groupPartByType({
              reasoning: ["group-chainOfThought", "group-reasoning"],
              "tool-call": ["group-chainOfThought", "group-tool"],
              "standalone-tool-call": [],
            })}
          >
            {({ part, children }) => {
              switch (part.type) {
                case "group-chainOfThought":
                  return <div data-slot="aui_chain-of-thought">{children}</div>
                case "group-tool":
                  if (ToolGroup) {
                    return <ToolGroup group={part}>{children}</ToolGroup>
                  }
                  return (
                    <ToolGroupRoot variant="ghost">
                      <ToolGroupTrigger
                        count={part.indices.length}
                        active={part.status.type === "running"}
                      />
                      <ToolGroupContent>{children}</ToolGroupContent>
                    </ToolGroupRoot>
                  )
                case "group-reasoning": {
                  if (ReasoningGroup) {
                    return <ReasoningGroup group={part}>{children}</ReasoningGroup>
                  }
                  const running = part.status.type === "running"
                  return (
                    <ReasoningRoot streaming={running}>
                      <ReasoningTrigger active={running} />
                      <ReasoningContent aria-busy={running}>
                        <ReasoningText>{children}</ReasoningText>
                      </ReasoningContent>
                    </ReasoningRoot>
                  )
                }
                case "text":
                  return <AssistantText text={part.text} />
                case "reasoning":
                  return <Reasoning {...part} />
                case "tool-call":
                  return part.toolUI ?? <ToolFallbackComponent {...part} />
                case "data":
                  return part.dataRendererUI
                case "indicator":
                  return (
                    <span
                      data-slot="aui_assistant-message-indicator"
                      className="animate-pulse font-sans"
                      aria-label="Assistant is working"
                    >
                      {"●"}
                    </span>
                  )
                default:
                  return null
              }
            }}
          </MessagePrimitive.GroupedParts>
          <CorrectionCard />
          <MessageError />
        </div>

        <div
          data-slot="aui_assistant-message-footer"
          className={cn("flex items-center", ACTION_BAR_HEIGHT)}
        >
          <BranchPicker />
          <AssistantActionBar />
        </div>
      </div>
    </MessagePrimitive.Root>
  )
}

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground animate-in fade-in col-start-3 row-start-2 -ms-1 flex gap-1 duration-200"
    >
      <MessageSpeakButton />
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton tooltip="More" className="data-[state=open]:bg-accent">
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="aui-action-bar-more-content bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none">
              <DownloadIcon className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  )
}

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto] [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 wrap-break-word shadow-sm shadow-blue-600/10 empty:hidden">
          <MessagePrimitive.Parts />
        </div>
        <CorrectionCard />
      </div>

      <BranchPicker
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 row-start-3 -me-1 justify-end"
      />
    </MessagePrimitive.Root>
  )
}

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex flex-col px-2 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <ComposerPrimitive.Root className="aui-edit-composer-root border-border/60 dark:border-muted-foreground/15 ms-auto flex w-full max-w-[85%] flex-col rounded-(--composer-radius) border bg-(--composer-bg) shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-2.5 mb-2.5 flex items-center gap-1.5 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3.5 [@media(pointer:coarse)]:h-11"
            >
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" className="h-8 rounded-full px-3.5 [@media(pointer:coarse)]:h-11">
              Update
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  )
}

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({ className, ...rest }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  )
}
