import type { CreateRunParams, DomainRun, RuntimeRunStatus, RuntimeToolCall } from './types'
import { useRunStore } from './run-store'
import { useEventStore } from '../events/event-store'
import { policyEngine } from '../policies/policy-engine'
import { executeToolCall } from '../tools/execute-tool-call'
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

const emitRunSucceeded = (run: DomainRun): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_SUCCEEDED',
    occurredAt: now(),
    payload: { runId: run.id, title: run.title },
  })
}

const emitRunFailed = (run: DomainRun, error: string): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_FAILED',
    occurredAt: now(),
    payload: { runId: run.id, title: run.title, error },
  })
}

const emitRunCreatedAndDecision = (run: DomainRun, decisionReason: string): void => {
  emitRunCreated(run)
  if (run.runtimeStatus === 'waiting_approval') {
    emitApprovalRequired(run, decisionReason)
  }
  if (run.runtimeStatus === 'blocked') {
    emitRunBlocked(run, decisionReason)
  }
}

// --- step 5: tool execution for queued runs ---------------------------------

const runInitialToolCall = (run: DomainRun): void => {
  const tcId = createId('TC')

  const pendingTc: RuntimeToolCall = {
    id: tcId,
    toolName: 'local_log',
    status: 'running',
    startedAt: now(),
    inputSummary: `Run started: ${run.title}`,
  }

  useRunStore.getState().updateRun(run.id, {
    runtimeStatus: 'executing',
    toolCalls: [pendingTc],
  })

  const { result } = executeToolCall({
    call: {
      id: tcId,
      name: 'local_log',
      args: { message: `Run ${run.id} started: ${run.title}`, level: 'info' },
      context: { runId: run.id },
    },
    runId: run.id,
    agentId: 'shell-agent',
  })

  const tcStatus = result.status
  const finishedTc: RuntimeToolCall = {
    ...pendingTc,
    status: tcStatus,
    finishedAt: now(),
    outputSummary: result.error ?? JSON.stringify(result.output).slice(0, 120),
    error: result.error,
  }

  const finalStatus: RuntimeRunStatus = tcStatus === 'failed' ? 'failed' : 'succeeded'

  useRunStore.getState().updateRun(run.id, {
    runtimeStatus: finalStatus,
    toolCalls: [finishedTc],
  })

  if (finalStatus === 'succeeded') {
    emitRunSucceeded(run)
  } else {
    emitRunFailed(run, result.error ?? 'tool call failed')
  }
}

// --- public API -------------------------------------------------------------

export const createRun = (params: CreateRunParams): DomainRun => {
  const initial = buildInitialRun(params)
  const { run: evaluated, decisionReason } = applyPolicies(initial)
  insertIntoStore(evaluated)
  emitRunCreatedAndDecision(evaluated, decisionReason)
  if (evaluated.runtimeStatus === 'queued') {
    runInitialToolCall(evaluated)
  }
  return evaluated
}
