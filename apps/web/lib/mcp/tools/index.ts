// Registry for domain tools. Read tools are always registered when an
// McpContext exists; write tools additionally require
// mcpContext.writeEnabled — see lib/mcp/server.ts.
//
// READ_TOOL_NAMES / WRITE_TOOL_NAMES are what the server's `instructions`
// tell a client it can use. lib/mcp/server.test.ts asserts they equal the
// tools actually registered below, so adding or removing a tool without
// updating them fails the build instead of shipping a wrong description.
import type { McpServer } from "@modelcontextprotocol/server"
import type { McpContext } from "../context"
import { isNotesEnabled } from "../../feature-flags"
import { registerGoalTools } from "./goals"
import { registerTaskTools } from "./tasks"
import { registerTodayOverviewTool } from "./today-overview"
import { registerLearningProgressTool } from "./learning-progress"
import { registerWeeklyProgressTool } from "./weekly-progress"
import { registerCreateTaskTool } from "./create-task"
import { registerUpdateTaskTool } from "./update-task"
import { registerCompleteTaskTool } from "./complete-task"
import { registerCreateGoalTool } from "./create-goal"
import { registerUpdateGoalTool } from "./update-goal"
import { registerCaptureReflectionTool } from "./capture-reflection"
import { registerCaptureKoreanPhraseTool } from "./capture-korean-phrase"
import {
  registerProjectKnowledgeReadTools,
  registerProjectKnowledgeWriteTools,
} from "./project-knowledge"

/**
 * The project-knowledge (Notes) tools exist only while Notes is on. Notes was
 * retired on 2026-11-10 (lib/feature-flags.ts `isNotesEnabled`): with it off,
 * an AI client could otherwise create and edit notes the owner can no longer
 * see or re-permission in the app. Read once — `NEXT_PUBLIC_*` is inlined at
 * build time.
 */
const NOTES_ENABLED = isNotesEnabled()

const PROJECT_NOTE_READ_TOOL_NAMES = [
  "list_knowledge_projects",
  "list_project_notes",
  "get_project_note",
] as const

const PROJECT_NOTE_WRITE_TOOL_NAMES = [
  "create_knowledge_project",
  "create_project_note",
  "update_project_note",
] as const

export const READ_TOOL_NAMES: readonly string[] = [
  "get_today_overview",
  "list_goals",
  "get_goal",
  "list_tasks",
  "get_goal_tasks",
  "get_learning_progress",
  "get_weekly_progress",
  ...(NOTES_ENABLED ? PROJECT_NOTE_READ_TOOL_NAMES : []),
]

export const WRITE_TOOL_NAMES: readonly string[] = [
  "create_task",
  "update_task",
  "complete_task",
  "create_goal",
  "update_goal",
  "capture_reflection",
  "capture_korean_phrase",
  ...(NOTES_ENABLED ? PROJECT_NOTE_WRITE_TOOL_NAMES : []),
]

export function registerReadTools(server: McpServer, ctx: McpContext): void {
  registerTodayOverviewTool(server, ctx)
  registerGoalTools(server, ctx)
  registerTaskTools(server, ctx)
  registerLearningProgressTool(server, ctx)
  registerWeeklyProgressTool(server, ctx)
  if (NOTES_ENABLED) registerProjectKnowledgeReadTools(server, ctx)
}

/** Only ever called when ctx.writeEnabled is true — see lib/mcp/server.ts. */
export function registerWriteTools(server: McpServer, ctx: McpContext): void {
  registerCreateTaskTool(server, ctx)
  registerUpdateTaskTool(server, ctx)
  registerCompleteTaskTool(server, ctx)
  registerCreateGoalTool(server, ctx)
  registerUpdateGoalTool(server, ctx)
  registerCaptureReflectionTool(server, ctx)
  registerCaptureKoreanPhraseTool(server, ctx)
  if (NOTES_ENABLED) registerProjectKnowledgeWriteTools(server, ctx)
}
