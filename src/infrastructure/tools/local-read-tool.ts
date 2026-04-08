import { db } from '../persistence/in-memory-db'
import type { ToolCall, ToolResult } from '../../domain/tools/types'

export const localReadTool = {
  name: 'local_read' as const,
  description: 'Read a record from the in-memory database',
  execute: (call: ToolCall): ToolResult => {
    const { collection, id } = call.args as { collection: string; id: string }
    const record = db.get(collection, id)
    return {
      toolCallId: call.id,
      output: record ?? null,
      error: record === undefined ? `No record found: ${collection}/${id}` : undefined,
    }
  },
}
