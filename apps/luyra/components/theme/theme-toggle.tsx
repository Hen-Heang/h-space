"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useThemePreference } from "@/components/theme/use-theme-preference";
import { setThemePreference, THEME_PREFERENCES, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const THEME_OPTIONS: Record<ThemePreference, { label: string; icon: LucideIcon }> = {
  system: { label: "System", icon: Monitor },
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
};

/** Segmented System / Light / Dark control. The choice applies instantly and is saved on this device. */
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemePreference();

  return (
    <div role="radiogroup" aria-label="Theme" className={cn("grid grid-cols-3 gap-1 rounded-xl border bg-secondary p-1", className)}>
      {THEME_PREFERENCES.map((option) => {
        const { label, icon: Icon } = THEME_OPTIONS[option];
        const active = preference === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setThemePreference(option)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors sm:min-h-9",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
