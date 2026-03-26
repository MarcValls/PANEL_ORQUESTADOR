import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <div className="page">
    <div className="empty">
      <p><strong>404</strong> — Esta ruta no existe.</p>
      <Link className="btn" to="/dashboard" style={{ marginTop: '12px', display: 'inline-flex' }}>
        Volver al inicio
      </Link>
    </div>
  </div>
)