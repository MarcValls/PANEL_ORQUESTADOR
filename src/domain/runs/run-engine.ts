import type { CreateRunParams, DomainRun } from './types'
import { useRunStore } from './run-store'
import { useEventStore } from '../events/event-store'
import { policyEngine } from '../policies/policy-engine'
import { createId } from '../../infrastructure/ids/create-id'
import { now } from '../../infrastructure/clock/now'

export const createRun = (params: CreateRunParams): DomainRun => {
  const id = createId('RUN')
  const startedAt = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const rawRun: DomainRun = {
    id,
    architectureId: params.architectureId,
    title: params.title,
    status: 'Queued',
    startedAt,
    duration: '-',
    node: params.node,
    initiatedBy: params.initiatedBy,
    riskLevel: params.riskLevel,
    environment: params.environment,
  }

  const evaluated = policyEngine.evaluate(rawRun)

  useRunStore.getState().addRun(evaluated)

  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_CREATED',
    payload: {
      runId: evaluated.id,
      title: evaluated.title,
      architectureId: evaluated.architectureId,
      status: evaluated.status,
      riskLevel: evaluated.riskLevel,
      environment: evaluated.environment,
    },
    occurredAt: now(),
  })

  if (evaluated.status === 'Requires approval') {
    useEventStore.getState().append({
      id: createId('EVT'),
      type: 'APPROVAL_REQUIRED',
      payload: {
        runId: evaluated.id,
        title: evaluated.title,
        reason: 'High risk run in production environment requires approval',
      },
      occurredAt: now(),
    })
  }

  return evaluated
}
