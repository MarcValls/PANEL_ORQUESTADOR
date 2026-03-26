import { Outlet } from 'react-router-dom'
import { Topbar } from './Topbar'
import { InspectorDrawer } from './InspectorDrawer'

export const MainLayout = () => (
  <div className="app-shell">
    <Topbar />
    <main className="app-main">
      <Outlet />
    </main>
    <InspectorDrawer />
  </div>
)