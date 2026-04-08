import type { DomainEvent, EventType } from './types'

type EventHandler = (event: DomainEvent) => void

type EventBus = {
  subscribe: (type: EventType | '*', handler: EventHandler) => () => void
  publish: (event: DomainEvent) => void
}

function createEventBus(): EventBus {
  const handlers: Map<string, Set<EventHandler>> = new Map()

  const subscribe = (type: EventType | '*', handler: EventHandler): (() => void) => {
    if (!handlers.has(type)) {
      handlers.set(type, new Set())
    }
    handlers.get(type)!.add(handler)
    return () => {
      handlers.get(type)?.delete(handler)
    }
  }

  const publish = (event: DomainEvent): void => {
    handlers.get(event.type)?.forEach((h) => h(event))
    handlers.get('*')?.forEach((h) => h(event))
  }

  return { subscribe, publish }
}

export const eventBus = createEventBus()
