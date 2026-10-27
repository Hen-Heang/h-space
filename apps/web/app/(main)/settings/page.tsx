"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Mail,
  CheckCircle2,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Globe,
  CalendarDays,
  Camera,
  Loader2,
  Bell,
  Send,
  AlarmClock,
  Target,
  Type,
  UserPlus,
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { authApi, userApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import { refreshProfileImage } from "@/hooks/useProfileImage"
import { usePush } from "@/hooks/usePush"
import { useIsAdmin } from "@/hooks/useInvites"
import { InvitesManager } from "@/components/settings/InvitesManager"
import { FieldSaveStatus } from "@/components/ui/field-save-status"
import { TEXT_DEBOUNCE_MS, useFieldAutosave } from "@/hooks/useFieldAutosave"
import { isCalendarIntegrationsEnabled } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:bg-slate-900/40",
        className,
      )}
    >
      {children}
    </div>
  )
}

function SectionRow({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("px-4 py-4 sm:px-5", !last && "border-b border-border/60")}>{children}</div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  color = "text-blue-500",
}: {
  icon: React.ElementType
  title: string
  description?: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/5",
          color,
        )}
      >
        <Icon size={15} strokeWidth={2} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

function FieldLabel({ children, status }: { children: React.ReactNode; status?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
      <label className="text-sm font-medium text-muted-foreground">{children}</label>
      {status}
    </div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
} as const

export default function SettingsPage() {
  const router = useRouter()
  const { isAdmin } = useIsAdmin()
  const push = usePush()
  const { saveField, stateOf } = useFieldAutosave()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [koreanLevel, setKoreanLevel] = useState("BEGINNER")
  const [nativeLanguage, setNativeLanguage] = useState("")
  const [occupation, setOccupation] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [studyRemindersEnabled, setStudyRemindersEnabled] = useState(true)
  const [studyReminderHour, setStudyReminderHour] = useState(20)
  const [savingReminders, setSavingReminders] = useState(false)
  const [holidayAlertsEnabled, setHolidayAlertsEnabled] = useState(false)
  const [savingHolidayAlerts, setSavingHolidayAlerts] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const userId = getUserId()
    if (!userId) return
    userApi
      .getById(userId)
      .then((data) => {
        setDisplayName(data.displayName ?? "")
        setEmail(data.email ?? "")
        setKoreanLevel(data.koreanLevel ?? "BEGINNER")
        setNativeLanguage(data.nativeLanguage ?? "")
        setOccupation(data.occupation ?? "")
        setStudyRemindersEnabled(data.studyRemindersEnabled ?? true)
        setStudyReminderHour(data.studyReminderHour ?? 20)
        setHolidayAlertsEnabled(data.holidayAlertsEnabled ?? false)
        if (data.hasProfileImage) {
          userApi
            .getProfileImageUrl(userId)
            .then(setAvatarUrl)
            .catch(() => {})
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveStudyReminders(enabled: boolean, hour: number) {
    const userId = getUserId()
    if (!userId) return
    const prevEnabled = studyRemindersEnabled
    const prevHour = studyReminderHour
    setStudyRemindersEnabled(enabled)
    setStudyReminderHour(hour)
    setSavingReminders(true)
    try {
      await userApi.updateStudyReminders(userId, enabled, hour)
    } catch {
      setStudyRemindersEnabled(prevEnabled)
      setStudyReminderHour(prevHour)
      toast.error("Could not save study reminders", { description: "Please try again." })
    } finally {
      setSavingReminders(false)
    }
  }

  async function saveHolidayAlerts(enabled: boolean) {
    const userId = getUserId()
    if (!userId) return
    setHolidayAlertsEnabled(enabled)
    setSavingHolidayAlerts(true)
    try {
      await userApi.updateHolidayAlerts(userId, enabled)
    } catch {
      setHolidayAlertsEnabled(!enabled)
      toast.error("Could not save holiday alerts", { description: "Please try again." })
    } finally {
      setSavingHolidayAlerts(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const userId = getUserId()
    if (!userId) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2 MB or smaller.")
      return
    }
    setUploadingAvatar(true)
    setError("")
    try {
      await userApi.uploadProfileImage(userId, file)
      const url = await userApi.getProfileImageUrl(userId)
      setAvatarUrl(url)
      refreshProfileImage()
    } catch {
      setError("Could not upload image. Please try again.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Every profile field autosaves and confirms next to itself — same contract
  // as /korean-coach/preferences, and as the notification switches on this
  // page, which have always saved on change. updateProfile writes the whole
  // row, so each call sends the current value of the others too; `overrides`
  // supplies the just-changed value, since the state update that triggered it
  // has not been applied to this render's closure yet.
  function saveProfileField(
    field: string,
    overrides: Partial<{ displayName: string; nativeLanguage: string; occupation: string }>,
    debounceMs = 0,
  ) {
    const userId = getUserId()
    if (!userId) return
    const next = { displayName, nativeLanguage, occupation, ...overrides }
    saveField(
      field,
      () =>
        userApi.updateProfile(userId, {
          displayName: next.displayName,
          koreanLevel,
          nativeLanguage: next.nativeLanguage || undefined,
          occupation: next.occupation || undefined,
        }),
      debounceMs,
    )
  }

  async function handleSignOut() {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    router.replace("/login")
  }

  // "Your name" used to render here in the same weight and colour a real
  // name would use, and again just below as the input's placeholder — the
  // same words as a value and as a prompt. Fall back to the email local part,
  // which is a real thing about this account; only when there is no email
  // either does the card ask, and then it reads as an invitation.
  const emailLocalPart = email.split("@")[0]
  const resolvedName = displayName.trim() || emailLocalPart
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (email?.[0]?.toUpperCase() ?? "?")

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-12">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          </div>
        </div>
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-1.5 h-3 w-40" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto max-w-3xl space-y-5 pb-24"
    >
      {/* The app shell provides the Settings page title. */}
      <motion.div variants={itemVariants}>
        <p className="px-1 py-1 text-sm text-muted-foreground">Profile, preferences & account</p>
      </motion.div>

      {/* Profile identity + editable name/email */}
      <motion.div variants={itemVariants}>
        <SectionCard>
          <SectionRow>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Change profile photo"
                  className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 text-lg font-semibold text-white shadow-sm"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    {uploadingAvatar ? (
                      <Loader2 size={18} className="animate-spin text-white" />
                    ) : (
                      <Camera size={18} className="text-white" />
                    )}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-emerald-400">
                  <CheckCircle2 size={10} className="text-white" strokeWidth={4} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                {resolvedName ? (
                  <p className="truncate text-base font-semibold text-foreground">{resolvedName}</p>
                ) : (
                  <p className="truncate text-base font-medium text-muted-foreground/70">
                    Add your name
                  </p>
                )}
                <p className="truncate text-xs font-medium text-muted-foreground">{email}</p>
                {/* Avatar upload is the one action here that isn't a field
                    autosave, so it reports next to the avatar rather than
                    through FieldSaveStatus. */}
                {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
              </div>
            </div>
          </SectionRow>
          <SectionRow last>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel status={<FieldSaveStatus state={stateOf("displayName")} />}>
                  Display name
                </FieldLabel>
                <Input
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value)
                    saveProfileField(
                      "displayName",
                      { displayName: e.target.value },
                      TEXT_DEBOUNCE_MS,
                    )
                  }}
                  placeholder={emailLocalPart || "Your name"}
                  className="h-11 rounded-lg border-border bg-accent/5 px-4 font-semibold transition-colors focus:bg-background"
                />
              </div>
              <div>
                <FieldLabel>Email address</FieldLabel>
                <div className="flex h-11 items-center gap-2.5 rounded-lg border border-border bg-accent/5 px-4 opacity-60">
                  <Mail size={14} className="shrink-0 text-muted-foreground" strokeWidth={2} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {email}
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground sm:flex">
                    <ShieldCheck size={10} strokeWidth={3} /> Verified
                  </span>
                </div>
              </div>
            </div>
          </SectionRow>
        </SectionCard>
      </motion.div>

      {/* Learning goal lives in Korean Coach preferences — the single source
          of truth (kori_korean_coach_preferences.main_goal) that both the
          tutoring prompt and Coach's scenario recommendation read. This page
          used to carry a second, competing list writing a different column;
          it's a link now so there is only ever one control. */}
      <motion.div variants={itemVariants}>
        <SectionCard>
          <button
            type="button"
            onClick={() => router.push("/korean-coach/preferences")}
            className="group flex w-full items-center justify-between px-5 py-4 text-left transition-all hover:bg-accent/5 active:scale-[0.98] sm:px-6"
          >
            <SectionHeader
              icon={Target}
              title="Learning goal"
              description="Shapes the scenarios and phrasing the AI practices with you"
              color="text-violet-500"
            />
            <ChevronRight
              size={14}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </SectionCard>
      </motion.div>

      {/* Romanization lives in Korean Coach preferences — the single source of
          truth (kori_korean_coach_preferences.romanization_mode) that Korean
          Coach and Phrasebook both read. Linked rather than duplicated here so
          there is only ever one control for it. */}
      <motion.div variants={itemVariants}>
        <SectionCard>
          <button
            type="button"
            onClick={() => router.push("/korean-coach/preferences")}
            className="group flex w-full items-center justify-between px-5 py-4 text-left transition-all hover:bg-accent/5 active:scale-[0.98] sm:px-6"
          >
            <SectionHeader
              icon={Type}
              title="Romanization & Korean Coach"
              description="Romanization, speech speed, and correction strictness"
              color="text-teal-500"
            />
            <ChevronRight
              size={14}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </SectionCard>
      </motion.div>

      {/* Integrations — hidden until Plan is navigable (see
          lib/feature-flags.ts). The code and the privacy copy stay put; only
          the entry point and the page body are gated. */}
      {isCalendarIntegrationsEnabled() && (
        <motion.div variants={itemVariants}>
          <SectionCard>
            <button
              type="button"
              onClick={() => router.push("/settings/integrations")}
              className="group flex w-full items-center justify-between px-5 py-4 text-left transition-all hover:bg-accent/5 active:scale-[0.98] sm:px-6"
            >
              <SectionHeader
                icon={CalendarDays}
                title="Integrations"
                description="Connect Google Calendar and other services"
                color="text-blue-500"
              />
              <ChevronRight
                size={14}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </SectionCard>
        </motion.div>
      )}

      {/* Background + Work */}
      <motion.div variants={itemVariants}>
        <SectionCard>
          <SectionRow>
            <SectionHeader
              icon={Globe}
              title="Background & Work"
              description="Your native language sets what glosses are written in; your role sets what the AI's examples are about"
              color="text-sky-500"
            />
          </SectionRow>
          <SectionRow last>
            {/* Two fields, not four. Country produced one weak prompt line
                ("From: X") and Years of experience was never read by anything
                at all — both are still collected once at registration, so
                nothing is lost by not asking again here. The two that survive
                each change the output in a way you can point at: native
                language decides the gloss language, occupation is what the
                system prompt means by "ground examples in the learner's job".
                See learnerProfileBlock in lib/server/ai.ts and
                buildRealtimeInstructions in lib/realtime/session-context.ts. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel status={<FieldSaveStatus state={stateOf("nativeLanguage")} />}>
                  Native language
                </FieldLabel>
                <select
                  value={nativeLanguage}
                  onChange={(e) => {
                    setNativeLanguage(e.target.value)
                    saveProfileField("nativeLanguage", { nativeLanguage: e.target.value })
                  }}
                  className="h-11 w-full rounded-lg border border-border bg-accent/5 px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:bg-background focus:ring-2 focus:ring-blue-500/20 dark:bg-white/5"
                >
                  <option value="">Select language</option>
                  {[
                    "Khmer",
                    "English",
                    "Chinese",
                    "Japanese",
                    "Vietnamese",
                    "Thai",
                    "Indonesian",
                    "Filipino",
                    "Malay",
                    "Other",
                  ].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel status={<FieldSaveStatus state={stateOf("occupation")} />}>
                  Occupation
                </FieldLabel>
                <select
                  value={occupation}
                  onChange={(e) => {
                    setOccupation(e.target.value)
                    saveProfileField("occupation", { occupation: e.target.value })
                  }}
                  className="h-11 w-full rounded-lg border border-border bg-accent/5 px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:bg-background focus:ring-2 focus:ring-blue-500/20 dark:bg-white/5"
                >
                  <option value="">Select role</option>
                  {[
                    "Frontend Developer",
                    "Backend Developer",
                    "Full-Stack Developer",
                    "QA Engineer",
                    "DevOps Engineer",
                    "Product Manager",
                    "Data Scientist",
                    "Other",
                  ].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SectionRow>
        </SectionCard>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={itemVariants}>
        <SectionCard>
          <SectionRow>
            <SectionHeader icon={Bell} title="Notifications" color="text-violet-500" />
          </SectionRow>

          {/* Browser push */}
          <SectionRow>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Browser</p>
                <p className="text-xs text-muted-foreground">
                  {push.supported
                    ? push.webState === "denied"
                      ? "Blocked in browser settings."
                      : "Alerts when Hengo isn't open."
                    : "Not supported in this browser."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {push.webEnabled && (
                  <Button type="button" variant="outline" size="sm" onClick={() => push.sendTest()}>
                    Send test
                  </Button>
                )}
                <Switch
                  checked={push.webEnabled}
                  disabled={!push.supported || push.webBusy || push.webState === "denied"}
                  onCheckedChange={(v) => (v ? push.enableWeb() : push.disableWeb())}
                  aria-label="Toggle browser notifications"
                />
              </div>
            </div>
          </SectionRow>

          {/* Telegram */}
          <SectionRow>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                  <Send size={14} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Telegram</p>
                  <p className="text-xs text-muted-foreground">
                    {push.telegramLinked ? "Connected" : "Get alerts in Telegram"}
                  </p>
                </div>
              </div>
              {push.telegramLinked ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => push.sendTelegramTest()}
                  >
                    Send test
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => push.unlinkTelegram()}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button type="button" size="sm" onClick={() => push.linkTelegram()}>
                  Connect
                </Button>
              )}
            </div>
          </SectionRow>

          {/* Study reminders */}
          <SectionRow>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <AlarmClock size={14} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Daily reminders</p>
                  <p className="text-xs text-muted-foreground">Review nudge + streak saver</p>
                </div>
              </div>
              <Switch
                checked={studyRemindersEnabled}
                disabled={savingReminders}
                onCheckedChange={(v) => saveStudyReminders(v, studyReminderHour)}
                aria-label="Toggle daily study reminders"
              />
            </div>
            {studyRemindersEnabled && (
              <div className="mt-3 flex items-center justify-between gap-4 rounded-lg bg-accent/5 px-4 py-3 dark:bg-white/5">
                <label htmlFor="study-hour" className="text-sm font-medium text-muted-foreground">
                  Remind me at
                </label>
                <select
                  id="study-hour"
                  value={studyReminderHour}
                  disabled={savingReminders}
                  onChange={(e) =>
                    saveStudyReminders(studyRemindersEnabled, Number(e.target.value))
                  }
                  className="h-11 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:ring-2 focus:ring-emerald-500/20"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {h === 0
                        ? "12:00 AM"
                        : h < 12
                          ? `${h}:00 AM`
                          : h === 12
                            ? "12:00 PM"
                            : `${h - 12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </SectionRow>

          {/* Holiday alerts */}
          <SectionRow>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                  <CalendarDays size={14} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Holiday alerts</p>
                  <p className="text-xs text-muted-foreground">
                    6 PM the evening before any Korea or Cambodia holiday
                  </p>
                </div>
              </div>
              <Switch
                checked={holidayAlertsEnabled}
                disabled={savingHolidayAlerts}
                onCheckedChange={(v) => saveHolidayAlerts(v)}
                aria-label="Toggle holiday alerts"
              />
            </div>
          </SectionRow>

          <SectionRow last>
            <button
              type="button"
              onClick={() => router.push("/settings/reminders")}
              className="flex min-h-11 w-full items-center justify-between gap-4 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Custom reminders</p>
                <p className="text-xs text-muted-foreground">
                  Manage reminders you&apos;ve set on tasks, habits, notes, and more
                </p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </button>
          </SectionRow>
        </SectionCard>
      </motion.div>

      {/* Invites — admins only; sign-up is invite-only (h-space-api) */}
      {isAdmin && (
        <motion.div variants={itemVariants}>
          <SectionCard>
            <SectionRow>
              <SectionHeader
                icon={UserPlus}
                title="Invites"
                description="Sign-up is invite-only. Invite someone to create an H-Space account."
                color="text-emerald-500"
              />
            </SectionRow>
            <SectionRow last>
              <InvitesManager />
            </SectionRow>
          </SectionCard>
        </motion.div>
      )}

      {/* Account */}
      <motion.div variants={itemVariants}>
        <SectionCard>
          <button
            type="button"
            onClick={handleSignOut}
            className="group flex w-full items-center justify-between px-5 py-4 text-left transition-all hover:bg-red-500/5 active:scale-[0.98] sm:px-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                <LogOut size={16} strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Sign out</p>
                <p className="text-xs text-muted-foreground">End your session</p>
              </div>
            </div>
            <ChevronRight
              size={14}
              strokeWidth={2}
              className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </SectionCard>
      </motion.div>

      <motion.div variants={itemVariants} className="pt-2 text-center">
        <p className="text-xs text-muted-foreground">© 2026 Hen Heang · FullStack Developer</p>
      </motion.div>
    </motion.div>
  )
}
