import { useState, type ReactNode } from 'react'
import './App.css'
import PrimaryShell, { type TabKey } from './components/layout/PrimaryShell'
import DashboardPage from './components/pages/DashboardPage'
import PortfoliosPage from './components/pages/PortfoliosPage'
import ProgrammesPage from './components/pages/ProgrammesPage'
import ProjectsPage from './components/pages/ProjectsPage'
import PipelinePage from './components/pages/PipelinePage'

const pageMap: Record<TabKey, ReactNode> = {
  dashboard: <DashboardPage />,
  portfolios: <PortfoliosPage />,
  programmes: <ProgrammesPage />,
  projects: <ProjectsPage />,
  pipeline: <PipelinePage />,
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')

  return (
    <div className="appShell">
      <PrimaryShell activeTab={activeTab} onChangeTab={setActiveTab}>
        {pageMap[activeTab]}
      </PrimaryShell>
    </div>
  )
}

export default App
