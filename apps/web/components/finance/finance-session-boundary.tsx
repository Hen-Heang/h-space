"use client"

import { Fragment, useSyncExternalStore } from "react"
import { getUserId, onAuthChange } from "@/lib/auth-store"

// Flush local forms and placeholder data as well as switching query keys
// when the account changes, including sign-in/sign-out in another tab.
export function FinanceSessionBoundary({ children }: { children: React.ReactNode }) {
  const userId = useSyncExternalStore(onAuthChange, getUserId, () => null)
  return userId ? <Fragment key={userId}>{children}</Fragment> : null
}
