import type { CreateRunParams, DomainRun } from './types'
import { useRunStore } from './run-store'
import { useEventStore } from '../events/event-store'
import { policyEngine } from '../policies/policy-engine'
import { createId } from '../../infrastructure/ids/create-id'
import { now } from '../../infrastructure/clock/now'

// --- helpers ----------------------------------------------------------------

const formatStartTime = (): string => {
  const d = new Date()
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

// --- step 1: construction ---------------------------------------------------

const buildInitialRun = (params: CreateRunParams): DomainRun => ({
  id: createId('RUN'),
  architectureId: params.architectureId,
  title: params.title,
  runtimeStatus: 'queued',
  approvalState: 'not_required',
  startedAt: formatStartTime(),
  duration: '-',
  node: params.node,
  initiatedBy: params.initiatedBy,
  riskLevel: params.riskLevel,
  environment: params.environment,
  toolCalls: [],
  errors: [],
})

// --- step 2: policy evaluation ----------------------------------------------

const applyPolicies = (run: DomainRun): { run: DomainRun; decisionReason: string } => {
  const decision = policyEngine.evaluate(run)
  if (decision.kind === 'block') {
    return {
      run: { ...run, runtimeStatus: 'blocked', errors: [decision.reason] },
      decisionReason: decision.reason,
    }
  }
  if (decision.kind === 'require_approval') {
    return {
      run: { ...run, runtimeStatus: 'waiting_approval', approvalState: 'required' },
      decisionReason: decision.reason,
    }
  }
  return { run, decisionReason: '' }
}

// --- step 3: store insertion -------------------------------------------------

const insertIntoStore = (run: DomainRun): void => {
  useRunStore.getState().addRun(run)
}

// --- step 4: event emission --------------------------------------------------

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

const emitApprovalRequired = (run: DomainRun, reason: string): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'APPROVAL_REQUIRED',
    payload: {
      runId: run.id,
      title: run.title,
      reason,
    },
    occurredAt: now(),
  })
}

const emitRunBlocked = (run: DomainRun, reason: string): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_BLOCKED',
    payload: {
      runId: run.id,
      title: run.title,
      reason,
    },
    occurredAt: now(),
  })
}

const emitEvents = (run: DomainRun, decisionReason: string): void => {
  emitRunCreated(run)
  if (run.runtimeStatus === 'waiting_approval') {
    emitApprovalRequired(run, decisionReason)
  }
  if (run.runtimeStatus === 'blocked') {
    emitRunBlocked(run, decisionReason)
  }
}

// --- public API -------------------------------------------------------------

export const createRun = (params: CreateRunParams): DomainRun => {
  const initial = buildInitialRun(params)
  const { run: evaluated, decisionReason } = applyPolicies(initial)
  insertIntoStore(evaluated)
  emitEvents(evaluated, decisionReason)
  return evaluated
}
