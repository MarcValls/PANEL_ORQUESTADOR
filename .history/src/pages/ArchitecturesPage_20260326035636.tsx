import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { useArchitecturesQuery } from '../lib/query/hooks'

export const ArchitecturesPage = () => {
  const navigate = useNavigate()
  const setActiveArchitectureId = useUIStore((s) => s.setActiveArchitectureId)
  const activeArchitectureId = useUIStore((s) => s.activeArchitectureId)
  const { data: architectures = [], isLoading } = useArchitecturesQuery()

  return (
    <div className="page">
      <div className="page-header">
        <h1>Arquitecturas</h1>
      </div>

      {isLoading ? (
        <div className="empty">Cargando...</div>
      ) : (
        <div className="arch-grid">
          {architectures.map((a) => (
            <div
              key={a.id}
              className={`arch-card ${activeArchitectureId === a.id ? 'is-active' : ''}`}
              onClick={() => {
                setActiveArchitectureId(a.id)
                navigate(`/architectures/${a.id}`)
              }}
            >
              <div className="arch-card-header">
                <h3>{a.name}</h3>
                <span className={`status status-${a.status.toLowerCase().replace(' ', '-')}`}>{a.status}</span>
              </div>
              <p>{a.summary}</p>
              <div className="arch-card-stats">
                <span><strong>{a.services}</strong> servicios</span>
                <span><strong>{a.pipelines}</strong> pipelines</span>
                <span><strong>{a.health}%</strong> salud</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}