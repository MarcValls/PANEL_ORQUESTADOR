import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { MainLayout } from './components/layout/MainLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ArchitecturesPage } from './pages/ArchitecturesPage'
import { ArchitectureOverviewPage } from './pages/ArchitectureOverviewPage'
import { TasksPage } from './pages/TasksPage'
import { RunsPage } from './pages/RunsPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { useUIStore } from './app/store/ui-store'
import { useTerminalWorkspaceQuery } from './lib/query/terminal-agent-hooks'

const RequireWorkspace = () => {
  const location = useLocation()
  const activeWorkspacePath = useUIStore((s) => s.activeWorkspacePath)
  const {
    data: workspaceInfo,
    isLoading: isWorkspaceLoading,
    error: workspaceError,
  } = useTerminalWorkspaceQuery()
  if (!activeWorkspacePath) {
    return <Navigate to="/workspace" replace state={{ from: location.pathname }} />
  }
  if (isWorkspaceLoading) {
    return <div style={{ padding: '24px' }}>Validando carpeta de trabajo...</div>
  }
  if (workspaceError) {
    return <Navigate to="/workspace" replace state={{ from: location.pathname }} />
  }
  if (workspaceInfo && !workspaceInfo.hasPackageJson) {
    return <Navigate to="/workspace" replace state={{ from: location.pathname }} />
  }
  return <MainLayout />
}

function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="workspace" element={<WorkspacePage />} />
        <Route element={<RequireWorkspace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="architectures" element={<ArchitecturesPage />} />
          <Route path="architectures/:architectureId" element={<ArchitectureOverviewPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </AppProviders>
  )
}

export default App
