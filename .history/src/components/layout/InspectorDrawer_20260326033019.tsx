import { X } from 'lucide-react'
import { useUIStore } from '../../app/store/ui-store'
import { useArchitecturesQuery } from '../../lib/query/hooks'

const tabs = ['Resumen', 'Datos', 'JSON'] as const

export const InspectorDrawer = () => {
  const { data: architectures = [] } = useArchitecturesQuery()
  const open = useUIStore((s) => s.inspectorOpen)
  const activeId = useUIStore((s) => s.activeArchitectureId)
  const tab = useUIStore((s) => s.inspectorTab)
  const setTab = useUIStore((s) => s.setInspectorTab)
  const close = useUIStore((s) => s.closeInspector)

  const arch = architectures.find((a) => a.id === activeId) ?? architectures[0]

  if (!open) return null

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer">
        <div className="drawer-header">
          <strong>{arch?.name ?? 'Sin datos'}</strong>
          <button className="icon-btn" type="button" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              className={`drawer-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {!arch ? (
            <p className="text-muted">No hay arquitectura cargada.</p>
          ) : tab === 'Resumen' ? (
            <>
              <p>{arch.summary}</p>
              <dl className="data-pairs">
                <div className="data-pair">
                  <dt>Entorno</dt>
                  <dd>{arch.environment}</dd>
                </div>
                <div className="data-pair">
                  <dt>Salud</dt>
                  <dd>{arch.health}%</dd>
                </div>
                <div className="data-pair">
                  <dt>Servicios</dt>
                  <dd>{arch.services}</dd>
                </div>
                <div className="data-pair">
                  <dt>Pipelines</dt>
                  <dd>{arch.pipelines}</dd>
                </div>
                <div className="data-pair">
                  <dt>Propietario</dt>
                  <dd>{arch.owner}</dd>
                </div>
                <div className="data-pair">
                  <dt>Aprobaciones</dt>
                  <dd>{arch.approvals}</dd>
                </div>
              </dl>
            </>
          ) : tab === 'Datos' ? (
            <dl className="data-pairs">
              <div className="data-pair">
                <dt>ID</dt>
                <dd className="mono">{arch.id}</dd>
              </div>
              <div className="data-pair">
                <dt>Dominio</dt>
                <dd>{arch.domain}</dd>
              </div>
              <div className="data-pair">
                <dt>Estado</dt>
                <dd>{arch.status}</dd>
              </div>
              <div className="data-pair">
                <dt>Riesgos</dt>
                <dd>{arch.risks}</dd>
              </div>
              <div className="data-pair">
                <dt>Tareas</dt>
                <dd>{arch.tasks}</dd>
              </div>
              <div className="data-pair">
                <dt>Actualizado</dt>
                <dd>{arch.updatedAt}</dd>
              </div>
            </dl>
          ) : (
            <pre className="mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(arch, null, 2)}
            </pre>
          )}
        </div>
      </aside>
    </>
  )
}
