import { useEffect, useMemo, useState } from 'react'
import { fetchPortfolioHierarchy, programmePhaseLabel, ragLabel } from '../../services/dataverseService'
import type { ProgrammeModel } from '../../models/dataverse'

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<ProgrammeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const hierarchy = await fetchPortfolioHierarchy()
        if (isMounted) setProgrammes(hierarchy.programmes)
      } catch (err) {
        if (isMounted) setError('Unable to load programmes.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const programmeGroups = useMemo(() => {
    return programmes.reduce<Record<string, ProgrammeModel[]>>((acc, programme) => {
      const key = programme.pm_portfolioname ?? 'No portfolio'
      acc[key] = acc[key] ?? []
      acc[key].push(programme)
      return acc
    }, {})
  }, [programmes])

  return (
    <div className="pagePanel">
      <div className="pageHeader">
        <h3>Programmes</h3>
        <p>Programme-level view, grouped by portfolio and annotated with phase / RAG status.</p>
      </div>

      {error ? <div className="alertBanner">{error}</div> : null}

      {loading ? (
        <div className="listPlaceholder">Loading programmes…</div>
      ) : (
        <div className="programmeGrid">
          {Object.entries(programmeGroups).map(([portfolioName, programmesInPortfolio]) => (
            <section key={portfolioName} className="programmeGroup">
              <h4>{portfolioName}</h4>
              <div className="programmeList">
                {programmesInPortfolio.map((programme) => (
                  <article key={programme.pm_programmeid} className="programmeCard">
                    <div className="programmeCardHeader">
                      <h5>{programme.pm_programmename}</h5>
                      <span className={`statusPill ${programme.pm_ragstatus === '2' ? 'statusRed' : programme.pm_ragstatus === '1' ? 'statusGreen' : 'statusAmber'}`}>
                        {ragLabel(programme.pm_ragstatus)}
                      </span>
                    </div>
                    <div className="programmeMeta">
                      <span>{programmePhaseLabel(programme.pm_programmephase)}</span>
                      <span>{programme.pm_startdate ?? 'No start date'}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
