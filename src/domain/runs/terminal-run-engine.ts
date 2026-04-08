import type { Environment, RiskLevel, RuntimeRunStatus } from './types'
import { useRunStore } from './run-store'
import { useEventStore } from '../events/event-store'
import { createId } from '../../infrastructure/ids/create-id'
import { now } from '../../infrastructure/clock/now'
import {
  killTerminalRunRequest,
  startTerminalRunRequest,
  subscribeTerminalRunStream,
  type TerminalCompleteEvent,
  type TerminalOutputEvent,
} from '../../infrastructure/terminal-agent/client'

type CreateTerminalRunParams = {
  architectureId: string
  title: string
  riskLevel: RiskLevel
  environment: Environment
  command: string
  cwd?: string
  initiatedBy?: string
  node?: string
}

const activeSubscriptions = new Map<string, () => void>()
const runStartTimes = new Map<string, number>()

const formatStartTime = (): string => {
  const d = new Date()
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

const formatDuration = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000))
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const ss = (totalSeconds % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

const appendRunUpdatedEvent = (runId: string, runtimeStatus: RuntimeRunStatus): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_UPDATED',
    occurredAt: now(),
    payload: {
      runId,
      runtimeStatus,
    },
  })
}

const appendRunFailedEvent = (runId: string, title: string, error: string): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_FAILED',
    occurredAt: now(),
    payload: {
      runId,
      title,
      error,
    },
  })
}

const appendRunSucceededEvent = (runId: string, title: string): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_SUCCEEDED',
    occurredAt: now(),
    payload: {
      runId,
      title,
    },
  })
}

const handleOutputEvent = (runId: string, event: TerminalOutputEvent): void => {
  const store = useRunStore.getState()
  const current = store.getRunById(runId)
  if (current === undefined) return
  const nextLogs = [...(current.terminalLogs ?? []), event.chunk]
  if (nextLogs.length > 500) {
    nextLogs.shift()
  }
  store.updateRun(runId, {
    terminalLogs: nextLogs,
  })
}

const handleCompleteEvent = (runId: string, title: string, event: TerminalCompleteEvent): void => {
  const store = useRunStore.getState()
  const startedAtMs = runStartTimes.get(runId) ?? Date.now()
  const elapsedMs = Date.now() - startedAtMs
  const succeeded = event.status === 'succeeded'
  const runtimeStatus: RuntimeRunStatus = succeeded ? 'succeeded' : 'failed'

  store.updateRun(runId, {
    runtimeStatus,
    duration: formatDuration(elapsedMs),
    terminalExitCode: event.exitCode,
  })
  appendRunUpdatedEvent(runId, runtimeStatus)
  if (succeeded) {
    appendRunSucceededEvent(runId, title)
  } else {
    const error = `Comando finalizado con código ${event.exitCode ?? 'desconocido'}`
    appendRunFailedEvent(runId, title, error)
  }

  runStartTimes.delete(runId)
  const stop = activeSubscriptions.get(runId)
  if (stop !== undefined) {
    stop()
    activeSubscriptions.delete(runId)
  }
}

const handleStreamError = (runId: string, title: string, message: string): void => {
  const store = useRunStore.getState()
  const current = store.getRunById(runId)
  if (current === undefined) return
  if (current.runtimeStatus !== 'executing' && current.runtimeStatus !== 'queued' && current.runtimeStatus !== 'planning') return

  const startedAtMs = runStartTimes.get(runId) ?? Date.now()
  const elapsedMs = Date.now() - startedAtMs
  store.updateRun(runId, {
    runtimeStatus: 'failed',
    duration: formatDuration(elapsedMs),
    errors: [...current.errors, message],
    terminalLogs: [...(current.terminalLogs ?? []), `[stream-error] ${message}\n`],
  })
  appendRunUpdatedEvent(runId, 'failed')
  appendRunFailedEvent(runId, title, message)
  runStartTimes.delete(runId)
}

const appendRunCreatedEvent = (params: {
  runId: string
  title: string
  architectureId: string
  riskLevel: RiskLevel
  environment: Environment
}): void => {
  useEventStore.getState().append({
    id: createId('EVT'),
    type: 'RUN_CREATED',
    occurredAt: now(),
    payload: {
      runId: params.runId,
      title: params.title,
      architectureId: params.architectureId,
      runtimeStatus: 'planning',
      riskLevel: params.riskLevel,
      environment: params.environment,
    },
  })
}

export const createTerminalRun = async (params: CreateTerminalRunParams): Promise<string> => {
  const runId = createId('RUN')
  const startedAtMs = Date.now()
  runStartTimes.set(runId, startedAtMs)

  useRunStore.getState().addRun({
    id: runId,
    architectureId: params.architectureId,
    title: params.title,
    runtimeStatus: 'planning',
    approvalState: 'not_required',
    startedAt: formatStartTime(),
    duration: '-',
    node: params.node ?? 'terminal-shell',
    initiatedBy: params.initiatedBy ?? 'terminal-user',
    riskLevel: params.riskLevel,
    environment: params.environment,
    toolCalls: [],
    errors: [],
    terminalCommand: params.command,
    terminalCwd: params.cwd,
    terminalLogs: [],
    terminalExitCode: null,
  })
  appendRunCreatedEvent({
    runId,
    title: params.title,
    architectureId: params.architectureId,
    riskLevel: params.riskLevel,
    environment: params.environment,
  })

  try {
    const response = await startTerminalRunRequest({
      runId,
      command: params.command,
      cwd: params.cwd,
    })

    useRunStore.getState().updateRun(runId, {
      runtimeStatus: 'executing',
      terminalCommand: response.command,
      terminalCwd: response.cwd,
    })
    appendRunUpdatedEvent(runId, 'executing')

    const unsubscribe = subscribeTerminalRunStream(runId, {
      onOutput: (event) => handleOutputEvent(runId, event),
      onComplete: (event) => handleCompleteEvent(runId, params.title, event),
      onError: (message) => handleStreamError(runId, params.title, message),
    })
    activeSubscriptions.set(runId, unsubscribe)
    return runId
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    useRunStore.getState().updateRun(runId, {
      runtimeStatus: 'failed',
      duration: formatDuration(Date.now() - startedAtMs),
      errors: [message],
      terminalLogs: [`[start-error] ${message}\n`],
    })
    appendRunUpdatedEvent(runId, 'failed')
    appendRunFailedEvent(runId, params.title, message)
    runStartTimes.delete(runId)
    return runId
  }
}

export const stopTerminalRun = async (runId: string): Promise<void> => {
  await killTerminalRunRequest(runId)
}
