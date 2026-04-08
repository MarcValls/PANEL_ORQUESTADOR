import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useUIStore } from '../app/store/ui-store'
import { useArchitectureQuery, useTasksQuery } from '../lib/query/hooks'

const filters = [
  { key: 'priority', label: 'Prioridad', statuses: ['Blocked', 'In progress'] as const },
  { key: 'blocked', label: 'Bloqueadas', statuses: ['Blocked'] as const },
  { key: 'inProgress', label: 'En progreso', statuses: ['In progress'] as const },
  { key: 'todo', label: 'Pendientes', statuses: ['Todo'] as const },
  { key: 'done', label: 'Completadas', statuses: ['Done'] as const },
  { key: 'all', label: 'Todas', statuses: null },
] as const

type FilterKey = (typeof filters)[number]['key']

const taskStatusLabel = {
  Todo: 'Pendiente',
  'In progress': 'En progreso',
  Blocked: 'Bloqueada',
  Done: 'Completada',
} as const

export const TasksPage = () => {
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const openInspectorForTask = useUIStore((s) => s.openInspectorForTask)
  const { data: tasks = [], isLoading } = useTasksQuery(activeArchitectureId)
  const { data: arch } = useArchitectureQuery(activeArchitectureId)
  const [filter, setFilter] = useState<FilterKey>('priority')
  const [search, setSearch] = useState('')

  const selectedFilter = filters.find((f) => f.key === filter) ?? filters[0]

  const sortedTasks = useMemo(() => {
    const statusWeight = {
      Blocked: 0,
      'In progress': 1,
      Todo: 2,
      Done: 3,
    } as const
    return [...tasks].sort((a, b) => statusWeight[a.status] - statusWeight[b.status])
  }, [tasks])

  const filtered = useMemo(() => {
    let byStatus = sortedTasks
    if (selectedFilter.statuses) {
      const statuses = selectedFilter.statuses
      byStatus = sortedTasks.filter((t) => statuses.some((status) => status === t.status))
    }
    const q = search.trim().toLowerCase()
    if (!q) return byStatus
    return byStatus.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.domain.toLowerCase().includes(q) ||
      t.assignee.toLowerCase().includes(q),
    )
  }, [search, selectedFilter, sortedTasks])

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
            key={f.key}
            type="button"
            className={`pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
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
              onClick={() => openInspectorForTask(t.id)}
            >
              <div className="list-item-main">
                <strong>{t.title}</strong>
                <span>{t.domain} · {t.assignee} · {t.estimate}</span>
              </div>
              <div className="list-item-meta">
                <span className={`status status-${t.risk.toLowerCase()}`}>{t.risk}</span>
                <span className={`status status-${t.status.toLowerCase().replace(' ', '-')}`}>{taskStatusLabel[t.status]}</span>
              </div>
            </button>
          ))}
          {!filtered.length && <div className="empty">Sin tareas para este filtro</div>}
        </div>
      )}
    </div>
  )
}
