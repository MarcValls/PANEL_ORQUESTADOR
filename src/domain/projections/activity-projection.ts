import { useEventStore } from '../events/event-store'
import type { DomainEvent } from '../events/types'
import { mapRuntimeStatusToRunStatus } from '../runs/run-status-mapper'

const assertNever = (value: never): never => {
  throw new Error(`Evento desconocido: ${String(value)}`)
}

const eventToActivityLine = (event: DomainEvent): string => {
  switch (event.type) {
    case 'RUN_CREATED': {
      const { title, architectureId, runtimeStatus } = event.payload
      const visualStatus = mapRuntimeStatusToRunStatus(runtimeStatus)
      return `${title} creado en ${architectureId} — estado: ${visualStatus}`
    }
    case 'APPROVAL_REQUIRED': {
      const { title, reason } = event.payload
      return `Aprobación requerida: ${title} — ${reason}`
    }
    case 'RUN_FAILED': {
      const { title, error } = event.payload
      return `Fallo en ejecución: ${title} — ${error}`
    }
    case 'RUN_SUCCEEDED': {
      const { title } = event.payload
      return `Ejecución completada: ${title}`
    }
    case 'RUN_UPDATED': {
      const { runId, runtimeStatus } = event.payload
      const visualStatus = mapRuntimeStatusToRunStatus(runtimeStatus)
      return `Ejecución ${runId} actualizada — estado: ${visualStatus}`
    }
    case 'TASK_UPDATED': {
      const { taskId } = event.payload
      return `Tarea actualizada: ${taskId}`
    }
    default:
      return assertNever(event)
  }
}

export const useActivityProjection = (): string[] => {
  const events = useEventStore((s) => s.events)
  return [...events].reverse().map(eventToActivityLine)
}
