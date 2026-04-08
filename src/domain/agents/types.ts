export type AgentRole =
  | 'orchestrator'
  | 'shell-agent'
  | 'data-agent'
  | 'inspector-agent'
  | 'tasks-agent'
  | 'runs-agent'
  | 'registry-agent'
  | 'pipeline-agent'
  | 'qa-agent'
  | 'security-workflow'

export type AgentStatus = 'active' | 'idle' | 'paused' | 'error'

export type Agent = {
  id: string
  role: AgentRole
  name: string
  status: AgentStatus
  toolNames: string[]
}
