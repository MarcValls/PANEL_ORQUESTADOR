import { useMemo, useState } from 'react'
import { useUIStore } from '../app/store/ui-store'
import { useRunsQuery } from '../lib/query/hooks'

const statusFilters = ['Todas', 'Running', 'Queued', 'Succeeded', 'Failed'] as const

export const RunsPage = () => {
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const { data: runs = [], isLoading } = useRunsQuery()
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('Todas')
  const [scope, setScope] = useState<'active' | 'all'>('active')

  const filtered = useMemo(() => {
    const byScope = scope === 'active' ? runs.filter((r) => r.architectureId === activeArchitectureId) : runs
    return filter === 'Todas' ? byScope : byScope.filter((r) => r.status === filter)
  }, [activeArchitectureId, filter, runs, scope])

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
        </div>
      </div>

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
            <div key={r.id} className="list-item">
              <div className="list-item-main">
                <strong>{r.title}</strong>
                <span>{r.id} · {r.node} · {r.initiatedBy}</span>
              </div>
              <div className="list-item-meta">
                <span className={`status status-${r.status.toLowerCase()}`}>{r.status}</span>
                <span className="text-sm text-muted">{r.startedAt}</span>
                <span className="text-sm text-muted">{r.duration}</span>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="empty">Sin ejecuciones para este filtro</div>}
        </div>
      )}
    </div>
  )
}