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
          <div className="data-pair">
            <dt>Fuente de datos</dt>
            <dd className="mono">public/data/orchestrator-panel.json</dd>
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
          <li>Revisa Ejecuciones para ver el historial.</li>
          <li>Edita <code className="mono">public/data/orchestrator-panel.json</code> para cambiar los datos.</li>
        </ol>
      </div>
    </div>
  )
}