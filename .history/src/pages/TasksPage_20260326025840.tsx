import { Funnel, GitBranch, Search, ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { useArchitectureQuery, useTasksQuery } from '../lib/query/hooks'

const filters = ['All', 'Todo', 'In progress', 'Blocked', 'Done'] as const

export const TasksPage = () => {
  const navigate = useNavigate()
  const activeArchitectureId = useUIStore((state) => state.activeArchitectureId)
  const openInspector = useUIStore((state) => state.openInspector)
  const setInspectorTab = useUIStore((state) => state.setInspectorTab)
  const { data: tasks = [], isLoading } = useTasksQuery(activeArchitectureId)
  const { data: architecture } = useArchitectureQuery(activeArchitectureId)
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [search, setSearch] = useState('')

  const filteredTasks = useMemo(
    () => {
      const byStatus = filter === 'All' ? tasks : tasks.filter((task) => task.status === filter)
      const query = search.trim().toLowerCase()

      if (!query) {
        return byStatus
      }

      return byStatus.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.domain.toLowerCase().includes(query) ||
          task.assignee.toLowerCase().includes(query),
      )
    },
    [filter, search, tasks],
  )

  return (
    <div className="page-stack">
      <div className="section-title">
        <GitBranch size={18} />
        <h2>Tasks for {architecture?.name ?? activeArchitectureId}</h2>
      </div>

      {architecture ? (
        <section className="panel-card slim-card">
          <div className="toolbar-row">
            <div>
              <strong>{architecture.name}</strong>
              <p>{architecture.summary}</p>
            </div>
            <div className="hero-actions compact">
              <button className="ghost-button" type="button" onClick={() => navigate(`/architectures/${architecture.id}`)}>
                Overview <ArrowRight size={16} />
              </button>
              <button className="secondary-button" type="button" onClick={() => navigate('/runs')}>
                Runs
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <label className="search-field">
        <Search size={16} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca por título, dominio o agente" />
      </label>

      <div className="filter-row">
        <Funnel size={16} />
        {filters.map((option) => (
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
        <div className="empty-state">Loading tasks...</div>
      ) : (
        <section className="table-card">
          {filteredTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className="table-row table-button"
              onClick={() => {
                openInspector()
                setInspectorTab('Summary')
              }}
            >
              <div>
                <strong>{task.title}</strong>
                <span>{task.domain} · {task.assignee}</span>
                <p className="row-description">{task.description}</p>
              </div>
              <div className="row-meta">
                <span className={`chip chip-${task.risk.toLowerCase()}`}>{task.risk}</span>
                <span className="chip chip-soft">{task.status}</span>
                <span className="chip chip-soft">{task.estimate}</span>
              </div>
            </button>
          ))}
          {!filteredTasks.length && <div className="empty-state compact">No tasks found for this filter.</div>}
        </section>
      )}
    </div>
  )
}