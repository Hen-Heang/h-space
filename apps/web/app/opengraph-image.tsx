import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

// Node runtime (not edge) so the real app icon can be read from public/ at
// build time; the image has no params, so it's generated once and cached.
export const alt = "H-Space — My Projects. One Space."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Brand colours: the icon's navy-to-violet background and its blue → violet
// gradient (the dark-theme stops of --brand-* in app/globals.css).
const BRAND_BG = "linear-gradient(135deg, #11153f 0%, #1a1f5e 55%, #2a1656 100%)"
const BRAND_GRADIENT = "linear-gradient(90deg, #6aa8ff, #8b7ff8, #c39bff)"

export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), "public/icons/icon-512.png"))
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        backgroundImage: `radial-gradient(circle at 12% 18%, rgba(61,123,255,0.35), transparent 45%), radial-gradient(circle at 92% 88%, rgba(163,92,255,0.35), transparent 45%), ${BRAND_BG}`,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <img src={iconSrc} width={72} height={72} alt="" />
        <div style={{ fontSize: 34, fontWeight: 700, color: "#ffffff" }}>H-Space</div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 52,
          fontSize: 68,
          fontWeight: 700,
          lineHeight: 1.1,
          color: "#ffffff",
        }}
      >
        My Projects.
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 6,
          fontSize: 68,
          fontWeight: 700,
          lineHeight: 1.1,
          backgroundImage: BRAND_GRADIENT,
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        One Space.
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 36,
          fontSize: 28,
          lineHeight: 1.4,
          color: "rgba(255,255,255,0.72)",
          maxWidth: 860,
        }}
      >
        A personal software ecosystem for learning, finance, AI engineering, productivity, and
        development.
      </div>
    </div>,
    { ...size },
  )
}
