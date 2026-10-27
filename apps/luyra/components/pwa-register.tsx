"use client";

import { useEffect } from "react";

// Mounted once in the root layout — registers public/sw.js for the whole
// app. Renders nothing.
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[pwa] service worker registration failed", error);
    });
  }, []);

  return null;
}
