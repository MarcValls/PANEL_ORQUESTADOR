import type { Policy, PolicyContext, PolicyDecision } from './types'

export const environmentPolicy: Policy = {
  name: 'environment-policy',
  evaluate: (context: PolicyContext): PolicyDecision => {
    if (context.environment === 'production') {
      if (context.riskLevel === 'High') {
        return {
          kind: 'block',
          reason: 'High risk executions in production are blocked',
        }
      }
      if (context.riskLevel === 'Medium') {
        return {
          kind: 'require_approval',
          reason: 'Medium risk runs in production require approval',
        }
      }
    }
    return { kind: 'allow' }
  },
}
