import { readFileSync, writeFileSync, readdirSync } from "node:fs"

// Only consume local synthetic sweep results, never account storage state.
const rows = new Map()
const unavailable = new Set()
for (const path of process.argv.slice(2)) {
  const report = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""))
  const theme = path.includes("dark") ? "dark" : "light"
  function visit(suite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const result = test.results?.at(-1)
        if (!result?.attachments?.some((a) => a.name.startsWith("layout-")))
          unavailable.add(spec.title)
        for (const attachment of result?.attachments ?? []) {
          if (!attachment.name.startsWith("layout-")) continue
          const layout = JSON.parse(Buffer.from(attachment.body, "base64").toString())
          rows.set(`${spec.title}/${theme}/${layout.viewport.width}`, {
            route: spec.title,
            theme,
            ...layout,
          })
        }
      }
    }
    for (const child of suite.suites ?? []) visit(child)
  }
  visit(report)
}
const layouts = [...rows.values()].sort(
  (a, b) => a.route.localeCompare(b.route) || a.theme.localeCompare(b.theme),
)
const routes = new Set(layouts.map((r) => r.route))
const lines = [
  "# iPhone 15 Pro Max layout audit",
  "",
  "Date: 2026-11-04. Browser: local Chromium with mobile/touch emulation; phone viewport 430 × 932 CSS pixels. Synthetic sessions and data, external requests blocked. This checks rendered initial states and redirects, not live authentication, real account data, the unlocked vault, every dialog, hardware microphone, or a physical iPhone/Safari keyboard.",
  "",
  `Recorded ${layouts.length} layouts across ${routes.size} requested routes.`,
  `Routes without a layout record: ${[...unavailable].filter((r) => !routes.has(r)).join(", ") || "none"}.`,
  "",
  "Typography follows the existing design system: 13px minimum metadata, 14px secondary text, 16px body/editable controls, medium row titles and semibold headings/actions. Marketing display headings retain their larger scale. Font family is inherited from the shared theme; actual platform glyph rendering requires device review.",
  "",
  "| Requested route | Rendered route | Theme | Viewport | Overflow findings | Text below 13px | Inputs below 16px |",
  "| --- | --- | --- | --- | ---: | ---: | ---: |",
  ...layouts.map(
    (r) =>
      `| ${r.route} | ${r.url} | ${r.theme} | ${r.viewport.width} × ${r.viewport.height} | ${r.overflow.length} | ${r.tiny.length} | ${r.smallInputs.length} |`,
  ),
  "",
  "A redirect verifies only its destination. Routes requiring an existing record, active session, invite code or OAuth transaction need dedicated fixtures; this route sweep does not establish those states. The separately deployed Luyra app is outside this H-Space audit.",
  "",
  "Local evidence: test-results/iphone15-*.json (computed headings/action font sizes, font weights and line heights, input sizes and overflow); test-results/ui-sweep/ (screenshots); test-results/iphone15-gallery.html (filterable gallery). Generated artifacts contain synthetic/default content and are not intended for commits.",
  "",
  "Rollback: revert the presentation changes in the working diff. No API, schema, storage identifier, vault encryption, or deployment configuration changes are required.",
  "",
]
writeFileSync("docs/iphone15-responsive-audit.md", lines.join("\n"))
const dirs = readdirSync("test-results/ui-sweep").filter((n) => n.startsWith("iphone15-final"))
const images = dirs.flatMap((dir) =>
  readdirSync(`test-results/ui-sweep/${dir}`)
    .filter((n) => n.endsWith(".png"))
    .map((name) => ({ dir, name })),
)
writeFileSync(
  "test-results/iphone15-gallery.html",
  `<!doctype html><meta charset="utf-8"><title>iPhone layout audit</title><style>body{font:16px system-ui;margin:24px;background:#f3f4f6;color:#172033}input{font:inherit;padding:12px;width:min(90%,500px)}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:20px}figure{margin:16px 0;background:white;padding:12px;border-radius:12px}img{width:100%;height:466px;object-fit:cover;object-position:top}figcaption{overflow-wrap:anywhere;font-size:13px}a{color:inherit}</style><h1>iPhone 15 Pro Max audit</h1><p>Synthetic initial states. Select an image for the full screenshot.</p><input aria-label="Filter screenshots" placeholder="Filter by route or theme"><main>${images.map(({ dir, name }) => `<figure><a href="ui-sweep/${dir}/${name}"><img loading="lazy" src="ui-sweep/${dir}/${name}"></a><figcaption>${dir}/${name}</figcaption></figure>`).join("")}</main><script>document.querySelector('input').oninput=e=>document.querySelectorAll('figure').forEach(f=>f.hidden=!f.textContent.toLowerCase().includes(e.target.value.toLowerCase()))</script>`,
)
console.log(
  `Wrote audit for ${routes.size} routes / ${layouts.length} layouts and ${images.length} screenshots.`,
)
