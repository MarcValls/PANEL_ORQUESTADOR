export type PolicyContext = {
  riskLevel: 'Low' | 'Medium' | 'High'
  environment: string
}

export type PolicyDecision =
  | { kind: 'allow' }
  | { kind: 'require_approval'; reason: string }
  | { kind: 'block'; reason: string }

export type Policy = {
  name: string
  evaluate: (context: PolicyContext) => PolicyDecision
}
