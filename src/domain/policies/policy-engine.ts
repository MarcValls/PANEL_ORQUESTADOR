import type { DomainRun } from '../runs/types'
import type { PolicyContext } from './types'
import { riskPolicy } from './risk-policy'
import { environmentPolicy } from './environment-policy'
import { approvalPolicy } from './approval-policy'

const policies = [riskPolicy, environmentPolicy, approvalPolicy]

export const policyEngine = {
  evaluate: (run: DomainRun): DomainRun => {
    const context: PolicyContext = {
      riskLevel: run.riskLevel,
      environment: run.environment,
    }

    const requiresApproval = policies.some((p) => p.evaluate(context).requiresApproval)

    if (requiresApproval && run.runtimeStatus === 'queued') {
      return { ...run, runtimeStatus: 'waiting_approval', approvalState: 'required' }
    }

    return run
  },
}
