import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addTerminalProjectRequest,
  getTerminalWorkspaceRequest,
  initTerminalPackageJsonRequest,
  listTerminalProjectsRequest,
  pickTerminalProjectFolderRequest,
  proposeTerminalTasksRequest,
  previewTerminalPackageJsonRequest,
  removeTerminalProjectRequest,
  setTerminalWorkspaceRequest,
  updateTerminalProjectRequest,
  type TerminalProject,
  type TerminalWorkspaceMutationResponse,
} from '../../infrastructure/terminal-agent/client'
import { queryKeys } from './query-keys'

export const useTerminalProjectsQuery = () =>
  useQuery({
    queryKey: queryKeys.terminalProjects,
    queryFn: listTerminalProjectsRequest,
    retry: 0,
  })

export const useTerminalWorkspaceQuery = () =>
  useQuery({
    queryKey: queryKeys.terminalWorkspace,
    queryFn: getTerminalWorkspaceRequest,
    retry: 0,
  })

export const useAddTerminalProjectMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addTerminalProjectRequest,
    onSuccess: (projects: TerminalProject[]) => {
      queryClient.setQueryData(queryKeys.terminalProjects, projects)
    },
  })
}

export const useRemoveTerminalProjectMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeTerminalProjectRequest,
    onSuccess: (projects: TerminalProject[]) => {
      queryClient.setQueryData(queryKeys.terminalProjects, projects)
    },
  })
}

export const useUpdateTerminalProjectMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTerminalProjectRequest,
    onSuccess: (projects: TerminalProject[]) => {
      queryClient.setQueryData(queryKeys.terminalProjects, projects)
    },
  })
}

export const useSetTerminalWorkspaceMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setTerminalWorkspaceRequest,
    onSuccess: (payload: TerminalWorkspaceMutationResponse) => {
      queryClient.setQueryData(queryKeys.terminalWorkspace, {
        activeWorkspacePath: payload.activeWorkspacePath,
        workspaceFileName: payload.workspaceFileName,
        workspaceFilePath: payload.workspaceFilePath,
        workspaceFileExists: payload.workspaceFileExists,
        packageJsonPath: payload.packageJsonPath,
        hasPackageJson: payload.hasPackageJson,
      })
      queryClient.setQueryData(queryKeys.terminalProjects, payload.projects)
    },
  })
}

export const usePickTerminalProjectFolderMutation = () =>
  useMutation({
    mutationFn: pickTerminalProjectFolderRequest,
  })

export const usePreviewTerminalPackageJsonMutation = () =>
  useMutation({
    mutationFn: previewTerminalPackageJsonRequest,
  })

export const useInitTerminalPackageJsonMutation = () =>
  useMutation({
    mutationFn: initTerminalPackageJsonRequest,
  })

type ProposeTasksParams = {
  path: string
  maxTodos?: number
}

export const useProposeTerminalTasksMutation = () =>
  useMutation({
    mutationFn: ({ path, maxTodos }: ProposeTasksParams) =>
      proposeTerminalTasksRequest(path, maxTodos),
  })
