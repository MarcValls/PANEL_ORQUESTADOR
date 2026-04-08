import type { Policy, PolicyContext, PolicyDecision } from './types'

export const riskPolicy: Policy = {
  name: 'risk-policy',
  evaluate: (context: PolicyContext): PolicyDecision => {
    if (context.riskLevel === 'High') {
      return {
        kind: 'require_approval',
        reason: 'High risk runs require approval before execution',
      }
    }
    return { kind: 'allow' }
  },
}
