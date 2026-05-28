import { useEffect, useState } from 'react'
import { createInitiative, fetchInitiatives, convertInitiativeToProject } from '../../services/dataverseService'
import type { InitiativeModel } from '../../models/dataverse'
import Modal from '../../components/Modal'
import KpiCard from '../../components/KpiCard'

export default function PipelinePage() {
  const [initiatives, setInitiatives] = useState<InitiativeModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newInitiative, setNewInitiative] = useState<Partial<InitiativeModel>>({ pm_name: '', pm_businesscase: '', pm_estimatedcost: 0 })
  const [showNewModal, setShowNewModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<number>(1) // 1 = UnderReview
  const [kpis, setKpis] = useState({ total: 0, pipelineValue: 0, avgPriority: 0 })

  async function load(status?: number) {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchInitiatives(status)
      setInitiatives(list)
      // KPIs: compute overall pipeline metrics (call all initiatives)
      const all = await fetchInitiatives()
      const pipelineValue = all.reduce((s, i) => s + (i.pm_estimatedcost ?? 0), 0)
      const avgPriority = all.length ? Math.round((all.reduce((s, i) => s + ((i as any).pm_priorityscore ?? 0), 0) / all.length) * 10) / 10 : 0
      setKpis({ total: all.length, pipelineValue, avgPriority })
    } catch (err) {
      setError('Unable to load pipeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

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
      setShowNewModal(false)
      await load(statusFilter)
    } catch (err) {
      setError('Unable to create initiative.')
    }
  }

  const handleConvert = async (initiative: InitiativeModel) => {
    try {
      const pid = await convertInitiativeToProject(initiative)
      if (pid) {
        // refresh
        await load(statusFilter)
        alert('Initiative converted to project: ' + pid)
      } else {
        alert('Conversion failed')
      }
    } catch (e) {
      alert('Conversion error')
    }
  }

  return (
    <div className="page-root pagePanel">
      <div className="pageHeader">
        <h3>Pipeline</h3>
        <p>Pre-project initiative pipeline with business case and estimated investment.</p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="kpi-grid">
        <KpiCard title="Total initiatives" value={kpis.total} accent="blue" />
        <KpiCard title="Pipeline value" value={`€${kpis.pipelineValue.toLocaleString()}`} accent="teal" />
        <KpiCard title="Avg priority" value={kpis.avgPriority} accent="amber" />
        <div />
      </div>

      <section className="sectionCard">
        <div className="sectionHeader">
          <h4>Pipeline initiatives</h4>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setStatusFilter(1)}>Under review</button>
            <button className="btn btn-secondary" onClick={() => setStatusFilter(0)}>Approved</button>
            <button className="btn btn-secondary" onClick={() => setStatusFilter(2)}>Deferred</button>
            <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>New Initiative</button>
          </div>
        </div>
        {loading ? (
          <div className="listPlaceholder">Loading pipeline…</div>
        ) : initiatives.length ? (
          <div className="initiativeGrid">
            {initiatives.map((initiative) => (
              <article key={initiative.pm_initiativeid} className="initiativeCard">
                <h5>{initiative.pm_name}</h5>
                <p>{initiative.pm_businesscase ?? 'Business case not provided'}</p>
                <div className="initiativeMeta">
                  <div>Priority: {(initiative as any).pm_priorityscore ?? '—'}</div>
                  <div>Strategic: {(initiative as any).pm_strategicalignmentscore ?? '—'}</div>
                  <div>Estimated cost: {initiative.pm_estimatedcost ? `€${initiative.pm_estimatedcost.toLocaleString()}` : 'TBC'}</div>
                  <div>Estimated benefits: {initiative.pm_estimatedbenefits ? `€${initiative.pm_estimatedbenefits.toLocaleString()}` : '—'}</div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  {initiative.pm_pipelinestatus === 0 ? (
                    <button className="btn btn-primary" onClick={() => handleConvert(initiative)}>Convert to Project</button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="listPlaceholder">No initiatives found.</div>
        )}
      </section>

      {showNewModal ? (
        <Modal title="New initiative" description="Submit a new idea to the pipeline" onClose={() => setShowNewModal(false)} large>
          <div className="formGrid">
            <label>
              Initiative name
              <input value={newInitiative.pm_name ?? ''} onChange={(event) => setNewInitiative((current) => ({ ...current, pm_name: event.target.value }))} />
            </label>
            <label>
              Business case
              <textarea value={newInitiative.pm_businesscase ?? ''} onChange={(event) => setNewInitiative((current) => ({ ...current, pm_businesscase: event.target.value }))} />
            </label>
            <label>
              Estimated cost
              <input type="number" value={newInitiative.pm_estimatedcost ?? 0} onChange={(event) => setNewInitiative((current) => ({ ...current, pm_estimatedcost: Number(event.target.value) }))} />
            </label>
            <div>
              <button className="btn btn-secondary" onClick={() => setShowNewModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Submit</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
