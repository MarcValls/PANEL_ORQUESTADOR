import { create } from 'zustand'
import type { DomainRun } from './types'

type RunStoreState = {
  runs: DomainRun[]
  addRun: (run: DomainRun) => void
  updateRun: (id: string, patch: Partial<DomainRun>) => void
  getRunById: (id: string) => DomainRun | undefined
  clearRuns: () => void
  replaceRuns: (runs: DomainRun[]) => void
}

export const useRunStore = create<RunStoreState>()((set, get) => ({
  runs: [],
  addRun: (run) => set((s) => ({ runs: [...s.runs, run] })),
  updateRun: (id, patch) =>
    set((s) => ({
      runs: s.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
  getRunById: (id) => get().runs.find((r) => r.id === id),
  clearRuns: () => set({ runs: [] }),
  replaceRuns: (runs) => set({ runs }),
}))
