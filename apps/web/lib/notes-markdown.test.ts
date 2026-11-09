/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest"

import { escapeHtml, renderMarkdown, safeUrl } from "./notes-markdown"

function parse(markdown: string): HTMLElement {
  const container = document.createElement("div")
  container.innerHTML = renderMarkdown(markdown)
  return container
}

/** Every element carrying an inline event handler (onerror, onclick, …). */
function handlerElements(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll("*")).filter((el) =>
    Array.from(el.attributes).some((attr) => attr.name.toLowerCase().startsWith("on")),
  )
}

const DANGEROUS_TAGS = "script, iframe, object, embed, style, form, svg, math, base, meta, link"

describe("renderMarkdown — untrusted content", () => {
  it.each([
    ["block html", '<img src="x" onerror="alert(1)">'],
    ["inline html", 'Hello <img src=x onerror=alert(1)> world'],
    ["script tag", "<script>alert(1)</script>"],
    ["svg", '<svg onload="alert(1)"><circle /></svg>'],
    ["iframe", '<iframe src="https://example.com"></iframe>'],
    ["html in a heading", "## Title <img src=x onerror=alert(1)>"],
    ["html in link text", "[<img src=x onerror=alert(1)>](https://example.com)"],
    ["html in a table", "| a |\n| - |\n| <img src=x onerror=alert(1)> |"],
    ["html in a list", "- <b onmouseover=alert(1)>item</b>"],
  ])("renders %s as text, not markup", (_label, markdown) => {
    const root = parse(markdown)
    expect(handlerElements(root)).toEqual([])
    expect(root.querySelector(DANGEROUS_TAGS)).toBeNull()
    expect(root.querySelector("img")).toBeNull()
  })

  it("keeps escaped html visible as text", () => {
    const root = parse("Use <kbd>Ctrl</kbd> to copy")
    expect(root.textContent).toContain("<kbd>Ctrl</kbd>")
  })

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "java\tscript:alert(1)",
    " javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
  ])("drops a %s link but keeps its text", (href) => {
    const root = parse(`[click me](<${href}>)`)
    expect(root.querySelector("a")).toBeNull()
    expect(root.textContent).toContain("click me")
  })

  it("does not let a link title break out of its attribute", () => {
    const root = parse('[x](https://example.com "a\\" onmouseover=\\"alert(1)")')
    const link = root.querySelector("a")
    expect(link).not.toBeNull()
    expect(handlerElements(root)).toEqual([])
    expect(link?.getAttribute("href")).toBe("https://example.com")
  })

  it("only allows http(s) and relative image sources", () => {
    expect(parse("![alt](javascript:alert(1))").querySelector("img")).toBeNull()
    expect(parse("![alt](data:image/svg+xml,<svg onload=alert(1)>)").querySelector("img")).toBeNull()

    const img = parse('![a "cat"](https://example.com/cat.png)').querySelector("img")
    expect(img?.getAttribute("src")).toBe("https://example.com/cat.png")
    expect(img?.getAttribute("alt")).toBe('a "cat"')
    expect(handlerElements(parse('![x" onerror="alert(1)](https://e.com/a.png)'))).toEqual([])
  })

  it("does not let a code fence language break out of data-lang", () => {
    const root = parse('```js" onclick="alert(1)\nconst a = 1\n```')
    expect(handlerElements(root)).toEqual([])
    expect(root.querySelector("code")?.textContent).toBe("const a = 1")
  })

  it("escapes html inside code blocks", () => {
    const root = parse("```html\n<script>alert(1)</script>\n```")
    expect(root.querySelector("script")).toBeNull()
    expect(root.querySelector("code")?.textContent).toBe("<script>alert(1)</script>")
  })
})

describe("renderMarkdown — normal notes", () => {
  it("renders safe links, stripping .md", () => {
    const root = parse(
      "[web](https://example.com) [mail](mailto:me@example.com) [doc](./setup.md) [jump](#intro)",
    )
    const hrefs = Array.from(root.querySelectorAll("a")).map((a) => a.getAttribute("href"))
    expect(hrefs).toEqual(["https://example.com", "mailto:me@example.com", "./setup", "#intro"])
  })

  it("keeps the README back link", () => {
    expect(parse("[back](../README.md)").querySelector("a")?.getAttribute("href")).toBe("/notes")
  })

  it("renders inline formatting inside links and headings", () => {
    const root = parse("## Hello **world**\n\n[**bold** link](https://example.com)")
    expect(root.querySelector("h2 strong")?.textContent).toBe("world")
    expect(root.querySelector("a strong")?.textContent).toBe("bold")
  })

  it("gives h2/h3 headings stable ids", () => {
    const root = parse("## Getting Started\n\n### Next steps")
    expect(root.querySelector("h2")?.id).toBe("getting-started")
    expect(root.querySelector("h3")?.id).toBe("next-steps")
  })

  it("wraps code blocks for CodeCopy", () => {
    const wrapper = parse("```ts\nconst a = 1\n```").querySelector(".shiki-wrapper")
    expect(wrapper?.getAttribute("data-lang")).toBe("ts")
  })
})

describe("safeUrl", () => {
  it("accepts relative URLs and allowed schemes", () => {
    for (const url of ["/notes", "setup", "#a", "?q=1", "https://a.b", "HTTP://a.b", "mailto:x@y.z"]) {
      expect(safeUrl(url)).toBe(url)
    }
  })

  it("rejects other schemes and empty input", () => {
    for (const url of ["javascript:x", "\u0001javascript:x", "file:///etc", "data:x", "", "  ", null]) {
      expect(safeUrl(url)).toBeNull()
    }
  })
})

describe("escapeHtml", () => {
  it("escapes the five html-significant characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    )
  })
})
