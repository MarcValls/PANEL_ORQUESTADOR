import { useMemo, useState } from 'react'
import { useUIStore } from '../app/store/ui-store'
import { useRunsQuery } from '../lib/query/hooks'
import { createRun } from '../domain/runs/run-engine'
import type { RiskLevel } from '../domain/runs/types'

const statusFilters = ['Todas', 'Running', 'Queued', 'Succeeded', 'Failed', 'Requires approval'] as const

export const RunsPage = () => {
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const { data: runs = [], isLoading } = useRunsQuery()
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('Todas')
  const [scope, setScope] = useState<'active' | 'all'>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createRisk, setCreateRisk] = useState<RiskLevel>('Low')
  const [createEnv, setCreateEnv] = useState('staging')

  const filtered = useMemo(() => {
    const byScope = scope === 'active' ? runs.filter((r) => r.architectureId === activeArchitectureId) : runs
    return filter === 'Todas' ? byScope : byScope.filter((r) => r.status === filter)
  }, [activeArchitectureId, filter, runs, scope])

  const handleCreate = () => {
    if (!createTitle.trim()) return
    createRun({
      architectureId: activeArchitectureId,
      title: createTitle.trim(),
      node: 'manual-node',
      initiatedBy: 'user',
      riskLevel: createRisk,
      environment: createEnv,
    })
    setCreateTitle('')
    setShowCreate(false)
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
          <button className="btn btn-primary" type="button" onClick={() => setShowCreate((v) => !v)}>
            Nueva ejecución
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'inherit', fontSize: '13px', outline: 'none' }}
              placeholder="Título de la ejecución"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
                onChange={(e) => setCreateEnv(e.target.value)}
              >
                <option>staging</option>
                <option>production</option>
                <option>sandbox</option>
              </select>
              <button className="btn btn-primary" type="button" onClick={handleCreate}>Crear</button>
              <button className="btn" type="button" onClick={() => setShowCreate(false)}>Cancelar</button>
            </div>
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
            <div key={r.id} className="list-item">
              <div className="list-item-main">
                <strong>{r.title}</strong>
                <span>{r.id} · {r.node} · {r.initiatedBy}</span>
              </div>
              <div className="list-item-meta">
                <span className={`status status-${r.status.toLowerCase().replace(/ /g, '-')}`}>{r.status}</span>
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