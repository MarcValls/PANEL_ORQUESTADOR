import type { Policy, PolicyContext, PolicyDecision } from './types'

export const approvalPolicy: Policy = {
  name: 'approval-policy',
  evaluate: (context: PolicyContext): PolicyDecision => {
    if (context.riskLevel === 'High' && context.environment === 'staging') {
      return {
        kind: 'require_approval',
        reason: 'High risk runs in staging require approval before promotion',
      }
    }
    return { kind: 'allow' }
  },
}
