import type { Agent } from '../agents/types'
import type { DomainTask } from '../tasks/types'

export type HandoffDecision = {
  shouldHandoff: boolean
  reason?: string
  targetAgent?: Agent
}

export const handoffPolicy = {
  evaluate: (task: DomainTask, currentAgent: Agent): HandoffDecision => {
    if (task.risk === 'High' && currentAgent.role !== 'security-workflow') {
      return {
        shouldHandoff: true,
        reason: 'High risk tasks require security-workflow oversight',
      }
    }
    if (task.status === 'Blocked') {
      return {
        shouldHandoff: true,
        reason: 'Blocked tasks require orchestrator intervention',
      }
    }
    return { shouldHandoff: false }
  },
}
