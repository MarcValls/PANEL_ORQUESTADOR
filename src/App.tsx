import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { MainLayout } from './components/layout/MainLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ArchitecturesPage } from './pages/ArchitecturesPage'
import { ArchitectureOverviewPage } from './pages/ArchitectureOverviewPage'
import { TasksPage } from './pages/TasksPage'
import { RunsPage } from './pages/RunsPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <AppProviders>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="architectures" element={<ArchitecturesPage />} />
          <Route path="architectures/:architectureId" element={<ArchitectureOverviewPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppProviders>
  )
}

export default App
