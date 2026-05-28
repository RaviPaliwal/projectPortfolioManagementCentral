import { useEffect, useMemo, useState } from 'react'
import { fetchPortfolioHierarchy, programmePhaseLabel, projectPhaseLabel, ragLabel } from '../../services/dataverseService'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '../../models/dataverse'

export default function PortfoliosPage() {
  const [hierarchy, setHierarchy] = useState<{ portfolios: PortfolioModel[]; programmes: ProgrammeModel[]; projects: ProjectModel[] }>({ portfolios: [], programmes: [], projects: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const data = await fetchPortfolioHierarchy()
        if (isMounted) setHierarchy(data)
      } catch (err) {
        if (isMounted) setError('Unable to load portfolio hierarchy.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const programmesByPortfolio = useMemo(() => {
    return hierarchy.programmes.reduce<Record<string, ProgrammeModel[]>>((acc, programme) => {
      const key = programme._pm_portfolio_value ?? 'orphan'
      acc[key] = acc[key] ?? []
      acc[key].push(programme)
      return acc
    }, {})
  }, [hierarchy.programmes])

  const projectsByProgramme = useMemo(() => {
    return hierarchy.projects.reduce<Record<string, ProjectModel[]>>((acc, project) => {
      const key = project._pm_programme_value ?? 'orphan'
      acc[key] = acc[key] ?? []
      acc[key].push(project)
      return acc
    }, {})
  }, [hierarchy.projects])

  return (
    <div className="page-root pagePanel">
      <div className="pageHeader">
        <h3>Portfolio hierarchy</h3>
        <p>Browse portfolios and the programmes / projects that belong to them.</p>
      </div>

      {error ? <div className="alertBanner">{error}</div> : null}

      {loading ? (
        <div className="listPlaceholder">Loading hierarchical data…</div>
      ) : (
        <div className="hierarchyGrid">
          {hierarchy.portfolios.map((portfolio) => (
            <article key={portfolio.pm_portfolioid} className="hierarchyCard">
              <div className="hierarchyHeader">
                <div>
                  <h4>{portfolio.pm_portfolioname ?? 'Unnamed portfolio'}</h4>
                  <span>{portfolio.pm_startdate ?? 'No start date'} → {portfolio.pm_enddate ?? 'No end date'}</span>
                </div>
                <span className={`statusPill ${portfolio.pm_ragstatus === '2' ? 'statusRed' : portfolio.pm_ragstatus === '1' ? 'statusGreen' : 'statusAmber'}`}>
                  {ragLabel(portfolio.pm_ragstatus)}
                </span>
              </div>
              <div className="hierarchyBody">
                {(programmesByPortfolio[portfolio.pm_portfolioid ?? ''] ?? []).map((programme) => (
                  <div key={programme.pm_programmeid} className="hierarchySegment">
                    <div className="hierarchySegmentHeader">
                      <strong>{programme.pm_programmename ?? 'Untitled programme'}</strong>
                      <span>{programmePhaseLabel(programme.pm_programmephase)}</span>
                    </div>
                    {(projectsByProgramme[programme.pm_programmeid ?? ''] ?? []).map((project) => (
                      <div key={project.pm_projectid} className="hierarchyItem">
                        <span>{project.pm_projectname}</span>
                        <span>{projectPhaseLabel(project.pm_projectphase)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
