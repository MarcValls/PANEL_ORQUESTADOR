import { agentRegistry } from '../agents/registry'
import type { DomainTask } from '../tasks/types'
import type { Agent } from '../agents/types'

export const routeTask = (task: DomainTask): Agent | undefined => {
  return agentRegistry.getById(task.assignee)
}
