import { ArrowRight, Gauge, Layers3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { useArchitecturesQuery } from '../lib/query/hooks'

export const ArchitecturesPage = () => {
  const navigate = useNavigate()
  const setActiveArchitectureId = useUIStore((state) => state.setActiveArchitectureId)
  const openInspector = useUIStore((state) => state.openInspector)
  const activeArchitectureId = useUIStore((state) => state.activeArchitectureId)
  const { data: architectures = [], isLoading } = useArchitecturesQuery()

  return (
    <div className="page-stack">
      <div className="section-title">
        <Layers3 size={18} />
        <h2>Architectures</h2>
      </div>

      {isLoading ? (
        <div className="empty-state">Loading architectures...</div>
      ) : (
        <section className="card-grid">
          {architectures.map((architecture) => (
            <article key={architecture.id} className={`panel-card architecture-card ${activeArchitectureId === architecture.id ? 'is-focused' : ''}`}>
              <div className="card-header-row">
                <div>
                  <p className="eyebrow">{architecture.environment}</p>
                  <h3>{architecture.name}</h3>
                </div>
                <span className={`chip chip-${architecture.status.toLowerCase().replace(' ', '-')}`}>
                  {architecture.status}
                </span>
              </div>

              <p>{architecture.summary}</p>

              <div className="inline-meta">
                <span>Owner: {architecture.owner}</span>
                <span>Domain: {architecture.domain}</span>
                <span>Updated: {architecture.updatedAt}</span>
              </div>

              <dl className="data-grid compact">
                <div>
                  <dt>Services</dt>
                  <dd>{architecture.services}</dd>
                </div>
                <div>
                  <dt>Pipelines</dt>
                  <dd>{architecture.pipelines}</dd>
                </div>
                <div>
                  <dt>Tasks</dt>
                  <dd>{architecture.tasks}</dd>
                </div>
                <div>
                  <dt>Health</dt>
                  <dd>{architecture.health}%</dd>
                </div>
              </dl>

              <div className="card-footer-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setActiveArchitectureId(architecture.id)
                    openInspector()
                  }}
                >
                  <Gauge size={16} />
                  Inspect
                </button>
                <button className="ghost-button" type="button" onClick={() => {
                  setActiveArchitectureId(architecture.id)
                  navigate(`/architectures/${architecture.id}`)
                }}>
                  Open overview <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}