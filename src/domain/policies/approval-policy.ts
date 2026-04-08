import type { Policy, PolicyContext, PolicyResult } from './types'

export const approvalPolicy: Policy = {
  name: 'approval-policy',
  evaluate: (context: PolicyContext): PolicyResult => {
    const requiresApproval =
      context.riskLevel === 'High' && context.environment === 'production'
    return {
      allowed: true,
      requiresApproval,
      reason: requiresApproval
        ? 'High risk in production: manual approval required'
        : undefined,
    }
  },
}
