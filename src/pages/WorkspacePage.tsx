import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { createTerminalRun } from '../domain/runs/terminal-run-engine'
import {
  useAddTerminalProjectMutation,
  useInitTerminalPackageJsonMutation,
  usePickTerminalProjectFolderMutation,
  useProposeTerminalTasksMutation,
  usePreviewTerminalPackageJsonMutation,
  useSetTerminalWorkspaceMutation,
  useTerminalProjectsQuery,
  useTerminalWorkspaceQuery,
  useUpdateTerminalProjectMutation,
} from '../lib/query/terminal-agent-hooks'
import type {
  TerminalTaskProposalReport,
  TerminalWorkspaceMutationResponse,
} from '../infrastructure/terminal-agent/client'

type PilotMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

type WorkspaceBootstrapBanner = {
  tone: 'success' | 'warning'
  text: string
}

export const WorkspacePage = () => {
  const navigate = useNavigate()
  const activeWorkspacePath = useUIStore((s) => s.activeWorkspacePath)
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const openInspectorForRun = useUIStore((s) => s.openInspectorForRun)
  const setActiveWorkspacePath = useUIStore((s) => s.setActiveWorkspacePath)
  const { data: terminalProjects = [], isLoading, error, refetch } = useTerminalProjectsQuery()
  const { data: workspaceInfo } = useTerminalWorkspaceQuery()
  const addProjectMutation = useAddTerminalProjectMutation()
  const initPackageJsonMutation = useInitTerminalPackageJsonMutation()
  const pickProjectFolderMutation = usePickTerminalProjectFolderMutation()
  const proposeTasksMutation = useProposeTerminalTasksMutation()
  const previewPackageJsonMutation = usePreviewTerminalPackageJsonMutation()
  const updateProjectMutation = useUpdateTerminalProjectMutation()
  const setWorkspaceMutation = useSetTerminalWorkspaceMutation()
  const [newProjectPath, setNewProjectPath] = useState('')
  const [selectedProjectPath, setSelectedProjectPath] = useState(activeWorkspacePath)
  const [pageError, setPageError] = useState('')
  const [pageNotice, setPageNotice] = useState<WorkspaceBootstrapBanner | null>(null)
  const [packageEditorPath, setPackageEditorPath] = useState('')
  const [packageEditorValue, setPackageEditorValue] = useState('')
  const [packageEditorOpen, setPackageEditorOpen] = useState(false)
  const [packageExists, setPackageExists] = useState(false)
  const [overwritePackage, setOverwritePackage] = useState(false)
  const [installPackageDependencies, setInstallPackageDependencies] = useState(true)
  const [packageEditorError, setPackageEditorError] = useState('')
  const [packageEditorNotice, setPackageEditorNotice] = useState('')
  const [pilotInput, setPilotInput] = useState('')
  const [pilotBusy, setPilotBusy] = useState(false)
  const [pilotTaskPlan, setPilotTaskPlan] = useState<TerminalTaskProposalReport | null>(null)
  const [pilotMessages, setPilotMessages] = useState<PilotMessage[]>([
    {
      id: 'pilot-boot',
      role: 'assistant',
      text:
        'Piloto activo. Pídeme: "elegir carpeta", "usar carpeta: /ruta", ' +
        '"inicializar package.json", "estado", o "ejecutar: npm run build".',
    },
  ])

  const recentProjects = useMemo(
    () => terminalProjects.slice(0, 8),
    [terminalProjects],
  )
  const resolvedSelectedProjectPath = selectedProjectPath
    || activeWorkspacePath
    || workspaceInfo?.activeWorkspacePath
    || recentProjects[0]?.path
    || ''

  const pushPilotMessage = (role: PilotMessage['role'], text: string) => {
    setPilotMessages((current) => [
      ...current,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role,
        text,
      },
    ])
  }

  const buildAutoPreparedBanner = (
    autoPrepared: TerminalWorkspaceMutationResponse['autoPrepared'],
  ): WorkspaceBootstrapBanner | null => {
    if (!autoPrepared) return null
    if (autoPrepared.warning) {
      return {
        tone: 'warning',
        text: `Preparación automática con aviso: ${autoPrepared.warning}`,
      }
    }
    if (!autoPrepared.packageJsonCreated && !autoPrepared.dependenciesInstallAttempted) {
      return null
    }
    const manager = autoPrepared.packageManager ?? 'gestor no detectado'
    const inferredCount =
      autoPrepared.installedDependencies.length + autoPrepared.installedDevDependencies.length
    const packageSegment = autoPrepared.packageJsonCreated
      ? 'package.json creado'
      : 'package.json detectado'
    const depsSegment = autoPrepared.dependenciesInstallAttempted
      ? `dependencias instaladas con ${manager}${inferredCount > 0 ? ` (+${inferredCount} inferidas)` : ''}`
      : 'instalación de dependencias no requerida'
    return {
      tone: 'success',
      text: `Preparación inicial completada: ${packageSegment}; ${depsSegment}.`,
    }
  }

  const openPackageEditorForPath = async (targetPath: string) => {
    setPageError('')
    setPackageEditorError('')
    setPackageEditorNotice('')
    const preview = await previewPackageJsonMutation.mutateAsync(targetPath)
    setPackageEditorPath(preview.projectPath)
    setPackageEditorValue(`${JSON.stringify(preview.packageJson, null, 2)}\n`)
    setPackageExists(preview.exists)
    setOverwritePackage(preview.exists)
    setInstallPackageDependencies(true)
    setPackageEditorNotice(
      preview.exists
        ? 'Se cargó package.json existente. Puedes editarlo y sobrescribirlo.'
        : 'Se generó una propuesta de package.json según la carpeta.',
    )
    setPackageEditorOpen(true)
  }

  const handleSelectWorkspace = async (projectPath: string) => {
    setPageError('')
    setPageNotice(null)
    try {
      const result = await setWorkspaceMutation.mutateAsync(projectPath)
      setActiveWorkspacePath(result.activeWorkspacePath)
      const autoPreparedBanner = buildAutoPreparedBanner(result.autoPrepared)
      if (autoPreparedBanner) {
        setPageNotice(autoPreparedBanner)
      }
      if (!result.hasPackageJson) {
        setPageError('No puedes continuar: falta package.json en la carpeta de trabajo. Créalo primero.')
        await openPackageEditorForPath(result.activeWorkspacePath)
        return
      }
      navigate('/dashboard', autoPreparedBanner ? { state: { workspaceBootstrap: autoPreparedBanner } } : undefined)
    } catch (err) {
      setPageError(err instanceof Error ? err.message : String(err))
      setPageNotice(null)
    }
  }

  const registerAndEnterProject = async (targetPath: string) => {
    const projects = await addProjectMutation.mutateAsync(targetPath)
    const created = projects.find((project) => project.path === targetPath || project.path.endsWith(targetPath))
    const path = created?.path ?? projects[0]?.path
    if (path) {
      setSelectedProjectPath(path)
      await handleSelectWorkspace(path)
    }
  }

  const handleAddProject = async () => {
    const targetPath = newProjectPath.trim()
    if (!targetPath) {
      setPageError('Indica una carpeta válida.')
      return
    }
    setPageError('')
    setPageNotice(null)
    try {
      await registerAndEnterProject(targetPath)
      setNewProjectPath('')
    } catch (err) {
      setPageError(err instanceof Error ? err.message : String(err))
    }
  }

  const handlePickFolder = async () => {
    setPageError('')
    setPageNotice(null)
    try {
      const pickedPath = await pickProjectFolderMutation.mutateAsync()
      setNewProjectPath(pickedPath)
      await registerAndEnterProject(pickedPath)
    } catch (err) {
      setPageError(err instanceof Error ? err.message : String(err))
    }
  }

  const toggleFavorite = async (projectPath: string, nextFavorite: boolean) => {
    setPageError('')
    setPageNotice(null)
    try {
      await updateProjectMutation.mutateAsync({
        path: projectPath,
        favorite: nextFavorite,
      })
    } catch (err) {
      setPageError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleOpenPackageEditor = async () => {
    const fromInput = newProjectPath.trim()
    let targetPath = resolvedSelectedProjectPath
    if (fromInput) {
      try {
        const projects = await addProjectMutation.mutateAsync(fromInput)
        const created = projects.find((project) => (
          project.path === fromInput || project.path.endsWith(fromInput)
        ))
        targetPath = created?.path ?? projects[0]?.path ?? fromInput
        setSelectedProjectPath(targetPath)
        setNewProjectPath('')
      } catch (err) {
        setPageError(err instanceof Error ? err.message : String(err))
        setPageNotice(null)
        return
      }
    }

    if (!targetPath) {
      setPageError('Primero selecciona una carpeta de proyecto.')
      setPageNotice(null)
      return
    }

    try {
      await openPackageEditorForPath(targetPath)
    } catch (err) {
      setPageError(err instanceof Error ? err.message : String(err))
      setPageNotice(null)
    }
  }

  const handleSavePackageJson = async () => {
    if (!packageEditorPath) {
      setPackageEditorError('No hay carpeta objetivo para guardar package.json.')
      return
    }

    let parsed: Record<string, unknown>
    try {
      const value = JSON.parse(packageEditorValue)
      if (value === null || Array.isArray(value) || typeof value !== 'object') {
        setPackageEditorError('El JSON debe ser un objeto.')
        return
      }
      parsed = value as Record<string, unknown>
    } catch {
      setPackageEditorError('JSON inválido. Revisa la sintaxis.')
      return
    }

    setPackageEditorError('')
    setPackageEditorNotice('')
    try {
      const result = await initPackageJsonMutation.mutateAsync({
        path: packageEditorPath,
        packageJson: parsed,
        overwrite: overwritePackage,
        installDependencies: installPackageDependencies,
      })
      setPackageExists(true)
      setPackageEditorPath(result.projectPath)
      setPackageEditorValue(`${JSON.stringify(result.packageJson, null, 2)}\n`)
      const baseNotice =
        result.existedBefore
          ? 'package.json sobrescrito correctamente.'
          : 'package.json creado correctamente.'
      const installNotice = !result.installResult.attempted
        ? 'Instalación automática de dependencias omitida.'
        : result.installResult.warning
          ? `Aviso de instalación: ${result.installResult.warning}`
          : (
            `Dependencias instaladas con ${result.installResult.packageManager}. ` +
            `${result.installResult.installedDependencies.length + result.installResult.installedDevDependencies.length} paquetes inferidos.`
          )
      setPackageEditorNotice(`${baseNotice} ${installNotice}`)
      const workspace = await setWorkspaceMutation.mutateAsync(result.projectPath)
      setActiveWorkspacePath(workspace.activeWorkspacePath)
      if (workspace.hasPackageJson) {
        setPageError('')
        setPackageEditorOpen(false)
        navigate('/dashboard')
      }
    } catch (err) {
      setPackageEditorError(err instanceof Error ? err.message : String(err))
    }
  }

  const extractCommandFromPrompt = (prompt: string): string => {
    const trimmed = prompt.trim()
    const match = trimmed.match(/^(?:ejecutar|run|comando)\s*:\s*(.+)$/i)
    if (match !== null) return match[1].trim()
    return ''
  }

  const extractPathFromPrompt = (prompt: string): string => {
    const trimmed = prompt.trim()
    const explicit = trimmed.match(
      /^(?:usar|seleccionar|set)\s+carpeta\s*[:=]\s*(.+)$/i,
    )
    if (explicit !== null) return explicit[1].trim()

    const quoted = trimmed.match(/["']([^"']+)["']/)
    if (quoted !== null) return quoted[1].trim()

    return ''
  }

  const handlePilotSubmit = async () => {
    const prompt = pilotInput.trim()
    if (!prompt || pilotBusy) return

    setPilotInput('')
    pushPilotMessage('user', prompt)
    setPilotBusy(true)

    const normalized = prompt.toLowerCase()
    try {
      if (
        normalized.includes('finder')
        || normalized.includes('explorador')
        || normalized.includes('elegir carpeta')
      ) {
        await handlePickFolder()
        pushPilotMessage(
          'assistant',
          'Selector de carpeta abierto. Si la carpeta no tiene package.json, te abriré el editor para crearlo.',
        )
        return
      }

      const pathFromPrompt = extractPathFromPrompt(prompt)
      if (pathFromPrompt) {
        await registerAndEnterProject(pathFromPrompt)
        pushPilotMessage(
          'assistant',
          `Carpeta aplicada: ${pathFromPrompt}. Si falta package.json, tienes el editor disponible debajo.`,
        )
        return
      }

      if (
        normalized.includes('inicializar package')
        || normalized.includes('crear package')
        || normalized.includes('package.json')
      ) {
        await handleOpenPackageEditor()
        pushPilotMessage('assistant', 'Editor de package.json abierto para la carpeta actual.')
        return
      }

      if (
        normalized.includes('proponer tareas')
        || normalized.includes('analizar repo')
        || normalized.includes('analiza repo')
      ) {
        const targetPath = resolvedSelectedProjectPath || workspaceInfo?.activeWorkspacePath
        if (!targetPath) {
          pushPilotMessage('assistant', 'Primero define carpeta de trabajo para analizar tareas.')
          return
        }
        const report = await proposeTasksMutation.mutateAsync({
          path: targetPath,
          maxTodos: 12,
        })
        setPilotTaskPlan(report)
        const top = report.tasks.slice(0, 3)
        const summary = top.map((task) => `- [${task.priority}] ${task.title}`).join('\n')
        pushPilotMessage(
          'assistant',
          `Propuesta generada para ${report.targetPath}.\nTop tareas:\n${summary}`,
        )
        return
      }

      if (normalized.includes('estado') || normalized.includes('status')) {
        const workspace = workspaceInfo?.activeWorkspacePath || '(sin carpeta)'
        const status = workspaceInfo?.hasPackageJson ? 'ok' : 'faltante'
        pushPilotMessage(
          'assistant',
          `Estado actual:\n- carpeta: ${workspace}\n- package.json: ${status}`,
        )
        return
      }

      const command = extractCommandFromPrompt(prompt)
      if (command) {
        if (!resolvedSelectedProjectPath) {
          pushPilotMessage('assistant', 'Primero selecciona carpeta de trabajo.')
          return
        }
        if (!workspaceInfo?.hasPackageJson) {
          pushPilotMessage(
            'assistant',
            'No puedo ejecutar npm/pnpm/yarn sin package.json. Usa "inicializar package.json".',
          )
          return
        }
        const runId = await createTerminalRun({
          architectureId: activeArchitectureId,
          title: `Piloto: ${command}`,
          riskLevel: 'Low',
          environment: 'staging',
          command,
          cwd: resolvedSelectedProjectPath,
          initiatedBy: 'pilot',
          node: 'pilot-assistant',
        })
        openInspectorForRun(runId)
        navigate('/runs')
        pushPilotMessage(
          'assistant',
          `Comando lanzado en ${resolvedSelectedProjectPath}. Te abrí la vista de Ejecuciones.`,
        )
        return
      }

      pushPilotMessage(
        'assistant',
        'No entendí la orden. Prueba: "elegir carpeta", "usar carpeta: /ruta", "inicializar package.json", "estado" o "ejecutar: npm run build".',
      )
    } catch (err) {
      pushPilotMessage(
        'assistant',
        err instanceof Error ? err.message : String(err),
      )
    } finally {
      setPilotBusy(false)
    }
  }

  const setupStepFolder = Boolean(workspaceInfo?.activeWorkspacePath)
  const setupStepPackage = workspaceInfo?.hasPackageJson === true
  const setupStepReady = setupStepFolder && setupStepPackage

  return (
    <div className="workspace-gate">
      <div className="workspace-card">
        <h1>Proyectos Recientes</h1>
        <p>Selecciona carpeta de trabajo para continuar. Al elegirla se crea el archivo del panel en esa ruta.</p>

        <div className="workspace-main-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void handlePickFolder()}
            disabled={pickProjectFolderMutation.isPending}
          >
            {pickProjectFolderMutation.isPending ? 'Abriendo...' : 'Elegir carpeta (Finder/Explorador)'}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => resolvedSelectedProjectPath && void handleSelectWorkspace(resolvedSelectedProjectPath)}
            disabled={!resolvedSelectedProjectPath}
          >
            Entrar con proyecto seleccionado
          </button>
        </div>

        <div className="workspace-setup-steps">
          <div className={`workspace-setup-step ${setupStepFolder ? 'is-done' : ''}`}>
            <span>1</span>
            Elegir carpeta
          </div>
          <div className={`workspace-setup-step ${setupStepPackage ? 'is-done' : ''}`}>
            <span>2</span>
            Preparar package.json
          </div>
          <div className={`workspace-setup-step ${setupStepReady ? 'is-done' : ''}`}>
            <span>3</span>
            Entrar al panel
          </div>
        </div>

        {isLoading ? (
          <div className="empty">Cargando proyectos...</div>
        ) : error ? (
          <div className="empty" style={{ color: 'var(--danger)' }}>
            No se pudo conectar con terminal-agent. Levántalo con `npm run terminal:agent`.
          </div>
        ) : (
          <>
            <div className="workspace-row">
              <select
                value={resolvedSelectedProjectPath}
                onChange={(e) => setSelectedProjectPath(e.target.value)}
              >
                {recentProjects.length === 0 && <option value="">Sin proyectos</option>}
                {recentProjects.map((project) => (
                  <option key={project.path} value={project.path}>
                    {project.favorite ? '★ ' : ''}{project.name} — {project.path}
                  </option>
                ))}
              </select>
              <button className="btn" type="button" onClick={() => void refetch()}>
                Recargar
              </button>
            </div>

            <div className="workspace-project-list">
              {recentProjects.map((project) => (
                <div
                  key={project.path}
                  role="button"
                  tabIndex={0}
                  className={`workspace-project ${activeWorkspacePath === project.path ? 'is-active' : ''}`}
                  onClick={() => void handleSelectWorkspace(project.path)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      void handleSelectWorkspace(project.path)
                    }
                  }}
                >
                  <div className="workspace-project-main">
                    <strong>{project.name}</strong>
                    <span>{project.path}</span>
                  </div>
                  <div className="workspace-project-actions">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation()
                        void toggleFavorite(project.path, !project.favorite)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          void toggleFavorite(project.path, !project.favorite)
                        }
                      }}
                      title={project.favorite ? 'Quitar favorito' : 'Marcar favorito'}
                    >
                      {project.favorite ? '★' : '☆'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <details className="workspace-details">
          <summary>Opciones avanzadas</summary>
          <div className="workspace-details-body">
            <div className="workspace-row">
              <input
                value={newProjectPath}
                onChange={(e) => setNewProjectPath(e.target.value)}
                placeholder="Agregar carpeta (ruta absoluta)"
              />
              <button className="btn" type="button" onClick={() => void handleAddProject()}>
                Agregar y entrar
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => void handleOpenPackageEditor()}
                disabled={previewPackageJsonMutation.isPending}
              >
                {previewPackageJsonMutation.isPending ? 'Analizando...' : 'Inicializar package.json'}
              </button>
            </div>

            {packageEditorOpen && (
              <div className="workspace-package-editor">
                <div className="workspace-package-header">
                  <strong>{packageExists ? 'Editar package.json existente' : 'Crear package.json'}</strong>
                  <span className="text-sm text-muted mono">{packageEditorPath}</span>
                </div>
                <textarea
                  value={packageEditorValue}
                  onChange={(e) => setPackageEditorValue(e.target.value)}
                  rows={14}
                />
                <label className="workspace-checkbox">
                  <input
                    type="checkbox"
                    checked={overwritePackage}
                    onChange={(e) => setOverwritePackage(e.target.checked)}
                    disabled={!packageExists}
                  />
                  Sobrescribir si ya existe
                </label>
                <label className="workspace-checkbox">
                  <input
                    type="checkbox"
                    checked={installPackageDependencies}
                    onChange={(e) => setInstallPackageDependencies(e.target.checked)}
                  />
                  Instalar dependencias inferidas para scripts
                </label>
                <div className="workspace-row">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => void handleSavePackageJson()}
                    disabled={initPackageJsonMutation.isPending}
                  >
                    {initPackageJsonMutation.isPending ? 'Guardando...' : 'Guardar package.json'}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setPackageEditorOpen(false)
                      setPackageEditorError('')
                      setPackageEditorNotice('')
                    }}
                  >
                    Cerrar
                  </button>
                </div>
                {packageEditorError && (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>
                    {packageEditorError}
                  </p>
                )}
                {packageEditorNotice && (
                  <p className="text-sm text-muted">{packageEditorNotice}</p>
                )}
              </div>
            )}
          </div>
        </details>

        <details className="workspace-details">
          <summary>Piloto (beta)</summary>
          <div className="workspace-details-body">
            <div className="workspace-pilot">
              <div className="workspace-pilot-header">
                <strong>Control guiado por comandos</strong>
                <span className="text-sm text-muted">Opcional</span>
              </div>
              <div className="workspace-pilot-log">
                {pilotMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`workspace-pilot-line ${message.role === 'assistant' ? 'assistant' : 'user'}`}
                  >
                    <span>{message.role === 'assistant' ? 'Piloto' : 'Tú'}</span>
                    <p>{message.text}</p>
                  </div>
                ))}
              </div>
              <div className="workspace-row">
                <input
                  value={pilotInput}
                  onChange={(e) => setPilotInput(e.target.value)}
                  placeholder="Escribe una orden (ej: ejecutar: npm run build)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handlePilotSubmit()
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => void handlePilotSubmit()}
                  disabled={pilotBusy || !pilotInput.trim()}
                >
                  {pilotBusy ? 'Procesando...' : 'Enviar'}
                </button>
              </div>
              {pilotTaskPlan && (
                <div className="workspace-task-plan">
                  <div className="workspace-task-plan-header">
                    <strong>Tareas propuestas</strong>
                    <span className="text-sm text-muted mono">{pilotTaskPlan.targetPath}</span>
                  </div>
                  <div className="workspace-task-plan-list">
                    {pilotTaskPlan.tasks.map((task) => (
                      <div key={task.id} className="workspace-task-card">
                        <div className="workspace-task-card-head">
                          <span className={`status ${task.priority === 'P1' ? 'status-failed' : task.priority === 'P2' ? 'status-running' : 'status-succeeded'}`}>
                            {task.priority}
                          </span>
                          <strong>{task.title}</strong>
                        </div>
                        <p>{task.description}</p>
                        {task.evidence.length > 0 && (
                          <div className="workspace-task-evidence">
                            {task.evidence.slice(0, 3).map((entry) => (
                              <div key={`${task.id}-${entry}`}>{entry}</div>
                            ))}
                          </div>
                        )}
                        {task.commands.length > 0 && (
                          <div className="workspace-task-commands">
                            {task.commands.slice(0, 2).map((command) => (
                              <button
                                key={`${task.id}-${command}`}
                                className="btn btn-ghost"
                                type="button"
                                onClick={() => setPilotInput(`ejecutar: ${command}`)}
                              >
                                {command}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </details>

        {pageError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{pageError}</p>}
        {pageNotice && (
          <p className="text-sm" style={{ color: pageNotice.tone === 'warning' ? 'var(--warning)' : 'var(--success)' }}>
            {pageNotice.text}
          </p>
        )}
        {workspaceInfo?.workspaceFilePath && (
          <p className="text-sm text-muted">
            Archivo del panel: <code className="mono">{workspaceInfo.workspaceFilePath}</code>
          </p>
        )}
        {workspaceInfo?.activeWorkspacePath && (
          <p className="text-sm text-muted">
            package.json: {' '}
            <code className="mono">
              {workspaceInfo.packageJsonPath ?? '(sin ruta)'}
            </code>
            {' '}·{' '}
            {workspaceInfo.hasPackageJson ? 'detectado' : 'faltante'}
          </p>
        )}
      </div>
    </div>
  )
}
