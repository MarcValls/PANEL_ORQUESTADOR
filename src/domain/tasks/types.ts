export type TaskStatus = 'Todo' | 'In progress' | 'Blocked' | 'Done'

export type TaskRisk = 'Low' | 'Medium' | 'High'

export type DomainTask = {
  id: string
  title: string
  architectureId: string
  domain: string
  risk: TaskRisk
  status: TaskStatus
  assignee: string
  estimate: string
  description: string
}
