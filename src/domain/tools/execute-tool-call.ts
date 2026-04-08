import type { ToolCall, ToolResult } from './types'
import { toolRegistry } from './registry'
import { agentRegistry } from '../agents/registry'
import { useEventStore } from '../events/event-store'
import { createId } from '../../infrastructure/ids/create-id'
import { now } from '../../infrastructure/clock/now'

export type ExecuteToolCallOptions = {
  call: ToolCall
  runId: string
  agentId?: string
}

export type ExecuteToolCallResult = {
  result: ToolResult
  toolCallId: string
}

export const executeToolCall = (options: ExecuteToolCallOptions): ExecuteToolCallResult => {
  const { call, runId, agentId } = options

  const tool = toolRegistry.getByName(call.name)
  if (tool === undefined) {
    throw new Error(`Tool not found: ${call.name}`)
  }

  if (agentId !== undefined) {
    const agent = agentRegistry.getById(agentId)
    if (agent !== undefined && !agent.toolNames.includes(call.name)) {
      throw new Error(`Agent ${agentId} is not permitted to use tool ${call.name}`)
    }
  }

  const inputSummary = JSON.stringify(call.args).slice(0, 120)

  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'TOOL_CALL_STARTED',
    occurredAt: now(),
    payload: {
      runId,
      toolCallId: call.id,
      toolName: call.name,
      inputSummary,
    },
  })

  const result = tool.execute(call)

  const outputSummary =
    result.error !== undefined ? result.error : JSON.stringify(result.output).slice(0, 120)

  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'TOOL_CALL_FINISHED',
    occurredAt: now(),
    payload: {
      runId,
      toolCallId: call.id,
      toolName: call.name,
      status: result.status,
      outputSummary,
      error: result.error,
    },
  })

  return { result, toolCallId: call.id }
}
