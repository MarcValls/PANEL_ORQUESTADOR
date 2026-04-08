import { useEventStore } from '../events/event-store'
import type { DomainEvent } from '../events/types'
import { mapRuntimeStatusToRunStatus } from '../runs/run-status-mapper'

const eventToActivityLine = (event: DomainEvent): string => {
  switch (event.type) {
    case 'RUN_CREATED': {
      const { title, architectureId, runtimeStatus } = event.payload
      const visualStatus = mapRuntimeStatusToRunStatus(runtimeStatus)
      return `${title} creado en ${architectureId} — estado: ${visualStatus}`
    }
    case 'APPROVAL_REQUIRED': {
      const { title } = event.payload
      return `Aprobación requerida: ${title}`
    }
    case 'RUN_FAILED': {
      const { title } = event.payload
      return `Fallo en ejecución: ${title}`
    }
    case 'RUN_SUCCEEDED': {
      const { title } = event.payload
      return `Ejecución completada: ${title}`
    }
    case 'TASK_UPDATED': {
      const { taskId } = event.payload
      return `Tarea actualizada: ${taskId}`
    }
    default:
      return `Evento: ${event.type}`
  }
}

export const useActivityProjection = (): string[] => {
  const events = useEventStore((s) => s.events)
  return [...events].reverse().map(eventToActivityLine)
}
