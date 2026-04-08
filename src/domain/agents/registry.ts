import type { Agent, AgentRole } from './types'

const agents: Agent[] = [
  {
    id: 'shell-agent',
    role: 'shell-agent',
    name: 'Shell Agent',
    status: 'active',
    toolNames: ['local_read', 'local_write', 'local_log'],
  },
  {
    id: 'data-agent',
    role: 'data-agent',
    name: 'Data Agent',
    status: 'active',
    toolNames: ['local_read'],
  },
  {
    id: 'inspector-agent',
    role: 'inspector-agent',
    name: 'Inspector Agent',
    status: 'active',
    toolNames: ['local_read', 'local_log'],
  },
  {
    id: 'tasks-agent',
    role: 'tasks-agent',
    name: 'Tasks Agent',
    status: 'active',
    toolNames: ['local_read', 'local_write', 'local_log'],
  },
  {
    id: 'runs-agent',
    role: 'runs-agent',
    name: 'Runs Agent',
    status: 'active',
    toolNames: ['local_read', 'local_write', 'local_log'],
  },
  {
    id: 'registry-agent',
    role: 'registry-agent',
    name: 'Registry Agent',
    status: 'idle',
    toolNames: ['local_read', 'local_write'],
  },
  {
    id: 'pipeline-agent',
    role: 'pipeline-agent',
    name: 'Pipeline Agent',
    status: 'active',
    toolNames: ['local_read', 'local_write', 'local_log'],
  },
  {
    id: 'qa-agent',
    role: 'qa-agent',
    name: 'QA Agent',
    status: 'active',
    toolNames: ['local_read', 'local_log'],
  },
  {
    id: 'security-workflow',
    role: 'security-workflow',
    name: 'Security Workflow',
    status: 'active',
    toolNames: ['local_read', 'local_write'],
  },
]

const agentMap = new Map<string, Agent>(agents.map((a) => [a.id, a]))

export const agentRegistry = {
  getAll: (): Agent[] => agents,
  getById: (id: string): Agent | undefined => agentMap.get(id),
  getByRole: (role: AgentRole): Agent | undefined => agents.find((a) => a.role === role),
}
