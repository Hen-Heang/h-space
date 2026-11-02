"use client"

import { AlertCircle, Info, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MIC_ACCESS_COPY, type MicAccess } from "@/lib/mic-access"
import { cn } from "@/lib/utils"

/**
 * Explains why voice answers can't (or might not) work. Never blocks: when
 * recording can't work the answer box has already switched to typing, so the
 * only action here is retrying the microphone.
 */
export function MicAccessNotice({
  access,
  typing,
  onRetry,
}: {
  access: MicAccess
  typing: boolean
  onRetry?: () => void
}) {
  if (access === "ready") return null
  // The browser prompt explains itself once the learner taps Record; only
  // mention it (and the privacy note) while voice is the chosen path.
  if (access === "needs-permission" && typing) return null

  const copy = MIC_ACCESS_COPY[access]
  const isAlert = copy.tone === "alert"
  const Icon = isAlert ? AlertCircle : Info

  return (
    <div
      role={isAlert ? "alert" : "status"}
      className={cn(
        "rounded-2xl border p-4",
        isAlert ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            isAlert ? "text-amber-600" : "text-muted-foreground",
          )}
        />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-foreground">{copy.title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
          {copy.steps && (
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
              {copy.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
          {(access === "blocked" || access === "no-mic") && onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry} className="h-10">
              <RotateCcw aria-hidden="true" /> Try the microphone again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
