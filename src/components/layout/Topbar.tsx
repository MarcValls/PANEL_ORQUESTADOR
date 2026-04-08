import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronDown, Menu, PanelRight, X } from 'lucide-react'
import { useUIStore } from '../../app/store/ui-store'
import { useArchitecturesQuery } from '../../lib/query/hooks'

const nav = [
  { to: '/workspace', label: 'Proyectos' },
  { to: '/dashboard', label: 'Inicio' },
  { to: '/architectures', label: 'Arquitecturas' },
  { to: '/tasks', label: 'Tareas' },
  { to: '/runs', label: 'Ejecuciones' },
]

export const Topbar = () => {
  const { data: architectures = [] } = useArchitecturesQuery()
  const activeWorkspacePath = useUIStore((s) => s.activeWorkspacePath)
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const setActiveArchitectureId = useUIStore((s) => s.setActiveArchitectureId)
  const openInspectorForArchitecture = useUIStore((s) => s.openInspectorForArchitecture)
  const toggleInspector = useUIStore((s) => s.toggleInspector)
  const inspectorOpen = useUIStore((s) => s.inspectorOpen)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleInspectorClick = () => {
    if (inspectorOpen) {
      toggleInspector()
      return
    }
    openInspectorForArchitecture(activeArchitectureId)
  }

  const workspaceLabel = activeWorkspacePath
    ? activeWorkspacePath.split('/').filter(Boolean).pop() ?? activeWorkspacePath
    : 'Sin carpeta'

  return (
    <header className="topbar-wrap">
      <div className="topbar">
        <div className="topbar-brand">
          <span className="orb" />
          {`Orquestador · ${workspaceLabel}`}
        </div>

        <nav className="topbar-nav">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setMobileMenuOpen(false)}
            >
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
            onClick={handleInspectorClick}
            title="Inspector"
          >
            <PanelRight size={18} />
          </button>
        </div>

        <button
          className="icon-btn mobile-menu-btn"
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          title="Menú"
          aria-expanded={mobileMenuOpen}
          aria-controls="topbar-mobile-panel"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div id="topbar-mobile-panel" className={`topbar-mobile-panel ${mobileMenuOpen ? 'open' : ''}`}>
        <nav className="topbar-mobile-nav">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setMobileMenuOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-mobile-controls">
          <div className="arch-select">
            <select
              value={activeArchitectureId}
              onChange={(e) => {
                setActiveArchitectureId(e.target.value)
                setMobileMenuOpen(false)
              }}
            >
              {architectures.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <button
            className={`icon-btn ${inspectorOpen ? 'is-active' : ''}`}
            type="button"
            onClick={handleInspectorClick}
            title="Inspector"
          >
            <PanelRight size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
