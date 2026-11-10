import { marked, Renderer, type Tokens } from "marked"

import { codeLanguageLabel, highlightCode } from "@/lib/notes-highlight"

// Client-side markdown → HTML for study notes. Code blocks are highlighted
// with highlight.js (lib/notes-highlight.ts) and wrapped in `.shiki-wrapper`
// (the class name is historical) with a `.code-header` that names the language
// and holds CodeCopy's button; globals.css styles both. Tables get a
// scrolling wrapper so they never widen a phone screen. Headings get stable
// ids (h2/h3) so the TOC and reading-progress observers can anchor to them.
//
// Security: the output goes into `dangerouslySetInnerHTML` on the same origin
// as H-Vault, under a CSP that still allows 'unsafe-inline' (lib/csp.ts), and
// note content isn't only typed by the owner — the MCP connector and Inbox
// conversion write it too. So note content is treated as untrusted:
//   - raw HTML in markdown is escaped and shown as text, never rendered;
//   - link and image URLs must be relative or use an allowed scheme;
//   - every attribute value we build is escaped.
// marked's own renderers escape text content; only the overrides below build
// HTML by hand, so each of them must escape what it interpolates.

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch])
}

const LINK_SCHEMES = new Set(["http", "https", "mailto"])
const IMAGE_SCHEMES = new Set(["http", "https"])

/**
 * Returns the URL if it is relative (`/x`, `x`, `#x`, `?x`) or uses one of
 * `schemes`; otherwise null. Browsers ignore ASCII whitespace and control
 * characters inside a scheme (`java\tscript:`), so those are stripped before
 * the scheme is read.
 */
export function safeUrl(
  url: string | null | undefined,
  schemes: ReadonlySet<string> = LINK_SCHEMES,
): string | null {
  if (url == null) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/[\u0000- \u007f]/g, "")
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)
  if (!scheme) return trimmed
  return schemes.has(scheme[1].toLowerCase()) ? trimmed : null
}

/**
 * A heading's anchor id. Keeps letters, combining marks and digits from any
 * script, so Korean and Khmer headings get real ids instead of "" (marks
 * matter for Khmer, whose vowel signs are combining characters). The id is
 * only ever used as an attribute value and with getElementById, never in a
 * CSS selector, so non-ASCII and leading digits are fine.
 */
export function slugifyHeading(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "")
}

export function renderMarkdown(content: string): string {
  // Ids must be unique per note: two "## Example" headings become
  // "example" and "example-2"; a heading with no letters becomes "section".
  const usedIds = new Set<string>()
  const uniqueHeadingId = (text: string) => {
    const base = slugifyHeading(text) || "section"
    let id = base
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`
    usedIds.add(id)
    return id
  }

  const renderer = new Renderer()

  // Raw HTML (block or inline) is shown as literal text.
  renderer.html = ({ text }: Tokens.HTML | Tokens.Tag) => escapeHtml(text)

  renderer.link = function (this: Renderer, { href, title, tokens }: Tokens.Link) {
    const text = this.parser.parseInline(tokens)
    if (href === "../README.md" || href === "../README") {
      return `<a href="/notes">← Back</a>`
    }
    const safe = safeUrl(href)
    // A disallowed URL keeps its text but loses the link.
    if (safe == null) return text
    const resolvedHref = safe.replace(/\.md$/, "")
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ""
    return `<a href="${escapeHtml(resolvedHref)}"${titleAttr}>${text}</a>`
  }

  renderer.image = ({ href, title, text }: Tokens.Image) => {
    const safe = safeUrl(href, IMAGE_SCHEMES)
    if (safe == null) return escapeHtml(text)
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ""
    return `<img src="${escapeHtml(safe)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy">`
  }

  renderer.code = ({ text, lang }: Tokens.Code) => {
    // Only the first word of the info string is the language ("ts title=x").
    const rawLang = (lang ?? "").trim().split(/\s+/, 1)[0].toLowerCase()
    const langAttr = rawLang ? ` data-lang="${escapeHtml(rawLang)}"` : ""
    const label = codeLanguageLabel(rawLang) || "Code"
    const copyLabel = rawLang ? `Copy ${label} code` : "Copy code"
    // highlightCode returns escaped text plus hljs <span class> wrappers only.
    return (
      `<div class="shiki-wrapper"${langAttr}>` +
      `<div class="code-header"><span class="code-lang">${escapeHtml(label)}</span>` +
      // Part of the HTML (not added after mount) so it survives React
      // re-applying the article's innerHTML; CodeCopy handles its clicks.
      `<button type="button" class="code-copy" aria-label="${escapeHtml(copyLabel)}">Copy</button></div>` +
      `<pre><code class="hljs">${highlightCode(text, rawLang)}</code></pre></div>`
    )
  }

  renderer.table = function (this: Renderer, token: Tokens.Table) {
    return `<div class="table-scroll">${Renderer.prototype.table.call(this, token)}</div>`
  }

  renderer.heading = function (this: Renderer, { tokens, depth }: Tokens.Heading) {
    const inner = this.parser.parseInline(tokens)
    if (depth === 2 || depth === 3) {
      const rawText = tokens.map((t) => ("raw" in t ? t.raw : "")).join("")
      return `<h${depth} id="${escapeHtml(uniqueHeadingId(rawText))}">${inner}</h${depth}>`
    }
    return `<h${depth}>${inner}</h${depth}>`
  }

  return marked(content, { renderer, gfm: true, breaks: false }) as string
}
