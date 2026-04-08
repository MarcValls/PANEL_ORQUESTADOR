import { useEffect, useMemo, useState } from 'react'
import { useUIStore } from '../app/store/ui-store'
import { useRunsQuery } from '../lib/query/hooks'
import type { RiskLevel, Environment } from '../domain/runs/types'
import { createTerminalRun } from '../domain/runs/terminal-run-engine'
import {
  useAddTerminalProjectMutation,
  useRemoveTerminalProjectMutation,
  useTerminalProjectsQuery,
  useUpdateTerminalProjectMutation,
} from '../lib/query/terminal-agent-hooks'

const statusFilters = ['Todas', 'Running', 'Queued', 'Succeeded', 'Failed', 'Requires approval'] as const

export const RunsPage = () => {
  const activeWorkspacePath = useUIStore((s) => s.activeWorkspacePath)
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const openInspectorForRun = useUIStore((s) => s.openInspectorForRun)
  const { data: runs = [], isLoading } = useRunsQuery()
  const {
    data: terminalProjects = [],
    isLoading: isProjectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useTerminalProjectsQuery()
  const addProjectMutation = useAddTerminalProjectMutation()
  const removeProjectMutation = useRemoveTerminalProjectMutation()
  const updateProjectMutation = useUpdateTerminalProjectMutation()
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('Todas')
  const [scope, setScope] = useState<'active' | 'all'>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createCommand, setCreateCommand] = useState('npm run lint')
  const [createCwd, setCreateCwd] = useState('')
  const [selectedProjectPath, setSelectedProjectPath] = useState('')
  const [newProjectPath, setNewProjectPath] = useState('')
  const [projectFormError, setProjectFormError] = useState('')
  const [createRisk, setCreateRisk] = useState<RiskLevel>('Low')
  const [createEnv, setCreateEnv] = useState<Environment>('staging')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (!terminalProjects.length) {
      setSelectedProjectPath('')
      return
    }
    if (activeWorkspacePath && terminalProjects.some((project) => project.path === activeWorkspacePath)) {
      setSelectedProjectPath(activeWorkspacePath)
      return
    }
    setSelectedProjectPath((current) => (
      terminalProjects.some((project) => project.path === current)
        ? current
        : terminalProjects[0].path
    ))
  }, [activeWorkspacePath, terminalProjects])

  const filtered = useMemo(() => {
    const byScope = scope === 'active' ? runs.filter((r) => r.architectureId === activeArchitectureId) : runs
    return filter === 'Todas' ? byScope : byScope.filter((r) => r.status === filter)
  }, [activeArchitectureId, filter, runs, scope])

  const applySelectedProjectToCwd = () => {
    if (!selectedProjectPath) return
    setCreateCwd(selectedProjectPath)
  }

  const handleAddProject = async () => {
    const targetPath = newProjectPath.trim()
    if (!targetPath) {
      setProjectFormError('Indica una ruta de carpeta.')
      return
    }
    setProjectFormError('')
    try {
      const projects = await addProjectMutation.mutateAsync(targetPath)
      const next = projects[0]?.path
      if (next) {
        setSelectedProjectPath(next)
        setCreateCwd(next)
      }
      setNewProjectPath('')
    } catch (err) {
      setProjectFormError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleRemoveProject = async (targetPath: string) => {
    setProjectFormError('')
    try {
      await removeProjectMutation.mutateAsync(targetPath)
      if (createCwd === targetPath) {
        setCreateCwd('')
      }
    } catch (err) {
      setProjectFormError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleToggleFavorite = async (targetPath: string, nextFavorite: boolean) => {
    setProjectFormError('')
    try {
      await updateProjectMutation.mutateAsync({
        path: targetPath,
        favorite: nextFavorite,
      })
    } catch (err) {
      setProjectFormError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleCreate = async () => {
    const title = createTitle.trim()
    const command = createCommand.trim()
    if (!title || !command) {
      setCreateError('Título y comando son obligatorios.')
      return
    }

    setIsCreating(true)
    setCreateError('')
    const resolvedCwd = createCwd.trim() || selectedProjectPath || undefined
    try {
      const runId = await createTerminalRun({
        architectureId: activeArchitectureId,
        title,
        riskLevel: createRisk,
        environment: createEnv,
        command,
        cwd: resolvedCwd,
        initiatedBy: 'user',
        node: 'terminal-shell',
      })
      openInspectorForRun(runId)
      setCreateTitle('')
      setShowCreate(false)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Ejecuciones</h1>
        <div className="flex-row">
          <button className={`pill ${scope === 'active' ? 'active' : ''}`} type="button" onClick={() => setScope('active')}>
            Arquitectura activa
          </button>
          <button className={`pill ${scope === 'all' ? 'active' : ''}`} type="button" onClick={() => setScope('all')}>
            Todas
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setShowCreate((v) => !v)
              setCreateError('')
            }}
          >
            Nueva ejecución
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--bg)' }}>
              <div className="flex-between">
                <strong style={{ fontSize: '13px', color: 'var(--title)' }}>Proyectos permitidos</strong>
                <button className="btn btn-ghost" type="button" onClick={() => void refetchProjects()}>
                  Recargar
                </button>
              </div>

              {isProjectsLoading ? (
                <span className="text-sm text-muted">Cargando proyectos...</span>
              ) : projectsError ? (
                <span className="text-sm" style={{ color: 'var(--danger)' }}>
                  No se pudo conectar con terminal-agent.
                </span>
              ) : (
                <>
                  <div className="flex-row">
                    <select
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'inherit', fontSize: '13px' }}
                      value={selectedProjectPath}
                      onChange={(e) => setSelectedProjectPath(e.target.value)}
                    >
                      {terminalProjects.length === 0 && <option value="">Sin proyectos</option>}
                      {terminalProjects.map((project) => (
                        <option key={project.path} value={project.path}>
                          {project.favorite ? '★ ' : ''}{project.name} — {project.path}
                        </option>
                      ))}
                    </select>
                    <button className="btn" type="button" onClick={applySelectedProjectToCwd} disabled={!selectedProjectPath}>
                      Usar
                    </button>
                  </div>

                  <div className="flex-row" style={{ flexWrap: 'wrap' }}>
                    {terminalProjects.map((project) => (
                      <div key={project.path} className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          style={{ border: 0, background: 'none', color: project.favorite ? 'var(--warning)' : 'var(--muted)', cursor: 'pointer', padding: 0 }}
                          title={project.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                          onClick={() => void handleToggleFavorite(project.path, !project.favorite)}
                        >
                          {project.favorite ? '★' : '☆'}
                        </button>
                        <button
                          type="button"
                          style={{ border: 0, background: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                          onClick={() => {
                            setSelectedProjectPath(project.path)
                            setCreateCwd(project.path)
                          }}
                        >
                          {project.name}
                        </button>
                        <button
                          type="button"
                          style={{ border: 0, background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                          onClick={() => void handleRemoveProject(project.path)}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex-row">
                <input
                  style={{ flex: 1, padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'inherit', fontSize: '13px', outline: 'none' }}
                  placeholder="Agregar carpeta de proyecto (ruta absoluta)"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                />
                <button className="btn" type="button" onClick={() => void handleAddProject()}>
                  Agregar
                </button>
              </div>
            </div>

            <input
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'inherit', fontSize: '13px', outline: 'none' }}
              placeholder="Título de la ejecución (ej. Validar build orquestador)"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            />
            <input
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'inherit', fontSize: '13px', outline: 'none' }}
              placeholder="Comando terminal (ej. npm run build)"
              value={createCommand}
              onChange={(e) => setCreateCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            />
            <input
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'inherit', fontSize: '13px', outline: 'none' }}
              placeholder="Directorio (opcional, ej. /Users/tuuser/proyecto)"
              value={createCwd}
              onChange={(e) => setCreateCwd(e.target.value)}
            />
            <div className="flex-row">
              <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Riesgo:</label>
              <select
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'inherit', fontSize: '13px' }}
                value={createRisk}
                onChange={(e) => setCreateRisk(e.target.value as RiskLevel)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Entorno:</label>
              <select
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'inherit', fontSize: '13px' }}
                value={createEnv}
                onChange={(e) => setCreateEnv(e.target.value as Environment)}
              >
                <option>staging</option>
                <option>production</option>
                <option>sandbox</option>
              </select>
              <button className="btn btn-primary" type="button" onClick={() => void handleCreate()} disabled={isCreating}>
                {isCreating ? 'Creando...' : 'Crear'}
              </button>
              <button className="btn" type="button" onClick={() => setShowCreate(false)}>Cancelar</button>
            </div>
            {createError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{createError}</p>}
            {projectFormError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{projectFormError}</p>}
            <p className="text-sm text-muted">
              Este comando se ejecuta en terminal-agent local y queda ligado al run.
            </p>
          </div>
        </div>
      )}

      <div className="filter-pills">
        {statusFilters.map((f) => (
          <button
            key={f}
            type="button"
            className={`pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="empty">Cargando...</div>
      ) : (
        <div className="list-card">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              className="list-item-clickable"
              onClick={() => openInspectorForRun(r.id)}
            >
              <div className="list-item-main">
                <strong>{r.title}</strong>
                <span>{r.id} · {r.node} · {r.initiatedBy}</span>
              </div>
              <div className="list-item-meta">
                <span className={`status status-${r.status.toLowerCase().replace(/ /g, '-')}`}>{r.status}</span>
                <span className="text-sm text-muted">{r.startedAt}</span>
                <span className="text-sm text-muted">{r.duration}</span>
              </div>
            </button>
          ))}
          {!filtered.length && <div className="empty">Sin ejecuciones para este filtro</div>}
        </div>
      )}
    </div>
  )
}
