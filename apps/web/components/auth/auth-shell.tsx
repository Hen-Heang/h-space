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
  "h-12 rounded-[14px] border-[1.5px] border-border bg-card px-4 text-[15px] shadow-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"

/** Full-width primary submit button styling (pairs with the default Button variant). */
export const authSubmitClass =
  "h-12 w-full rounded-[14px] text-[15px] font-bold shadow-lg shadow-primary/25"

/** Inline text link styling used inside auth pages. */
export const authLinkClass =
  "font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"

const SPACE_APPS: Array<{ icon: LucideIcon; label: string; area: string; tile: string }> = [
  {
    icon: GraduationCap,
    label: "Hengo Learning",
    area: "Learning & AI",
    tile: "bg-blue-100 text-blue-700",
  },
  {
    icon: WalletCards,
    label: "Luyra",
    area: "Personal finance",
    tile: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: CalendarCheck,
    label: "Planner",
    area: "Tasks & goals",
    tile: "bg-violet-100 text-violet-700",
  },
  { icon: Vault, label: "H-Vault", area: "Personal accounts", tile: "bg-amber-100 text-amber-700" },
]

const SIGN_UP_STEPS = [
  "Create your account",
  "Verify your email",
  "Open every H-Space app with one sign-in",
]

function BrandMark({ subtitle }: { subtitle?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/15">
        <Image src="/H%20Space%20Icon.png" alt="" width={40} height={40} className="size-full" />
      </span>
      <span>
        <span className="block text-lg font-bold leading-tight">H-Space</span>
        {subtitle && (
          <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.14em] text-white/70">
            YOUR PERSONAL OS
          </span>
        )}
      </span>
    </span>
  )
}

/**
 * Layout for the (auth) pages, after the "H-Space Auth Screens" design: from
 * `lg`, a deep-indigo brand panel on the left and the form centered on the
 * right, with the page's switch link (`topAction`, e.g. "New to H-Space?
 * Create account") top right. Below `lg`, a compact brand band sits above a
 * rounded form sheet and `topAction` moves under the form. The form stays
 * first in the DOM so keyboard and screen-reader order start with it.
 */
export function AuthShell({
  children,
  footer,
  topAction,
  brand = "signin",
}: {
  children: ReactNode
  /** Small print under the form (e.g. Terms / Privacy). */
  footer?: ReactNode
  /** Link to the other auth page ("New to H-Space? Create account"). */
  topAction?: ReactNode
  /** Brand panel copy: the app tour (sign in) or the sign-up steps. */
  brand?: "signin" | "signup"
}) {
  return (
    <main className="grid min-h-dvh w-full bg-background selection:bg-primary/20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-4 lg:p-4">
      <div className="flex min-h-dvh flex-col lg:min-h-0">
        <header className="relative isolate overflow-hidden bg-brand-surface px-5 pb-14 pt-[max(1.25rem,env(safe-area-inset-top))] text-white sm:px-8 lg:overflow-visible lg:bg-transparent lg:px-8 lg:pb-0 lg:pt-2 lg:text-foreground">
          <div
            aria-hidden
            className="absolute -right-16 -top-16 -z-10 size-52 rounded-full bg-primary/45 lg:hidden"
          />
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Link
              href="/"
              className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
            >
              <BrandMark />
            </Link>
            <div className="ml-auto flex items-center gap-3">
              {topAction && (
                <p className="hidden text-sm text-muted-foreground lg:block">{topAction}</p>
              )}
              <ThemeToggle className="border-white/15 bg-white/10 text-white hover:bg-white/20 lg:border-border lg:bg-transparent lg:text-foreground lg:hover:bg-accent" />
            </div>
          </div>
        </header>

        <div className="-mt-7 flex flex-1 flex-col rounded-t-[28px] bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 sm:px-8 lg:mt-0 lg:rounded-none lg:px-8 lg:pt-0">
          <div className="flex flex-1 items-center justify-center py-4 lg:py-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[420px]"
            >
              {children}
            </motion.div>
          </div>

          {topAction && (
            <p className="mb-4 text-center text-sm text-muted-foreground lg:hidden">{topAction}</p>
          )}

          {footer && (
            <footer className="mx-auto w-full max-w-[420px] text-center text-xs leading-relaxed text-muted-foreground">
              {footer}
            </footer>
          )}
        </div>
      </div>

      <BrandPanel variant={brand} />
    </main>
  )
}

function BrandPanel({ variant }: { variant: "signin" | "signup" }) {
  return (
    <aside
      aria-hidden="true"
      className="relative isolate hidden overflow-hidden rounded-[28px] bg-brand-surface p-11 text-white lg:order-first lg:flex lg:flex-col lg:justify-between lg:gap-10"
    >
      <div className="absolute -right-24 -top-32 -z-10 size-[420px] rounded-full bg-white/[0.05]" />
      <div className="absolute -bottom-40 right-16 -z-10 size-80 rounded-full bg-primary/45" />

      <BrandMark subtitle />

      <div className="max-w-lg space-y-5">
        <p className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]">
          {variant === "signup" ? "Get started" : "One account · Every app"}
        </p>
        {variant === "signup" ? (
          <>
            <h2 className="text-[44px] font-bold leading-[1.12] tracking-tight">
              Start your space
              <br />
              in under a minute.
            </h2>
            <p className="text-base leading-relaxed text-white/80">
              One account for your H-Space apps: planner, notes, learning, and more.
            </p>
            <ol className="space-y-3 pt-2">
              {SIGN_UP_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-3.5 rounded-2xl bg-white/[0.07] px-4 py-3.5 ring-1 ring-white/12"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                      index === 0 ? "bg-white text-brand-surface" : "bg-white/15",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[15px] font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <h2 className="text-[44px] font-bold leading-[1.12] tracking-tight">
              Your personal OS,
              <br />
              all in one place.
            </h2>
            <p className="text-base leading-relaxed text-white/80">
              Plan your day, keep learning, track your money and find your notes — one sign-in opens
              every H-Space app.
            </p>
            <ul className="grid grid-cols-2 gap-3 pt-2">
              {SPACE_APPS.map((app) => (
                <li
                  key={app.label}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/12"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-[11px]",
                      app.tile,
                    )}
                  >
                    <app.icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{app.label}</span>
                    <span className="block truncate text-xs text-white/70">{app.area}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-4 text-[13px] text-white/70">
        <span>Designed for focus, powered by your ideas.</span>
        <span>© {new Date().getFullYear()} H-Space</span>
      </div>
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
    <div className={cn("mb-7 space-y-2", centered && "text-center")}>
      {Icon && (
        <span
          className={cn(
            "mb-5 flex size-14 items-center justify-center rounded-[18px]",
            centered && "mx-auto",
            tone === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            tone === "error" && "bg-destructive/10 text-destructive",
            tone === "default" && "bg-primary/10 text-primary",
          )}
        >
          <Icon size={26} aria-hidden="true" />
        </span>
      )}
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">
        {title}
      </h1>
      {description && (
        <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>
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
    <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted-foreground">
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
        className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
