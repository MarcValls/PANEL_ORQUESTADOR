import type { Task } from '../../lib/types'

// In the first iteration, tasks are derived from static panel data.
// Future iterations can merge runtime state (e.g., status changes) here.
export const projectTasks = (raw: Task[], architectureId: string): Task[] =>
  raw.filter((t) => t.architectureId === architectureId)
