import React, { useState, useEffect } from 'react'
import { DynamicFormDialog } from '@/components/common'
import type { FormField } from '@/components/common'
import type { RiskModel } from '@/types/dataverse'

interface RiskDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  initialData?: RiskModel | null
}

export const RiskDialog: React.FC<RiskDialogProps> = ({ open, onClose, onSave, initialData }) => {
  const [resources, setResources] = useState<{ value: string, label: string }[]>([])
  const [resourcesLoaded, setResourcesLoaded] = useState(false)

  useEffect(() => {
    if (open) {
      setResourcesLoaded(false)
      import('@/services').then(({ fetchResources }) => {
        fetchResources().then((resList) => {
          const options = [
            { value: '', label: 'Unassigned' },
            ...resList.map(r => ({ value: r.pm_resourceid || '', label: r.pm_fullname || '' })).filter(r => r.value !== '')
          ]
          setResources(options)
          setResourcesLoaded(true)
        }).catch(err => {
          console.error("[RiskDialog] Failed to load resources:", err)
          setResourcesLoaded(true)
        })
      })
    }
  }, [open])

  const fields: FormField[] = [
    { name: 'pm_risktitle', label: 'Risk Title', type: 'text', required: true, gridSize: 8 },
    { name: 'pm_riskcategory', label: 'Category', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Resource' }, { value: '1', label: 'Financial' }, { value: '2', label: 'Legal' }, { value: '3', label: 'Technical' }, { value: '4', label: 'External' }
    ]},
    { name: 'pm_ragstatus', label: 'RAG Status', type: 'select', gridSize: 4, options: [
      { value: '1', label: 'Low — Low Risk' }, { value: '0', label: 'Medium — Medium Risk' }, { value: '2', label: 'High — High Risk' }
    ]},
    { 
      name: '_pm_riskowner_value', 
      label: 'Risk Owner', 
      type: 'select', 
      gridSize: 4,
      options: resources 
    },
    { name: 'pm_identifieddate', label: 'Identified Date', type: 'date', gridSize: 6 },
    { name: 'pm_targetclosedate', label: 'Target Close Date', type: 'date', gridSize: 6 },
    { name: 'pm_riskcause', label: 'Cause', type: 'text', gridSize: 6 },
    { name: 'pm_riskeffect', label: 'Effect', type: 'text', gridSize: 6 },
    { name: 'pm_riskdescription', label: 'Description', type: 'multiline', rows: 2 },
    { name: 'pm_inherentprobability', label: 'Inherent Probability', type: 'select', gridSize: 4, options: [
      { value: '3', label: 'Rare' }, { value: '2', label: 'Unlikely' }, { value: '0', label: 'Possible' }, { value: '1', label: 'Likely' }
    ]},
    { name: 'pm_inherentimpact', label: 'Inherent Impact', type: 'select', gridSize: 4, options: [
      { value: '1', label: 'Moderate' }, { value: '0', label: 'Major' }, { value: '2', label: 'Catastrophic' }
    ]},
    { name: 'pm_residualprobability', label: 'Residual Probability', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Unlikely' }, { value: '1', label: 'Possible' }, { value: '2', label: 'Rare' }
    ]},
    { name: 'pm_residualimpact', label: 'Residual Impact', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Moderate' }, { value: '1', label: 'Minor' }, { value: '2', label: 'Major' }
    ]},
    { name: 'pm_responsestrategy', label: 'Response Strategy', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Mitigate' }, { value: '1', label: 'Accept' }
    ]},
    { name: '_pm_project_value', label: 'Project', type: 'project-select', gridSize: 6 },
  ]

  if (open && !resourcesLoaded) return null

  return (
    <DynamicFormDialog
      open={open}
      title={initialData ? 'Edit Risk' : 'Add New Risk'}
      fields={fields}
      initialData={initialData || undefined}
      onClose={onClose}
      onSubmit={onSave}
      submitText={initialData ? 'Update Risk' : 'Create Risk'}
    />
  )
}

interface MitigationActionDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  projectId?: string
}

export const MitigationActionDialog: React.FC<MitigationActionDialogProps> = ({ open, onClose, onSave, projectId }) => {
  const [owners, setOwners] = useState<{ value: string, label: string }[]>([])
  const [ownersLoaded, setOwnersLoaded] = useState(false)

  useEffect(() => {
    if (open) {
      setOwnersLoaded(false)
      import('@/services').then(async ({ fetchAllocatedResourcesByProject, fetchResources }) => {
        try {
          let list: any[] = []
          if (projectId) {
            list = await fetchAllocatedResourcesByProject(projectId)
          }
          if (list.length === 0) {
            list = await fetchResources()
          }
          const options = list
            .map(r => ({ value: r._pm_systemuser_value || '', label: r.pm_fullname || '' }))
            .filter(opt => opt.value !== '')
          setOwners(options)
        } catch (err) {
          console.error('[MitigationActionDialog] Failed to load owners:', err)
        } finally {
          setOwnersLoaded(true)
        }
      })
    }
  }, [open, projectId])

  const fields: FormField[] = [
    { name: 'pm_actiontitle', label: 'Action Title', type: 'text', required: true },
    { name: 'pm_actiondescription', label: 'Description', type: 'multiline', rows: 2 },
    { 
      name: 'ownerid', 
      label: 'Owner', 
      type: 'select', 
      required: true, 
      gridSize: 6,
      options: owners
    },
    { name: 'pm_duedate', label: 'Due Date', type: 'date', gridSize: 6 },
    { name: 'pm_actionstatus', label: 'Status', type: 'select', defaultValue: '1', options: [
      { value: '1', label: 'In Progress' }, { value: '0', label: 'Complete' }
    ]}
  ]

  if (open && !ownersLoaded) return null

  return (
    <DynamicFormDialog
      open={open}
      title="Add Mitigation Action"
      fields={fields}
      onClose={onClose}
      onSubmit={onSave}
      submitText="Save Action"
    />
  )
}
