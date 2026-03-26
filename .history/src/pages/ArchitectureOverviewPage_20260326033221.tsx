import { Link, Navigate, useParams } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { useArchitectureQuery, useRunsQuery, useTasksQuery } from '../lib/query/hooks'

export const ArchitectureOverviewPage = () => {
  const { architectureId = '' } = useParams()
  const openInspector = useUIStore((s) => s.openInspector)
  const setActive = useUIStore((s) => s.setActiveArchitectureId)
  const { data: arch, isLoading } = useArchitectureQuery(architectureId)
  const { data: tasks = [] } = useTasksQuery(architectureId)
  const { data: runs = [] } = useRunsQuery()

  if (!isLoading && !arch) return <Navigate to="/architectures" replace />
  if (!arch) return <div className="empty">Cargando...</div>

  const relatedRuns = runs.filter((r) => r.architectureId === arch.id).slice(0, 3)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{arch.name}</h1>
          <p>{arch.summary}</p>
        </div>
        <div className="flex-row">
          <button className="btn" type="button" onClick={() => { setActive(arch.id); openInspector() }}>
            Inspeccionar
          </button>
          <Link className="btn" to="/tasks">Tareas</Link>
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric">
          <div className="metric-label">Salud</div>
          <div className="metric-value">{arch.health}%</div>
        </div>
        <div className="metric">
          <div className="metric-label">Aprobaciones</div>
          <div className="metric-value">{arch.approvals}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Riesgos</div>
          <div className="metric-value">{arch.risks}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Actualizado</div>
          <div className="metric-value" style={{ fontSize: '16px' }}>{arch.updatedAt}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Tareas actuales</span>
          </div>
          <div className="list-card">
            {tasks.slice(0, 4).map((t) => (
              <div key={t.id} className="list-item">
                <div className="list-item-main">
                  <strong>{t.title}</strong>
                  <span>{t.domain} · {t.assignee}</span>
                </div>
                <div className="list-item-meta">
                  <span className={`status status-${t.risk.toLowerCase()}`}>{t.risk}</span>
                </div>
              </div>
            ))}
            {!tasks.length && <div className="empty">Sin tareas</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Últimas ejecuciones</span>
          </div>
          <div className="list-card">
            {relatedRuns.map((r) => (
              <div key={r.id} className="list-item">
                <div className="list-item-main">
                  <strong>{r.title}</strong>
                  <span>{r.node} · {r.initiatedBy}</span>
                </div>
                <div className="list-item-meta">
                  <span className={`status status-${r.status.toLowerCase()}`}>{r.status}</span>
                </div>
              </div>
            ))}
            {!relatedRuns.length && <div className="empty">Sin ejecuciones</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Contexto operativo</span>
        </div>
        <dl className="data-pairs">
          <div className="data-pair">
            <dt>Propietario</dt>
            <dd>{arch.owner}</dd>
          </div>
          <div className="data-pair">
            <dt>Dominio</dt>
            <dd>{arch.domain}</dd>
          </div>
          <div className="data-pair">
            <dt>Entorno</dt>
            <dd>{arch.environment}</dd>
          </div>
          <div className="data-pair">
            <dt>Estado</dt>
            <dd>{arch.status}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}