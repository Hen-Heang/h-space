#!/usr/bin/env node
// Generates the H-Space app icon set from one vector definition.
//
//   node scripts/generate-app-icons.mjs        (from apps/web)
//
// Writes public/icons/* and public/favicon.ico. The SVGs it writes are the
// masters; the PNGs are rendered from the same markup by Playwright's Chromium
// (already a dev dependency), so nothing new is installed. Re-run it after
// changing the mark and commit the output.
//
// Variants:
// - full:   bars + crossbar + orbit + sparkle — large icons and the in-app mark
// - simple: bars + crossbar only — favicons, where the orbit turns to noise
// - mono:   white silhouette on transparent — Android notification badge
//
// Shapes:
// - rounded: transparent corners (browser tab, PWA "any", in-app logo)
// - square:  full bleed (iOS touch icon and Android maskable — the OS masks it)

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const outDir = path.join(root, "public", "icons")

const VIEW = 512
const CORNER = 115 // ≈22.5%, close to the iOS/macOS icon corner

function defs(id) {
  return `
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#18236b"/>
      <stop offset="0.55" stop-color="#11153f"/>
      <stop offset="1" stop-color="#2a1656"/>
    </linearGradient>
    <radialGradient id="${id}-glow-l" cx="0.12" cy="0.18" r="0.62">
      <stop offset="0" stop-color="#3d7bff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#3d7bff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}-glow-r" cx="0.92" cy="0.9" r="0.62">
      <stop offset="0" stop-color="#a35cff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#a35cff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}-bar-l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9be6ff"/>
      <stop offset="0.5" stop-color="#4a96ff"/>
      <stop offset="1" stop-color="#2f66ff"/>
    </linearGradient>
    <linearGradient id="${id}-bar-r" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd3b6"/>
      <stop offset="0.45" stop-color="#a77bff"/>
      <stop offset="0.85" stop-color="#ff9cc4"/>
      <stop offset="1" stop-color="#ffc39a"/>
    </linearGradient>
    <linearGradient id="${id}-cross" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7fd0ff"/>
      <stop offset="1" stop-color="#c39bff"/>
    </linearGradient>
    <linearGradient id="${id}-orbit" gradientUnits="userSpaceOnUse" x1="42" y1="0" x2="470" y2="0">
      <stop offset="0" stop-color="#5cc0ff"/>
      <stop offset="0.55" stop-color="#b48cff"/>
      <stop offset="1" stop-color="#ffb47a"/>
    </linearGradient>
    <radialGradient id="${id}-ball-l" cx="0.35" cy="0.3" r="0.75">
      <stop offset="0" stop-color="#e6fbff"/>
      <stop offset="1" stop-color="#3fb4ff"/>
    </radialGradient>
    <radialGradient id="${id}-ball-r" cx="0.35" cy="0.3" r="0.75">
      <stop offset="0" stop-color="#fff1df"/>
      <stop offset="1" stop-color="#ff9a4d"/>
    </radialGradient>`
}

// The H: two rounded bars joined by a gently waving ribbon. The wave stays
// shallow on purpose — a steep diagonal makes the mark read as "N" at
// favicon size. The ribbon is drawn first and its ends run under the bars,
// so the joins have no visible seam.
function letterH(id, mono) {
  const fill = (name) => (mono ? "#ffffff" : `url(#${id}-${name})`)
  return `
    <path d="M176 222 C236 210 276 252 336 236 L336 292 C276 308 236 266 176 278 Z" fill="${fill("cross")}"/>
    <rect x="140" y="118" width="80" height="276" rx="36" fill="${fill("bar-l")}"/>
    <rect x="292" y="118" width="80" height="276" rx="36" fill="${fill("bar-r")}"/>`
}

// Orbit around the H, tilted. The far half is drawn before the letter and the
// near half after it, so the ring passes behind and in front of the bars.
const ORBIT = { cx: 256, cy: 262, rx: 214, ry: 58, tilt: -20 }
function orbitArc(id, half) {
  const { cx, cy, rx, ry, tilt } = ORBIT
  const sweep = half === "far" ? 1 : 0
  return `
    <path transform="rotate(${tilt} ${cx} ${cy})"
      d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 ${sweep} ${cx + rx} ${cy}"
      fill="none" stroke="url(#${id}-orbit)" stroke-linecap="round"
      stroke-width="${half === "far" ? 11 : 14}" opacity="${half === "far" ? 0.7 : 1}"/>`
}
function orbitBalls(id) {
  const { cx, cy, rx, ry, tilt } = ORBIT
  const at = (deg) => {
    const t = (deg * Math.PI) / 180
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]
  }
  const [lx, ly] = at(152)
  const [rx2, ry2] = at(-14)
  return `
    <g transform="rotate(${tilt} ${cx} ${cy})">
      <circle cx="${rx2.toFixed(1)}" cy="${ry2.toFixed(1)}" r="17" fill="url(#${id}-ball-r)"/>
      <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="19" fill="url(#${id}-ball-l)"/>
    </g>`
}
function sparkle(cx, cy, s) {
  return `<path d="M${cx} ${cy - s} Q${cx} ${cy} ${cx + s} ${cy} Q${cx} ${cy} ${cx} ${cy + s} Q${cx} ${cy} ${cx - s} ${cy} Q${cx} ${cy} ${cx} ${cy - s} Z" fill="#ffdcaa"/>`
}

/**
 * @param {{ variant: "full" | "simple" | "mono", shape: "rounded" | "square" | "none", markScale?: number }} o
 */
export function iconSvg({ variant, shape, markScale = 1 }) {
  const id = `hs-${variant}-${shape}`
  const mono = variant === "mono"
  const c = VIEW / 2
  const markTransform = markScale === 1 ? "" : `translate(${c} ${c}) scale(${markScale}) translate(${-c} ${-c})`

  const background =
    shape === "none"
      ? ""
      : `<g ${shape === "rounded" ? `clip-path="url(#${id}-clip)"` : ""}>
          <rect width="${VIEW}" height="${VIEW}" fill="url(#${id}-bg)"/>
          <rect width="${VIEW}" height="${VIEW}" fill="url(#${id}-glow-l)"/>
          <rect width="${VIEW}" height="${VIEW}" fill="url(#${id}-glow-r)"/>
        </g>`

  let mark
  if (variant === "full") {
    mark = `${orbitArc(id, "far")}${letterH(id, false)}${orbitArc(id, "near")}${orbitBalls(id)}${sparkle(324, 74, 24)}`
  } else {
    mark = letterH(id, mono)
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="${VIEW}" height="${VIEW}">
  <defs>${defs(id)}
    <clipPath id="${id}-clip"><rect width="${VIEW}" height="${VIEW}" rx="${CORNER}"/></clipPath>
  </defs>
  ${background}
  <g transform="${markTransform}">${mark}</g>
</svg>
`
}

// variant/shape/scale per output file.
const PNGS = [
  // Browser tab + PWA "any": rounded, transparent corners.
  { file: "favicon-16.png", size: 16, variant: "simple", shape: "rounded", markScale: 1.12 },
  { file: "favicon-32.png", size: 32, variant: "simple", shape: "rounded", markScale: 1.12 },
  { file: "favicon-48.png", size: 48, variant: "simple", shape: "rounded", markScale: 1.12 },
  { file: "icon-192.png", size: 192, variant: "full", shape: "rounded" },
  { file: "icon-512.png", size: 512, variant: "full", shape: "rounded" },
  // The OS applies its own mask: full bleed. Maskable keeps the mark inside
  // the 80% safe circle.
  { file: "apple-touch-icon.png", size: 180, variant: "full", shape: "square", markScale: 0.9 },
  { file: "icon-maskable-512.png", size: 512, variant: "full", shape: "square", markScale: 0.74 },
  // Android shows only the alpha channel of a notification badge.
  { file: "badge-96.png", size: 96, variant: "mono", shape: "none", markScale: 1.25 },
]

const SVGS = [
  // In-app logo (sidebar, rail, auth, error pages) and the SVG favicon.
  { file: "h-space-mark.svg", variant: "full", shape: "rounded" },
  { file: "favicon.svg", variant: "simple", shape: "rounded", markScale: 1.12 },
]

// ICO that embeds PNGs directly (supported by every current browser).
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const entries = []
  let offset = 6 + images.length * 16
  for (const { size, data } of images) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    entries.push(e)
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

async function main() {
  await mkdir(outDir, { recursive: true })

  for (const s of SVGS) {
    await writeFile(path.join(outDir, s.file), iconSvg(s))
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  const rendered = {}
  try {
    for (const p of PNGS) {
      await page.setViewportSize({ width: p.size, height: p.size })
      const svg = iconSvg(p).replace(
        `width="${VIEW}" height="${VIEW}"`,
        `width="${p.size}" height="${p.size}"`,
      )
      await page.setContent(
        `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`,
      )
      const data = await page.screenshot({
        omitBackground: true,
        clip: { x: 0, y: 0, width: p.size, height: p.size },
      })
      rendered[p.file] = data
      await writeFile(path.join(outDir, p.file), data)
    }
  } finally {
    await browser.close()
  }

  const ico = buildIco(
    [16, 32, 48].map((size) => ({ size, data: rendered[`favicon-${size}.png`] })),
  )
  await writeFile(path.join(root, "public", "favicon.ico"), ico)

  console.log(`Wrote ${SVGS.length + PNGS.length} files to public/icons and public/favicon.ico`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
