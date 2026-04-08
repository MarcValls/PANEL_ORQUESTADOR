import type { DomainTask, TaskStatus } from './types'

export const taskService = {
  updateStatus: (task: DomainTask, status: TaskStatus): DomainTask => ({
    ...task,
    status,
  }),
  isBlocked: (task: DomainTask): boolean => task.status === 'Blocked',
  isHighRisk: (task: DomainTask): boolean => task.risk === 'High',
  filterByArchitecture: (tasks: DomainTask[], architectureId: string): DomainTask[] =>
    tasks.filter((t) => t.architectureId === architectureId),
}
