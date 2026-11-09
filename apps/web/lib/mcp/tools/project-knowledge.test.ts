import { afterEach, describe, expect, it, vi } from "vitest"
import { registerProjectKnowledgeReadTools, registerProjectKnowledgeWriteTools } from "./project-knowledge"
import { captureRegisteredTools, fakeContext, fakeDb, fakeQuery } from "./test-support"

const PROJECT_ID = "11111111-1111-4111-8111-111111111111"
const NOTE_ID = "22222222-2222-4222-8222-222222222222"

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
      projectId: PROJECT_ID, limit: 20,
    })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
  })

  it("lists explicitly approved projects", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", PROJECT_ID)
    const { fakeServer, tools } = captureRegisteredTools()
    const projects = fakeQuery({
      data: [{
        id: PROJECT_ID, name: "Backend Study", description: "Practice",
        project_type: "learning", status: "active", updated_at: "2026-11-09T00:00:00Z",
      }],
      error: null,
    })
    registerProjectKnowledgeReadTools(fakeServer, fakeContext(fakeDb({
      kori_note_projects: projects,
    })))
    const result = await tools.get("list_knowledge_projects")!.handler({})
    expect(result.isError).toBeFalsy()
    expect((result.structuredContent as { projects: { id: string }[] }).projects[0].id)
      .toBe(PROJECT_ID)
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
    registerProjectKnowledgeWriteTools(fakeServer, fakeContext(fakeDb({
      kori_notes: notes,
    }), { writeEnabled: true }))
    const result = await tools.get("create_project_note")!.handler({
      projectId: PROJECT_ID, title: "Mock Notes",
      content: "Fictional example only", noteType: "technical", tags: [],
    })
    expect(result.isError).toBe(true)
    expect(inserted).toBe(false)
  })

  it("creates a note in an approved, user-owned project", async () => {
    vi.stubEnv("MCP_KNOWLEDGE_PROJECT_IDS", PROJECT_ID)
    const { fakeServer, tools } = captureRegisteredTools()
    const notes = fakeQuery({
      data: {
        id: NOTE_ID, user_id: "user-1", project_id: PROJECT_ID,
        slug: "note-new", title: "SQL Learning", description: "",
        content: "How LEFT JOIN works", note_type: "technical",
        tags: ["sql"], source_url: null, updated_at: "2026-11-09T00:00:00Z",
      },
      error: null,
    })
    registerProjectKnowledgeWriteTools(fakeServer, fakeContext(fakeDb({
      kori_note_projects: fakeQuery({ data: { id: PROJECT_ID }, error: null }),
      kori_notes: notes,
    }), { writeEnabled: true }))
    const result = await tools.get("create_project_note")!.handler({
      projectId: PROJECT_ID, title: "SQL Learning",
      content: "How LEFT JOIN works", noteType: "technical", tags: ["sql"],
    })
    expect(result.isError).toBeFalsy()
    expect((result.structuredContent as { created: boolean }).created).toBe(true)
  })
})
