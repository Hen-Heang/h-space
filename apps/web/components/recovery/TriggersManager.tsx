"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { itemVariants } from "@/lib/motion"
import type { RecoveryTrigger, TriggerCategory } from "@/lib/types"

const CATEGORIES: Array<{ value: TriggerCategory; label: string }> = [
  { value: "emotion", label: "Emotion" },
  { value: "time", label: "Time" },
  { value: "location", label: "Location" },
  { value: "device", label: "Device" },
  { value: "content_source", label: "Content source" },
  { value: "situation", label: "Situation" },
  { value: "sleep", label: "Sleep" },
  { value: "stress", label: "Stress" },
  { value: "social_connection", label: "Social connection" },
  { value: "previous_activity", label: "Previous activity" },
]

function categoryLabel(category: TriggerCategory) {
  return CATEGORIES.find((item) => item.value === category)?.label ?? "Situation"
}

function TriggerRow({
  trigger,
  onUpdate,
  onDelete,
}: {
  trigger: RecoveryTrigger
  onUpdate: (label: string, category: TriggerCategory) => Promise<unknown>
  onDelete: () => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(trigger.label)
  const [category, setCategory] = useState<TriggerCategory>(trigger.category)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!label.trim() || saving) return
    setSaving(true)
    try {
      await onUpdate(label.trim(), category)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="grid gap-2 rounded-xl border border-border bg-card p-2 sm:grid-cols-[1fr_10rem_auto_auto]">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          autoFocus
          className="h-9"
        />
        <Select value={category} onValueChange={(value) => setCategory(value as TriggerCategory)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} disabled={saving || !label.trim()}>
          Save
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            setLabel(trigger.label)
            setCategory(trigger.category)
            setEditing(false)
          }}
        >
          <X size={16} />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
      <span className="min-w-0 text-sm text-foreground">
        <span className="block truncate">{trigger.label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {categoryLabel(trigger.category)}
        </span>
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setEditing(true)}
          aria-label="Rename trigger"
        >
          <Pencil size={14} />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Delete trigger">
              <Trash2 size={14} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this trigger?</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{trigger.label}&quot; will no longer show up as a chip when logging. Past
                check-ins that used it keep their own record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export function TriggersManager({
  triggers,
  onAdd,
  onUpdate,
  onDelete,
}: {
  triggers: RecoveryTrigger[]
  onAdd: (label: string, category: TriggerCategory) => Promise<unknown>
  onUpdate: (id: string, label: string, category: TriggerCategory) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}) {
  const [newLabel, setNewLabel] = useState("")
  const [newCategory, setNewCategory] = useState<TriggerCategory>("situation")
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim() || adding) return
    setAdding(true)
    try {
      await onAdd(newLabel.trim(), newCategory)
      setNewLabel("")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <motion.form
        variants={itemVariants}
        onSubmit={handleAdd}
        className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]"
      >
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="e.g. after a stressful meeting"
          maxLength={60}
        />
        <Select
          value={newCategory}
          onValueChange={(value) => setNewCategory(value as TriggerCategory)}
        >
          <SelectTrigger className="h-11" aria-label="Trigger category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="icon"
          disabled={adding || !newLabel.trim()}
          aria-label="Add trigger"
        >
          <Plus size={18} />
        </Button>
      </motion.form>

      {triggers.length === 0 ? (
        <motion.p variants={itemVariants} className="text-sm text-muted-foreground">
          No triggers yet — add one above so it shows up as a chip when logging.
        </motion.p>
      ) : (
        <div className="space-y-2">
          {triggers.map((trigger) => (
            <motion.div key={trigger.id} variants={itemVariants}>
              <TriggerRow
                trigger={trigger}
                onUpdate={(label, category) => onUpdate(trigger.id, label, category)}
                onDelete={() => onDelete(trigger.id)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
