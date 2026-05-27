import { useEffect, useState } from 'react'
import { createInitiative, fetchInitiatives } from '../../services/dataverseService'
import type { InitiativeModel } from '../../models/dataverse'

export default function PipelinePage() {
  const [initiatives, setInitiatives] = useState<InitiativeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newInitiative, setNewInitiative] = useState<Partial<InitiativeModel>>({ pm_name: '', pm_businesscase: '', pm_estimatedcost: 0 })

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const list = await fetchInitiatives()
        if (isMounted) setInitiatives(list)
      } catch (err) {
        if (isMounted) setError('Unable to load pipeline.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleCreate = async () => {
    setError(null)
    if (!newInitiative.pm_name) {
      setError('Initiative name is required.')
      return
    }
    try {
      await createInitiative({
        pm_initiativename: newInitiative.pm_name,
        pm_businesscasedescription: newInitiative.pm_businesscase,
        pm_estimatedcosteur: newInitiative.pm_estimatedcost,
      } as any)
      setNewInitiative({ pm_name: '', pm_businesscase: '', pm_estimatedcost: 0 })
      setInitiatives(await fetchInitiatives())
    } catch (err) {
      setError('Unable to create initiative.')
    }
  }

  return (
    <div className="pagePanel">
      <div className="pageHeader">
        <h3>Pipeline</h3>
        <p>Pre-project initiative pipeline with business case and estimated investment.</p>
      </div>

      {error ? <div className="alertBanner">{error}</div> : null}

      <section className="sectionCard">
        <div className="sectionHeader">
          <h4>New initiative</h4>
        </div>
        <div className="formGrid">
          <label>
            Initiative name
            <input value={newInitiative.pm_name ?? ''} onChange={(event) => setNewInitiative((current) => ({ ...current, pm_name: event.target.value }))} />
          </label>
          <label>
            Business case
            <input value={newInitiative.pm_businesscase ?? ''} onChange={(event) => setNewInitiative((current) => ({ ...current, pm_businesscase: event.target.value }))} />
          </label>
          <label>
            Estimated cost
            <input type="number" value={newInitiative.pm_estimatedcost ?? 0} onChange={(event) => setNewInitiative((current) => ({ ...current, pm_estimatedcost: Number(event.target.value) }))} />
          </label>
          <button className="actionButton" type="button" onClick={handleCreate}>
            Save initiative
          </button>
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHeader">
          <h4>Pipeline initiatives</h4>
          <span>{initiatives.length} initiatives</span>
        </div>
        {loading ? (
          <div className="listPlaceholder">Loading pipeline…</div>
        ) : initiatives.length ? (
          <div className="initiativeGrid">
            {initiatives.map((initiative) => (
              <article key={initiative.pm_initiativeid} className="initiativeCard">
                <h5>{initiative.pm_name}</h5>
                <p>{initiative.pm_businesscase ?? 'Business case not provided'}</p>
                <div className="initiativeMeta">Estimated cost: {initiative.pm_estimatedcost ? `$${initiative.pm_estimatedcost.toLocaleString()}` : 'TBC'}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="listPlaceholder">No initiatives found.</div>
        )}
      </section>
    </div>
  )
}
