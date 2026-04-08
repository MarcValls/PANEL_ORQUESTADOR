import type { ToolCall, ToolResult } from './types'
import { toolRegistry } from './registry'

export const executeToolCall = (call: ToolCall): ToolResult => {
  const tool = toolRegistry.getByName(call.name)
  if (!tool) {
    return {
      toolCallId: call.id,
      output: null,
      error: `Tool not found: ${call.name}`,
    }
  }
  try {
    return tool.execute(call)
  } catch (err) {
    return {
      toolCallId: call.id,
      output: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
