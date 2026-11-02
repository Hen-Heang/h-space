"use client"

import { useQuery } from "@tanstack/react-query"

import { useBrowserStorage } from "@/hooks/useBrowserStorage"
import { interviewApi } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import { dateKeyInTimeZone } from "@/lib/date-key"
import {
  interviewScriptStorageKeys,
  parseStoredQueueIds,
  pickNewerScript,
  type ScriptSnapshot,
} from "@/lib/exam-prep-home"
import {
  INTERVIEW_TIME_ZONE,
  todayQueueStorageKey,
  type PracticeDifficulty,
} from "@/lib/interview-practice"

export const interviewQuestionsQueryKey = (userId: string | null, topicId: string) =>
  ["interview-questions", userId, topicId] as const
export const interviewProgressQueryKey = (userId: string | null) =>
  ["interview-progress", userId] as const
export const interviewScriptQueryKey = (userId: string | null, topicId: string) =>
  ["interview-script", userId, topicId] as const

// The drills and the script editor write these through interviewApi directly
// (no shared cache), so refetch whenever the home mounts: coming back from a
// drill must show today's fresh "done" count.
const FRESH_ON_MOUNT = { staleTime: 0, refetchOnMount: "always" } as const

function parseLocalScript(raw: string | null, updatedAt: string | null): ScriptSnapshot | null {
  if (!raw) return null
  try {
    const sections: unknown = JSON.parse(raw)
    if (!sections || typeof sections !== "object" || Array.isArray(sections)) return null
    return { sections: sections as Record<string, string>, updatedAt }
  } catch {
    return null
  }
}

/** Everything the Exam Prep home reads, from the existing tables and keys only. */
export function useExamPrepHome(topicId: string, difficulty: PracticeDifficulty) {
  const userId = getUserId()
  const enabled = userId != null

  const questions = useQuery({
    queryKey: interviewQuestionsQueryKey(userId, topicId),
    queryFn: () => interviewApi.listQuestions(topicId),
    enabled,
    ...FRESH_ON_MOUNT,
  })
  const progress = useQuery({
    queryKey: interviewProgressQueryKey(userId),
    queryFn: interviewApi.listQuestionProgress,
    enabled,
    ...FRESH_ON_MOUNT,
  })
  const remoteScript = useQuery({
    queryKey: interviewScriptQueryKey(userId, topicId),
    queryFn: () => interviewApi.getScript(topicId),
    enabled,
    ...FRESH_ON_MOUNT,
  })

  const todayKey = todayQueueStorageKey(
    dateKeyInTimeZone(new Date(), INTERVIEW_TIME_ZONE),
    difficulty,
  )
  const [storedQueueRaw] = useBrowserStorage("local", todayKey)
  const scriptKeys = interviewScriptStorageKeys(topicId)
  const [localScriptRaw] = useBrowserStorage("local", scriptKeys.sections)
  const [localScriptUpdatedAt] = useBrowserStorage("local", scriptKeys.updatedAt)

  const remote = remoteScript.data
  const script = pickNewerScript(
    parseLocalScript(localScriptRaw, localScriptUpdatedAt),
    remote ? { sections: remote.sections ?? {}, updatedAt: remote.updatedAt } : null,
  )

  return {
    practice: {
      questions: questions.data ?? [],
      progress: progress.data ?? {},
      storedIds: parseStoredQueueIds(storedQueueRaw),
      loading: questions.isPending || progress.isPending,
      error: questions.isError || progress.isError,
      retry: () => {
        void questions.refetch()
        void progress.refetch()
      },
    },
    // The script card always has something to show: the local copy or the draft.
    script: {
      snapshot: script,
      loading: remoteScript.isPending && !script,
      syncFailed: remoteScript.isError,
    },
  }
}
