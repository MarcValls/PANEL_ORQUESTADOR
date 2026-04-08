export type EventType =
  | 'RUN_CREATED'
  | 'RUN_UPDATED'
  | 'RUN_FAILED'
  | 'RUN_SUCCEEDED'
  | 'TASK_UPDATED'
  | 'APPROVAL_REQUIRED'

export type DomainEvent = {
  id: string
  type: EventType
  payload: Record<string, unknown>
  occurredAt: string
}
