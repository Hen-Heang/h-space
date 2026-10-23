"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Lets a detail page tell the shell's mobile header what the record is called
// ("Back | Goal name | ") without the shell having to fetch anything.
// Entirely optional — pages that don't call the hook fall back to the nav
// model's label for the route.

type Ctx = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const MobileHeaderTitleContext = createContext<Ctx | null>(null);

export function MobileHeaderTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return <MobileHeaderTitleContext.Provider value={value}>{children}</MobileHeaderTitleContext.Provider>;
}

export function useMobileHeaderTitleValue(): string | null {
  return useContext(MobileHeaderTitleContext)?.title ?? null;
}

/**
 * Publish a title for the mobile header while this component is mounted.
 * Pass `undefined` while loading — the header keeps its fallback label.
 */
export function useMobileHeaderTitle(title: string | null | undefined) {
  const ctx = useContext(MobileHeaderTitleContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setTitle(title ?? null);
    return () => ctx.setTitle(null);
    // `ctx.setTitle` is a stable useState setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);
}
