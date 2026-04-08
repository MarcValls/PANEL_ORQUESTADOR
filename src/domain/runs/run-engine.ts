import type { CreateRunParams, DomainRun } from './types'
import { useRunStore } from './run-store'
import { useEventStore } from '../events/event-store'
import { policyEngine } from '../policies/policy-engine'
import { createId } from '../../infrastructure/ids/create-id'
import { now } from '../../infrastructure/clock/now'

const normalizeEnvironment = (env: string): 'sandbox' | 'staging' | 'production' => {
  if (env === 'sandbox' || env === 'staging' || env === 'production') return env
  return 'sandbox'
}

const buildInitialRun = (params: CreateRunParams): DomainRun => ({
  id: createId('RUN'),
  architectureId: params.architectureId,
  title: params.title,
  runtimeStatus: 'queued',
  approvalState: 'not_required',
  startedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  duration: '-',
  node: params.node,
  initiatedBy: params.initiatedBy,
  riskLevel: params.riskLevel,
  environment: normalizeEnvironment(params.environment),
  toolCalls: [],
  errors: [],
})

const emitRunCreated = (run: DomainRun): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_CREATED',
    payload: {
      runId: run.id,
      title: run.title,
      architectureId: run.architectureId,
      runtimeStatus: run.runtimeStatus,
      riskLevel: run.riskLevel,
      environment: run.environment,
    },
    occurredAt: now(),
  })
}

const emitApprovalRequired = (run: DomainRun): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'APPROVAL_REQUIRED',
    payload: {
      runId: run.id,
      title: run.title,
      reason: 'High risk run in production environment requires approval',
    },
    occurredAt: now(),
  })
}

export const createRun = (params: CreateRunParams): DomainRun => {
  const initial = buildInitialRun(params)
  const evaluated = policyEngine.evaluate(initial)

  useRunStore.getState().addRun(evaluated)
  emitRunCreated(evaluated)

  if (evaluated.runtimeStatus === 'waiting_approval') {
    emitApprovalRequired(evaluated)
  }

  return evaluated
}
