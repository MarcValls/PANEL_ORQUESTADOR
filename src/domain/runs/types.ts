export type RuntimeRunStatus =
  | 'queued'
  | 'planning'
  | 'waiting_approval'
  | 'executing'
  | 'blocked'
  | 'retrying'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export type RuntimeApprovalState = 'not_required' | 'required' | 'approved' | 'rejected'

export type RuntimeToolCall = {
  id: string
  toolName: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'blocked'
  startedAt?: string
  finishedAt?: string
  inputSummary?: string
  outputSummary?: string
  error?: string
}

export type RiskLevel = 'Low' | 'Medium' | 'High'

export type Environment = 'sandbox' | 'staging' | 'production'

export type DomainRun = {
  id: string
  architectureId: string
  title: string
  runtimeStatus: RuntimeRunStatus
  approvalState: RuntimeApprovalState
  startedAt: string
  finishedAt?: string
  duration: string
  node: string
  initiatedBy: string
  riskLevel: RiskLevel
  environment: Environment
  toolCalls: RuntimeToolCall[]
  errors: string[]
}

export type CreateRunParams = {
  architectureId: string
  title: string
  node: string
  initiatedBy: string
  riskLevel: RiskLevel
  environment: Environment
}
