/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Task } from "@/lib/tasks"

import { ModernTaskItem } from "./ModernTaskItem"

afterEach(cleanup)

describe("ModernTaskItem", () => {
  it("shows the whole title and leaves shortening to CSS line clamping", () => {
    const title = "Read one chapter and write a short summary of it"
    render(
      <ModernTaskItem
        task={{ id: "t1", title, completed: false, is_anytime: true } as Task}
        onToggleCompletion={vi.fn()}
      />,
    )
    const el = screen.getByText(title)
    expect(el.className).toContain("line-clamp-2")
    expect(screen.queryByText(/\.\.\.$/)).toBeNull()
  })
})
