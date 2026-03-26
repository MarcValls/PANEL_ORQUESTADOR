import { Clock3, PlayCircle, Radar, ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { useRunsQuery } from '../lib/query/hooks'

const runFilters = ['All', 'Running', 'Queued', 'Succeeded', 'Failed'] as const

export const RunsPage = () => {
  const navigate = useNavigate()
  const activeArchitectureId = useUIStore((state) => state.activeArchitectureId)
  const { data: runs = [], isLoading } = useRunsQuery()
  const [filter, setFilter] = useState<(typeof runFilters)[number]>('All')
  const [scope, setScope] = useState<'active' | 'all'>('active')

  const filteredRuns = useMemo(() => {
    const byScope = scope === 'active' ? runs.filter((run) => run.architectureId === activeArchitectureId) : runs
    return filter === 'All' ? byScope : byScope.filter((run) => run.status === filter)
  }, [activeArchitectureId, filter, runs, scope])

  return (
    <div className="page-stack">
      <div className="section-title">
        <PlayCircle size={18} />
        <h2>Runs</h2>
      </div>

      <section className="panel-card slim-card">
        <div className="toolbar-row">
          <div>
            <strong>Execution context</strong>
            <p>Alterna entre runs de la arquitectura activa o el historial completo.</p>
          </div>
          <div className="hero-actions compact">
            <button className={`tab-button ${scope === 'active' ? 'is-active' : ''}`} type="button" onClick={() => setScope('active')}>
              Active architecture
            </button>
            <button className={`tab-button ${scope === 'all' ? 'is-active' : ''}`} type="button" onClick={() => setScope('all')}>
              All runs
            </button>
            <button className="ghost-button" type="button" onClick={() => navigate('/tasks')}>
              Tasks <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <div className="filter-row">
        <Radar size={16} />
        {runFilters.map((option) => (
          <button
            key={option}
            type="button"
            className={`tab-button ${filter === option ? 'is-active' : ''}`}
            onClick={() => setFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="empty-state">Loading runs...</div>
      ) : (
        <section className="table-card">
          {filteredRuns.map((run) => (
            <div key={run.id} className="table-row">
              <div>
                <strong>{run.title}</strong>
                <span>{run.id} · {run.node} · {run.initiatedBy}</span>
              </div>
              <div className="row-meta">
                <span className={`chip chip-${run.status.toLowerCase()}`}>{run.status}</span>
                <span className="chip chip-soft"><Clock3 size={12} /> {run.startedAt}</span>
                <span className="chip chip-soft">{run.duration}</span>
              </div>
            </div>
          ))}
          {!filteredRuns.length && <div className="empty-state compact">No runs found for the current filters.</div>}
        </section>
      )}
    </div>
  )
}