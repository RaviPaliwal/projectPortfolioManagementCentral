import { useEffect, useState } from 'react'
import { fetchDashboardMetrics, fetchMyActiveProjects, projectPhaseLabel, ragLabel } from '../../services/dataverseService'
import type { ProjectModel } from '../../models/dataverse'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({ totalActiveProjects: 0, projectsInRed: 0, pipelineValue: 0 })
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showAllProjects, setShowAllProjects] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const [dashboard, activeProjects] = await Promise.all([fetchDashboardMetrics(), fetchMyActiveProjects()])
        if (!isMounted) return
        setMetrics(dashboard)
        setProjects(activeProjects.slice(0, 6))
      } catch (err) {
        if (!isMounted) return
        setError('Unable to load dashboard data.')
      } finally {
        if (!isMounted) return
        setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="pagePanel" style={{ width: '100%', maxWidth: 'none', padding: 0 }}>
      <div className="pageHeader" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 28, marginBottom: 6 }}>Project Portfolio Dashboard</h3>
        <p style={{ fontSize: 17 }}>High-level metrics, KPIs, and business insights for the PPM Central workspace.</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 32 }}>
        <article className="metricCard">
          <span className="metricLabel">Total Active Projects</span>
          <strong>{loading ? 'Loading…' : metrics.totalActiveProjects}</strong>
        </article>
        <article className="metricCard">
          <span className="metricLabel">Projects in Red</span>
          <strong>{loading ? 'Loading…' : metrics.projectsInRed}</strong>
        </article>
        <article className="metricCard">
          <span className="metricLabel">Total Pipeline Value</span>
          <strong>{loading ? 'Loading…' : currencyFormatter.format(metrics.pipelineValue)}</strong>
        </article>
        <article className="metricCard">
          <span className="metricLabel">Business Units</span>
          <strong>5</strong>
        </article>
      </div>

      {/* Insights Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32 }}>
        <section className="sectionCard" style={{ minHeight: 260 }}>
          <div className="sectionHeader">
            <div>
              <h4>My Active Projects</h4>
              <p>Projects currently in flight with basic status and delivery phase information.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="actionButton secondary" type="button" onClick={() => setShowNewProject(true)}>New Project</button>
              <button className="actionButton" type="button" onClick={() => setShowAllProjects(true)}>View All Projects</button>
            </div>
          </div>
          {loading ? (
            <div className="listPlaceholder">Loading project cards…</div>
          ) : (
            <div className="projectCardGrid">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <article key={project.pm_projectid} className="projectCard">
                    <div className="projectCardHeader">
                      <h5>{project.pm_projectname ?? 'Untitled project'}</h5>
                      <span className={`statusPill ${project.pm_ragstatus === '2' ? 'statusRed' : project.pm_ragstatus === '1' ? 'statusGreen' : 'statusAmber'}`}>
                        {ragLabel(project.pm_ragstatus)}
                      </span>
                    </div>
                    <p>{project.pm_projectcode ?? 'No code'}</p>
                    <div className="projectMetaRow">
                      <span>{projectPhaseLabel(project.pm_projectphase)}</span>
                      <span>{project.pm_programmename ?? project.pm_portfolioname ?? 'No parent assigned'}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="listPlaceholder">No active projects found.</div>
              )}
            </div>
          )}
        </section>
        <section className="sectionCard" style={{ minHeight: 260 }}>
          <div className="sectionHeader">
            <div>
              <h4>Business Insights</h4>
              <p>Static context and sample KPIs for demo purposes.</p>
            </div>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: 'var(--muted)', fontSize: 15 }}>
            <li>Avg. Project Duration: <strong style={{ color: 'var(--text)' }}>14 months</strong></li>
            <li>Avg. Budget Utilization: <strong style={{ color: 'var(--text)' }}>87%</strong></li>
            <li>Top Portfolio: <strong style={{ color: 'var(--text)' }}>Digital Transformation</strong></li>
            <li>Top Risk: <strong style={{ color: 'var(--text)' }}>Resource Constraints</strong></li>
          </ul>
        </section>
      </div>

      {/* Popups */}
      {showNewProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'grid', placeItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.13)', padding: 36, minWidth: 380, maxWidth: '90vw' }}>
            <h3 style={{ marginTop: 0 }}>New Project (Demo)</h3>
            <p>This is a placeholder popup for creating a new project. Integrate your form here.</p>
            <button className="actionButton secondary" style={{ marginTop: 18 }} onClick={() => setShowNewProject(false)}>Close</button>
          </div>
        </div>
      )}
      {showAllProjects && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'grid', placeItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.13)', padding: 36, minWidth: 600, maxWidth: '96vw', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>All Projects (Demo)</h3>
            <p>This is a placeholder popup for viewing all projects. Integrate your grid or table here.</p>
            <button className="actionButton secondary" style={{ marginTop: 18 }} onClick={() => setShowAllProjects(false)}>Close</button>
          </div>
        </div>
      )}
      {error ? <div className="alertBanner">{error}</div> : null}
    </div>
  )
}
