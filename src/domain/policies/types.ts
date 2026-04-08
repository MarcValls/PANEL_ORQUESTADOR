export type PolicyContext = {
  riskLevel: 'Low' | 'Medium' | 'High'
  environment: string
}

export type PolicyResult = {
  allowed: boolean
  requiresApproval: boolean
  reason?: string
}

export type Policy = {
  name: string
  evaluate: (context: PolicyContext) => PolicyResult
}
