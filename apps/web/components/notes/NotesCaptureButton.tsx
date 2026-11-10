"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Inbox } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { useInboxMutations } from "@/hooks/useInbox"
import { getApiErrorMessage } from "@/lib/api"
import { buildCaptureInput } from "@/lib/notes-home"

/**
 * "Save to inbox" — Notes Home's quick capture. Writes an Inbox item (type
 * "note") to organize later; "New note" stays the way into the editor. The
 * text is kept if saving fails.
 */
export function NotesCaptureButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [hint, setHint] = useState(false)
  const { capture } = useInboxMutations()

  const save = async () => {
    const input = buildCaptureInput(text)
    if (!input) {
      setHint(true)
      return
    }
    try {
      await capture.mutateAsync(input)
      setText("")
      setHint(false)
      setOpen(false)
      toast.success("Saved to Inbox. Organize it later.", {
        action: { label: "Open Inbox", onClick: () => router.push("/inbox") },
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save to Inbox. Your text is still here."))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md">
          <Inbox size={16} aria-hidden="true" />
          Save to inbox
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] space-y-2.5">
        <label htmlFor="notes-capture-text" className="text-sm font-semibold text-foreground">
          Save to inbox
        </label>
        <Textarea
          id="notes-capture-text"
          rows={4}
          value={text}
          autoFocus
          onChange={(e) => {
            setText(e.target.value)
            if (hint) setHint(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void save()
            }
          }}
          placeholder="Jot down advice, an idea or a question. Organize it later."
          aria-invalid={hint || undefined}
          aria-describedby={hint ? "notes-capture-hint" : "notes-capture-help"}
          className="min-h-24 text-base sm:text-sm"
        />
        {hint ? (
          <p id="notes-capture-hint" role="alert" className="text-xs text-destructive">
            Type something to save first.
          </p>
        ) : (
          <p id="notes-capture-help" className="text-xs text-muted-foreground">
            Goes to your Inbox, not into Notes.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="h-11" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="h-11" onClick={save} disabled={capture.isPending}>
            {capture.isPending ? "Saving…" : "Save to inbox"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
