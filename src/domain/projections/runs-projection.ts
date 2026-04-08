import { useRunStore } from '../runs/run-store'
import type { Run } from '../../lib/types'
import type { DomainRun } from '../runs/types'
import { mapRuntimeStatusToRunStatus } from '../runs/run-status-mapper'

const domainRunToRun = (r: DomainRun): Run => ({
  id: r.id,
  architectureId: r.architectureId,
  title: r.title,
  status: mapRuntimeStatusToRunStatus(r.runtimeStatus),
  startedAt: r.startedAt,
  duration: r.duration,
  node: r.node,
  initiatedBy: r.initiatedBy,
})

export const useRuntimeRunsProjection = (): Run[] => {
  const runtimeRuns = useRunStore((s) => s.runs)
  return runtimeRuns.map(domainRunToRun)
}
