import { useRunStore } from './run-store'
import type { DomainRun, DomainRunStatus } from './types'

export const useRunsByArchitecture = (architectureId: string): DomainRun[] =>
  useRunStore((s) => s.runs.filter((r) => r.architectureId === architectureId))

export const useRunsByStatus = (status: DomainRunStatus): DomainRun[] =>
  useRunStore((s) => s.runs.filter((r) => r.status === status))

export const useAllRuntimeRuns = (): DomainRun[] => useRunStore((s) => s.runs)
