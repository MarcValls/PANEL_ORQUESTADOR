type StartTerminalRunParams = {
  runId: string
  command: string
  cwd?: string
}

type StartTerminalRunResponse = {
  runId: string
  status: 'running'
  startedAt: string
  cwd: string
  command: string
}

export type TerminalOutputEvent = {
  stream: 'stdout' | 'stderr'
  chunk: string
  at: string
}

export type TerminalCompleteEvent = {
  runId: string
  status: 'succeeded' | 'failed'
  exitCode: number | null
  signal: string | null
  endedAt: string
}

export type TerminalProject = {
  path: string
  name: string
  favorite: boolean
  createdAt: string
}

export type TerminalWorkspace = {
  activeWorkspacePath: string
  workspaceFileName: string
  workspaceFilePath: string | null
  workspaceFileExists: boolean
  packageJsonPath: string | null
  hasPackageJson: boolean
}

export type TerminalWorkspaceMutationResponse = TerminalWorkspace & {
  projects: TerminalProject[]
  autoPrepared?: {
    firstOpen: boolean
    packageJsonCreated: boolean
    dependenciesInstallAttempted: boolean
    dependenciesInstalled: boolean
    packageManager: 'npm' | 'pnpm' | 'yarn' | null
    installedDependencies: string[]
    installedDevDependencies: string[]
    warning: string | null
  }
}

export type TerminalPackageJsonPreview = {
  projectPath: string
  packageJsonPath: string
  exists: boolean
  packageJson: Record<string, unknown>
  inferredPackageJson: Record<string, unknown>
}

export type TerminalPackageJsonMutationResponse = {
  projectPath: string
  packageJsonPath: string
  existedBefore: boolean
  packageJson: Record<string, unknown>
  installResult: {
    attempted: boolean
    packageManager: 'npm' | 'pnpm' | 'yarn' | null
    installedDependencies: string[]
    installedDevDependencies: string[]
    warning: string | null
  }
}

export type TerminalTaskProposal = {
  id: string
  priority: 'P1' | 'P2' | 'P3'
  title: string
  description: string
  evidence: string[]
  commands: string[]
}

export type TerminalTaskProposalReport = {
  generatedAt: string
  targetPath: string
  todoCount: number
  isGitRepo: boolean
  tasks: TerminalTaskProposal[]
}

type StreamHandlers = {
  onReady?: () => void
  onOutput: (event: TerminalOutputEvent) => void
  onComplete: (event: TerminalCompleteEvent) => void
  onError: (message: string) => void
}

const baseUrl = (() => {
  const runtimeUrl = typeof window !== 'undefined'
    ? window.panelRuntime?.terminalAgentUrl
    : undefined
  if (typeof runtimeUrl === 'string' && runtimeUrl.trim().length > 0) {
    return runtimeUrl.replace(/\/+$/, '')
  }
  const configured = import.meta.env['VITE_TERMINAL_AGENT_URL']
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.replace(/\/+$/, '')
  }
  return 'http://localhost:8787'
})()

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as { error?: string } & T
  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`)
  }
  return payload
}

export const startTerminalRunRequest = async (
  params: StartTerminalRunParams,
): Promise<StartTerminalRunResponse> => {
  const response = await fetch(`${baseUrl}/api/terminal/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  return parseJsonResponse<StartTerminalRunResponse>(response)
}

export const killTerminalRunRequest = async (runId: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/api/terminal/exec/${encodeURIComponent(runId)}/kill`, {
    method: 'POST',
  })
  await parseJsonResponse<Record<string, unknown>>(response)
}

export const listTerminalProjectsRequest = async (): Promise<TerminalProject[]> => {
  const response = await fetch(`${baseUrl}/api/terminal/projects`)
  const payload = await parseJsonResponse<{ projects: TerminalProject[] }>(response)
  return payload.projects
}

export const getTerminalWorkspaceRequest = async (): Promise<TerminalWorkspace> => {
  const response = await fetch(`${baseUrl}/api/terminal/workspace`)
  return parseJsonResponse<TerminalWorkspace>(response)
}

export const setTerminalWorkspaceRequest = async (
  targetPath: string,
): Promise<TerminalWorkspaceMutationResponse> => {
  const response = await fetch(`${baseUrl}/api/terminal/workspace`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: targetPath, favorite: true }),
  })
  return parseJsonResponse<TerminalWorkspaceMutationResponse>(response)
}

export const addTerminalProjectRequest = async (targetPath: string): Promise<TerminalProject[]> => {
  const response = await fetch(`${baseUrl}/api/terminal/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: targetPath, favorite: true }),
  })
  const payload = await parseJsonResponse<{ project: TerminalProject; projects: TerminalProject[] }>(response)
  return payload.projects
}

export const pickTerminalProjectFolderRequest = async (): Promise<string> => {
  const response = await fetch(`${baseUrl}/api/terminal/projects/pick`, {
    method: 'POST',
  })
  const payload = await parseJsonResponse<{ path: string }>(response)
  return payload.path
}

export const previewTerminalPackageJsonRequest = async (
  targetPath: string,
): Promise<TerminalPackageJsonPreview> => {
  const response = await fetch(`${baseUrl}/api/terminal/projects/package/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: targetPath }),
  })
  return parseJsonResponse<TerminalPackageJsonPreview>(response)
}

type InitTerminalPackageJsonParams = {
  path: string
  packageJson?: Record<string, unknown>
  overwrite?: boolean
  installDependencies?: boolean
}

export const initTerminalPackageJsonRequest = async (
  params: InitTerminalPackageJsonParams,
): Promise<TerminalPackageJsonMutationResponse> => {
  const response = await fetch(`${baseUrl}/api/terminal/projects/package`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: params.path,
      packageJson: params.packageJson,
      overwrite: params.overwrite === true,
      installDependencies: params.installDependencies !== false,
    }),
  })
  return parseJsonResponse<TerminalPackageJsonMutationResponse>(response)
}

export const proposeTerminalTasksRequest = async (
  targetPath: string,
  maxTodos = 10,
): Promise<TerminalTaskProposalReport> => {
  const response = await fetch(`${baseUrl}/api/terminal/tasks/propose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: targetPath,
      maxTodos,
    }),
  })
  return parseJsonResponse<TerminalTaskProposalReport>(response)
}

type UpdateTerminalProjectParams = {
  path: string
  favorite?: boolean
  name?: string
}

export const updateTerminalProjectRequest = async (
  params: UpdateTerminalProjectParams,
): Promise<TerminalProject[]> => {
  const response = await fetch(`${baseUrl}/api/terminal/projects`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  const payload = await parseJsonResponse<{ project: TerminalProject; projects: TerminalProject[] }>(response)
  return payload.projects
}

export const removeTerminalProjectRequest = async (targetPath: string): Promise<TerminalProject[]> => {
  const query = new URLSearchParams({ path: targetPath }).toString()
  const response = await fetch(`${baseUrl}/api/terminal/projects?${query}`, {
    method: 'DELETE',
  })
  const payload = await parseJsonResponse<{ projects: TerminalProject[] }>(response)
  return payload.projects
}

export const subscribeTerminalRunStream = (
  runId: string,
  handlers: StreamHandlers,
): (() => void) => {
  const stream = new EventSource(`${baseUrl}/api/terminal/exec/${encodeURIComponent(runId)}/stream`)

  const onReady = () => {
    handlers.onReady?.()
  }
  const onOutput = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data) as TerminalOutputEvent
      handlers.onOutput(payload)
    } catch {
      handlers.onError('No se pudo parsear salida del stream de terminal.')
    }
  }
  const onComplete = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data) as TerminalCompleteEvent
      handlers.onComplete(payload)
      stream.close()
    } catch {
      handlers.onError('No se pudo parsear cierre del stream de terminal.')
      stream.close()
    }
  }
  const onError = () => {
    handlers.onError('Se perdió la conexión con terminal-agent.')
    stream.close()
  }

  stream.addEventListener('ready', onReady)
  stream.addEventListener('output', onOutput)
  stream.addEventListener('complete', onComplete)
  stream.addEventListener('error', onError)

  return () => {
    stream.removeEventListener('ready', onReady)
    stream.removeEventListener('output', onOutput)
    stream.removeEventListener('complete', onComplete)
    stream.removeEventListener('error', onError)
    stream.close()
  }
}
