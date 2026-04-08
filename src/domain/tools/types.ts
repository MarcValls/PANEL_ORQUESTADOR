export type ToolExecutionContext = {
  agentId?: string
  runId?: string
}

export type ToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
  context?: ToolExecutionContext
}

export type ToolResult = {
  toolCallId: string
  status: 'succeeded' | 'failed'
  output: unknown
  error?: string
}

export type Tool = {
  name: string
  description: string
  mutates: boolean
  execute: (call: ToolCall) => ToolResult
}
