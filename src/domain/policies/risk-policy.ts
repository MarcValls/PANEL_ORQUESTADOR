import type { Policy, PolicyContext, PolicyResult } from './types'

export const riskPolicy: Policy = {
  name: 'risk-policy',
  evaluate: (context: PolicyContext): PolicyResult => {
    if (context.riskLevel === 'High') {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'High risk runs require approval before execution',
      }
    }
    return { allowed: true, requiresApproval: false }
  },
}
