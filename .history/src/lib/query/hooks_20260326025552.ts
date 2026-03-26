import { useQuery } from '@tanstack/react-query'
import { architectures, runs, tasks } from '../mock-data'
import { queryKeys } from './query-keys'

const delay = async <T,>(value: T) => {
  await new Promise((resolve) => setTimeout(resolve, 180))
  return value
}

export const useArchitecturesQuery = () =>
  useQuery({
    queryKey: queryKeys.architectures,
    queryFn: async () => delay(architectures),
  })

export const useArchitectureQuery = (architectureId: string) =>
  useQuery({
    queryKey: ['architecture', architectureId],
    queryFn: async () => delay(architectures.find((architecture) => architecture.id === architectureId) ?? null),
  })

export const useTasksQuery = (architectureId: string) =>
  useQuery({
    queryKey: queryKeys.tasks(architectureId),
    queryFn: async () => delay(tasks.filter((task) => task.architectureId === architectureId)),
  })

export const useRunsQuery = () =>
  useQuery({
    queryKey: queryKeys.runs,
    queryFn: async () => delay(runs),
  })