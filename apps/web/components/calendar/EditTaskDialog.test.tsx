/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import type { Task } from "@/lib/tasks"

import { EditTaskDialog } from "./EditTaskDialog"

beforeAll(() => {
  // jsdom has no matchMedia; useIsMobile reads it.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  // …nor ResizeObserver; the form's auto-resizing description uses it.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(cleanup)

const task = {
  id: "t1",
  title: "Synthetic task",
  description: "",
  completed: false,
  is_anytime: true,
  start_date: "2026-11-05T00:00:00.000Z",
  end_date: "2026-11-05T23:59:59.000Z",
} as Task

describe("EditTaskDialog delete", () => {
  it("hands off to the calendar's single confirm instead of asking first", () => {
    const onDeleteTask = vi.fn()
    const onClose = vi.fn()
    render(
      <EditTaskDialog
        isOpen
        onClose={onClose}
        onUpdateTask={vi.fn()}
        onDeleteTask={onDeleteTask}
        task={task}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(onDeleteTask).toHaveBeenCalledWith("t1")
    expect(onClose).toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
