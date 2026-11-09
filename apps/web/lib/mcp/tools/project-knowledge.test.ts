import { afterEach, describe, expect, it, vi } from "vitest"
import {
  aiLevelOf,
  registerProjectKnowledgeReadTools,
  registerProjectKnowledgeWriteTools,
} from "./project-knowledge"
import { captureRegisteredTools, fakeContext, fakeDb, fakeQuery } from "./test-support"

const PROJECT_ID = "11111111-1111-4111-8111-111111111111"
const NOTE_ID = "22222222-2222-4222-8222-222222222222"
const OTHER_PROJECT_ID = "33333333-3333-4333-8333-333333333333"

// Synthetic data only.
const NOTE_ROW = {
  id: NOTE_ID,
  user_id: "user-1",
  project_id: PROJECT_ID,
  slug: "note-existing",
  title: "Fictional note",
  description: "",
  content: "Synthetic body",
  note_type: "technical",
  tags: [],
  source_url: null,
  updated_at: "2026-11-09T00:00:00Z",
}

/** A user-owned project set to Read & edit in the app. */
const EDITABLE_PROJECT = { id: PROJECT_ID, ai_access: true, ai_can_edit: true }

/** fakeQuery that also records .eq() filters and .update() patches. */
function recordingQuery(result: { data: unknown; error: unknown }) {
  const query = fakeQuery(result)
  const eqs: [string, unknown][] = []
  const updates: Record<string, unknown>[] = []
  query.eq = (column: string, value: unknown) => {
    eqs.push([column, value])
    return query
  }
  query.update = (patch: Record<string, unknown>) => {
    updates.push(patch)
    return query
  }
  return { query, eqs, updates }
}

afterEach(() => vi.unstubAllEnvs())

describe("project knowledge MCP", () => {
  it("is deny-all by default", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeReadTools(fakeServer, fakeContext(fakeDb({})))
    const result = await tools.get("list_knowledge_projects")!.handler({})
    expect(result.structuredContent).toEqual({ projects: [] })
  })

  it("refuses reads for non-allowlisted projects", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeReadTools(fakeServer, fakeContext(fakeDb({})))
    const result = await tools.get("list_project_notes")!.handler({
      projectId: PROJECT_ID,
      limit: 20,
    })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
  })

  it("lists explicitly approved projects", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", PROJECT_ID)
    const { fakeServer, tools } = captureRegisteredTools()
    const projects = fakeQuery({
      data: [
        {
          id: PROJECT_ID,
          name: "Backend Study",
          description: "Practice",
          project_type: "learning",
          status: "active",
          updated_at: "2026-11-09T00:00:00Z",
        },
      ],
      error: null,
    })
    registerProjectKnowledgeReadTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: projects,
        }),
      ),
    )
    const result = await tools.get("list_knowledge_projects")!.handler({})
    expect(result.isError).toBeFalsy()
    expect((result.structuredContent as { projects: { id: string }[] }).projects[0].id).toBe(
      PROJECT_ID,
    )
  })

  it("refuses writes outside explicitly approved projects", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    let inserted = false
    const notes = fakeQuery({ data: [], error: null })
    notes.insert = () => {
      inserted = true
      return notes
    }
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_notes: notes,
        }),
        { writeEnabled: true },
      ),
    )
    const result = await tools.get("create_project_note")!.handler({
      projectId: PROJECT_ID,
      title: "Mock Notes",
      content: "Fictional example only",
      noteType: "technical",
      tags: [],
    })
    expect(result.isError).toBe(true)
    expect(inserted).toBe(false)
  })

  it("refuses an allowlisted project the caller does not own", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", PROJECT_ID)
    const { fakeServer, tools } = captureRegisteredTools()
    // Another user's project: the user_id filter (and RLS) returns no row.
    registerProjectKnowledgeReadTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: fakeQuery({ data: null, error: null }),
          kori_notes: fakeQuery({ data: [NOTE_ROW], error: null }),
        }),
      ),
    )
    const result = await tools.get("list_project_notes")!.handler({
      projectId: PROJECT_ID,
      limit: 20,
    })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
  })

  it("gives the same denial for a missing note and a note outside the allowlist", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", OTHER_PROJECT_ID)
    const read = async (note: unknown) => {
      const { fakeServer, tools } = captureRegisteredTools()
      registerProjectKnowledgeReadTools(
        fakeServer,
        fakeContext(
          fakeDb({
            kori_note_projects: fakeQuery({ data: { id: PROJECT_ID }, error: null }),
            kori_notes: fakeQuery({ data: note, error: null }),
          }),
        ),
      )
      return tools.get("get_project_note")!.handler({ noteId: NOTE_ID })
    }
    const missing = await read(null) // e.g. another user's note, hidden by RLS
    const notApproved = await read(NOTE_ROW)
    const unfiled = await read({ ...NOTE_ROW, project_id: null })
    for (const result of [missing, notApproved, unfiled]) {
      expect(result.isError).toBe(true)
      expect(result.structuredContent).toBeUndefined()
    }
    // No existence oracle: every denial reads identically.
    expect(notApproved.content).toEqual(missing.content)
    expect(unfiled.content).toEqual(missing.content)
  })

  it("reads a note in an approved, user-owned project", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", PROJECT_ID)
    const { fakeServer, tools } = captureRegisteredTools()
    const notes = recordingQuery({ data: NOTE_ROW, error: null })
    registerProjectKnowledgeReadTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: fakeQuery({ data: { id: PROJECT_ID }, error: null }),
          kori_notes: notes.query,
        }),
      ),
    )
    const result = await tools.get("get_project_note")!.handler({ noteId: NOTE_ID })
    expect(result.isError).toBeFalsy()
    expect((result.structuredContent as { note: { content: string } }).note.content).toBe(
      NOTE_ROW.content,
    )
    expect(notes.eqs).toContainEqual(["user_id", "user-1"])
  })

  it("refuses updates to a note outside the allowlist without writing", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", OTHER_PROJECT_ID)
    const notes = recordingQuery({ data: NOTE_ROW, error: null })
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: fakeQuery({ data: { id: PROJECT_ID }, error: null }),
          kori_notes: notes.query,
        }),
        { writeEnabled: true },
      ),
    )
    const result = await tools.get("update_project_note")!.handler({
      noteId: NOTE_ID,
      title: "Changed",
    })
    expect(result.isError).toBe(true)
    expect(notes.updates).toHaveLength(0)
  })

  it("updates only the caller's note, pinned to its project", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const notes = recordingQuery({ data: NOTE_ROW, error: null })
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: fakeQuery({ data: EDITABLE_PROJECT, error: null }),
          kori_notes: notes.query,
        }),
        { writeEnabled: true },
      ),
    )
    const result = await tools.get("update_project_note")!.handler({
      noteId: NOTE_ID,
      title: "Changed",
    })
    expect(result.isError).toBeFalsy()
    expect(notes.updates).toHaveLength(1)
    expect(notes.updates[0]).toMatchObject({ title: "Changed" })
    // Never moves a note or touches its owner.
    expect(notes.updates[0]).not.toHaveProperty("project_id")
    expect(notes.updates[0]).not.toHaveProperty("user_id")
    expect(notes.eqs).toContainEqual(["user_id", "user-1"])
    expect(notes.eqs).toContainEqual(["project_id", PROJECT_ID])
  })

  it("creates a note in a Read & edit, user-owned project", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const { fakeServer, tools } = captureRegisteredTools()
    const notes = fakeQuery({
      data: {
        id: NOTE_ID,
        user_id: "user-1",
        project_id: PROJECT_ID,
        slug: "note-new",
        title: "SQL Learning",
        description: "",
        content: "How LEFT JOIN works",
        note_type: "technical",
        tags: ["sql"],
        source_url: null,
        updated_at: "2026-11-09T00:00:00Z",
      },
      error: null,
    })
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: fakeQuery({ data: EDITABLE_PROJECT, error: null }),
          kori_notes: notes,
        }),
        { writeEnabled: true },
      ),
    )
    const result = await tools.get("create_project_note")!.handler({
      projectId: PROJECT_ID,
      title: "SQL Learning",
      content: "How LEFT JOIN works",
      noteType: "technical",
      tags: ["sql"],
    })
    expect(result.isError).toBeFalsy()
    expect((result.structuredContent as { created: boolean }).created).toBe(true)
  })
})

describe("project knowledge MCP — in-app AI access switch", () => {
  const PROJECT_ROW = {
    id: PROJECT_ID,
    name: "Work reviews",
    description: "",
    project_type: "work_reference",
    status: "active",
    updated_at: "2026-11-09T00:00:00Z",
  }

  /** A kori_note_projects fake whose maybeSingle() answers in sequence. */
  function sequencedProjects(...results: { data: unknown; error: unknown }[]) {
    const query = fakeQuery({ data: [], error: null })
    const selects: string[] = []
    query.select = (columns: string) => {
      selects.push(columns)
      return query
    }
    query.maybeSingle = () => Promise.resolve(results.shift() ?? { data: null, error: null })
    return { query, selects }
  }

  it("lists a switched-on project with no env allowlist", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeReadTools(
      fakeServer,
      fakeContext(fakeDb({ kori_note_projects: fakeQuery({ data: [PROJECT_ROW], error: null }) })),
    )
    const result = await tools.get("list_knowledge_projects")!.handler({})
    expect((result.structuredContent as { projects: { id: string }[] }).projects).toHaveLength(1)
  })

  it("reads notes in a switched-on, user-owned project", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const projects = sequencedProjects({ data: { id: PROJECT_ID, ai_access: true }, error: null })
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeReadTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: projects.query,
          kori_notes: fakeQuery({ data: NOTE_ROW, error: null }),
        }),
      ),
    )
    const result = await tools.get("get_project_note")!.handler({ noteId: NOTE_ID })
    expect(result.isError).toBeFalsy()
    expect(projects.selects).toContain("id, ai_access, ai_can_edit")
  })

  it("refuses a project whose switch is off, with the standard denial", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const projects = sequencedProjects({ data: { id: PROJECT_ID, ai_access: false }, error: null })
    let inserted = false
    const notes = fakeQuery({ data: [], error: null })
    notes.insert = () => {
      inserted = true
      return notes
    }
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(fakeDb({ kori_note_projects: projects.query, kori_notes: notes }), {
        writeEnabled: true,
      }),
    )
    const result = await tools.get("create_project_note")!.handler({
      projectId: PROJECT_ID,
      title: "Fictional review",
      content: "Synthetic body",
      noteType: "technical",
      tags: [],
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/not found/)
    expect(inserted).toBe(false)
  })

  it("falls back to the env allowlist when the ai_access column doesn't exist yet", async () => {
    const missingColumn = { data: null, error: { code: "42703" } }
    const owned = { data: { id: PROJECT_ID }, error: null }
    const read = async (envIds: string) => {
      vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", envIds)
      const projects = sequencedProjects(missingColumn, owned)
      const { fakeServer, tools } = captureRegisteredTools()
      registerProjectKnowledgeReadTools(
        fakeServer,
        fakeContext(
          fakeDb({
            kori_note_projects: projects.query,
            kori_notes: fakeQuery({ data: [NOTE_ROW], error: null }),
          }),
        ),
      )
      return tools.get("list_project_notes")!.handler({ projectId: PROJECT_ID, limit: 20 })
    }
    expect((await read(PROJECT_ID)).isError).toBeFalsy()
    expect((await read("")).isError).toBe(true)
  })

  it("create_knowledge_project creates an owned, switched-on, empty project", async () => {
    const inserts: Record<string, unknown>[] = []
    const projects = fakeQuery({ data: PROJECT_ROW, error: null })
    projects.insert = (row: Record<string, unknown>) => {
      inserts.push(row)
      return projects
    }
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(fakeDb({ kori_note_projects: projects }), { writeEnabled: true }),
    )
    const result = await tools.get("create_knowledge_project")!.handler({
      name: "Work reviews",
      description: "",
      projectType: "work_reference",
    })
    expect(result.isError).toBeFalsy()
    expect(inserts).toEqual([
      {
        user_id: "user-1",
        name: "Work reviews",
        description: "",
        project_type: "work_reference",
        status: "active",
        ai_access: true,
        ai_can_edit: true,
      },
    ])
    expect(
      (result.structuredContent as { project: { aiCanEdit: boolean } }).project.aiCanEdit,
    ).toBe(true)
    expect((result.structuredContent as { project: { id: string } }).project.id).toBe(PROJECT_ID)
  })

  it("create_knowledge_project explains when the switch isn't set up yet", async () => {
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(
        fakeDb({ kori_note_projects: fakeQuery({ data: null, error: { code: "PGRST204" } }) }),
        { writeEnabled: true },
      ),
    )
    const result = await tools.get("create_knowledge_project")!.handler({
      name: "Work reviews",
      description: "",
      projectType: "personal",
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/isn't set up/)
  })

  it("create_knowledge_project still works before the ai_can_edit column exists", async () => {
    const inserts: Record<string, unknown>[] = []
    const results = [
      { data: null, error: { code: "PGRST204" } }, // ai_can_edit unknown
      { data: PROJECT_ROW, error: null },
    ]
    const projects = fakeQuery({ data: null, error: null })
    projects.insert = (row: Record<string, unknown>) => {
      inserts.push(row)
      return projects
    }
    projects.single = () => Promise.resolve(results.shift()!)
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(fakeDb({ kori_note_projects: projects }), { writeEnabled: true }),
    )
    const result = await tools.get("create_knowledge_project")!.handler({
      name: "Work reviews",
      description: "",
      projectType: "personal",
    })
    expect(result.isError).toBeFalsy()
    expect(inserts).toHaveLength(2)
    expect(inserts[0]).toHaveProperty("ai_can_edit", true)
    expect(inserts[1]).not.toHaveProperty("ai_can_edit")
  })

  it("no tool can switch AI access on for an existing project", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", PROJECT_ID)
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeReadTools(fakeServer, fakeContext(fakeDb({})))
    registerProjectKnowledgeWriteTools(fakeServer, fakeContext(fakeDb({}), { writeEnabled: true }))
    for (const tool of tools.values()) {
      expect(JSON.stringify(tool.config.inputSchema ?? {})).not.toMatch(/ai_?access|can_?edit/i)
    }
  })
})

describe("project knowledge MCP — AI permission levels", () => {
  const READ_ONLY_PROJECT = { id: PROJECT_ID, ai_access: true, ai_can_edit: false }

  function writeTools(project: unknown, notes: ReturnType<typeof recordingQuery>) {
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeWriteTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: fakeQuery({ data: project, error: null }),
          kori_notes: notes.query,
        }),
        { writeEnabled: true },
      ),
    )
    return tools
  }

  it("maps project rows to levels", () => {
    expect(aiLevelOf({ ai_access: false, ai_can_edit: true }, false)).toBe("none")
    expect(aiLevelOf({ ai_access: true, ai_can_edit: false }, false)).toBe("read")
    expect(aiLevelOf({ ai_access: true, ai_can_edit: true }, false)).toBe("edit")
    // Before the ai_can_edit migration, ai_access alone kept Read & edit.
    expect(aiLevelOf({ ai_access: true }, false)).toBe("edit")
    // The env allowlist only ever grants reading.
    expect(aiLevelOf({ ai_access: false, ai_can_edit: false }, true)).toBe("read")
    expect(aiLevelOf({}, true)).toBe("read")
    expect(aiLevelOf({}, false)).toBe("none")
  })

  it("lets AI read a Read only project", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeReadTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: fakeQuery({ data: READ_ONLY_PROJECT, error: null }),
          kori_notes: fakeQuery({ data: [NOTE_ROW], error: null }),
        }),
      ),
    )
    const result = await tools.get("list_project_notes")!.handler({
      projectId: PROJECT_ID,
      limit: 20,
    })
    expect(result.isError).toBeFalsy()
  })

  it("refuses to create a note in a Read only project without writing", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const notes = recordingQuery({ data: NOTE_ROW, error: null })
    let inserted = false
    notes.query.insert = () => {
      inserted = true
      return notes.query
    }
    const result = await writeTools(READ_ONLY_PROJECT, notes).get("create_project_note")!.handler({
      projectId: PROJECT_ID,
      title: "Fictional",
      content: "Synthetic body",
      noteType: "technical",
      tags: [],
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/Read only/)
    expect(inserted).toBe(false)
  })

  it("refuses to update a note in a Read only project without writing", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const notes = recordingQuery({ data: NOTE_ROW, error: null })
    const result = await writeTools(READ_ONLY_PROJECT, notes).get("update_project_note")!.handler({
      noteId: NOTE_ID,
      title: "Changed",
    })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/Read only/)
    expect(notes.updates).toHaveLength(0)
  })

  it("treats an env-allowlisted project as Read only", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", PROJECT_ID)
    const notes = recordingQuery({ data: NOTE_ROW, error: null })
    const result = await writeTools({ id: PROJECT_ID, ai_access: false, ai_can_edit: false }, notes)
      .get("update_project_note")!
      .handler({ noteId: NOTE_ID, title: "Changed" })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/Read only/)
    expect(notes.updates).toHaveLength(0)
  })

  it("reports each listed project's edit permission", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", "")
    const row = (id: string, aiCanEdit: boolean) => ({
      id,
      name: "Fictional " + id.slice(0, 4),
      description: "",
      project_type: "learning",
      status: "active",
      updated_at: "2026-11-09T00:00:00Z",
      ai_access: true,
      ai_can_edit: aiCanEdit,
    })
    const { fakeServer, tools } = captureRegisteredTools()
    registerProjectKnowledgeReadTools(
      fakeServer,
      fakeContext(
        fakeDb({
          kori_note_projects: fakeQuery({
            data: [row(PROJECT_ID, true), row(OTHER_PROJECT_ID, false)],
            error: null,
          }),
        }),
      ),
    )
    const result = await tools.get("list_knowledge_projects")!.handler({})
    const projects = (
      result.structuredContent as { projects: { id: string; aiCanEdit: boolean }[] }
    ).projects
    expect(projects.map((p) => [p.id, p.aiCanEdit])).toEqual([
      [PROJECT_ID, true],
      [OTHER_PROJECT_ID, false],
    ])
  })
})
