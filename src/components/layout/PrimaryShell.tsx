import type { ReactNode } from 'react'

export type TabKey = 'dashboard' | 'portfolios' | 'programmes' | 'projects' | 'pipeline'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'portfolios', label: 'Portfolios' },
  { key: 'programmes', label: 'Programmes' },
  { key: 'projects', label: 'Projects' },
  { key: 'pipeline', label: 'Pipeline' },
]

interface PrimaryShellProps {
  activeTab: TabKey
  onChangeTab: (tab: TabKey) => void
  children: ReactNode
}

export default function PrimaryShell({ activeTab, onChangeTab, children }: PrimaryShellProps) {
  return (
    <div className="primaryShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandLogo">📈</div>
          <div>
            <h1>PPM Central</h1>
            <span>Executive portfolio hub</span>
          </div>
        </div>

        <nav className="navMenu" role="navigation" aria-label="Primary navigation">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`navButton ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => onChangeTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="contentArea">
        <header className="topBar">
          <div>
            <h2>{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
            <p>Enterprise PPM UX connecting directly to Dataverse.</p>
          </div>
        </header>

        <section className="pageContainer">{children}</section>
      </main>
    </div>
  )
}
