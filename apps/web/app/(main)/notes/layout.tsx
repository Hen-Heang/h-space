import { redirect } from "next/navigation"

import { isNotesEnabled } from "@/lib/feature-flags"

// Notes was retired on 2026-11-10 (notes moved to Obsidian). While
// NEXT_PUBLIC_FEATURE_NOTES isn't "true", every /notes* URL — the library,
// /notes/new, a note, a project — goes to the Inbox, where quick capture
// lives. next.config.ts answers those URLs with an HTTP 307 first; this
// layout is the backstop, so the Notes pages never mount or query kori_notes
// even if a request reaches them. The pages and the data are untouched;
// turning the flag back on restores them.
export default function NotesLayout({ children }: { children: React.ReactNode }) {
  if (!isNotesEnabled()) redirect("/inbox")
  return children
}
