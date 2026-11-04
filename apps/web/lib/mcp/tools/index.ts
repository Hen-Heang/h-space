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

export const READ_TOOL_NAMES = [
  "get_today_overview",
  "list_goals",
  "get_goal",
  "list_tasks",
  "get_goal_tasks",
  "get_learning_progress",
  "get_weekly_progress",
] as const

export const WRITE_TOOL_NAMES = [
  "create_task",
  "update_task",
  "complete_task",
  "create_goal",
  "update_goal",
  "capture_reflection",
  "capture_korean_phrase",
] as const

export function registerReadTools(server: McpServer, ctx: McpContext): void {
  registerTodayOverviewTool(server, ctx)
  registerGoalTools(server, ctx)
  registerTaskTools(server, ctx)
  registerLearningProgressTool(server, ctx)
  registerWeeklyProgressTool(server, ctx)
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
}
