import { NavLink } from 'react-router-dom'
import { ChevronDown, PanelRight } from 'lucide-react'
import { useUIStore } from '../../app/store/ui-store'
import { useArchitecturesQuery } from '../../lib/query/hooks'

const nav = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/architectures', label: 'Arquitecturas' },
  { to: '/tasks', label: 'Tareas' },
  { to: '/runs', label: 'Ejecuciones' },
]

export const Topbar = () => {
  const { data: architectures = [] } = useArchitecturesQuery()
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const setActiveArchitectureId = useUIStore((s) => s.setActiveArchitectureId)
  const toggleInspector = useUIStore((s) => s.toggleInspector)
  const inspectorOpen = useUIStore((s) => s.inspectorOpen)

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="orb" />
        Orquestador
      </div>

      <nav className="topbar-nav">
        {nav.map(({ to, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-spacer" />

      <div className="arch-select">
        <select
          value={activeArchitectureId}
          onChange={(e) => setActiveArchitectureId(e.target.value)}
        >
          {architectures.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <ChevronDown size={14} />
      </div>

      <div className="topbar-actions">
        <button
          className={`icon-btn ${inspectorOpen ? 'is-active' : ''}`}
          type="button"
          onClick={toggleInspector}
          title="Inspector"
        >
          <PanelRight size={18} />
        </button>
      </div>
    </header>
  )
}