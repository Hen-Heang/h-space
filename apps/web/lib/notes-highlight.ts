// Syntax highlighting for note code blocks (lib/notes-markdown.ts).
//
// highlight.js core with a fixed set of languages, so the bundle stays small.
// Its output is the code HTML-escaped and wrapped in
// `<span class="hljs-…">` — no other tags or attributes — so it's safe to put
// inside the sanitized note HTML. A language we don't know falls back to
// plain escaped text.

import hljs from "highlight.js/lib/core"
import bash from "highlight.js/lib/languages/bash"
import css from "highlight.js/lib/languages/css"
import diff from "highlight.js/lib/languages/diff"
import dockerfile from "highlight.js/lib/languages/dockerfile"
import go from "highlight.js/lib/languages/go"
import gradle from "highlight.js/lib/languages/gradle"
import ini from "highlight.js/lib/languages/ini"
import java from "highlight.js/lib/languages/java"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import kotlin from "highlight.js/lib/languages/kotlin"
import markdown from "highlight.js/lib/languages/markdown"
import plaintext from "highlight.js/lib/languages/plaintext"
import properties from "highlight.js/lib/languages/properties"
import python from "highlight.js/lib/languages/python"
import rust from "highlight.js/lib/languages/rust"
import shell from "highlight.js/lib/languages/shell"
import sql from "highlight.js/lib/languages/sql"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import yaml from "highlight.js/lib/languages/yaml"

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch])
}

const LANGUAGES = {
  bash,
  css,
  diff,
  dockerfile,
  go,
  gradle,
  ini,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  plaintext,
  properties,
  python,
  rust,
  shell,
  sql,
  typescript,
  xml,
  yaml,
}

for (const [name, language] of Object.entries(LANGUAGES)) {
  if (!hljs.getLanguage(name)) hljs.registerLanguage(name, language)
}
// Fence names people actually write that highlight.js doesn't alias itself.
hljs.registerAliases(["tsx", "mts", "cts"], { languageName: "typescript" })
hljs.registerAliases(["jsx", "mjs", "cjs"], { languageName: "javascript" })
hljs.registerAliases(["zsh", "sh", "console", "terminal"], { languageName: "bash" })
hljs.registerAliases(["vue", "svelte"], { languageName: "xml" })
hljs.registerAliases(["env", "dotenv", "toml"], { languageName: "ini" })
hljs.registerAliases(["postgres", "postgresql", "psql", "mysql", "plsql"], { languageName: "sql" })

/** Readable names for the code block header; anything else is shown as typed. */
const LABELS: Record<string, string> = {
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  zsh: "Zsh",
  console: "Terminal",
  terminal: "Terminal",
  css: "CSS",
  diff: "Diff",
  dockerfile: "Dockerfile",
  docker: "Dockerfile",
  go: "Go",
  golang: "Go",
  gradle: "Gradle",
  ini: "INI",
  toml: "TOML",
  env: ".env",
  java: "Java",
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  json: "JSON",
  kotlin: "Kotlin",
  kt: "Kotlin",
  md: "Markdown",
  markdown: "Markdown",
  properties: "Properties",
  py: "Python",
  python: "Python",
  rs: "Rust",
  rust: "Rust",
  sql: "SQL",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  html: "HTML",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  text: "Text",
  txt: "Text",
  plaintext: "Text",
}

/** The header label for a fence's language, or "" when none was given. */
export function codeLanguageLabel(lang: string): string {
  const key = lang.trim().toLowerCase()
  if (!key) return ""
  return LABELS[key] ?? key
}

/**
 * Highlighted HTML for a code block. Known languages are highlighted;
 * unknown or missing ones come back as plain escaped text (no guessing, so a
 * shell snippet is never coloured as something else).
 */
export function highlightCode(code: string, lang: string): string {
  const key = lang.trim().toLowerCase()
  if (key && hljs.getLanguage(key)) {
    try {
      return hljs.highlight(code, { language: key, ignoreIllegals: true }).value
    } catch {
      // Fall through to plain text.
    }
  }
  return escapeHtml(code)
}
