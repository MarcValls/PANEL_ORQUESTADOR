import { useRunStore } from './run-store'
import type { DomainRun, RuntimeRunStatus } from './types'

export const useRunsByArchitecture = (architectureId: string): DomainRun[] =>
  useRunStore((s) => s.runs.filter((r) => r.architectureId === architectureId))

export const useRunsByStatus = (status: RuntimeRunStatus): DomainRun[] =>
  useRunStore((s) => s.runs.filter((r) => r.runtimeStatus === status))

export const useAllRuntimeRuns = (): DomainRun[] => useRunStore((s) => s.runs)
