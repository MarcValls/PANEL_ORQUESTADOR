import { SlidersHorizontal, PanelRightOpen, PanelsTopLeft, CircleHelp } from 'lucide-react'
import { useUIStore } from '../app/store/ui-store'

export const SettingsPage = () => {
  const activeArchitectureId = useUIStore((state) => state.activeArchitectureId)
  const inspectorOpen = useUIStore((state) => state.inspectorOpen)
  const bottomTrayOpen = useUIStore((state) => state.bottomTrayOpen)
  const bottomTrayMode = useUIStore((state) => state.bottomTrayMode)
  const toggleInspector = useUIStore((state) => state.toggleInspector)
  const toggleBottomTray = useUIStore((state) => state.toggleBottomTray)

  return (
    <div className="page-stack">
      <div className="section-title">
        <SlidersHorizontal size={18} />
        <h2>Settings</h2>
      </div>

      <section className="panel-card">
        <p>Este panel ya persiste el contexto del shell entre recargas del navegador.</p>
        <div className="hero-actions compact">
          <button className="secondary-button" type="button" onClick={toggleInspector}>
            <PanelRightOpen size={16} />
            Toggle inspector
          </button>
          <button className="secondary-button" type="button" onClick={toggleBottomTray}>
            <PanelsTopLeft size={16} />
            Toggle bottom tray
          </button>
        </div>
      </section>

      <section className="content-grid two-col">
        <article className="panel-card">
          <div className="section-title">
            <CircleHelp size={18} />
            <h3>Estado actual</h3>
          </div>
          <dl className="data-grid compact">
            <div>
              <dt>Active architecture</dt>
              <dd>{activeArchitectureId}</dd>
            </div>
            <div>
              <dt>Inspector</dt>
              <dd>{inspectorOpen ? 'Open' : 'Closed'}</dd>
            </div>
            <div>
              <dt>Bottom tray</dt>
              <dd>{bottomTrayOpen ? 'Open' : 'Closed'}</dd>
            </div>
            <div>
              <dt>Tray mode</dt>
              <dd>{bottomTrayMode}</dd>
            </div>
          </dl>
        </article>

        <article className="panel-card">
          <div className="section-title">
            <CircleHelp size={18} />
            <h3>Cómo usar el panel</h3>
          </div>
          <ol className="guide-list">
            <li>Selecciona una arquitectura desde la topbar.</li>
            <li>Entra a Architectures para ver su overview operativo.</li>
            <li>Usa Tasks para revisar backlog filtrado por contexto.</li>
            <li>Usa Runs para seguir ejecuciones del contexto activo o global.</li>
          </ol>
        </article>
      </section>
    </div>
  )
}