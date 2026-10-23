"use client";

import { useEffect, useSyncExternalStore } from "react";
import { readPreference, THEME_CHANGE_EVENT, watchTheme, type ThemePreference } from "@/lib/theme";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

/**
 * The saved theme preference. The server snapshot is "system", so the first
 * client render matches the server's HTML; React then switches to the stored
 * value without a hydration mismatch. Every toggle reading this updates
 * together when any one of them changes the preference.
 */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system");
}

/** Mounted once in the root layout: follows OS changes and other tabs. */
export function ThemeSync(): null {
  useEffect(() => watchTheme(), []);
  return null;
}
