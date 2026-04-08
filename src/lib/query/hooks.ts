import { useQuery } from '@tanstack/react-query'
import type { OrchestratorPanelData } from '../types'
import { queryKeys } from './query-keys'
import { useRuntimeRunsProjection } from '../../domain/projections/runs-projection'
import { useActivityProjection } from '../../domain/projections/activity-projection'

const loadPanelData = async (): Promise<OrchestratorPanelData> => {
  const response = await fetch('/data/orchestrator-panel.json')

  if (!response.ok) {
    throw new Error('No se pudo cargar el JSON local del panel.')
  }

  return response.json() as Promise<OrchestratorPanelData>
}

export const useArchitecturesQuery = () =>
  useQuery({
    queryKey: queryKeys.architectures,
    queryFn: async () => (await loadPanelData()).architectures,
  })

export const useArchitectureQuery = (architectureId: string) =>
  useQuery({
    queryKey: ['architecture', architectureId],
    queryFn: async () => {
      const data = await loadPanelData()
      return data.architectures.find((a) => a.id === architectureId) ?? null
    },
  })

export const useTasksQuery = (architectureId: string) =>
  useQuery({
    queryKey: queryKeys.tasks(architectureId),
    queryFn: async () => {
      const data = await loadPanelData()
      return data.tasks.filter((t) => t.architectureId === architectureId)
    },
  })

export const useRunsQuery = () => {
  const runtimeRuns = useRuntimeRunsProjection()
  const query = useQuery({
    queryKey: queryKeys.runs,
    queryFn: async () => (await loadPanelData()).runs,
  })
  const data = [...(query.data ?? []), ...runtimeRuns]
  return { ...query, data }
}

export const useActivityQuery = () => {
  const eventActivity = useActivityProjection()
  const query = useQuery({
    queryKey: ['activity'],
    queryFn: async () => (await loadPanelData()).activity,
  })
  const data = [...eventActivity, ...(query.data ?? [])]
  return { ...query, data }
}