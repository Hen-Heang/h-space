// Light/dark theme. The preference ("system", "light", "dark") is stored per
// device in localStorage; <html data-theme> always holds the *resolved* theme
// ("light" or "dark"), so the CSS has a single dark token block and Tailwind's
// `dark:` variant keys off the same attribute (see app/globals.css).
//
// THEME_INIT_SCRIPT runs inline in <head> before first paint (see
// app/layout.tsx), so a saved choice never flashes the other theme.

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "luyra-theme";
export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

const DARK_QUERY = "(prefers-color-scheme: dark)";

// Plain ES5 on purpose: it's inlined as a string and runs before any bundle.
// Mirrors readPreference + resolveTheme + applyResolvedTheme below. Reading
// storage has its own try: when it's blocked (private mode), "System" must
// still resolve from the OS rather than the whole script bailing out.
export const THEME_INIT_SCRIPT = `(function(){var p=null;try{p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)})}catch(e){}try{var t=p==="light"||p==="dark"?p:(window.matchMedia(${JSON.stringify(
  DARK_QUERY
)}).matches?"dark":"light");var d=document.documentElement;d.setAttribute("data-theme",t);d.style.colorScheme=t}catch(e){}})()`;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

// The choice made on this page view when it couldn't be saved (storage
// blocked, e.g. private mode). Without it, toggles would re-read storage, see
// nothing, show "System" while the page is dark, and let an OS change undo
// the user's explicit choice. Null while storage works — storage stays the
// source of truth then, so changes from other tabs still apply.
let unsavedPreference: ThemePreference | null = null;

export function readPreference(): ThemePreference {
  if (unsavedPreference) return unsavedPreference;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

/** Saves the choice (when storage allows) and applies it immediately. */
export function setThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    unsavedPreference = null;
  } catch {
    // Storage blocked (private mode): remember the choice for this page view.
    unsavedPreference = preference;
  }
  applyResolvedTheme(resolveTheme(preference));
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: preference }));
}

/** Fired on this tab whenever the preference changes, so every toggle stays in sync. */
export const THEME_CHANGE_EVENT = "luyra:theme-change";

/**
 * Keeps the resolved theme current after load: follows the OS while the
 * preference is "system", and picks up a change made in another tab.
 * Returns an unsubscribe function.
 */
export function watchTheme(): () => void {
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readPreference() === "system") applyResolvedTheme(resolveTheme("system"));
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const preference = readPreference();
    applyResolvedTheme(resolveTheme(preference));
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: preference }));
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}
