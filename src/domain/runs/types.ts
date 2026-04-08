export type DomainRunStatus =
  | 'Succeeded'
  | 'Running'
  | 'Queued'
  | 'Failed'
  | 'Requires approval'

export type RiskLevel = 'Low' | 'Medium' | 'High'

export type DomainRun = {
  id: string
  architectureId: string
  title: string
  status: DomainRunStatus
  startedAt: string
  duration: string
  node: string
  initiatedBy: string
  riskLevel: RiskLevel
  environment: string
}

export type CreateRunParams = {
  architectureId: string
  title: string
  node: string
  initiatedBy: string
  riskLevel: RiskLevel
  environment: string
}
