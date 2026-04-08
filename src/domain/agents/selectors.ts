import { agentRegistry } from './registry'
import type { Agent } from './types'

export const selectActiveAgents = (): Agent[] =>
  agentRegistry.getAll().filter((a) => a.status === 'active')

export const selectAgentById = (id: string): Agent | undefined =>
  agentRegistry.getById(id)

export const selectAgentsForTool = (toolName: string): Agent[] =>
  agentRegistry.getAll().filter((a) => a.toolNames.includes(toolName))
