export type ArchitectureStatus = 'Healthy' | 'At risk' | 'Paused'

export type TaskStatus = 'Todo' | 'In progress' | 'Blocked' | 'Done'

export type RunStatus = 'Succeeded' | 'Running' | 'Queued' | 'Failed'

export type BottomTrayMode = 'Logs' | 'Queue' | 'Events' | 'Locks' | 'Alerts'

export type InspectorTab = 'Summary' | 'Source' | 'Contract' | 'Runtime' | 'Raw'

export type Architecture = {
  id: string
  name: string
  owner: string
  domain: string
  status: ArchitectureStatus
  services: number
  pipelines: number
  tasks: number
  health: number
  environment: string
  updatedAt: string
  summary: string
  risks: number
  approvals: number
}

export type Task = {
  id: string
  title: string
  architectureId: string
  domain: string
  risk: 'Low' | 'Medium' | 'High'
  status: TaskStatus
  assignee: string
  estimate: string
  description: string
}

export type Run = {
  id: string
  architectureId: string
  title: string
  status: RunStatus
  startedAt: string
  duration: string
  node: string
  initiatedBy: string
}