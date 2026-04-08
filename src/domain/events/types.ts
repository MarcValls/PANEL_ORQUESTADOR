import type { RuntimeRunStatus, RiskLevel, Environment } from '../runs/types'

type RunCreatedEvent = {
  id: string
  type: 'RUN_CREATED'
  occurredAt: string
  payload: {
    runId: string
    title: string
    architectureId: string
    runtimeStatus: RuntimeRunStatus
    riskLevel: RiskLevel
    environment: Environment
  }
}

type RunUpdatedEvent = {
  id: string
  type: 'RUN_UPDATED'
  occurredAt: string
  payload: {
    runId: string
    runtimeStatus: RuntimeRunStatus
  }
}

type RunFailedEvent = {
  id: string
  type: 'RUN_FAILED'
  occurredAt: string
  payload: {
    runId: string
    title: string
    error?: string
  }
}

type RunSucceededEvent = {
  id: string
  type: 'RUN_SUCCEEDED'
  occurredAt: string
  payload: {
    runId: string
    title: string
  }
}

type TaskUpdatedEvent = {
  id: string
  type: 'TASK_UPDATED'
  occurredAt: string
  payload: {
    taskId: string
  }
}

type ApprovalRequiredEvent = {
  id: string
  type: 'APPROVAL_REQUIRED'
  occurredAt: string
  payload: {
    runId: string
    title: string
    reason: string
  }
}

export type DomainEvent =
  | RunCreatedEvent
  | RunUpdatedEvent
  | RunFailedEvent
  | RunSucceededEvent
  | TaskUpdatedEvent
  | ApprovalRequiredEvent

export type EventType = DomainEvent['type']
