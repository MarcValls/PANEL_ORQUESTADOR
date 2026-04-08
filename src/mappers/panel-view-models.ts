import type { Architecture, Run, Task } from '../lib/types'
import type { DomainRun } from '../domain/runs/types'
import type { DomainTask } from '../domain/tasks/types'
import { mapRuntimeStatusToRunStatus } from '../domain/runs/run-status-mapper'

export const mapDomainRunToViewModel = (run: DomainRun): Run => ({
  id: run.id,
  architectureId: run.architectureId,
  title: run.title,
  status: mapRuntimeStatusToRunStatus(run.runtimeStatus),
  startedAt: run.startedAt,
  duration: run.duration,
  node: run.node,
  initiatedBy: run.initiatedBy,
})

export const mapDomainTaskToViewModel = (task: DomainTask): Task => ({
  id: task.id,
  title: task.title,
  architectureId: task.architectureId,
  domain: task.domain,
  risk: task.risk,
  status: task.status,
  assignee: task.assignee,
  estimate: task.estimate,
  description: task.description,
})

export const mapArchitectureToViewModel = (a: Architecture): Architecture => a
