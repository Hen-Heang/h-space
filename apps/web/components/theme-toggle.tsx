"use client"

import { useRef, useSyncExternalStore } from "react"
import { flushSync } from "react-dom"
import { Check, Laptop, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

function subscribeToHydration(callback: () => void) {
  queueMicrotask(callback)
  return () => undefined
}

const themes = [
  { label: "Light", value: "light", icon: Sun },
  { label: "Dark", value: "dark", icon: Moon },
  { label: "System", value: "system", icon: Laptop },
] as const

let activeTransition: ViewTransition | undefined
let themeChangeId = 0

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pendingTheme = useRef<(typeof themes)[number]["value"] | null>(null)
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )

  const activeTheme = mounted ? theme : "system"
  const ActiveIcon = mounted && resolvedTheme === "dark" ? Moon : Sun

  async function changeTheme(next: (typeof themes)[number]["value"]) {
    const changeId = ++themeChangeId
    activeTransition?.skipTransition()
    activeTransition = undefined
    const nextResolved =
      next === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next

    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      nextResolved === resolvedTheme
    ) {
      delete document.documentElement.dataset.themeTransition
      setTheme(next)
      return
    }

    const rect = triggerRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : 0
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    document.documentElement.dataset.themeTransition = ""
    let transition: ViewTransition | undefined
    try {
      transition = document.startViewTransition(() => {
        if (changeId === themeChangeId) flushSync(() => setTheme(next))
      })
      activeTransition = transition
      await transition.ready
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 480,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      )
      await transition.finished
    } catch {
      // A skipped snapshot or unsupported animation must still save the choice.
      transition?.skipTransition()
      if (changeId === themeChangeId) setTheme(next)
    } finally {
      if (changeId === themeChangeId) {
        activeTransition = undefined
        delete document.documentElement.dataset.themeTransition
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          size="sm"
          className={cn(
            "size-11 rounded-full border-border/70 bg-background/80 px-0 backdrop-blur",
            className,
          )}
          aria-label="Toggle theme"
        >
          <ActiveIcon size={20} strokeWidth={1.5} className="text-current" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40 rounded-2xl"
        onCloseAutoFocus={() => {
          const next = pendingTheme.current
          pendingTheme.current = null
          // Wait until Radix removes the closing menu before taking a snapshot.
          if (next) requestAnimationFrame(() => void changeTheme(next))
        }}
      >
        {themes.map((option) => {
          const Icon = option.icon

          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => {
                pendingTheme.current = option.value
              }}
              className="rounded-xl"
            >
              <Icon size={20} strokeWidth={1.5} className="text-current" />
              {option.label}
              {activeTheme === option.value ? (
                <Check size={20} strokeWidth={1.5} className="ml-auto text-current" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
