"use client";

import { useCallback, useSyncExternalStore } from "react";

import { readSidebarCollapsed, writeSidebarCollapsed } from "@/lib/sidebar-state";

// localStorage is an external store, so read it through useSyncExternalStore
// rather than a mount effect — no cascading render, and every mounted sidebar
// stays in sync if more than one ever exists.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Desktop sidebar collapsed state, persisted under `luyra-sidebar-collapsed`. */
export function useSidebarState() {
  const collapsed = useSyncExternalStore(
    subscribe,
    readSidebarCollapsed,
    () => false // server / first paint: expanded
  );

  const toggle = useCallback(() => {
    writeSidebarCollapsed(!readSidebarCollapsed());
    listeners.forEach((listener) => listener());
  }, []);

  return { collapsed, toggle };
}
