"use client"

import { Suspense } from "react"
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
  // The URL is the single source of truth, read on every render — so a link
  // into another mode (the Learning tab's plain /phrasebook, the Hub's
  // Library), the /reading and /learn/foundations redirect stubs, refresh,
  // and back/forward all show the mode the URL names. An unknown mode shows
  // Phrases. Switching replaces the URL (no history entry), as before.
  const mode: StudyMode = VALID_MODES.includes(queryMode as StudyMode)
    ? (queryMode as StudyMode)
    : "phrases"

  function changeMode(next: StudyMode) {
    router.replace(next === "phrases" ? "/phrasebook" : `/phrasebook?mode=${next}`, {
      scroll: false,
    })
  }

  return (
    <div className="space-y-6">
      <StudyModeTabs mode={mode} onChange={changeMode} />
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
