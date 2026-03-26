import { Copy, PanelRightClose } from 'lucide-react'
import { useUIStore } from '../../app/store/ui-store'
import { useArchitecturesQuery } from '../../lib/query/hooks'

export const InspectorDock = () => {
  const { data: architectures = [] } = useArchitecturesQuery()
  const open = useUIStore((state) => state.inspectorOpen)
  const activeArchitectureId = useUIStore((state) => state.activeArchitectureId)
  const inspectorTab = useUIStore((state) => state.inspectorTab)
  const setInspectorTab = useUIStore((state) => state.setInspectorTab)
  const closeInspector = useUIStore((state) => state.closeInspector)

  const selectedArchitecture = architectures.find((architecture) => architecture.id === activeArchitectureId) ?? architectures[0]

  if (!selectedArchitecture) {
    return (
      <aside className={`inspector-dock ${open ? 'is-open' : 'is-collapsed'}`}>
        <div className="empty-state compact">
          <strong>Inspector</strong>
          <p>No hay arquitectura cargada desde el JSON local.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className={`inspector-dock ${open ? 'is-open' : 'is-collapsed'}`}>
      <div className="inspector-header">
        <div>
          <p className="eyebrow">Inspector</p>
          <strong>{selectedArchitecture.name}</strong>
        </div>
        <button className="icon-button icon-button-ghost" type="button" onClick={closeInspector}>
          <PanelRightClose size={16} />
        </button>
      </div>

      <div className="tabs-row">
        {['Summary', 'Source', 'Contract', 'Runtime', 'Raw'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-button ${inspectorTab === tab ? 'is-active' : ''}`}
            onClick={() => setInspectorTab(tab as typeof inspectorTab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="inspector-content">
        {inspectorTab === 'Summary' && (
          <>
            <p>{selectedArchitecture.summary}</p>
            <dl className="data-grid">
              <div>
                <dt>Environment</dt>
                <dd>{selectedArchitecture.environment}</dd>
              </div>
              <div>
                <dt>Health</dt>
                <dd>{selectedArchitecture.health}%</dd>
              </div>
              <div>
                <dt>Services</dt>
                <dd>{selectedArchitecture.services}</dd>
              </div>
              <div>
                <dt>Pipelines</dt>
                <dd>{selectedArchitecture.pipelines}</dd>
              </div>
            </dl>
          </>
        )}

        {inspectorTab === 'Source' && (
          <div className="source-card">
            <div className="source-row">
              <span>Architecture ref</span>
              <button className="icon-button icon-button-ghost" type="button">
                <Copy size={14} />
                Copy
              </button>
            </div>
            <code>{selectedArchitecture.id}</code>
          </div>
        )}

        {inspectorTab === 'Contract' && (
          <div className="empty-state compact">
            <strong>Contract preview</strong>
            <p>Los contratos se muestran aquí cuando la entidad tenga esquema formal.</p>
          </div>
        )}

        {inspectorTab === 'Runtime' && (
          <div className="runtime-list">
            <div>Latest deployment: 12 min ago</div>
            <div>Current owner: {selectedArchitecture.owner}</div>
            <div>Pending approvals: {selectedArchitecture.approvals}</div>
          </div>
        )}

        {inspectorTab === 'Raw' && <pre>{JSON.stringify(selectedArchitecture, null, 2)}</pre>}
      </div>
    </aside>
  )
}