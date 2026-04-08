export type ToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
}

export type ToolResult = {
  toolCallId: string
  output: unknown
  error?: string
}

export type Tool = {
  name: string
  description: string
  execute: (call: ToolCall) => ToolResult
}
