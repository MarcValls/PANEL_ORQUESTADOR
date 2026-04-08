import { useRunStore } from '../runs/run-store'
import type { Run } from '../../lib/types'
import type { DomainRun } from '../runs/types'

const domainRunToRun = (r: DomainRun): Run => ({
  id: r.id,
  architectureId: r.architectureId,
  title: r.title,
  status: r.status,
  startedAt: r.startedAt,
  duration: r.duration,
  node: r.node,
  initiatedBy: r.initiatedBy,
})

export const useRuntimeRunsProjection = (): Run[] => {
  const runtimeRuns = useRunStore((s) => s.runs)
  return runtimeRuns.map(domainRunToRun)
}
