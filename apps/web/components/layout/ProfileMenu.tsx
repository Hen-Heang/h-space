"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/ui/UserAvatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { clearAuth, getUserEmail } from "@/lib/auth-store"
import { cn } from "@/lib/utils"

/**
 * Account entry point for the desktop sidebar and tablet rail (the top bar
 * deliberately has none, so it isn't shown twice). Replaces the bare
 * avatar-linking-to-settings that used to sit in every header — profile,
 * theme and sign out now live behind one menu.
 */
export function ProfileMenu({
  collapsed = false,
  align = "start",
  side = "top",
  className,
}: {
  collapsed?: boolean
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}) {
  const router = useRouter()
  const email = getUserEmail()

  async function handleSignOut() {
    await clearAuth()
    router.replace("/login")
  }

  const trigger = (
    <button
      type="button"
      aria-label="Account menu"
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "justify-center px-0",
        className,
      )}
    >
      <UserAvatar className="size-8 rounded-lg" />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">Account</span>
            <span className="block truncate text-xs text-muted-foreground">
              {email ?? "Signed in"}
            </span>
          </span>
          <ChevronsUpDown size={14} aria-hidden className="shrink-0 text-muted-foreground" />
        </>
      )}
    </button>
  )

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Account</TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}

      <DropdownMenuContent align={align} side={side} className="min-w-56 rounded-xl">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {email ?? "Signed in"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-lg">
          <Link href="/settings">
            <Settings size={16} /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-sm">Theme</span>
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="rounded-lg text-destructive focus:text-destructive"
        >
          <LogOut size={16} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
