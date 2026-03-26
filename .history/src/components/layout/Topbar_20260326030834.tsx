import { Search, PanelRightOpen, PanelsTopLeft, ChevronDown } from 'lucide-react'
import { useUIStore } from '../../app/store/ui-store'
import { useArchitecturesQuery } from '../../lib/query/hooks'

export const Topbar = () => {
  const { data: architectures = [] } = useArchitecturesQuery()
  const activeArchitectureId = useUIStore((state) => state.activeArchitectureId)
  const setActiveArchitectureId = useUIStore((state) => state.setActiveArchitectureId)
  const toggleInspector = useUIStore((state) => state.toggleInspector)
  const toggleBottomTray = useUIStore((state) => state.toggleBottomTray)

  return (
    <header className="topbar-panel">
      <div>
        <p className="eyebrow">Orchestrator control plane</p>
        <h1>UI Panel</h1>
      </div>

      <div className="topbar-controls">
        <label className="architecture-select">
          <Search size={16} />
          <select
            value={activeArchitectureId}
            onChange={(event) => setActiveArchitectureId(event.target.value)}
          >
            {!architectures.length ? <option value="">Sin datos</option> : null}
            {architectures.map((architecture) => (
              <option key={architecture.id} value={architecture.id}>
                {architecture.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>

        <button className="icon-button" type="button" onClick={toggleBottomTray}>
          <PanelsTopLeft size={16} />
          Tray
        </button>

        <button className="icon-button" type="button" onClick={toggleInspector}>
          <PanelRightOpen size={16} />
          Inspector
        </button>
      </div>
    </header>
  )
}