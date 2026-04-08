import { create } from 'zustand'
import type { DomainRun } from './types'

type RunStoreState = {
  runs: DomainRun[]
  addRun: (run: DomainRun) => void
  updateRun: (id: string, patch: Partial<DomainRun>) => void
}

export const useRunStore = create<RunStoreState>()((set) => ({
  runs: [],
  addRun: (run) => set((s) => ({ runs: [...s.runs, run] })),
  updateRun: (id, patch) =>
    set((s) => ({
      runs: s.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
}))
