/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { renderMarkdown } from "@/lib/notes-markdown"

import { CodeCopy } from "./CodeCopy"

const writeText = vi.fn()

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
})
afterEach(cleanup)

function Reader({ markdown }: { markdown: string }) {
  return (
    <>
      <CodeCopy />
      <article className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />
    </>
  )
}

describe("CodeCopy", () => {
  it("copies the exact code of the block whose button was pressed", async () => {
    render(<Reader markdown={"```ts\nconst a = 1\n```\n\n```bash\necho hi\n```"} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy Bash code" }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("echo hi"))
    expect(screen.getByRole("button", { name: "Copy Bash code" }).textContent).toBe("Copied")
    expect(screen.getByRole("button", { name: "Copy TypeScript code" }).textContent).toBe("Copy")
  })

  it("says so when the clipboard refuses", async () => {
    writeText.mockRejectedValue(new Error("denied"))
    render(<Reader markdown={"```\nplain\n```"} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy code" }).textContent).toBe("Couldn't copy"),
    )
  })

  it("goes back to Copy after a moment", async () => {
    vi.useFakeTimers()
    try {
      render(<Reader markdown={"```\nplain\n```"} />)
      const button = screen.getByRole("button", { name: "Copy code" })
      fireEvent.click(button)
      await act(async () => {
        await Promise.resolve()
      })
      expect(button.textContent).toBe("Copied")
      act(() => {
        vi.advanceTimersByTime(2100)
      })
      expect(button.textContent).toBe("Copy")
    } finally {
      vi.useRealTimers()
    }
  })
})
