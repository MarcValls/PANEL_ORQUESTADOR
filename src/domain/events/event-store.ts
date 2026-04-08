import { create } from 'zustand'
import type { DomainEvent } from './types'
import { eventBus } from './event-bus'

type EventStoreState = {
  events: DomainEvent[]
  append: (event: DomainEvent) => void
  clear: () => void
}

export const useEventStore = create<EventStoreState>()((set) => ({
  events: [],
  append: (event) => {
    set((s) => ({ events: [...s.events, event] }))
    eventBus.publish(event)
  },
  clear: () => set({ events: [] }),
}))
