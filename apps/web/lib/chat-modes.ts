// Modes of the Ask Hengo assistant (`/chat`). The URL is the single source
// of truth: bare `/chat` is General chat, `?mode=memory` is Search my
// workspace, and the Korean tools keep their own `?mode=` links.

export type AiMode = "chat" | "analyze" | "generate" | "corrections" | "memory"

/** The two modes shown as the switch at the top of the assistant. */
export const ASSISTANT_MODE_IDS = ["chat", "memory"] as const satisfies readonly AiMode[]

/** Korean coaching tools, reached from the assistant's "Korean tools" menu. */
export const KOREAN_TOOL_IDS = [
  "analyze",
  "generate",
  "corrections",
] as const satisfies readonly AiMode[]

const ALL_MODE_IDS: readonly AiMode[] = [...ASSISTANT_MODE_IDS, ...KOREAN_TOOL_IDS]

export function isAiMode(value: string | null | undefined): value is AiMode {
  return value != null && (ALL_MODE_IDS as readonly string[]).includes(value)
}

/**
 * The mode a `/chat` URL asks for. A `?prompt=` deep link is a chat request,
 * so it always lands on General chat; an unknown or missing mode does too.
 */
export function resolveAiMode(params: { get(name: string): string | null }): AiMode {
  if (params.get("prompt")) return "chat"
  const mode = params.get("mode")
  return isAiMode(mode) ? mode : "chat"
}

/** The canonical URL for a mode — General chat has no query. */
export function aiModeHref(mode: AiMode): string {
  return mode === "chat" ? "/chat" : `/chat?mode=${mode}`
}
