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

// Fuente: snapshot local (public/data/orchestrator-panel.json)
export const useArchitecturesQuery = () =>
  useQuery({
    queryKey: queryKeys.architectures,
    queryFn: async () => (await loadPanelData()).architectures,
  })

// Fuente: snapshot local (public/data/orchestrator-panel.json)
export const useArchitectureQuery = (architectureId: string) =>
  useQuery({
    queryKey: ['architecture', architectureId],
    queryFn: async () => {
      const data = await loadPanelData()
      return data.architectures.find((a) => a.id === architectureId) ?? null
    },
  })

// Fuente: snapshot local (public/data/orchestrator-panel.json)
export const useTasksQuery = (architectureId: string) =>
  useQuery({
    queryKey: queryKeys.tasks(architectureId),
    queryFn: async () => {
      const data = await loadPanelData()
      return data.tasks.filter((t) => t.architectureId === architectureId)
    },
  })

// Fuente híbrida: snapshot local (public/data/orchestrator-panel.json) + runtime en memoria (Zustand run-store)
// Los runs del runtime se añaden a continuación de los runs del snapshot.
export const useRunsQuery = () => {
  const runtimeRuns = useRuntimeRunsProjection()
  const query = useQuery({
    queryKey: queryKeys.runs,
    queryFn: async () => (await loadPanelData()).runs,
  })
  const data = [...(query.data ?? []), ...runtimeRuns]
  return { ...query, data }
}

// Fuente híbrida: eventos runtime (event-store) + snapshot local (public/data/orchestrator-panel.json)
// Los eventos del runtime aparecen primero para reflejar la actividad más reciente.
export const useActivityQuery = () => {
  const eventActivity = useActivityProjection()
  const query = useQuery({
    queryKey: ['activity'],
    queryFn: async () => (await loadPanelData()).activity,
  })
  const data = [...eventActivity, ...(query.data ?? [])]
  return { ...query, data }
}