import type { RuntimeRunStatus, RiskLevel, Environment } from '../runs/types'

export type RunCreatedEvent = {
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

export type RunUpdatedEvent = {
  id: string
  type: 'RUN_UPDATED'
  occurredAt: string
  payload: {
    runId: string
    runtimeStatus: RuntimeRunStatus
  }
}

export type RunFailedEvent = {
  id: string
  type: 'RUN_FAILED'
  occurredAt: string
  payload: {
    runId: string
    title: string
    error: string
  }
}

export type RunBlockedEvent = {
  id: string
  type: 'RUN_BLOCKED'
  occurredAt: string
  payload: {
    runId: string
    title: string
    reason: string
  }
}

export type RunSucceededEvent = {
  id: string
  type: 'RUN_SUCCEEDED'
  occurredAt: string
  payload: {
    runId: string
    title: string
  }
}

export type TaskUpdatedEvent = {
  id: string
  type: 'TASK_UPDATED'
  occurredAt: string
  payload: {
    taskId: string
  }
}

export type ApprovalRequiredEvent = {
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
  | RunBlockedEvent
  | RunSucceededEvent
  | TaskUpdatedEvent
  | ApprovalRequiredEvent

export type EventType = DomainEvent['type']
