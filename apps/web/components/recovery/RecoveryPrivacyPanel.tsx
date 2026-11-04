"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { clearRecoveryLock, hasRecoveryLockCredential, setRecoveryPin } from "@/lib/recovery-lock"
import { recoveryNotificationText } from "@/lib/recovery-notifications"
import type { RecoveryPrivacySettings } from "@/lib/types"

const DEFAULTS: RecoveryPrivacySettings = {
  lockEnabled: false,
  discreetNotifications: true,
  morningReminder: false,
  eveningReminder: false,
  riskTimeReminder: false,
  bedtimeReminder: false,
  weeklyReviewReminder: false,
  aiConsent: false,
}

export function RecoveryPrivacyPanel({
  settings,
  onSave,
  onExport,
  onDelete,
}: {
  settings?: RecoveryPrivacySettings
  onSave: (settings: RecoveryPrivacySettings) => Promise<unknown>
  onExport: () => Promise<{ exportedAt: string; data: Record<string, unknown[]> }>
  onDelete: () => Promise<void>
}) {
  const router = useRouter()
  const [form, setForm] = useState<RecoveryPrivacySettings>(settings ?? DEFAULTS)
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [confirmDelete, setConfirmDelete] = useState("")
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState("")
  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])
  const patch = (data: Partial<RecoveryPrivacySettings>) =>
    setForm((current) => ({ ...current, ...data }))

  const save = async () => {
    setMessage("")
    if (form.lockEnabled && !hasRecoveryLockCredential()) {
      if (!/^\d{4,8}$/.test(pin)) {
        setMessage("Use a 4–8 digit PIN.")
        return
      }
      if (pin !== confirmPin) {
        setMessage("PINs do not match.")
        return
      }
      await setRecoveryPin(pin)
    }
    if (!form.lockEnabled) clearRecoveryLock()
    setSaving(true)
    try {
      await onSave(form)
      setPin("")
      setConfirmPin("")
      setMessage("Privacy settings saved.")
    } finally {
      setSaving(false)
    }
  }
  const exportData = async () => {
    setExporting(true)
    try {
      const data = await onExport()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `hengo-recovery-export-${data.exportedAt.slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }
  const deleteData = async () => {
    setDeleting(true)
    try {
      await onDelete()
      clearRecoveryLock()
      router.push("/growth/recovery")
    } finally {
      setDeleting(false)
    }
  }
  const toggles: Array<{ key: keyof RecoveryPrivacySettings; label: string; description: string }> =
    [
      {
        key: "morningReminder",
        label: "Morning check-in",
        description: "Your Hengo check-in is ready.",
      },
      {
        key: "eveningReminder",
        label: "Evening reflection",
        description: "Take one minute to protect tomorrow.",
      },
      {
        key: "riskTimeReminder",
        label: "High-risk-time reminder",
        description: "A five-minute action is enough right now.",
      },
      {
        key: "bedtimeReminder",
        label: "Bedtime protection",
        description: "Prepare a calm end to the day.",
      },
      {
        key: "weeklyReviewReminder",
        label: "Weekly review",
        description: "Remember the reason you started.",
      },
    ]
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex gap-3">
          <LockKeyhole size={19} className="mt-0.5 text-primary" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Recovery Lock</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  A local PIN hides this workspace on this device. It is not account encryption.
                </p>
              </div>
              <Switch
                checked={form.lockEnabled}
                onCheckedChange={(checked) => patch({ lockEnabled: checked })}
                aria-label="Enable Recovery Lock"
              />
            </div>
            {form.lockEnabled && !hasRecoveryLockCredential() && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                  maxLength={8}
                  placeholder="4–8 digit PIN"
                  aria-label="New Recovery PIN"
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
                  maxLength={8}
                  placeholder="Confirm PIN"
                  aria-label="Confirm Recovery PIN"
                />
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Discreet notifications</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Private labels stay off the lock screen by default.
            </p>
          </div>
          <Switch
            checked={form.discreetNotifications}
            onCheckedChange={(checked) => patch({ discreetNotifications: checked })}
            aria-label="Use discreet notification previews"
          />
        </div>
        <div className="mt-4 rounded-2xl bg-muted/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <p className="mt-1 text-sm font-medium">Hengo</p>
          <p className="mt-1 text-sm text-muted-foreground">{recoveryNotificationText(form)}</p>
        </div>
        <label htmlFor="notification-text" className="mt-4 block text-sm font-medium">
          Custom wording <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="notification-text"
          className="mt-2"
          value={form.customNotificationText ?? ""}
          onChange={(event) => patch({ customNotificationText: event.target.value || undefined })}
          maxLength={120}
          placeholder="Your Hengo check-in is ready."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="quiet-start" className="text-sm font-medium">
              Quiet hours start
            </label>
            <Input
              id="quiet-start"
              type="time"
              className="mt-2"
              value={form.quietHoursStart ?? ""}
              onChange={(event) => patch({ quietHoursStart: event.target.value || undefined })}
            />
          </div>
          <div>
            <label htmlFor="quiet-end" className="text-sm font-medium">
              Quiet hours end
            </label>
            <Input
              id="quiet-end"
              type="time"
              className="mt-2"
              value={form.quietHoursEnd ?? ""}
              onChange={(event) => patch({ quietHoursEnd: event.target.value || undefined })}
            />
          </div>
        </div>
        <div className="mt-5 divide-y divide-border">
          {toggles.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={Boolean(form[item.key])}
                onCheckedChange={(checked) => patch({ [item.key]: checked })}
                aria-label={`Enable ${item.label}`}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">AI consent</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Recovery records and notes are never sent to an AI route unless you explicitly enable
              consent and request an AI action.
            </p>
          </div>
          <Switch
            checked={form.aiConsent}
            onCheckedChange={(checked) => patch({ aiConsent: checked })}
            aria-label="Allow explicit AI recovery requests"
          />
        </div>
      </section>
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
      <Button size="lg" onClick={save} disabled={saving} className="w-full sm:w-auto">
        <ShieldCheck size={17} />
        {saving ? "Saving…" : "Save privacy settings"}
      </Button>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Your data</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Export includes only rows visible to your authenticated account. Permanent deletion
          removes Recovery data but leaves unrelated Hengo goals, habits, and learning history
          intact.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={exportData} disabled={exporting}>
            <Download size={16} />
            {exporting ? "Preparing…" : "Export Recovery data"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                <Trash2 size={16} />
                Delete Recovery data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete Recovery data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes targets, events, check-ins, plans, triggers, reviews, protection
                  items, contacts, and privacy settings. It cannot be undone. Type DELETE to
                  continue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.value)}
                aria-label="Type DELETE to confirm"
                placeholder="DELETE"
              />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting || confirmDelete !== "DELETE"}
                  onClick={deleteData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting…" : "Delete permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  )
}
