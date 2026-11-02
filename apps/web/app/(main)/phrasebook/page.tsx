"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs"
import { FoundationsHome } from "@/components/learn/FoundationsHome"
import { PhrasebookHome } from "@/components/phrasebook/PhrasebookHome"
import { StudyModeTabs, type StudyMode } from "@/components/phrasebook/StudyModeTabs"
import { ReadingHome } from "@/components/reading/ReadingHome"

const VALID_MODES: StudyMode[] = ["phrases", "reading", "foundations"]

export default function PhrasebookPage() {
  return (
    <div className="space-y-6">
      <WorkspaceTabs sectionId="learn" />
      <Suspense fallback={null}>
        <PhrasebookPageContent />
      </Suspense>
    </div>
  )
}

function PhrasebookPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryMode = searchParams.get("mode")
  const [mode, setMode] = useState<StudyMode>(
    VALID_MODES.includes(queryMode as StudyMode) ? (queryMode as StudyMode) : "phrases",
  )

  // Keep the URL in sync with the active mode, so refreshing, sharing a
  // link, or navigating in via /reading or /learn/foundations (see the
  // redirect stubs there) all land on the right tab — same pattern as the
  // AI Coach mode switcher on /chat.
  useEffect(() => {
    router.replace(mode === "phrases" ? "/phrasebook" : `/phrasebook?mode=${mode}`, {
      scroll: false,
    })
    // Intentionally mode-only: this reflects mode changes into the URL, it
    // shouldn't re-run when router identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  return (
    <div className="space-y-6">
      <StudyModeTabs mode={mode} onChange={setMode} />
      {mode === "phrases" ? (
        <PhrasebookHome />
      ) : mode === "reading" ? (
        <ReadingHome />
      ) : (
        <FoundationsHome />
      )}
    </div>
  )
}
