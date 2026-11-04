"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Cloud,
  CloudCheck,
  Download,
  Eye,
  FileText,
  History,
  Languages,
  ListTree,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ListenRepeatPractice } from "@/components/interview/ListenRepeatPractice"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SpeakButton } from "@/components/ui/SpeakButton"
import { Button } from "@/components/ui/button"
import { interviewApi } from "@/lib/api"
import type { InterviewScript, ScriptVersion } from "@/lib/api/interview"
import {
  buildQADocument,
  buildScriptDocument,
  getSeedQA,
  INTERVIEW_TOPICS,
  type QAItem,
} from "@/lib/interview"
import { duplicateVersionLabel, suggestUniqueVersionLabel } from "@/lib/interview-practice"
import { SCRIPT_DUE_LABEL } from "@/lib/study-plan"
import { cn } from "@/lib/utils"

const topic = INTERVIEW_TOPICS[0]
const SCRIPT_MODES = ["script", "qa", "read", "repeat"] as const
type ScriptMode = (typeof SCRIPT_MODES)[number]

const subscribeNever = () => () => undefined
function readTabParam(): ScriptMode | null {
  const tab = new URLSearchParams(window.location.search).get("tab")
  return tab && (SCRIPT_MODES as readonly string[]).includes(tab) ? (tab as ScriptMode) : null
}

const STORAGE_KEY = `koriai-interview-script:${topic.id}`
const STORAGE_UPDATED_AT_KEY = `${STORAGE_KEY}:updated-at`
// Custom (user-added) section definitions live separately from the section text
// so the existing per-topic text payload keeps syncing to the backend unchanged.
const CUSTOM_KEY = `koriai-interview-script-custom:${topic.id}`

// Custom (user-added) Q&A questions. Like custom sections, the question text is
// frontend-only; the ANSWER rides in `values` (keyed by the item id) and syncs.
const QA_CUSTOM_KEY = `koriai-interview-qa-custom:${topic.id}`

/** A section the candidate adds themselves, beyond the fixed exam outline. */
type CustomSection = { id: string; title: string }

/** A Q&A question the candidate adds, beyond the seeded likely questions. */
type CustomQA = { id: string; questionKo: string }

// SSR-safe localStorage JSON helpers — return the fallback when there's no
// window, no value, or a parse error; swallow quota / private-mode write errors.
function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function loadLocalUpdatedAt(): number {
  if (typeof window === "undefined") return 0
  try {
    const value = window.localStorage.getItem(STORAGE_UPDATED_AT_KEY)
    const timestamp = value ? Date.parse(value) : Number.NaN
    return Number.isFinite(timestamp) ? timestamp : 0
  } catch {
    return 0
  }
}

function saveScriptLocally(value: Record<string, string>, updatedAt = new Date()) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  window.localStorage.setItem(STORAGE_UPDATED_AT_KEY, updatedAt.toISOString())
}

const loadInitialQA = (): CustomQA[] => loadJSON<CustomQA[]>(QA_CUSTOM_KEY, [])
const loadInitial = (): Record<string, string> => loadJSON<Record<string, string>>(STORAGE_KEY, {})
const loadInitialCustom = (): CustomSection[] => loadJSON<CustomSection[]>(CUSTOM_KEY, [])

function countWords(text: string) {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

// Fill any missing/empty outline section (and its English translation) from
// the candidate's drafted script. The seed IS the candidate's own draft, so a
// blank section always falls back to it — this replaces the old one-time seed
// flag, which left the whole script blank whenever an account sync carried
// only empty Q&A keys (they counted as "content", so seeding never ran).
function withSeedDefaults(current: Record<string, string>): Record<string, string> {
  const next = { ...current }
  let changed = false
  for (const [id, text] of Object.entries(topic.scriptSeed ?? {})) {
    if (!(next[id] ?? "").trim()) {
      next[id] = text
      changed = true
    }
  }
  for (const [id, text] of Object.entries(topic.scriptSeedEn ?? {})) {
    const key = `en-${id}`
    if (!(next[key] ?? "").trim()) {
      next[key] = text
      changed = true
    }
  }
  return changed ? next : current
}

// Only a custom section's TEXT syncs to the account (under its `custom-*` key);
// its definition (title/order) lives in localStorage. Text that arrives from the
// account — or survives a cache clear — can therefore lack a definition, which
// would hide it and silently drop it from the export. Re-create a placeholder
// definition for any such orphaned key so the work is always visible and saved.
function reconcileCustom(custom: CustomSection[], values: Record<string, string>): CustomSection[] {
  const known = new Set(custom.map((s) => s.id))
  const orphans = Object.keys(values)
    .filter(
      (id) => id.startsWith("custom-") && !known.has(id) && (values[id] ?? "").trim().length > 0,
    )
    .map((id) => ({ id, title: "" }))
  return orphans.length > 0 ? [...custom, ...orphans] : custom
}

// Borderless, auto-growing textarea so each section flows like document body
// text instead of a boxed form field.
function DocTextarea({
  value,
  onChange,
  placeholder,
  label,
  lang,
}: {
  value: string
  onChange: (text: string) => void
  placeholder: string
  /** Accessible name — the placeholder disappears once there's text. */
  label: string
  /** "ko" for Korean fields: correct screen-reader voice and CJK line breaking. */
  lang?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      lang={lang}
      rows={1}
      className="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-[1.9] text-slate-800 outline-none placeholder:text-slate-500 focus:ring-0 dark:text-slate-200 dark:placeholder:text-slate-400"
    />
  )
}

export default function InterviewScriptPage() {
  const outline = useMemo(() => topic.scriptOutline ?? [], [])
  const [values, setValues] = useState<Record<string, string>>(loadInitial)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [synced, setSynced] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [activeSection, setActiveSection] = useState<string>("")
  const [customSections, setCustomSections] = useState<CustomSection[]>(loadInitialCustom)
  // Deep link: /interview/script?tab=repeat (from /interview/repeat), qa, or
  // read. Read as an external store so the server renders "script" and the
  // client switches after hydration without a mismatch; a tap overrides it.
  const urlTab = useSyncExternalStore(subscribeNever, readTabParam, () => null)
  const [chosenMode, setMode] = useState<ScriptMode | null>(null)
  const mode: ScriptMode = chosenMode ?? urlTab ?? "script"
  // Show/hide English support in both the Script and Q&A Prep views.
  const [showEnglish, setShowEnglish] = useState(true)
  // Starts from the hardcoded seed (instant, offline-safe) and upgrades to the
  // DB-backed question bank (kori_interview_questions) once it loads — that
  // table is the real seed source now (supabase/seed/kori_interview_questions.sql)
  // and is what "Focus on weak questions" mode on /interview/speaking reads too.
  const [bankQA, setBankQA] = useState<QAItem[]>(() => getSeedQA(topic))
  const [qaAnswerEnglish, setQaAnswerEnglish] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (topic.prep?.sampleQuestions ?? [])
        .map((question, index) => [`qa-seed-${index}`, question.answerEn ?? ""] as const)
        .filter(([, answer]) => answer.trim().length > 0),
    ),
  )
  const [customQA, setCustomQA] = useState<CustomQA[]>(loadInitialQA)
  // Named snapshots layered on top of the autosaving draft (kori_interview_scripts,
  // untouched by this) — "Original" / "Script V1" / "Mentor Correction" / etc.
  const [versions, setVersions] = useState<ScriptVersion[]>([])
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [previewVersion, setPreviewVersion] = useState<ScriptVersion | null>(null)
  useEffect(() => {
    interviewApi
      .listScriptVersions(topic.id)
      .then(setVersions)
      .catch(() => {})
  }, [])
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Avoid a hydration mismatch: the server has no localStorage, so render the
  // stored content only after mount (same technique as the app shell).
  const mounted = useSyncExternalStore(
    (callback) => {
      queueMicrotask(callback)
      return () => undefined
    },
    () => true,
    () => false,
  )

  useEffect(() => {
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current)
    }
  }, [])

  // Push the latest script to the account a moment after typing stops. Failures
  // are silent — the local autosave already guarantees the work is kept.
  function scheduleSync(next: Record<string, string>) {
    if (syncTimeout.current) clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => {
      interviewApi
        .saveScript(topic.id, next)
        .then(() => setSynced(true))
        .catch(() => {})
    }, 1500)
  }

  // Best-effort hydrate from the account, then fill any still-empty sections
  // from the drafted script. Compare timestamps so a newer account copy (for
  // example, a mentor-updated final draft) can replace a stale browser cache,
  // while genuinely newer local edits still win. Legacy caches have no
  // timestamp and therefore yield to the account copy once.
  useEffect(() => {
    let active = true
    const hasText = (map: Record<string, string>) =>
      Object.values(map).some((v) => (v ?? "").trim().length > 0)

    const hydrate = (remote: InterviewScript | null) => {
      if (!active) return
      setValues((prev) => {
        const remoteUpdatedAt = remote ? Date.parse(remote.updatedAt) : Number.NaN
        const useRemote = Boolean(
          remote &&
          hasText(remote.sections) &&
          Number.isFinite(remoteUpdatedAt) &&
          remoteUpdatedAt >= loadLocalUpdatedAt(),
        )
        const base = useRemote && remote ? remote.sections : prev
        const next = withSeedDefaults(base)
        if (next === prev) {
          if (remote) setSynced(true)
          return prev
        }
        try {
          const localSavedAt = useRemote ? new Date(remoteUpdatedAt) : new Date()
          saveScriptLocally(next, localSavedAt)
          setSavedAt(localSavedAt)
        } catch {
          // ignore
        }
        if (useRemote && next === base) {
          setSynced(true)
        } else {
          scheduleSync(next)
        }
        return next
      })
    }

    interviewApi
      .getScript(topic.id)
      .then(hydrate)
      // Offline or endpoint not live yet — the local copy (plus seed) stands.
      .catch(() => hydrate(null))
    return () => {
      active = false
    }
  }, [])

  // Loads the DB-backed question bank (kori_interview_questions — the real
  // seed source now, supabase/seed/kori_interview_questions.sql; also what
  // "Focus on weak questions" mode on /interview/speaking reads) and fills any
  // still-blank Q&A answer from its own drafted answer (sample_answer_ko) —
  // same fill-once logic withSeedDefaults uses for script sections above.
  useEffect(() => {
    let active = true
    interviewApi
      .listQuestions(topic.id)
      .then((questions) => {
        if (!active || questions.length === 0) return
        setBankQA(
          questions.map((q) => ({
            id: q.id,
            questionKo: q.questionKo,
            questionEn: q.questionEn ?? "",
          })),
        )
        setQaAnswerEnglish(
          Object.fromEntries(
            questions
              .filter((q) => (q.sampleAnswerEn ?? "").trim().length > 0)
              .map((q) => [q.id, q.sampleAnswerEn ?? ""]),
          ),
        )
        setValues((prev) => {
          let changed = false
          const next = { ...prev }
          for (const q of questions) {
            if (q.sampleAnswerKo && !(next[q.id] ?? "").trim()) {
              next[q.id] = q.sampleAnswerKo
              changed = true
            }
          }
          if (!changed) return prev
          try {
            saveScriptLocally(next)
            setSavedAt(new Date())
          } catch {
            // ignore
          }
          scheduleSync(next)
          return next
        })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Custom sections, plus recovered placeholders for any orphaned `custom-*`
  // text (see reconcileCustom). Derived — never written back — so orphan text is
  // always shown and exported without any state-sync gymnastics.
  const effectiveCustom = useMemo(
    () => reconcileCustom(customSections, values),
    [customSections, values],
  )

  // Seeded likely questions + the candidate's own, in display order.
  const allQA = useMemo<QAItem[]>(
    () => [
      ...bankQA,
      ...customQA.map((q) => ({ id: q.id, questionKo: q.questionKo, questionEn: "" })),
    ],
    [bankQA, customQA],
  )

  const scriptDocument = useMemo(
    () => buildScriptDocument(topic, values, effectiveCustom),
    [values, effectiveCustom],
  )
  const qaDocument = useMemo(() => buildQADocument(allQA, values), [allQA, values])

  // Mentor / submission export bundles the script and the Q&A prep together.
  const exportDocument = useMemo(() => {
    const parts = [scriptDocument]
    if (qaDocument) parts.push(`【 예상 질문 & 답변 (Q&A) 】\n\n${qaDocument}`)
    return parts.filter(Boolean).join("\n\n")
  }, [scriptDocument, qaDocument])

  // Counts reflect the tab you're on so the script's length isn't skewed by Q&A.
  // Iterate the items shown on the active tab and read their text straight from
  // `values`, rather than scanning the whole map and filtering by key.
  const countedItems = useMemo(
    () => (mode === "qa" ? allQA : [...outline, ...effectiveCustom]),
    [mode, allQA, outline, effectiveCustom],
  )

  const totalWords = useMemo(
    () => countedItems.reduce((sum, item) => sum + countWords(values[item.id] ?? ""), 0),
    [countedItems, values],
  )
  // Korean script length is usually judged by 글자 수 (characters, spaces
  // excluded) rather than whitespace-delimited words, so surface both.
  const totalChars = useMemo(
    () =>
      countedItems.reduce(
        (sum, item) => sum + (values[item.id] ?? "").replace(/\s/g, "").length,
        0,
      ),
    [countedItems, values],
  )

  // Saving happens here in the change handler (not in an effect) so there is no
  // cascading render, and edits persist instantly.
  function updateSection(id: string, text: string) {
    const next = { ...values, [id]: text }
    setValues(next)
    setSynced(false)
    try {
      saveScriptLocally(next)
      setSavedAt(new Date())
    } catch {
      // Ignore quota / private-mode failures.
    }
    scheduleSync(next)
  }

  // ── Custom sections ──────────────────────────────────────────────────────
  // Their definitions are frontend-only (localStorage); the text they hold still
  // rides along in `values` and syncs to the account like every other section.
  function persistCustom(next: CustomSection[]) {
    setCustomSections(next)
    saveJSON(CUSTOM_KEY, next)
  }

  function addCustomSection() {
    const id = `custom-${crypto.randomUUID()}`
    persistCustom([...customSections, { id, title: "" }])
    // Focus the new title field once it renders.
    setTimeout(() => document.getElementById(`title-${id}`)?.focus(), 0)
  }

  function renameCustomSection(id: string, title: string) {
    // The section may be a recovered orphan that isn't in customSections yet —
    // editing its title is what promotes it to a real, persisted definition.
    const exists = customSections.some((s) => s.id === id)
    persistCustom(
      exists
        ? customSections.map((s) => (s.id === id ? { ...s, title } : s))
        : [...customSections, { id, title }],
    )
  }

  function moveCustomSection(id: string, dir: "up" | "down") {
    const index = customSections.findIndex((s) => s.id === id)
    const target = dir === "up" ? index - 1 : index + 1
    if (index < 0 || target < 0 || target >= customSections.length) return
    const next = [...customSections]
    ;[next[index], next[target]] = [next[target], next[index]]
    persistCustom(next)
  }

  function removeCustomSection(id: string) {
    persistCustom(customSections.filter((s) => s.id !== id))
    if (values[id] === undefined) return
    // Drop its text too so it doesn't linger in the synced payload.
    const next = { ...values }
    delete next[id]
    setValues(next)
    setSynced(false)
    try {
      saveScriptLocally(next)
      setSavedAt(new Date())
    } catch {
      // ignore
    }
    scheduleSync(next)
  }

  // ── Custom Q&A questions ─────────────────────────────────────────────────
  function persistQA(next: CustomQA[]) {
    setCustomQA(next)
    saveJSON(QA_CUSTOM_KEY, next)
  }

  function addCustomQA() {
    const id = `qa-${crypto.randomUUID()}`
    persistQA([...customQA, { id, questionKo: "" }])
    setTimeout(() => document.getElementById(`qa-q-${id}`)?.focus(), 0)
  }

  function renameCustomQA(id: string, questionKo: string) {
    persistQA(customQA.map((q) => (q.id === id ? { ...q, questionKo } : q)))
  }

  function removeCustomQA(id: string) {
    persistQA(customQA.filter((q) => q.id !== id))
    if (values[id] === undefined) return
    // Drop its answer too so it doesn't linger in the synced payload.
    const next = { ...values }
    delete next[id]
    setValues(next)
    setSynced(false)
    try {
      saveScriptLocally(next)
      setSavedAt(new Date())
    } catch {
      // ignore
    }
    scheduleSync(next)
  }

  async function copyAll() {
    if (!exportDocument) return
    try {
      await navigator.clipboard.writeText(exportDocument)
      toast.success("Script copied")
    } catch {
      toast.error("Couldn't copy — use Download instead.")
    }
  }

  function downloadTxt() {
    if (!exportDocument) return
    // Prefix a UTF-8 BOM so the Korean text is detected correctly by Windows
    // apps (한글/Notepad/Word) the recipient is likely to open it in — without
    // it, older editors can misread the encoding and show mojibake.
    const blob = new Blob(["\uFEFF" + exportDocument], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `interview-script-${topic.id}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  // ── Script version snapshots ──────────────────────────────────────────────
  async function saveVersion() {
    const enteredLabel = window.prompt(
      'Name this version (examples: "Final Practice Version 2", "Mentor Review", "Exam Week Version"):',
      "",
    )
    if (!enteredLabel || !enteredLabel.trim()) return
    let label = enteredLabel.trim()
    const existingLabels = versions.map((version) => version.versionLabel)
    if (duplicateVersionLabel(label, existingLabels)) {
      const suggested = suggestUniqueVersionLabel(label, existingLabels)
      const useSuggestion = window.confirm(
        `A version named "${label}" already exists. Save this snapshot as "${suggested}" instead?`,
      )
      if (!useSuggestion) return
      label = suggested
    }
    try {
      const version = await interviewApi.saveScriptVersion(topic.id, {
        versionLabel: label,
        sections: values,
        makeActive: true,
      })
      setVersions((prev) => [version, ...prev.map((v) => ({ ...v, isActive: false }))])
    } catch {
      // Best-effort — the live draft in kori_interview_scripts is unaffected
      // either way, so a failed snapshot never loses the candidate's work.
    }
  }

  async function activateVersion(version: ScriptVersion) {
    if (
      !window.confirm(
        `Make "${version.versionLabel}" the active practice version? Your live editor draft will not be overwritten.`,
      )
    )
      return
    try {
      await interviewApi.setActiveScriptVersion(topic.id, version.id)
      setVersions((prev) => prev.map((v) => ({ ...v, isActive: v.id === version.id })))
      setPreviewVersion((current) =>
        current?.id === version.id ? { ...current, isActive: true } : current,
      )
    } catch {
      // ignore
    }
  }

  function restoreVersion(version: ScriptVersion) {
    if (
      !window.confirm(
        `Load "${version.versionLabel}" into the editor? This will overwrite the current draft text below (your saved versions themselves are never lost).`,
      )
    )
      return
    const next = { ...values, ...version.sections }
    setValues(next)
    setSynced(false)
    try {
      saveScriptLocally(next)
      setSavedAt(new Date())
    } catch {
      // ignore
    }
    scheduleSync(next)
  }

  // Confirmed through an AlertDialog (rendered beside the toolbar).
  function clearAll() {
    setConfirmClear(false)
    setValues({})
    persistCustom([])
    persistQA([])
    setSynced(false)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem(STORAGE_UPDATED_AT_KEY)
      setSavedAt(new Date())
    } catch {
      // ignore
    }
    scheduleSync({})
  }

  const view = mounted ? values : {}
  const viewCustom = mounted ? effectiveCustom : []

  // Fixed exam outline first, then the candidate's own sections after it.
  const allSections = [
    ...outline.map((s) => ({
      id: s.id,
      titleKo: s.titleKo,
      titleEn: s.titleEn,
      hint: s.hint,
      custom: false as const,
    })),
    ...viewCustom.map((s) => ({
      id: s.id,
      titleKo: s.title,
      titleEn: "",
      hint: "",
      custom: true as const,
    })),
  ]
  const completedSections = allSections.filter((s) => (view[s.id] ?? "").trim()).length
  const answeredQA = allQA.filter((q) => (view[q.id] ?? "").trim()).length

  // Read mode: the script as one flowing Korean document (no titles, no
  // English) for reading aloud and memorizing. Empty sections are skipped.
  const readSections = allSections
    .map((s) => ({ id: s.id, text: (view[s.id] ?? "").trim() }))
    .filter((s) => s.text)
  const readText = readSections.map((s) => s.text).join("\n\n")
  // Rough presentation pace for Korean (~280자/min), so the candidate knows
  // how long the delivered script runs.
  const readMinutes = Math.max(1, Math.ceil(totalChars / 280))

  // Highlight the section nearest the top of the viewport in the outline rail,
  // the way Google Docs tracks the cursor's heading.
  useEffect(() => {
    if (!mounted) return
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-doc-section]"))
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) {
          setActiveSection(visible[0].target.id.replace("sec-", ""))
        }
      },
      { rootMargin: "-15% 0px -75% 0px" },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [mounted, outline, customSections])

  function scrollToSection(id: string) {
    const el = document.getElementById(`sec-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    el.querySelector("textarea")?.focus({ preventScroll: true })
    setActiveSection(id)
  }

  return (
    // Break out of the centered content column to get a full Google-Docs canvas.
    <div className="-mx-3.5 -mt-5 sm:-mx-6 lg:-mx-8 lg:-mt-8">
      {/* ── Docs-style title bar ── */}
      <div className="sticky top-[var(--shell-header-h,0px)] z-20 border-b border-border/70 bg-background/90 px-3.5 py-2.5 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3">
          <Link
            href="/interview"
            aria-label="Back to interview"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <FileText size={18} strokeWidth={2.5} />
          </div>

          {/* Doc name + live save status (the line Docs shows under the title) */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-tight text-foreground">
              {topic.labelKo}
            </p>
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              {synced ? (
                <CloudCheck size={13} className="shrink-0 text-blue-500" />
              ) : (
                <Cloud size={13} className="shrink-0 text-blue-500" />
              )}
              <span className="truncate">
                {synced
                  ? "Saved to your account"
                  : savedAt
                    ? "Saved on this device"
                    : "Saves automatically as you type"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Script actions"
                  className="size-11 rounded-lg"
                >
                  <MoreHorizontal aria-hidden="true" size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => void copyAll()} disabled={!exportDocument}>
                  <ClipboardCopy aria-hidden="true" /> Copy script
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={downloadTxt} disabled={!exportDocument}>
                  <Download aria-hidden="true" /> Download as text
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setConfirmClear(true)}
                  disabled={!exportDocument}
                >
                  <Trash2 aria-hidden="true" /> Clear script…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear the whole script and Q&amp;A?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sections reset to your original drafted script the next time the page loads.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my script</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={clearAll}
                  >
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* ── Canvas: outline rail + paper ── */}
      <div className="min-h-[calc(100dvh-3.25rem)] bg-[#f9fbfd] px-2 py-6 max-lg:pb-32 dark:bg-black/40 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-[1180px]">
          {/* Script | Q&A tabs */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            {/* Four modes are wider than a phone: the row scrolls sideways
                inside its own box instead of running off the screen. */}
            <div className="no-scrollbar min-w-0 max-w-full overflow-x-auto">
              <div className="inline-flex min-w-max items-center gap-1 rounded-2xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setMode("script")}
                  aria-pressed={mode === "script"}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    mode === "script"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground/70 hover:text-foreground",
                  )}
                >
                  <FileText size={14} strokeWidth={2.6} /> Script
                </button>
                <button
                  type="button"
                  onClick={() => setMode("qa")}
                  aria-pressed={mode === "qa"}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    mode === "qa"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground/70 hover:text-foreground",
                  )}
                >
                  <MessagesSquare size={14} strokeWidth={2.6} /> Q&amp;A Prep
                </button>
                <button
                  type="button"
                  onClick={() => setMode("read")}
                  aria-pressed={mode === "read"}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    mode === "read"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground/70 hover:text-foreground",
                  )}
                >
                  <BookOpenText size={14} strokeWidth={2.6} /> Read
                </button>
                <button
                  type="button"
                  onClick={() => setMode("repeat")}
                  aria-pressed={mode === "repeat"}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    mode === "repeat"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground/70 hover:text-foreground",
                  )}
                >
                  <Repeat2 size={14} strokeWidth={2.6} /> Listen &amp; Repeat
                </button>
              </div>
            </div>

            {(mode === "script" || mode === "qa") && (
              <button
                type="button"
                onClick={() => setShowEnglish((v) => !v)}
                aria-pressed={showEnglish}
                title={
                  mode === "qa"
                    ? "Show or hide English meanings in Q&A Prep"
                    : "Show or hide the English translation under each section"
                }
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-border/70 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide shadow-sm transition-all",
                  showEnglish
                    ? "bg-emerald-600 text-white"
                    : "bg-background text-muted-foreground/70 hover:text-foreground dark:bg-slate-900",
                )}
              >
                <Languages size={14} strokeWidth={2.6} /> English
              </button>
            )}
          </div>

          {mode === "script" && (
            <div className="mb-6 flex justify-center">
              <div className="w-full max-w-[816px]">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background px-4 py-2.5 shadow-sm dark:bg-slate-900">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                    <History size={14} strokeWidth={2.5} />
                    {versions.length === 0
                      ? "No saved versions yet"
                      : `${versions.length} version${versions.length === 1 ? "" : "s"} saved`}
                    {versions.find((v) => v.isActive) && (
                      <Badge className="rounded-lg border-none bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-600 dark:text-blue-400">
                        Active: {versions.find((v) => v.isActive)?.versionLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveVersion}
                      className="h-7 rounded-lg text-xs font-bold"
                    >
                      Save as version
                    </Button>
                    {versions.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVersionsOpen((v) => !v)}
                        className="h-7 rounded-lg text-xs font-bold"
                      >
                        {versionsOpen ? "Hide" : "Show"} history
                      </Button>
                    )}
                  </div>
                </div>
                {versionsOpen && versions.length > 0 && (
                  <div className="mt-2 space-y-1.5 rounded-2xl border border-border/70 bg-background p-2 shadow-sm dark:bg-slate-900">
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">
                            {v.versionLabel}
                            {v.isActive && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                                Active
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString()} · {v.sourceType}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewVersion(v)}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-accent"
                          >
                            <Eye size={12} className="mr-1 inline" /> Preview
                          </button>
                          {!v.isActive && (
                            <button
                              type="button"
                              onClick={() => activateVersion(v)}
                              className="rounded-lg px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                            >
                              Mark active
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => restoreVersion(v)}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-accent"
                          >
                            Load into editor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {previewVersion && (
                  <div className="mt-3 rounded-2xl border border-blue-500/25 bg-background p-4 shadow-sm dark:bg-slate-900">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-foreground">
                            {previewVersion.versionLabel}
                          </p>
                          {previewVersion.isActive && (
                            <Badge className="border-none bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(previewVersion.createdAt).toLocaleString()} {"\u00B7"} Source:{" "}
                          {previewVersion.sourceType}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!previewVersion.isActive && (
                          <Button
                            size="sm"
                            onClick={() => activateVersion(previewVersion)}
                            className="h-8 rounded-lg bg-blue-600 text-xs text-white hover:bg-blue-700"
                          >
                            Make active
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreVersion(previewVersion)}
                          className="h-8 rounded-lg text-xs"
                        >
                          Load into editor
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewVersion(null)}
                          className="h-8 rounded-lg text-xs"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Preview only. Activating a version does not overwrite the live draft.
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <section className="rounded-xl border border-border p-3">
                        <h3 className="text-xs font-bold text-muted-foreground">Korean</h3>
                        <div className="mt-3 space-y-4">
                          {outline.map((section) => (
                            <div key={section.id}>
                              <p className="text-xs font-medium text-muted-foreground">
                                {section.titleKo}
                              </p>
                              <p
                                lang="ko"
                                className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                              >
                                {previewVersion.sections[section.id] || "\u2014"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="rounded-xl border border-border p-3">
                        <h3 className="text-xs font-bold text-muted-foreground">English</h3>
                        <div className="mt-3 space-y-4">
                          {outline.map((section) => (
                            <div key={section.id}>
                              <p className="text-xs font-medium text-muted-foreground">
                                {section.titleEn}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                {previewVersion.sections[`en-${section.id}`] || "\u2014"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "script" ? (
            <div className="flex justify-center gap-6 xl:gap-8">
              {/* Below lg the outline rail is hidden — a section jump menu
                  stands in for it so long scripts stay navigable on phones. */}
              <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex justify-center px-4 lg:hidden">
                <label className="sr-only" htmlFor="script-section-jump">
                  Jump to section
                </label>
                <select
                  id="script-section-jump"
                  value={activeSection}
                  onChange={(event) => scrollToSection(event.target.value)}
                  className="h-11 w-full max-w-sm rounded-full border border-border bg-background/95 px-4 text-sm font-medium text-foreground shadow-lg backdrop-blur"
                >
                  {!activeSection && <option value="">Jump to section…</option>}
                  {allSections.map((section, index) => (
                    <option key={section.id} value={section.id}>
                      {index + 1}.{" "}
                      {section.custom
                        ? section.titleKo.trim() || "Untitled section"
                        : section.titleEn}
                    </option>
                  ))}
                </select>
              </div>
              {/* Document outline (Docs left panel) */}
              <aside className="hidden w-56 shrink-0 lg:block">
                <div className="sticky top-[calc(var(--shell-header-h,0px)+5rem)]">
                  <div className="mb-3 flex items-center gap-2 px-2 text-muted-foreground">
                    <ListTree size={16} strokeWidth={2.5} />
                    <span className="text-xs font-bold uppercase tracking-[0.18em]">Outline</span>
                  </div>
                  <nav className="space-y-0.5">
                    {allSections.map((section, index) => {
                      const filled = (view[section.id] ?? "").trim().length > 0
                      const active = activeSection === section.id
                      const label = section.custom
                        ? section.titleKo.trim() || "Untitled section"
                        : section.titleEn
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => scrollToSection(section.id)}
                          className={cn(
                            "group flex w-full items-center gap-2.5 rounded-lg border-l-2 py-1.5 pl-3 pr-2 text-left transition-colors",
                            active
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-transparent hover:bg-accent",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                              filled ? "bg-blue-500" : "bg-muted-foreground/30",
                            )}
                          />
                          <span
                            className={cn(
                              "truncate text-[13px] font-bold transition-colors",
                              active
                                ? "text-blue-700 dark:text-blue-400"
                                : "text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            {index + 1}. {label}
                          </span>
                        </button>
                      )
                    })}
                  </nav>
                  <button
                    type="button"
                    onClick={addCustomSection}
                    className="mt-2 flex w-full items-center gap-2 rounded-lg py-1.5 pl-3 pr-2 text-left text-[13px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Plus size={14} strokeWidth={3} className="shrink-0" />
                    Add section
                  </button>
                  <div className="mt-4 border-t border-border/60 px-3 pt-3">
                    <p className="text-xs font-bold text-muted-foreground/70">
                      {completedSections}/{allSections.length} sections
                    </p>
                    <p className="text-xs font-bold text-muted-foreground/70">
                      {totalWords} {totalWords === 1 ? "word" : "words"} · {totalChars}자
                    </p>
                  </div>
                </div>
              </aside>

              {/* The paper */}
              <article className="w-full max-w-[816px] rounded-sm bg-white px-6 py-10 shadow-[0_1px_3px_rgba(60,64,67,0.15),0_4px_24px_rgba(60,64,67,0.1)] ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 sm:px-14 sm:py-16 lg:px-[96px]">
                {/* Document title */}
                <header className="border-b border-border/60 pb-6">
                  <h2 className="text-[1.7rem] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                    {topic.labelKo}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    {topic.label} · Interview script · Submit by {SCRIPT_DUE_LABEL}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {completedSections}/{allSections.length} sections · {totalWords} words ·{" "}
                    {totalChars}자
                  </p>
                </header>

                {/* Body */}
                <div className="mt-8 space-y-9">
                  {allSections.map((section, index) => {
                    const sectionWords = countWords(view[section.id] ?? "")
                    const active = activeSection === section.id
                    return (
                      <section
                        key={section.id}
                        id={`sec-${section.id}`}
                        data-doc-section
                        className={cn(
                          "scroll-mt-[calc(var(--shell-header-h,0px)+3.5rem)] rounded-r-lg border-l-2 pl-4 transition-colors",
                          active ? "border-blue-500/60" : "border-transparent",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {section.custom ? (
                            <div className="flex min-w-0 flex-1 items-baseline gap-2">
                              <span className="text-lg font-bold text-foreground">
                                {index + 1}.
                              </span>
                              <input
                                id={`title-${section.id}`}
                                value={section.titleKo}
                                onChange={(e) => renameCustomSection(section.id, e.target.value)}
                                placeholder="Section title…"
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-bold text-foreground outline-none placeholder:font-bold placeholder:text-muted-foreground/40 focus:ring-0"
                              />
                            </div>
                          ) : (
                            <h2 className="text-lg font-bold text-foreground">
                              {index + 1}. {section.titleKo}
                              <span className="ml-2 text-sm font-bold text-muted-foreground/70">
                                {section.titleEn}
                              </span>
                            </h2>
                          )}
                          <div className="flex shrink-0 items-center gap-2">
                            {sectionWords > 0 && (
                              <span className="text-xs font-bold tabular-nums text-muted-foreground">
                                {sectionWords}w
                              </span>
                            )}
                            {(view[section.id] ?? "").trim() && (
                              <SpeakButton
                                text={view[section.id]}
                                title="Listen to what you wrote"
                                className="shrink-0"
                              />
                            )}
                            {section.custom && (
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => moveCustomSection(section.id, "up")}
                                  aria-label="Move section up"
                                  className="flex h-7 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground"
                                >
                                  <ChevronUp size={15} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveCustomSection(section.id, "down")}
                                  aria-label="Move section down"
                                  className="flex h-7 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground"
                                >
                                  <ChevronDown size={15} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCustomSection(section.id)}
                                  aria-label="Delete section"
                                  className="flex h-7 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {section.hint && (
                          <p className="mt-1.5 text-xs font-medium italic leading-relaxed text-muted-foreground/80">
                            💡 {section.hint}
                          </p>
                        )}
                        <div className="mt-3">
                          <DocTextarea
                            value={view[section.id] ?? ""}
                            onChange={(text) => updateSection(section.id, text)}
                            placeholder="여기에 한국어로 작성하세요…"
                            lang="ko"
                            label={`${section.custom ? section.titleKo.trim() || "Custom section" : section.titleEn} — Korean`}
                          />
                        </div>
                        {/* Editable English translation, defaulted from the topic's
                        seed until the candidate writes their own. Reference
                        only — excluded from counts and the Korean export. */}
                        {!section.custom && showEnglish && (
                          <div className="mt-3 rounded-xl bg-muted/30 p-3">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              <Languages size={11} strokeWidth={2.5} /> English
                            </p>
                            <div className="mt-1.5">
                              <DocTextarea
                                value={
                                  view[`en-${section.id}`] ?? topic.scriptSeedEn?.[section.id] ?? ""
                                }
                                onChange={(text) => updateSection(`en-${section.id}`, text)}
                                placeholder="Write the English translation here…"
                                label={`${section.titleEn} — English translation`}
                              />
                            </div>
                          </div>
                        )}
                        <div className="mt-2 border-b border-dashed border-border/50" />
                      </section>
                    )
                  })}

                  {/* Add a new custom section to the end of the document */}
                  <button
                    type="button"
                    onClick={addCustomSection}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3.5 text-sm font-bold text-muted-foreground transition-colors hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-600"
                  >
                    <Plus size={16} strokeWidth={2.5} /> Add section
                  </button>
                </div>
              </article>
            </div>
          ) : mode === "repeat" ? (
            // Practices the editor's live text, including edits not yet synced.
            <div className="mx-auto w-full max-w-[816px]">
              <ListenRepeatPractice scriptSections={values} />
            </div>
          ) : mode === "read" ? (
            <article className="mx-auto w-full max-w-[816px] rounded-sm bg-white px-6 py-10 shadow-[0_1px_3px_rgba(60,64,67,0.15),0_4px_24px_rgba(60,64,67,0.1)] ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 sm:px-14 sm:py-16 lg:px-[96px]">
              <header className="border-b border-border/60 pb-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[1.7rem] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                      {topic.labelKo}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                      Your full script as one text — read it aloud, no titles, no English.
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {totalChars}자 · about {readMinutes} min aloud
                    </p>
                  </div>
                  {readText && (
                    <SpeakButton
                      text={readText}
                      title="Listen to the whole script"
                      className="mt-1 shrink-0 rounded-xl border border-border p-2.5"
                    />
                  )}
                </div>
              </header>

              {readSections.length > 0 ? (
                <div className="mt-8 space-y-7">
                  {readSections.map((section) => (
                    <div key={section.id} className="group flex items-start gap-2">
                      <p
                        lang="ko"
                        className="min-w-0 flex-1 whitespace-pre-wrap break-keep text-[17px] leading-[2.05] text-slate-800 dark:text-slate-200"
                      >
                        {section.text}
                      </p>
                      <SpeakButton
                        text={section.text}
                        title="Listen to this part"
                        className="mt-1 shrink-0 opacity-50 transition-opacity focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-8 text-sm text-muted-foreground">
                  Nothing written yet — switch to the Script tab and write your sections first.
                </p>
              )}
            </article>
          ) : (
            <article className="mx-auto w-full max-w-[816px] rounded-sm bg-white px-6 py-10 shadow-[0_1px_3px_rgba(60,64,67,0.15),0_4px_24px_rgba(60,64,67,0.1)] ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10 sm:px-14 sm:py-16 lg:px-[96px]">
              <header className="border-b border-border/60 pb-6">
                <h2 className="text-[1.7rem] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                  예상 질문 &amp; 답변 (Q&amp;A)
                </h2>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  Practice the Korean answer first, then use the English meaning only to confirm
                  what you are saying.
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {answeredQA}/{allQA.length} answered · {totalWords} words · {totalChars}자
                </p>
              </header>

              <div className="mt-8 space-y-8">
                {allQA.map((item, index) => {
                  const isCustom = customQA.some((custom) => custom.id === item.id)
                  const answer = view[item.id] ?? ""
                  const answerEnglish = qaAnswerEnglish[item.id] ?? ""
                  return (
                    <section key={item.id} className="border-l-2 border-transparent pl-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {isCustom ? (
                            <input
                              id={`qa-q-${item.id}`}
                              value={item.questionKo}
                              onChange={(e) => renameCustomQA(item.id, e.target.value)}
                              placeholder="질문을 입력하세요…"
                              className="w-full border-0 bg-transparent p-0 text-base font-bold text-foreground outline-none placeholder:font-bold placeholder:text-muted-foreground/40 focus:ring-0"
                              lang="ko"
                            />
                          ) : (
                            <>
                              <p className="text-base font-bold leading-snug text-foreground">
                                {index + 1}. {item.questionKo}
                              </p>
                              {showEnglish && item.questionEn && (
                                <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground/70">
                                  {item.questionEn}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.questionKo.trim() && (
                            <SpeakButton
                              text={item.questionKo}
                              title="Hear the question"
                              className="shrink-0"
                            />
                          )}
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => removeCustomQA(item.id)}
                              aria-label="Delete question"
                              className="flex h-7 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 size={14} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl bg-muted/30 p-3">
                        <DocTextarea
                          value={answer}
                          onChange={(text) => updateSection(item.id, text)}
                          placeholder="여기에 답변을 작성하세요…"
                          lang="ko"
                          label="Your answer — Korean"
                        />
                        {showEnglish && answerEnglish && !isCustom && (
                          <div className="mt-3 border-t border-border/60 pt-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                              <Languages size={12} strokeWidth={2.5} /> English meaning
                            </div>
                            <p className="mt-1.5 text-sm font-medium leading-relaxed text-muted-foreground">
                              {answerEnglish}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  )
                })}

                <button
                  type="button"
                  onClick={addCustomQA}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3.5 text-sm font-bold text-muted-foreground transition-colors hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-600"
                >
                  <Plus size={16} strokeWidth={2.5} /> Add your own question
                </button>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
