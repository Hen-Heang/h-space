"use client";

import { useEffect, useState } from "react";

// Explicit navigation breakpoints. Tailwind's `lg` (1024px) is the wrong
// boundary in both directions here: a 768x1024 tablet would get the mobile
// bottom bar, and a 1024px-wide window would get the full sidebar with
// almost no room left for content. The shell switches chrome on these instead.
export const TABLET_MIN_WIDTH = 768;
export const DESKTOP_MIN_WIDTH = 1200;

export type NavigationMode = "mobile" | "tablet" | "desktop";

export function navigationModeForWidth(width: number): NavigationMode {
  if (width >= DESKTOP_MIN_WIDTH) return "desktop";
  if (width >= TABLET_MIN_WIDTH) return "tablet";
  return "mobile";
}

/**
 * Which navigation chrome the current viewport should render. Resolves after
 * mount; the app shell already gates on a mount check via the auth layout, so
 * callers never paint with the placeholder value for long.
 */
export function useNavigationMode(): NavigationMode {
  // Always starts at "desktop" so the client's first render matches the
  // server's — reading window.innerWidth here would run during hydration
  // too, not just after mount, and mismatch whenever the real viewport
  // isn't desktop-sized.
  const [mode, setMode] = useState<NavigationMode>("desktop");

  useEffect(() => {
    const tablet = window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`);
    const desktop = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);

    function update() {
      setMode(navigationModeForWidth(window.innerWidth));
    }

    update();
    tablet.addEventListener("change", update);
    desktop.addEventListener("change", update);
    return () => {
      tablet.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
    };
  }, []);

  return mode;
}
