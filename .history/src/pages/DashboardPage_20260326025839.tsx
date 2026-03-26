import { useMemo } from 'react'
import { ArrowRight, Play, Workflow } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { useArchitecturesQuery, useRunsQuery } from '../lib/query/hooks'

export const DashboardPage = () => {
  const navigate = useNavigate()
  const setActiveArchitectureId = useUIStore((state) => state.setActiveArchitectureId)
  const openInspector = useUIStore((state) => state.openInspector)
  const setBottomTrayMode = useUIStore((state) => state.setBottomTrayMode)
  const activeArchitectureId = useUIStore((state) => state.activeArchitectureId)
  const { data: architectures = [] } = useArchitecturesQuery()
  const { data: runs = [] } = useRunsQuery()

  const activeArchitecture = architectures.find((architecture) => architecture.id === activeArchitectureId)

  const metrics = useMemo(
    () => [
      { label: 'Architectures', value: architectures.length },
      { label: 'Healthy', value: architectures.filter((architecture) => architecture.status === 'Healthy').length },
      { label: 'Running runs', value: runs.filter((run) => run.status === 'Running').length },
      { label: 'Warnings', value: architectures.filter((architecture) => architecture.status === 'At risk').length },
    ],
    [architectures, runs],
  )

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Start here</p>
          <h2>Controla arquitecturas, tasks, runs e inspección desde un solo panel.</h2>
          <p className="hero-copy">
            Esta base ya responde a navegación, estado global y paneles laterales. Usa el panel para orquestar sin saltar entre pantallas.
          </p>
        </div>

        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={() => navigate('/architectures')}>
            Open architectures
            <ArrowRight size={16} />
          </button>
          <button className="secondary-button" type="button" onClick={() => setBottomTrayMode('Logs')}>
            <Play size={16} />
            Open logs
          </button>
        </div>
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="content-grid two-col">
        <article className="panel-card">
          <div className="section-title">
            <Workflow size={18} />
            <h3>How to use</h3>
          </div>
          <ol className="guide-list">
            <li>Pick an architecture from the topbar or the Architectures page.</li>
            <li>Open the inspector to view summary, source and runtime details.</li>
            <li>Use the bottom tray for logs, queue, events, locks or alerts.</li>
            <li>Switch to Tasks and Runs when you need operational context.</li>
          </ol>
        </article>

        <article className="panel-card">
          <div className="section-title">
            <Workflow size={18} />
            <h3>Active architecture snapshot</h3>
          </div>
          {activeArchitecture ? (
            <div className="focus-banner">
              <div>
                <strong>{activeArchitecture.name}</strong>
                <span>{activeArchitecture.domain} · {activeArchitecture.environment}</span>
              </div>
              <button className="ghost-button" type="button" onClick={() => navigate(`/architectures/${activeArchitecture.id}`)}>
                Overview <ArrowRight size={16} />
              </button>
            </div>
          ) : null}
          <div className="architecture-pick-list">
            {architectures.map((architecture) => (
              <button
                key={architecture.id}
                type="button"
                className="architecture-pick"
                onClick={() => {
                  setActiveArchitectureId(architecture.id)
                  openInspector()
                  navigate(`/architectures/${architecture.id}`)
                }}
              >
                <div>
                  <strong>{architecture.name}</strong>
                  <span>{architecture.summary}</span>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}