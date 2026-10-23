import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// The one shared entry point for every Luyra domain that wants a
// structured LLM response — Finance's Money Coach today, Learning/
// Interview/Coach features later. No domain service should import
// @anthropic-ai/sdk directly; they call callClaudeWithTool() here instead,
// so there's exactly one place that knows how to talk to the provider.

let client: Anthropic | undefined;
function getClient(): Anthropic {
  return (client ??= new Anthropic());
}

const DEFAULT_MODEL = "claude-opus-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; reason: "not_configured" | "request_failed" | "no_tool_call" };

export interface ClaudeToolSpec {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
}

// Forces Claude to answer via a single tool call so the response is
// structured JSON matching inputSchema, rather than free text to parse.
export async function callClaudeWithTool<T>(params: {
  system: string;
  userMessage: string;
  tool: ClaudeToolSpec;
  maxTokens?: number;
}): Promise<AiResult<T>> {
  if (!isAiConfigured()) return { ok: false, reason: "not_configured" };

  try {
    const response = await getClient().messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      tools: [{ name: params.tool.name, description: params.tool.description, input_schema: params.tool.inputSchema }],
      tool_choice: { type: "tool", name: params.tool.name },
      messages: [{ role: "user", content: params.userMessage }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return { ok: false, reason: "no_tool_call" };
    return { ok: true, data: toolUse.input as T };
  } catch (error) {
    console.error("[ai] Claude request failed", error);
    return { ok: false, reason: "request_failed" };
  }
}
