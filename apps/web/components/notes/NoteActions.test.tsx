/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/reminders/ReminderButton", () => ({ ReminderButton: () => null }))

import { NoteActions } from "./NoteActions"

afterEach(cleanup)

/** Radix menus open on pointerdown in jsdom. */
function openMore() {
  const trigger = screen.getByRole("button", { name: "More actions" })
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" })
}

describe("NoteActions", () => {
  it("shows Edit, a Pin icon and a More menu", () => {
    const onEdit = vi.fn()
    render(<NoteActions onEdit={onEdit} onTogglePin={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(screen.getByRole("button", { name: "Pin note" }).getAttribute("aria-pressed")).toBe(
      "false",
    )
    expect(screen.getByRole("button", { name: "More actions" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Delete note" })).toBeNull()
  })

  it("labels the pin as Unpin when pinned and toggles it", async () => {
    const onTogglePin = vi.fn().mockResolvedValue(undefined)
    render(<NoteActions pinned onEdit={vi.fn()} onTogglePin={onTogglePin} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Unpin note" }))
    await waitFor(() => expect(onTogglePin).toHaveBeenCalledOnce())
  })

  it("deletes only after confirming from the More menu", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(<NoteActions onEdit={vi.fn()} onDelete={onDelete} />)
    openMore()
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete note" }))
    expect(await screen.findByText("Delete this note?")).toBeTruthy()
    expect(onDelete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Delete note" }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce())
  })

  it("keeps the note when the confirmation is cancelled", async () => {
    const onDelete = vi.fn()
    render(<NoteActions onEdit={vi.fn()} onDelete={onDelete} />)
    openMore()
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete note" }))
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByText("Delete this note?")).toBeNull())
    expect(onDelete).not.toHaveBeenCalled()
  })
})
