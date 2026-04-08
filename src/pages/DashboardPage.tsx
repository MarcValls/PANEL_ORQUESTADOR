import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { useArchitecturesQuery, useRunsQuery, useActivityQuery } from '../lib/query/hooks'

type WorkspaceBootstrapBanner = {
  tone: 'success' | 'warning'
  text: string
}

export const DashboardPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const setActiveArchitectureId = useUIStore((s) => s.setActiveArchitectureId)
  const openInspectorForArchitecture = useUIStore((s) => s.openInspectorForArchitecture)
  const { data: architectures = [] } = useArchitecturesQuery()
  const { data: runs = [] } = useRunsQuery()
  const { data: activity = [] } = useActivityQuery()

  const active = architectures.find((a) => a.id === activeArchitectureId)

  const workspaceBootstrap = useMemo(() => {
    const stateValue = location.state
    return (
      stateValue !== null
      && typeof stateValue === 'object'
      && 'workspaceBootstrap' in stateValue
      && stateValue.workspaceBootstrap !== null
      && typeof stateValue.workspaceBootstrap === 'object'
      && 'text' in stateValue.workspaceBootstrap
      && typeof stateValue.workspaceBootstrap.text === 'string'
      && 'tone' in stateValue.workspaceBootstrap
      && (stateValue.workspaceBootstrap.tone === 'success' || stateValue.workspaceBootstrap.tone === 'warning')
        ? stateValue.workspaceBootstrap as WorkspaceBootstrapBanner
        : null
    )
  }, [location.state])

  const metrics = useMemo(() => [
    { label: 'Arquitecturas', value: architectures.length },
    { label: 'Saludables', value: architectures.filter((a) => a.status === 'Healthy').length },
    { label: 'En ejecución', value: runs.filter((r) => r.status === 'Running').length },
    { label: 'Alertas', value: architectures.filter((a) => a.status === 'At risk').length },
  ], [architectures, runs])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Panel del orquestador</h1>
          <p>Resumen de estado de las arquitecturas activas</p>
        </div>
      </div>

      {workspaceBootstrap && (
        <div className={`workspace-bootstrap-banner ${workspaceBootstrap.tone === 'warning' ? 'is-warning' : 'is-success'}`}>
          <span>{workspaceBootstrap.text}</span>
          <button className="btn btn-ghost" type="button" onClick={() => navigate(location.pathname, { replace: true })}>
            Ocultar
          </button>
        </div>
      )}

      <div className="metrics-row">
        {metrics.map((m) => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
          </div>
        ))}
      </div>

      {active && (
        <div className="card">
          <div className="flex-between">
            <div>
              <div className="card-title">{active.name}</div>
              <span className="text-sm text-muted">{active.domain} · {active.environment}</span>
            </div>
            <div className="flex-row">
              <button className="btn" type="button" onClick={() => { openInspectorForArchitecture(active.id) }}>
                Inspeccionar
              </button>
              <button className="btn" type="button" onClick={() => navigate(`/architectures/${active.id}`)}>
                Ver detalle
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Arquitecturas</span>
            <button className="btn-ghost btn" type="button" onClick={() => navigate('/architectures')}>Ver todas</button>
          </div>
          <div className="list-card">
            {architectures.map((a) => (
              <button
                key={a.id}
                type="button"
                className="list-item-clickable"
                onClick={() => {
                  setActiveArchitectureId(a.id)
                  navigate(`/architectures/${a.id}`)
                }}
              >
                <div className="list-item-main">
                  <strong>{a.name}</strong>
                  <span>{a.domain} · {a.owner}</span>
                </div>
                <div className="list-item-meta">
                  <span className={`status status-${a.status.toLowerCase().replace(' ', '-')}`}>{a.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Actividad reciente</span>
          </div>
          <div>
            {activity.map((line, i) => (
              <div key={i} className="activity-item">
                <span className="activity-dot log" />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
