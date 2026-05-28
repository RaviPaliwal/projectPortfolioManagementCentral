import { useEffect, useState } from 'react'
import {
  fetchDashboardMetrics,
  fetchMyActiveProjects,
  fetchPortfolioHierarchy,
  fetchPendingApprovalRequests,
  updateInitiativeStatus,
  projectPhaseLabel,
} from '../../services/dataverseService'
import KpiCard from '../../components/KpiCard'
import type { InitiativeModel, PortfolioModel, ProgrammeModel, ProjectModel } from '../../models/dataverse'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const RAG_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  '2': { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444', label: 'Red' },
  '1': { bg: '#F0FDF4', text: '#166534', dot: '#22C55E', label: 'Green' },
  '0': { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B', label: 'Amber' },
}

function RagPill({ status }: { status: string | undefined }) {
  const cfg = RAG_CONFIG[status ?? '0'] ?? RAG_CONFIG['0']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.text,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      padding: '3px 9px', borderRadius: 20,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    totalActiveProjects: 0,
    totalActivePortfolios: 0,
    totalApprovedBudget: 0,
    totalActualSpend: 0,
    projectsInRed: 0,
    projectsInAmber: 0,
    pipelineValue: 0,
  })
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [approvals, setApprovals] = useState<InitiativeModel[]>([])
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioModel[]>([])
  const [programmeSnapshot, setProgrammeSnapshot] = useState<ProgrammeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const sortByRag = <T extends { pm_ragstatus?: string | number }>(a: T, b: T) => {
    const rank = (status?: string | number) => (status === '2' || status === 2 ? 0 : status === '0' || status === 0 ? 1 : 2)
    return rank(a.pm_ragstatus) - rank(b.pm_ragstatus)
  }

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const [dashboard, activeProjects, pendingApprovals, hierarchy] = await Promise.all([
          fetchDashboardMetrics(),
          fetchMyActiveProjects(),
          fetchPendingApprovalRequests(),
          fetchPortfolioHierarchy(),
        ])
        if (!isMounted) return
        setMetrics(dashboard)
        setProjects(activeProjects.slice(0, 6))
        setApprovals(pendingApprovals)
        setPortfolioSnapshot(hierarchy.portfolios.slice().sort(sortByRag).slice(0, 4))
        setProgrammeSnapshot(hierarchy.programmes.slice().sort(sortByRag).slice(0, 4))
      } catch {
        if (!isMounted) return
        setError('Unable to load dashboard data.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const handleRequestAction = async (initiativeId: string, status: number) => {
    setActionLoading(true)
    try {
      await updateInitiativeStatus(initiativeId, status)
      setApprovals((current) => current.filter((item) => item.pm_initiativeid !== initiativeId))
    } catch {
      setError('Unable to update approval request.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
      <div className="page-root">
        {/* Header */}
        <header className="page-intro">
          <p className="page-eyebrow">PPM Central · Executive Dashboard</p>
          <h1 className="page-title">Executive Portfolio Dashboard</h1>
          <p className="page-subtitle">Top-line portfolio KPIs, budget health, and pending approvals in one executive view.</p>
        </header>

        {/* KPI Row */}
        
          <div className="kpi-grid">
                <KpiCard title="Active Portfolios" value={metrics.totalActivePortfolios} accent="blue" />
                <KpiCard title="Approved Budget" value={currencyFormatter.format(metrics.totalApprovedBudget)} accent="teal" />
                <KpiCard title="Actual Spend" value={currencyFormatter.format(metrics.totalActualSpend)} accent="amber" />
                <KpiCard title="Red / Amber Projects" value={metrics.projectsInRed + metrics.projectsInAmber} accent="amber" />
                <div />
        </div>

        {/* Main content */}
        <div className="main-grid">

          {/* Projects card */}
          <section className="section-card">
            <div className="section-header">
              <div>
                <h2 className="section-title">My Active Projects</h2>
                <p className="section-desc">Projects currently in-flight with live status and delivery phase.</p>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" type="button" onClick={() => setShowAllProjects(true)}>
                  View all projects
                </button>
              </div>
            </div>

            {loading ? (
              <div className="project-grid-loading">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="project-card-loading">
                    <div className="skeleton skeleton-line skeleton-line--label" />
                    <div className="skeleton skeleton-line skeleton-line--short" />
                    <div className="skeleton skeleton-line" />
                  </div>
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="project-grid">
                {projects.map((project) => (
                  <article key={project.pm_projectid} className="project-card">
                    <div className="project-card-top">
                      <h3 className="project-name">{project.pm_projectname ?? 'Untitled project'}</h3>
                      <RagPill status={project.pm_ragstatus?.toString()} />
                    </div>
                    <p className="project-code">{project.pm_projectcode ?? '—'}</p>
                    <div className="project-meta">
                      <span className="project-phase">{projectPhaseLabel(project.pm_projectphase)}</span>
                      <span className="project-parent">
                        {project.pm_programmename ?? project.pm_portfolioname ?? 'No parent'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No active projects found.</div>
            )}
          </section>

          <div className="stacked-column">
            <section className="section-card">
              <div className="section-header">
                <div>
                  <h2 className="section-title">My Action Center</h2>
                  <p className="section-desc">Pending approvals assigned for executive review.</p>
                </div>
              </div>

              {loading ? (
                <div className="empty-state">Loading approval requests…</div>
              ) : approvals.length > 0 ? (
                <div className="action-list">
                  {approvals.map((request) => (
                    <article key={request.pm_initiativeid} className="request-card">
                      <div>
                        <h3>{request.pm_name ?? 'Approval request'}</h3>
                        <p className="request-meta">
                          {request.pm_portfolioname ?? 'Portfolio not set'} · {request.pm_requestorname ?? 'Unknown requestor'}
                        </p>
                        <p className="request-copy">{request.pm_businesscase ?? 'No business case provided.'}</p>
                        {request.pm_submissiondate ? <p className="request-meta">Submitted {new Date(request.pm_submissiondate).toLocaleDateString()}</p> : null}
                      </div>
                      <div className="request-actions">
                        <button
                          className="btn btn-primary"
                          disabled={actionLoading}
                          type="button"
                          onClick={() => handleRequestAction(request.pm_initiativeid!, 0)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-secondary"
                          disabled={actionLoading}
                          type="button"
                          onClick={() => handleRequestAction(request.pm_initiativeid!, 3)}
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No pending approvals found.</div>
              )}
            </section>

            <section className="section-card">
              <div className="section-header">
                <div>
                  <h2 className="section-title">RAG Snapshot</h2>
                  <p className="section-desc">Current portfolio and programme health at a glance.</p>
                </div>
              </div>

              <div className="snapshot-body">
                <div className="snapshot-section">
                  <h3 className="snapshot-heading">Portfolios</h3>
                  {portfolioSnapshot.length > 0 ? (
                    portfolioSnapshot.map((portfolio) => (
                      <div key={portfolio.pm_portfolioid} className="snapshot-item">
                        <div>
                          <strong>{portfolio.pm_portfolioname ?? 'Unnamed portfolio'}</strong>
                          <p className="request-meta">Budget {currencyFormatter.format(portfolio.pm_approvedbudgeteur ?? 0)}</p>
                        </div>
                        <RagPill status={portfolio.pm_ragstatus?.toString()} />
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No portfolio snapshot available.</div>
                  )}
                </div>

                <div className="snapshot-section">
                  <h3 className="snapshot-heading">Programmes</h3>
                  {programmeSnapshot.length > 0 ? (
                    programmeSnapshot.map((programme) => (
                      <div key={programme.pm_programmeid} className="snapshot-item">
                        <div>
                          <strong>{programme.pm_programmename ?? 'Unnamed programme'}</strong>
                          <p className="request-meta">{programme.pm_portfolioname ?? 'No portfolio'}</p>
                        </div>
                        <RagPill status={programme.pm_ragstatus?.toString()} />
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No programme snapshot available.</div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Error */}
        {error && <div className="error-banner">⚠ {error}</div>}

        {showAllProjects && (
          <div className="modal-backdrop" onClick={() => setShowAllProjects(false)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">All Active Projects</h3>
              <p className="modal-desc">Live project list powered by the portfolio model.</p>
              {loading ? (
                <div className="empty-state">Loading full project list…</div>
              ) : projects.length > 0 ? (
                <div className="project-grid" style={{ gap: 12, marginTop: 12 }}>
                  {projects.map((project) => (
                    <article key={project.pm_projectid} className="project-card">
                      <div className="project-card-top">
                        <h3 className="project-name">{project.pm_projectname ?? 'Untitled project'}</h3>
                        <RagPill status={project.pm_ragstatus?.toString()} />
                      </div>
                      <p className="project-code">{project.pm_projectcode ?? '—'}</p>
                      <div className="project-meta">
                        <span className="project-phase">{projectPhaseLabel(project.pm_projectphase)}</span>
                        <span className="project-parent">
                          {project.pm_programmename ?? project.pm_portfolioname ?? 'No parent'}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No active projects found.</div>
              )}
              <button className="btn btn-secondary" onClick={() => setShowAllProjects(false)}>
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    )
}
