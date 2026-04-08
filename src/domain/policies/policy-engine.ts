import type { DomainRun } from '../runs/types'
import type { PolicyContext, PolicyDecision } from './types'
import { riskPolicy } from './risk-policy'
import { environmentPolicy } from './environment-policy'
import { approvalPolicy } from './approval-policy'

const policies = [riskPolicy, environmentPolicy, approvalPolicy]

export const policyEngine = {
  evaluate: (run: DomainRun): PolicyDecision => {
    const context: PolicyContext = {
      riskLevel: run.riskLevel,
      environment: run.environment,
    }

    const decisions = policies.map((p) => p.evaluate(context))

    const blockDecision = decisions.find((d) => d.kind === 'block')
    if (blockDecision && blockDecision.kind === 'block') {
      return { kind: 'block', reason: blockDecision.reason }
    }

    const approvalDecision = decisions.find((d) => d.kind === 'require_approval')
    if (approvalDecision && approvalDecision.kind === 'require_approval') {
      return { kind: 'require_approval', reason: approvalDecision.reason }
    }

    return { kind: 'allow' }
  },
}
