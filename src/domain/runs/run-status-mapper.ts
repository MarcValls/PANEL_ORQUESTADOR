import type { RunStatus } from '../../lib/types'
import type { RuntimeRunStatus } from './types'

export const mapRuntimeStatusToRunStatus = (runtimeStatus: RuntimeRunStatus): RunStatus => {
  switch (runtimeStatus) {
    case 'queued': return 'Queued'
    case 'planning': return 'Queued'
    case 'executing': return 'Running'
    case 'retrying': return 'Running'
    case 'waiting_approval': return 'Requires approval'
    case 'succeeded': return 'Succeeded'
    case 'failed': return 'Failed'
    case 'blocked': return 'Failed'
    case 'cancelled': return 'Failed'
  }
}
