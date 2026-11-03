// Progress through the /roadmap study plan, for its entry row in the Learning
// hub's Library. The roadmap page owns the data: completed topic ids
// ("p{phase}-t{topic}") in localStorage under ROADMAP_STORAGE_KEY. This only
// reads them — it never writes or migrates that key.

export const ROADMAP_STORAGE_KEY = "roadmap_completed_topics"

/**
 * The seven phases, in order, with how many topics each has — 102 in all,
 * matching app/(main)/roadmap/page.tsx. (The old Overview teaser hard-coded
 * 105, so it could never show more than 97%.)
 */
export const ROADMAP_PHASES: readonly { title: string; topics: number }[] = [
  { title: "Java Foundations", topics: 14 },
  { title: "Java Advanced", topics: 14 },
  { title: "SQL & Database", topics: 14 },
  { title: "Spring Core & Boot", topics: 15 },
  { title: "Spring Data + Security", topics: 15 },
  { title: "Advanced Spring", topics: 15 },
  { title: "System Design", topics: 15 },
]

const TOTAL_TOPICS = ROADMAP_PHASES.reduce((sum, phase) => sum + phase.topics, 0)

export interface RoadmapProgress {
  /** 1-based number of the current phase: the first one not finished, or the last. */
  phase: number
  title: string
  /** Completion of the current phase, 0–100. */
  phasePct: number
  /** Completion of the whole roadmap, 0–100. */
  overallPct: number
}

/** Parses the stored id list; anything malformed counts as no progress. */
export function parseCompletedTopics(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === "string"))
      : new Set()
  } catch {
    return new Set()
  }
}

export function getRoadmapProgress(completed: ReadonlySet<string>): RoadmapProgress {
  // Topics done per phase. Only real "p{n}-t{n}" ids count, so a stray
  // stored value can't push progress past what the roadmap actually has.
  const donePerPhase = ROADMAP_PHASES.map((info, index) => {
    let done = 0
    for (let topic = 1; topic <= info.topics; topic++) {
      if (completed.has(`p${index + 1}-t${topic}`)) done++
    }
    return done
  })

  // The current phase is the first unfinished one; with everything done, the last.
  const unfinished = donePerPhase.findIndex((done, i) => done < ROADMAP_PHASES[i].topics)
  const index = unfinished === -1 ? ROADMAP_PHASES.length - 1 : unfinished
  const info = ROADMAP_PHASES[index]
  const totalDone = donePerPhase.reduce((sum, done) => sum + done, 0)

  return {
    phase: index + 1,
    title: info.title,
    phasePct: Math.round((donePerPhase[index] / info.topics) * 100),
    overallPct: Math.round((totalDone / TOTAL_TOPICS) * 100),
  }
}
