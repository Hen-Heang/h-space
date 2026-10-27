// Persistence helper for the desktop sidebar's collapsed state. Kept out of
// the component so it can be unit-tested and so the storage key lives in one
// place. Only a boolean is stored — never anything user-identifying.

export const SIDEBAR_STORAGE_KEY = "luyra-sidebar-collapsed";

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    // Private mode / storage disabled — fall back to expanded.
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch {
    /* storage unavailable — the state still works for this session */
  }
}
