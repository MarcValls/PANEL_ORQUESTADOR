import type { Policy, PolicyContext, PolicyResult } from './types'

export const environmentPolicy: Policy = {
  name: 'environment-policy',
  evaluate: (context: PolicyContext): PolicyResult => {
    if (context.environment === 'production') {
      const requiresApproval = context.riskLevel !== 'Low'
      return {
        allowed: true,
        requiresApproval,
        reason: requiresApproval
          ? 'Non-low risk runs in production require approval'
          : undefined,
      }
    }
    return { allowed: true, requiresApproval: false }
  },
}
