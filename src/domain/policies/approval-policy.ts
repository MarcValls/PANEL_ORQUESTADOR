import type { Policy, PolicyContext, PolicyDecision } from './types'

export const approvalPolicy: Policy = {
  name: 'approval-policy',
  evaluate: (context: PolicyContext): PolicyDecision => {
    if (context.riskLevel === 'High' && context.environment === 'production') {
      return {
        kind: 'require_approval',
        reason: 'High risk in production: manual approval required',
      }
    }
    return { kind: 'allow' }
  },
}
