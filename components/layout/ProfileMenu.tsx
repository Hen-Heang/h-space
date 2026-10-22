"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, LogOut, ShieldCheck } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { THEME_OPTIONS } from "@/components/theme/theme-toggle";
import { useThemePreference } from "@/components/theme/use-theme-preference";
import { clearOfflineApiCache } from "@/lib/pwa-cache";
import { setThemePreference, THEME_PREFERENCES } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Account entry point for the sidebar, rail and desktop header. Replaces a
 * bare avatar with one menu for account settings and sign out.
 */
export function ProfileMenu({
  collapsed = false,
  align = "start",
  side = "top",
  className,
}: {
  collapsed?: boolean;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const themePreference = useThemePreference();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    await clearOfflineApiCache();
    router.replace("/login");
    router.refresh();
  }

  const trigger = (
    <button
      type="button"
      aria-label="Account menu"
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "justify-center px-0",
        className
      )}
    >
      <UserAvatar className="size-8 rounded-lg" email={email} />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">Account</span>
            <span className="block truncate text-xs text-muted-foreground">{email ?? "Signed in"}</span>
          </span>
          <ChevronsUpDown size={14} aria-hidden className="shrink-0 text-muted-foreground" />
        </>
      )}
    </button>
  );

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
          <Link href="/account/security">
            <ShieldCheck size={16} /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
        {THEME_PREFERENCES.map((option) => {
          const { label, icon: Icon } = THEME_OPTIONS[option];
          return (
            <DropdownMenuItem
              key={option}
              role="menuitemradio"
              aria-checked={themePreference === option}
              // Stay open so the change is visible before the menu closes.
              onSelect={(event) => {
                event.preventDefault();
                setThemePreference(option);
              }}
              className="rounded-lg"
            >
              <Icon size={16} /> {label}
              {themePreference === option && <Check size={16} className="ml-auto" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="rounded-lg text-destructive focus:text-destructive">
          <LogOut size={16} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
