import { ArrowRight, Activity, ShieldAlert, Workflow } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useUIStore } from '../app/store/ui-store'
import { useArchitectureQuery, useRunsQuery, useTasksQuery } from '../lib/query/hooks'

export const ArchitectureOverviewPage = () => {
  const { architectureId = '' } = useParams()
  const setActiveArchitectureId = useUIStore((state) => state.setActiveArchitectureId)
  const openInspector = useUIStore((state) => state.openInspector)
  const { data: architecture, isLoading } = useArchitectureQuery(architectureId)
  const { data: tasks = [] } = useTasksQuery(architectureId)
  const { data: runs = [] } = useRunsQuery()

  if (!isLoading && !architecture) {
    return <Navigate to="/architectures" replace />
  }

  if (!architecture) {
    return <div className="empty-state">Loading architecture overview...</div>
  }

  const relatedRuns = runs.filter((run) => run.architectureId === architecture.id).slice(0, 3)
  const relatedTasks = tasks.slice(0, 4)

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Architecture overview</p>
          <h2>{architecture.name}</h2>
          <p className="hero-copy">{architecture.summary}</p>
        </div>

        <div className="hero-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setActiveArchitectureId(architecture.id)
              openInspector()
            }}
          >
            Open in inspector
            <ArrowRight size={16} />
          </button>
          <Link className="secondary-button" to="/tasks">
            Go to tasks
          </Link>
        </div>
      </section>

      <section className="metric-grid overview-metrics">
        <article className="metric-card">
          <span>Health</span>
          <strong>{architecture.health}%</strong>
        </article>
        <article className="metric-card">
          <span>Approvals</span>
          <strong>{architecture.approvals}</strong>
        </article>
        <article className="metric-card">
          <span>Risks</span>
          <strong>{architecture.risks}</strong>
        </article>
        <article className="metric-card">
          <span>Updated</span>
          <strong>{architecture.updatedAt}</strong>
        </article>
      </section>

      <section className="content-grid two-col">
        <article className="panel-card">
          <div className="section-title">
            <Workflow size={18} />
            <h3>Current workload</h3>
          </div>
          <div className="stack-list">
            {relatedTasks.map((task) => (
              <div key={task.id} className="stack-item">
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.domain} · {task.assignee}</span>
                </div>
                <span className={`chip chip-${task.risk.toLowerCase()}`}>{task.risk}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-title">
            <Activity size={18} />
            <h3>Latest runs</h3>
          </div>
          <div className="stack-list">
            {relatedRuns.map((run) => (
              <div key={run.id} className="stack-item">
                <div>
                  <strong>{run.title}</strong>
                  <span>{run.node} · {run.initiatedBy}</span>
                </div>
                <span className={`chip chip-${run.status.toLowerCase()}`}>{run.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid two-col">
        <article className="panel-card">
          <div className="section-title">
            <ShieldAlert size={18} />
            <h3>Operational context</h3>
          </div>
          <dl className="data-grid compact">
            <div>
              <dt>Owner</dt>
              <dd>{architecture.owner}</dd>
            </div>
            <div>
              <dt>Domain</dt>
              <dd>{architecture.domain}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>{architecture.environment}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{architecture.status}</dd>
            </div>
          </dl>
        </article>

        <article className="panel-card">
          <div className="section-title">
            <Workflow size={18} />
            <h3>Next actions</h3>
          </div>
          <div className="stack-actions">
            <Link className="ghost-button full-width" to="/tasks">Review task queue</Link>
            <Link className="ghost-button full-width" to="/runs">Inspect execution history</Link>
            <Link className="ghost-button full-width" to="/settings">Adjust shell behavior</Link>
          </div>
        </article>
      </section>
    </div>
  )
}