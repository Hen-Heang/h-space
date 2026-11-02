"use client"

import { useId, useState } from "react"
import { ClipboardCopy, ExternalLink, MessageCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useSavedScript } from "@/hooks/useExamPrepHome"
import { buildVoicePracticePrompt, CHATGPT_URL, type VoicePracticeStyle } from "@/lib/chatgpt-voice"
import { scriptSectionsForDisplay } from "@/lib/exam-prep-home"
import type { InterviewTopic } from "@/lib/interview"

/**
 * Optional free-form conversation practice in ChatGPT's voice mode. H-Space
 * only prepares a prompt to copy and opens ChatGPT in a new tab: no API call,
 * and nothing said there is saved, scored, or synced back.
 */
export function ChatGptVoiceCard({
  topic,
  style = "practice",
}: {
  topic: InterviewTopic
  style?: VoicePracticeStyle
}) {
  const headingId = useId()
  const switchId = useId()
  const previewId = useId()
  const [includeScript, setIncludeScript] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const saved = useSavedScript(topic.id)
  const prompt = buildVoicePracticePrompt({
    topic,
    style,
    script: includeScript ? scriptSectionsForDisplay(topic, saved.snapshot) : null,
  })

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success("Prompt copied — paste it into ChatGPT")
    } catch {
      // Clipboard blocked: show the text so it can be selected by hand.
      setShowPreview(true)
      toast.error("Couldn't copy. Select the prompt below and copy it yourself.")
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5"
    >
      <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageCircle aria-hidden="true" className="size-4 text-primary" />
        Free conversation with ChatGPT Voice
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        For open-ended speaking beyond your question bank. It runs in ChatGPT, outside H-Space —
        nothing you say there is saved, scored, or synced here.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Copy the practice prompt.</li>
        <li>Open ChatGPT and paste it.</li>
        <li>Tap ChatGPT&apos;s voice button and start talking.</li>
      </ol>

      <div className="mt-4 flex items-center gap-3">
        <Switch id={switchId} checked={includeScript} onCheckedChange={setIncludeScript} />
        <label htmlFor={switchId} className="text-sm text-foreground">
          Include my script in the prompt
        </label>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        The prompt always includes your exam topic and question plan
        {includeScript
          ? ", plus your script."
          : ". Your script stays out unless you switch this on."}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => void copyPrompt()} className="h-11">
          <ClipboardCopy aria-hidden="true" /> Copy practice prompt
        </Button>
        <Button asChild variant="outline" className="h-11">
          <a href={CHATGPT_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" /> Open ChatGPT
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setShowPreview((value) => !value)}
        aria-expanded={showPreview}
        aria-controls={previewId}
        className="relative mt-3 text-xs font-medium text-muted-foreground underline-offset-4 after:absolute after:-inset-3 hover:text-foreground hover:underline"
      >
        {showPreview ? "Hide the prompt" : "See exactly what's shared"}
      </button>
      <pre
        id={previewId}
        hidden={!showPreview}
        className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-3 text-xs leading-relaxed text-foreground"
      >
        {prompt}
      </pre>
    </section>
  )
}
