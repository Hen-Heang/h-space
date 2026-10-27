"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, type ComponentProps, type ReactNode } from "react"
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  NotebookPen,
  Sprout,
  Vault,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import { motion } from "motion/react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Shared input styling for every auth form field. */
export const authInputClass =
  "h-11 rounded-xl border-border bg-background px-4 shadow-xs transition-colors focus-visible:border-primary/60"

/** Full-width primary submit button styling (pairs with the default Button variant). */
export const authSubmitClass = "h-11 w-full rounded-xl text-sm font-semibold"

/** Inline text link styling used inside auth pages. */
export const authLinkClass =
  "font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"

const SPACE_APPS: Array<{ icon: LucideIcon; label: string; color: string }> = [
  { icon: CalendarCheck, label: "Planner", color: "text-sky-300" },
  { icon: NotebookPen, label: "Notes", color: "text-amber-300" },
  { icon: GraduationCap, label: "Learning", color: "text-violet-300" },
  { icon: Sprout, label: "Growth", color: "text-emerald-300" },
  { icon: WalletCards, label: "Finance", color: "text-teal-300" },
  { icon: Vault, label: "Vault", color: "text-rose-300" },
]

/**
 * Layout for the (auth) pages: from `lg`, an app-neutral H-Space brand panel
 * on the left and the form centered in the right half. Mobile is a single
 * full-bleed column with no card chrome. The form stays first in the DOM so
 * keyboard and screen-reader order start with it.
 */
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode
  /** Small print under the form (e.g. Terms / Privacy). */
  footer?: ReactNode
}) {
  return (
    <main className="grid min-h-dvh w-full bg-background selection:bg-primary/20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-dvh flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl shadow-sm">
              <Image
                src="/H%20Space%20Icon.png"
                alt=""
                width={36}
                height={36}
                className="h-full w-full"
              />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">H-Space</span>
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full max-w-[400px]"
          >
            {children}
          </motion.div>
        </div>

        {footer && (
          <footer className="mx-auto w-full max-w-[400px] text-center text-xs leading-relaxed text-muted-foreground">
            {footer}
          </footer>
        )}
      </div>

      <BrandPanel />
    </main>
  )
}

function BrandPanel() {
  return (
    <aside
      aria-hidden="true"
      className="relative m-3 hidden overflow-hidden rounded-3xl bg-slate-950 text-white lg:order-first lg:flex lg:flex-col lg:justify-between lg:p-12"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-indigo-900 to-slate-950" />
        <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-violet-500/25 blur-[110px]" />
        <div className="absolute -bottom-32 -left-16 size-[380px] rounded-full bg-sky-400/20 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-white/60">
        Personal workspace
      </p>

      <div className="relative max-w-md space-y-8">
        <div className="space-y-3">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            My Projects.
            <br />
            One Space.
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            Plan the day, capture notes, keep learning, and open every app you build — all from one
            place.
          </p>
        </div>

        <ul className="grid grid-cols-3 gap-3">
          {SPACE_APPS.map((app) => (
            <li
              key={app.label}
              className="flex flex-col items-start gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur-sm"
            >
              <app.icon size={18} className={app.color} />
              <span className="text-sm font-medium text-white/90">{app.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/50">One account across every H-Space app.</p>
    </aside>
  )
}

/** Page title block: optional status icon, the page's single h1, and a one-line description. */
export function AuthHeading({
  title,
  description,
  icon,
  tone = "default",
  centered = false,
}: {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  tone?: "default" | "success" | "error"
  centered?: boolean
}) {
  const Icon = icon
  return (
    <div className={cn("mb-8 space-y-2", centered && "text-center")}>
      {Icon && (
        <span
          className={cn(
            "mb-5 flex size-12 items-center justify-center rounded-2xl",
            centered && "mx-auto",
            tone === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            tone === "error" && "bg-destructive/10 text-destructive",
            tone === "default" && "bg-primary/10 text-primary",
          )}
        >
          <Icon size={24} aria-hidden="true" />
        </span>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        {title}
      </h1>
      {description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

/** Inline status message. Errors are announced via role="alert". */
export function AuthAlert({
  children,
  tone = "error",
  icon,
}: {
  children: ReactNode
  tone?: "error" | "info" | "success"
  icon?: LucideIcon
}) {
  const Icon = icon ?? (tone === "success" ? CheckCircle2 : AlertCircle)
  return (
    <motion.div
      role={tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        tone === "error" && "border-destructive/25 bg-destructive/5 font-medium text-destructive",
        tone === "info" && "border-primary/20 bg-primary/5 text-foreground/80",
        tone === "success" &&
          "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
      )}
    >
      <Icon
        size={17}
        aria-hidden="true"
        className={cn("mt-0.5 shrink-0", tone === "info" && "text-primary")}
      />
      <div className="leading-relaxed">{children}</div>
    </motion.div>
  )
}

/** Horizontal rule with a centered label ("or"). */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

/** Password field with a show/hide toggle. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(authInputClass, "pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-0.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

/** Terms / Privacy small print shared by login and register. */
export function AuthLegal({ action }: { action: string }) {
  return (
    <>
      By {action}, you agree to our{" "}
      <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
        Privacy Policy
      </Link>
      .
    </>
  )
}
