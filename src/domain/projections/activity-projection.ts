import { useEventStore } from '../events/event-store'
import type { DomainEvent } from '../events/types'
import { mapRuntimeStatusToRunStatus } from '../runs/run-status-mapper'
import type { RuntimeRunStatus } from '../runs/types'

const eventToActivityLine = (event: DomainEvent): string => {
  switch (event.type) {
    case 'RUN_CREATED': {
      const { title, architectureId, runtimeStatus } = event.payload as {
        title: string
        architectureId: string
        runtimeStatus: RuntimeRunStatus
      }
      const visualStatus = mapRuntimeStatusToRunStatus(runtimeStatus)
      return `${title} creado en ${architectureId} — estado: ${visualStatus}`
    }
    case 'APPROVAL_REQUIRED': {
      const { title } = event.payload as { title: string }
      return `Aprobación requerida: ${title}`
    }
    case 'RUN_FAILED': {
      const { title } = event.payload as { title: string }
      return `Fallo en ejecución: ${title}`
    }
    case 'RUN_SUCCEEDED': {
      const { title } = event.payload as { title: string }
      return `Ejecución completada: ${title}`
    }
    case 'TASK_UPDATED': {
      const { taskId } = event.payload as { taskId: string }
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
