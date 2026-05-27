import { useEffect, useState } from 'react'
import { fetchDashboardMetrics, fetchMyActiveProjects, projectPhaseLabel, ragLabel } from '../../services/dataverseService'
import type { ProjectModel } from '../../models/dataverse'

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({ totalActiveProjects: 0, projectsInRed: 0, pipelineValue: 0 })
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="pagePanel">
      <div className="pageHeader">
        <h3>Project Portfolio Dashboard</h3>
        <p>High-level metrics and my active project summary for the PPM Central workspace.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="actionButton secondary" type="button">New Project</button>
        <button className="actionButton" type="button">View All Projects</button>
      </div>

      {error ? (
        <div className="alertBanner">{error}</div>
      ) : null}

      <div className="dashboardGrid">
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
      </div>

      <section className="sectionCard">
        <div className="sectionHeader">
          <div>
            <h4>My Active Projects</h4>
            <p>Projects currently in flight with basic status and delivery phase information.</p>
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
    </div>
  )
}
