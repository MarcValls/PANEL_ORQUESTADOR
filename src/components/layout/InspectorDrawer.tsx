import { useState } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '../../app/store/ui-store'
import { useArchitecturesQuery, usePanelDataQuery, useRunsQuery } from '../../lib/query/hooks'
import { useRunStore } from '../../domain/runs/run-store'
import { stopTerminalRun } from '../../domain/runs/terminal-run-engine'
import { mapRuntimeStatusToRunStatus } from '../../domain/runs/run-status-mapper'

const tabs = ['Resumen', 'Datos', 'JSON'] as const

export const InspectorDrawer = () => {
  const [isStoppingRun, setIsStoppingRun] = useState(false)
  const [stopError, setStopError] = useState('')
  const { data: panelData } = usePanelDataQuery()
  const { data: architectures = [] } = useArchitecturesQuery()
  const { data: runs = [] } = useRunsQuery()
  const open = useUIStore((s) => s.inspectorOpen)
  const entity = useUIStore((s) => s.inspectorEntity)
  const runtimeRun = useRunStore((s) => (
    entity.type === 'run' ? s.runs.find((r) => r.id === entity.id) : undefined
  ))
  const activeId = useUIStore((s) => s.activeArchitectureId)
  const tab = useUIStore((s) => s.inspectorTab)
  const setTab = useUIStore((s) => s.setInspectorTab)
  const close = useUIStore((s) => s.closeInspector)

  const tasks = panelData?.tasks ?? []

  const selectedTask = entity.type === 'task'
    ? tasks.find((t) => t.id === entity.id)
    : undefined
  const selectedRun = entity.type === 'run'
    ? runs.find((r) => r.id === entity.id)
    : undefined

  const fallbackArchitecture = architectures.find((a) => a.id === activeId) ?? architectures[0]
  const selectedArchitecture = entity.type === 'architecture'
    ? architectures.find((a) => a.id === entity.id)
    : entity.type === 'task'
      ? architectures.find((a) => a.id === selectedTask?.architectureId)
      : architectures.find((a) => a.id === selectedRun?.architectureId)
  const arch = selectedArchitecture ?? fallbackArchitecture

  const statusClass = (status: string) => `status status-${status.toLowerCase().replace(/\s+/g, '-')}`
  const runtimeRunForInspector = runtimeRun === undefined
    ? undefined
    : {
      ...runtimeRun,
      status: mapRuntimeStatusToRunStatus(runtimeRun.runtimeStatus),
    }
  const runForInspector = runtimeRunForInspector ?? selectedRun

  const handleStopRun = async () => {
    if (runForInspector === undefined) return
    setIsStoppingRun(true)
    setStopError('')
    try {
      await stopTerminalRun(runForInspector.id)
    } catch (err) {
      setStopError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsStoppingRun(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer">
        <div className="drawer-header">
          <strong>
            {entity.type === 'architecture' && (arch?.name ?? 'Arquitectura')}
            {entity.type === 'task' && `Tarea ${selectedTask?.id ?? entity.id}`}
            {entity.type === 'run' && `Ejecución ${selectedRun?.id ?? entity.id}`}
          </strong>
          <div className="flex-row">
            {entity.type === 'run' && runtimeRun?.runtimeStatus === 'executing' && (
              <button className="btn" type="button" onClick={() => void handleStopRun()} disabled={isStoppingRun}>
                {isStoppingRun ? 'Deteniendo...' : 'Detener'}
              </button>
            )}
            <button className="icon-btn" type="button" onClick={close}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="drawer-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={`drawer-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {entity.type === 'architecture' && !arch ? (
            <p className="text-muted">No hay arquitectura cargada.</p>
          ) : entity.type === 'task' && !selectedTask ? (
            <p className="text-muted">No se encontró la tarea seleccionada.</p>
          ) : entity.type === 'run' && !selectedRun ? (
            <p className="text-muted">No se encontró la ejecución seleccionada.</p>
          ) : tab === 'Resumen' ? (
            <>
              {entity.type === 'architecture' && arch && (
                <>
                  <p>{arch.summary}</p>
                  <dl className="data-pairs">
                    <div className="data-pair">
                      <dt>Entorno</dt>
                      <dd>{arch.environment}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Salud</dt>
                      <dd>{arch.health}%</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Servicios</dt>
                      <dd>{arch.services}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Pipelines</dt>
                      <dd>{arch.pipelines}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Propietario</dt>
                      <dd>{arch.owner}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Aprobaciones</dt>
                      <dd>{arch.approvals}</dd>
                    </div>
                  </dl>
                </>
              )}

              {entity.type === 'task' && selectedTask && (
                <>
                  <p>{selectedTask.description}</p>
                  <dl className="data-pairs">
                    <div className="data-pair">
                      <dt>Estado</dt>
                      <dd><span className={statusClass(selectedTask.status)}>{selectedTask.status}</span></dd>
                    </div>
                    <div className="data-pair">
                      <dt>Riesgo</dt>
                      <dd><span className={statusClass(selectedTask.risk)}>{selectedTask.risk}</span></dd>
                    </div>
                    <div className="data-pair">
                      <dt>Responsable</dt>
                      <dd>{selectedTask.assignee}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Estimación</dt>
                      <dd>{selectedTask.estimate}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Dominio</dt>
                      <dd>{selectedTask.domain}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Arquitectura</dt>
                      <dd>{arch?.name ?? selectedTask.architectureId}</dd>
                    </div>
                  </dl>
                </>
              )}

              {entity.type === 'run' && runForInspector && (
                <>
                  <p>{runForInspector.title}</p>
                  <dl className="data-pairs">
                    <div className="data-pair">
                      <dt>Estado</dt>
                      <dd><span className={statusClass(runForInspector.status)}>{runForInspector.status}</span></dd>
                    </div>
                    <div className="data-pair">
                      <dt>Nodo</dt>
                      <dd>{runForInspector.node}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Iniciado por</dt>
                      <dd>{runForInspector.initiatedBy}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Inicio</dt>
                      <dd>{runForInspector.startedAt}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Duración</dt>
                      <dd>{runForInspector.duration}</dd>
                    </div>
                    <div className="data-pair">
                      <dt>Arquitectura</dt>
                      <dd>{arch?.name ?? runForInspector.architectureId}</dd>
                    </div>
                    {runtimeRun?.terminalCommand && (
                      <div className="data-pair">
                        <dt>Comando</dt>
                        <dd className="mono">{runtimeRun.terminalCommand}</dd>
                      </div>
                    )}
                    {runtimeRun?.terminalCwd && (
                      <div className="data-pair">
                        <dt>Directorio</dt>
                        <dd className="mono">{runtimeRun.terminalCwd}</dd>
                      </div>
                    )}
                    {runtimeRun?.terminalExitCode !== undefined && runtimeRun.terminalExitCode !== null && (
                      <div className="data-pair">
                        <dt>Exit Code</dt>
                        <dd>{runtimeRun.terminalExitCode}</dd>
                      </div>
                    )}
                  </dl>

                  {runtimeRun && (
                    <div className="card" style={{ padding: '10px 12px' }}>
                      <div className="card-header" style={{ marginBottom: '8px' }}>
                        <span className="card-title">Salida terminal</span>
                      </div>
                      <pre className="terminal-log">
                        {(runtimeRun.terminalLogs ?? []).join('') || 'Sin salida todavía.'}
                      </pre>
                    </div>
                  )}
                  {stopError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{stopError}</p>}
                </>
              )}
            </>
          ) : tab === 'Datos' ? (
            <>
              {entity.type === 'architecture' && arch && (
                <dl className="data-pairs">
                  <div className="data-pair">
                    <dt>ID</dt>
                    <dd className="mono">{arch.id}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Dominio</dt>
                    <dd>{arch.domain}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Estado</dt>
                    <dd>{arch.status}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Riesgos</dt>
                    <dd>{arch.risks}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Tareas</dt>
                    <dd>{arch.tasks}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Actualizado</dt>
                    <dd>{arch.updatedAt}</dd>
                  </div>
                </dl>
              )}

              {entity.type === 'task' && selectedTask && (
                <dl className="data-pairs">
                  <div className="data-pair">
                    <dt>ID</dt>
                    <dd className="mono">{selectedTask.id}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Arquitectura ID</dt>
                    <dd className="mono">{selectedTask.architectureId}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Título</dt>
                    <dd>{selectedTask.title}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Estado</dt>
                    <dd>{selectedTask.status}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Dominio</dt>
                    <dd>{selectedTask.domain}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Responsable</dt>
                    <dd>{selectedTask.assignee}</dd>
                  </div>
                </dl>
              )}

              {entity.type === 'run' && runForInspector && (
                <dl className="data-pairs">
                  <div className="data-pair">
                    <dt>ID</dt>
                    <dd className="mono">{runForInspector.id}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Arquitectura ID</dt>
                    <dd className="mono">{runForInspector.architectureId}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Título</dt>
                    <dd>{runForInspector.title}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Estado</dt>
                    <dd>{runForInspector.status}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Nodo</dt>
                    <dd>{runForInspector.node}</dd>
                  </div>
                  <div className="data-pair">
                    <dt>Iniciado por</dt>
                    <dd>{runForInspector.initiatedBy}</dd>
                  </div>
                </dl>
              )}
            </>
          ) : (
            <pre className="mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(
                entity.type === 'architecture'
                  ? arch
                  : entity.type === 'task'
                    ? selectedTask
                    : runtimeRun ?? selectedRun,
                null,
                2,
              )}
            </pre>
          )}
        </div>
      </aside>
    </>
  )
}
