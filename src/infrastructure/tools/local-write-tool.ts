import { db } from '../persistence/in-memory-db'
import type { ToolCall, ToolResult } from '../../domain/tools/types'

export const localWriteTool = {
  name: 'local_write' as const,
  description: 'Write a record to the in-memory database',
  mutates: true,
  execute: (call: ToolCall): ToolResult => {
    const { collection, record } = call.args as {
      collection: string
      record: { id: string }
    }
    db.put(collection, record)
    return {
      toolCallId: call.id,
      status: 'succeeded',
      output: record,
    }
  },
}
