import type { ToolCall, ToolResult } from '../../domain/tools/types'

export const localLogTool = {
  name: 'local_log' as const,
  description: 'Log a message to the console',
  mutates: false,
  execute: (call: ToolCall): ToolResult => {
    const { message, level = 'info' } = call.args as {
      message: string
      level?: string
    }
    const fn =
      level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    fn(`[local_log] ${message}`)
    return {
      toolCallId: call.id,
      status: 'succeeded',
      output: { message, level },
    }
  },
}
