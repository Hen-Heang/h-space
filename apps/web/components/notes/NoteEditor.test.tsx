/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ supabase: {} }))
vi.mock("@/hooks/useNoteProjects", () => ({
  useNoteProjects: () => ({ projects: [], unavailable: false }),
}))

import { NoteConflictError } from "@/lib/api"
import { noteDraftKey, serializeNoteDraft } from "@/lib/note-drafts"

import { NoteEditor, type NoteEditorValues } from "./NoteEditor"

const BASE = "2026-11-09T01:00:00.000000+00:00"
const EDIT_KEY = noteDraftKey("edit", "my-note")

const existing: NoteEditorValues = {
  slug: "my-note",
  title: "My note",
  description: "",
  icon: "common",
  category: "",
  noteType: "technical",
  tags: [],
  sourceUrl: "",
  pinned: false,
  content: "Saved body",
  projectId: "",
}

const blank: NoteEditorValues = { ...existing, slug: "", title: "", content: "Body" }

/** Lets the editor's 500ms draft autosave run. */
async function flushAutosave() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650))
  })
}

const body = () => screen.getByPlaceholderText("Write your markdown here...") as HTMLTextAreaElement

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe("NoteEditor drafts", () => {
  it("keeps no draft when nothing changed", async () => {
    render(
      <NoteEditor mode="edit" initial={existing} baseUpdatedAt={BASE} onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    await flushAutosave()
    expect(window.localStorage.getItem(EDIT_KEY)).toBeNull()
    expect(screen.queryByText(/Restored your unsaved changes/)).toBeNull()
    expect(screen.queryByText(/Unsaved changes/)).toBeNull()
  })

  it("keeps changes with the version they started from, and removes them on discard", async () => {
    const onCancel = vi.fn()
    render(
      <NoteEditor mode="edit" initial={existing} baseUpdatedAt={BASE} onSave={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.change(body(), { target: { value: "Edited body" } })
    await flushAutosave()
    expect(screen.getByText("Unsaved changes are kept on this device")).toBeTruthy()
    const stored = JSON.parse(window.localStorage.getItem(EDIT_KEY) ?? "{}")
    expect(stored.baseUpdatedAt).toBe(BASE)
    expect(stored.values.content).toBe("Edited body")

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole("button", { name: "Discard changes" }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(window.localStorage.getItem(EDIT_KEY)).toBeNull()
  })

  it("leaves straight away on Cancel when nothing changed", () => {
    const onCancel = vi.fn()
    render(
      <NoteEditor mode="edit" initial={existing} baseUpdatedAt={BASE} onSave={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("restores a draft that started from the note's current version", () => {
    window.localStorage.setItem(EDIT_KEY, serializeNoteDraft({ ...existing, content: "Draft body" }, BASE))
    render(
      <NoteEditor mode="edit" initial={existing} baseUpdatedAt={BASE} onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(body().value).toBe("Draft body")
    expect(screen.getByText(/Restored your unsaved changes/)).toBeTruthy()
  })

  it("asks before using a draft from an older version, and doesn't overwrite it meanwhile", async () => {
    const stale = serializeNoteDraft({ ...existing, content: "Old draft" }, "2026-11-08T00:00:00Z")
    window.localStorage.setItem(EDIT_KEY, stale)
    render(
      <NoteEditor mode="edit" initial={existing} baseUpdatedAt={BASE} onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(body().value).toBe("Saved body")
    expect(screen.getByText(/from an earlier version of this note/)).toBeTruthy()

    await flushAutosave()
    expect(window.localStorage.getItem(EDIT_KEY)).toBe(stale)

    fireEvent.click(screen.getByRole("button", { name: "Use these changes" }))
    expect(body().value).toBe("Old draft")
  })

  it("asks before using a draft written before drafts were versioned", () => {
    window.localStorage.setItem(EDIT_KEY, JSON.stringify({ ...existing, content: "Legacy draft" }))
    render(
      <NoteEditor mode="edit" initial={existing} baseUpdatedAt={BASE} onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(body().value).toBe("Saved body")
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }))
    expect(window.localStorage.getItem(EDIT_KEY)).toBeNull()
    expect(screen.queryByText(/from an earlier version of this note/)).toBeNull()
  })

  it("doesn't bring a plain new-note draft into a project's new note", () => {
    window.localStorage.setItem(
      noteDraftKey("create", ""),
      serializeNoteDraft({ ...blank, title: "Elsewhere", content: "Other draft" }, null),
    )
    render(
      <NoteEditor mode="create" initial={{ ...blank, projectId: "p1" }} onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(body().value).toBe("Body")
    expect(screen.queryByText(/Restored your unsaved changes/)).toBeNull()
  })

  it("keeps the draft and explains when the note changed before saving", async () => {
    const onSave = vi.fn().mockRejectedValue(new NoteConflictError())
    render(
      <NoteEditor mode="edit" initial={existing} baseUpdatedAt={BASE} onSave={onSave} onCancel={vi.fn()} />,
    )
    fireEvent.change(body(), { target: { value: "My edits" } })
    await flushAutosave()
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toMatch(/changed or deleted somewhere else/)
    expect(JSON.parse(window.localStorage.getItem(EDIT_KEY) ?? "{}").values.content).toBe("My edits")
  })
})

describe("NoteEditor accessibility", () => {
  it("names every field with its visible label", () => {
    render(<NoteEditor mode="create" initial={blank} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText("Type").tagName).toBe("BUTTON")
    expect(screen.getByLabelText("Project").tagName).toBe("BUTTON")
    expect(screen.getByLabelText("Category (project section)").tagName).toBe("INPUT")
    expect(screen.getByLabelText("Source URL (optional)").tagName).toBe("INPUT")
    expect(screen.getByLabelText("Tags").tagName).toBe("INPUT")
  })

  it("has a single pin control", () => {
    render(<NoteEditor mode="create" initial={blank} onSave={vi.fn()} onCancel={vi.fn()} />)
    const pin = screen.getByRole("button", { name: "Pin note" })
    expect(screen.queryByRole("switch")).toBeNull()
    fireEvent.click(pin)
    expect(screen.getByRole("button", { name: "Unpin note" }).getAttribute("aria-pressed")).toBe("true")
  })

  it("says which editor mode is selected", () => {
    render(<NoteEditor mode="create" initial={blank} onSave={vi.fn()} onCancel={vi.fn()} />)
    const write = screen.getByRole("button", { name: "Write" })
    const preview = screen.getByRole("button", { name: "Preview" })
    expect(write.getAttribute("aria-pressed")).toBe("true")
    expect(preview.getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(preview)
    expect(preview.getAttribute("aria-pressed")).toBe("true")
    expect(write.getAttribute("aria-pressed")).toBe("false")
  })
})

describe("NoteEditor slugs", () => {
  it("generates a slug for a Korean title", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<NoteEditor mode="create" initial={blank} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Note title"), { target: { value: "한국어 공부" } })
    const slugInput = screen.getByLabelText("Note URL slug") as HTMLInputElement
    expect(slugInput.value).toMatch(/^note-\d{8}-[a-z0-9]{4}$/)

    fireEvent.change(screen.getByLabelText("Note title"), { target: { value: "한국어 공부 노트" } })
    expect((screen.getByLabelText("Note URL slug") as HTMLInputElement).value).toBe(slugInput.value)

    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0][0].slug).toBe(slugInput.value)
  })

  it("follows an English title until the slug is edited", () => {
    render(<NoteEditor mode="create" initial={blank} onSave={vi.fn()} onCancel={vi.fn()} />)
    const title = screen.getByLabelText("Note title")
    const slug = screen.getByLabelText("Note URL slug") as HTMLInputElement
    fireEvent.change(title, { target: { value: "Spring tips" } })
    expect(slug.value).toBe("spring-tips")
    fireEvent.change(slug, { target: { value: "my-spring" } })
    fireEvent.change(title, { target: { value: "Spring tips 2" } })
    expect(slug.value).toBe("my-spring")
  })

  it("rejects a slug typed in another script", async () => {
    const onSave = vi.fn()
    render(<NoteEditor mode="create" initial={blank} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Note title"), { target: { value: "Notes" } })
    fireEvent.change(screen.getByLabelText("Note URL slug"), { target: { value: "공부" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText(/Use English letters, numbers and dashes/)).toBeTruthy()
    expect(onSave).not.toHaveBeenCalled()
  })

  it("explains a slug another note already uses", async () => {
    const onSave = vi.fn().mockRejectedValue({ code: "23505", message: "duplicate key value" })
    render(<NoteEditor mode="create" initial={blank} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Note title"), { target: { value: "Spring tips" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Another note already uses /notes/spring-tips. Change the URL and save again.")).toBeTruthy()
  })
})
