"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { romanize } from "es-hangul"
import { CheckCircle2, Loader2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { phrasebookApi, getApiErrorMessage } from "@/lib/api"
import {
  draftProvenance,
  draftToCardContent,
  type WorkCardDraft,
} from "@/lib/korean-phrasebook/work"

const MAX_MESSAGE = 300

function withRomanizationFallback(draft: WorkCardDraft): WorkCardDraft {
  // The model romanizes short messages; anything missing is pre-filled
  // with the rule-based romanizer and marked for checking — never left to
  // fail silently.
  const safe = (text: string) => {
    try {
      return text ? romanize(text) : ""
    } catch {
      return ""
    }
  }
  return {
    ...draft,
    messageRomanization:
      draft.messageRomanization ||
      (draft.messageKorean.length <= MAX_MESSAGE ? safe(draft.messageKorean) : ""),
    replyRomanization: draft.replyRomanization || safe(draft.replyKorean),
  }
}

// Review-before-save: the learner sees and edits exactly what will be stored.
// Nothing is written until "Save card"; the write itself is idempotent
// (phrasebookApi.saveWorkCapture), so a double click or a retry after a
// timeout can't create a second card.
export function SaveToPhrasebookDialog({
  open,
  onOpenChange,
  initialDraft,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDraft: WorkCardDraft
}) {
  const ids = useId()
  const [draft, setDraft] = useState(() => withRomanizationFallback(initialDraft))
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ id: string; created: boolean } | null>(null)

  const provenance = draftProvenance(draft)
  const set = <K extends keyof WorkCardDraft>(key: K, value: WorkCardDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  async function save() {
    if (saving) return
    const validation = draftToCardContent(draft)
    if (!validation.ok) {
      setErrors(validation.errors)
      return
    }
    setErrors([])
    setSaving(true)
    try {
      const { card, created } = await phrasebookApi.saveWorkCapture(
        validation.content,
        validation.sourceKey,
      )
      setSaved({ id: card.id, created })
    } catch (err) {
      setErrors([getApiErrorMessage(err, "Couldn't save the card. Please try again.")])
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Save to Phrasebook</DialogTitle>
          <DialogDescription>
            Check and edit what will be saved. It goes to your private “My work messages” collection
            — only you can see it. Remove anything confidential first.
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div role="status" className="space-y-4 py-2">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-emerald-600"
              />
              {saved.created
                ? "Saved. It's in My work messages and can come up in today's practice."
                : "This message and reply were already in your Phrasebook — nothing was duplicated."}
            </p>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button asChild>
                <Link
                  href={`/phrasebook/practice?mode=work&phraseId=${encodeURIComponent(saved.id)}`}
                >
                  Practice it now
                </Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <fieldset className="space-y-3">
              <legend className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                The message
                <Badge variant="secondary">
                  {provenance === "quoted" ? "Exact message" : "Your paraphrase"}
                </Badge>
              </legend>
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-msg`}>Korean</Label>
                <Textarea
                  id={`${ids}-msg`}
                  lang="ko"
                  value={draft.messageKorean}
                  onChange={(e) => set("messageKorean", e.target.value)}
                  rows={3}
                  className="text-base leading-7"
                  aria-describedby={`${ids}-msg-hint`}
                />
                <p
                  id={`${ids}-msg-hint`}
                  className={
                    draft.messageKorean.length > MAX_MESSAGE
                      ? "text-xs font-medium text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {draft.messageKorean.length}/{MAX_MESSAGE} ·{" "}
                  {draft.messageKorean.length > MAX_MESSAGE
                    ? "Shorten it to the part you want to practice."
                    : "Editing it marks the card as your paraphrase, not a quotation."}
                </p>
              </div>
              <Field
                id={`${ids}-msg-rom`}
                label="Romanization (check it)"
                value={draft.messageRomanization}
                onChange={(v) => set("messageRomanization", v)}
              />
              <Field
                id={`${ids}-msg-en`}
                label="English meaning"
                value={draft.messageEnglish}
                onChange={(v) => set("messageEnglish", v)}
              />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                Reply to practice
                <Badge variant="secondary">AI-suggested</Badge>
              </legend>
              <Field
                id={`${ids}-reply`}
                label="Korean"
                lang="ko"
                value={draft.replyKorean}
                onChange={(v) => set("replyKorean", v)}
              />
              <Field
                id={`${ids}-reply-rom`}
                label="Romanization (check it)"
                value={draft.replyRomanization}
                onChange={(v) => set("replyRomanization", v)}
              />
              <Field
                id={`${ids}-reply-en`}
                label="English meaning"
                value={draft.replyEnglish}
                onChange={(v) => set("replyEnglish", v)}
              />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground">Notes</legend>
              <Field
                id={`${ids}-main`}
                label="Main point"
                value={draft.workContext.mainPoint}
                onChange={(v) => set("workContext", { ...draft.workContext, mainPoint: v })}
              />
              <Field
                id={`${ids}-todo`}
                label="What to do"
                value={draft.workContext.requiredAction}
                onChange={(v) => set("workContext", { ...draft.workContext, requiredAction: v })}
              />
              {draft.vocabulary.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground">Useful language</p>
                  <ul className="mt-1.5 flex flex-wrap gap-2">
                    {draft.vocabulary.map((v, i) => (
                      <li key={`${v.korean}-${i}`}>
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              "vocabulary",
                              draft.vocabulary.filter((_, j) => j !== i),
                            )
                          }
                          aria-label={`Remove ${v.korean}`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span lang="ko" className="font-semibold">
                            {v.korean}
                          </span>
                          <span className="text-muted-foreground">{v.english}</span>
                          <X aria-hidden="true" className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Field
                id={`${ids}-label`}
                label="Private label (optional)"
                placeholder="e.g. team chat, review comment"
                maxLength={100}
                value={draft.sourceLabel}
                onChange={(v) => set("sourceLabel", v)}
              />
            </fieldset>

            {errors.length > 0 && (
              <ul role="alert" className="space-y-1 text-sm font-medium text-destructive">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                {saving ? "Saving…" : "Save card"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  lang,
  placeholder,
  maxLength = 300,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  lang?: string
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        lang={lang}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-base sm:text-sm"
      />
    </div>
  )
}
