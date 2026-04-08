import { useUIStore } from '../app/store/ui-store'

export const SettingsPage = () => {
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const inspectorOpen = useUIStore((s) => s.inspectorOpen)
  const toggleInspector = useUIStore((s) => s.toggleInspector)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Ajustes</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Estado del panel</span>
          <button className="btn" type="button" onClick={toggleInspector}>
            {inspectorOpen ? 'Cerrar' : 'Abrir'} inspector
          </button>
        </div>
        <dl className="data-pairs">
          <div className="data-pair">
            <dt>Arquitectura activa</dt>
            <dd>{activeArchitectureId}</dd>
          </div>
          <div className="data-pair">
            <dt>Inspector</dt>
            <dd>{inspectorOpen ? 'Abierto' : 'Cerrado'}</dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Fuentes de datos</span>
        </div>
        <dl className="data-pairs">
          <div className="data-pair">
            <dt>Arquitecturas</dt>
            <dd>Snapshot local — <code className="mono">public/data/orchestrator-panel.json</code></dd>
          </div>
          <div className="data-pair">
            <dt>Tareas</dt>
            <dd>Snapshot local — <code className="mono">public/data/orchestrator-panel.json</code></dd>
          </div>
          <div className="data-pair">
            <dt>Ejecuciones</dt>
            <dd>Snapshot local + runtime en memoria (Zustand)</dd>
          </div>
          <div className="data-pair">
            <dt>Actividad</dt>
            <dd>Snapshot local + eventos runtime (event-store)</dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Cómo usar este panel</span>
        </div>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Selecciona una arquitectura en la barra superior.</li>
          <li>Navega a Arquitecturas para ver cada una en detalle.</li>
          <li>Usa Tareas para ver el backlog filtrado.</li>
          <li>Revisa Ejecuciones para ver el historial, incluyendo runs creados desde el runtime.</li>
          <li>Para datos estáticos (arquitecturas y tareas), edita <code className="mono">public/data/orchestrator-panel.json</code>.</li>
          <li>Los runs nuevos y la actividad reciente se generan desde el runtime interno y no requieren editar el JSON.</li>
        </ol>
      </div>
    </div>
  )
}