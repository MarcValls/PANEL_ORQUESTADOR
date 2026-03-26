import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useUIStore } from '../app/store/ui-store'
import { useArchitectureQuery, useTasksQuery } from '../lib/query/hooks'

const filters = ['Todas', 'Todo', 'In progress', 'Blocked', 'Done'] as const

export const TasksPage = () => {
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const openInspector = useUIStore((s) => s.openInspector)
  const { data: tasks = [], isLoading } = useTasksQuery(activeArchitectureId)
  const { data: arch } = useArchitectureQuery(activeArchitectureId)
  const [filter, setFilter] = useState<(typeof filters)[number]>('Todas')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const byStatus = filter === 'Todas' ? tasks : tasks.filter((t) => t.status === filter)
    const q = search.trim().toLowerCase()
    if (!q) return byStatus
    return byStatus.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.domain.toLowerCase().includes(q) ||
      t.assignee.toLowerCase().includes(q),
    )
  }, [filter, search, tasks])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Tareas</h1>
          <p>{arch?.name ?? activeArchitectureId}</p>
        </div>
      </div>

      <div className="search-bar">
        <Search size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, dominio o agente" />
      </div>

      <div className="filter-pills">
        {filters.map((f) => (
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
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              className="list-item-clickable"
              onClick={() => openInspector()}
            >
              <div className="list-item-main">
                <strong>{t.title}</strong>
                <span>{t.domain} · {t.assignee} · {t.estimate}</span>
              </div>
              <div className="list-item-meta">
                <span className={`status status-${t.risk.toLowerCase()}`}>{t.risk}</span>
                <span className={`status status-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span>
              </div>
            </button>
          ))}
          {!filtered.length && <div className="empty">Sin tareas para este filtro</div>}
        </div>
      )}
    </div>
  )
}