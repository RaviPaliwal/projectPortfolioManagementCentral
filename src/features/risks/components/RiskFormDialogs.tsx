import React from 'react'
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
  const fields: FormField[] = [
    { name: 'pm_risktitle', label: 'Risk Title', type: 'text', required: true, gridSize: 8 },
    { name: 'pm_riskreference', label: 'Reference', type: 'text', gridSize: 4 },
    { name: 'pm_riskcategory', label: 'Category', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Strategic' }, { value: '1', label: 'Operational' }, { value: '2', label: 'Financial' }, { value: '3', label: 'Compliance' }, { value: '4', label: 'Technology' }
    ]},
    { name: 'pm_ragstatus', label: 'RAG Status', type: 'select', gridSize: 4, options: [
      { value: '1', label: 'Green — Low Risk' }, { value: '0', label: 'Amber — Medium Risk' }, { value: '2', label: 'Red — High Risk' }
    ]},
    { name: 'pm_riskowner', label: 'Risk Owner', type: 'user-select', gridSize: 4 },
    { name: 'pm_identifieddate', label: 'Identified Date', type: 'date', gridSize: 6 },
    { name: 'pm_targetclosedate', label: 'Target Close Date', type: 'date', gridSize: 6 },
    { name: 'pm_riskcause', label: 'Cause', type: 'text', gridSize: 6 },
    { name: 'pm_riskeffect', label: 'Effect', type: 'text', gridSize: 6 },
    { name: 'pm_riskdescription', label: 'Description', type: 'multiline', rows: 2 },
    { name: 'pm_inherentprobability', label: 'Inherent Probability', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Very Low (1)' }, { value: '1', label: 'Low (2)' }, { value: '2', label: 'Medium (3)' }, { value: '3', label: 'High (4)' }, { value: '4', label: 'Very High (5)' }
    ]},
    { name: 'pm_inherentimpact', label: 'Inherent Impact', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Negligible (1)' }, { value: '1', label: 'Minor (2)' }, { value: '2', label: 'Moderate (3)' }, { value: '3', label: 'Major (4)' }, { value: '4', label: 'Catastrophic (5)' }
    ]},
    { name: 'pm_residualprobability', label: 'Residual Probability', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Very Low (1)' }, { value: '1', label: 'Low (2)' }, { value: '2', label: 'Medium (3)' }, { value: '3', label: 'High (4)' }, { value: '4', label: 'Very High (5)' }
    ]},
    { name: 'pm_residualimpact', label: 'Residual Impact', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Negligible (1)' }, { value: '1', label: 'Minor (2)' }, { value: '2', label: 'Moderate (3)' }, { value: '3', label: 'Major (4)' }, { value: '4', label: 'Catastrophic (5)' }
    ]},
    { name: 'pm_responsestrategy', label: 'Response Strategy', type: 'select', gridSize: 4, options: [
      { value: '0', label: 'Accept' }, { value: '1', label: 'Avoid' }, { value: '2', label: 'Transfer' }, { value: '3', label: 'Mitigate' }
    ]},
    { name: '_pm_programmefk_value', label: 'Programme FK (GUID)', type: 'text', gridSize: 6 },
    { name: '_pm_project_value', label: 'Project FK (GUID)', type: 'text', gridSize: 6 },
  ]

  return (
    <DynamicFormDialog
      open={open}
      title={initialData ? 'Edit Risk' : 'Add New Risk'}
      fields={fields}
      initialData={initialData || {}}
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
}

export const MitigationActionDialog: React.FC<MitigationActionDialogProps> = ({ open, onClose, onSave }) => {
  const fields: FormField[] = [
    { name: 'pm_actiontitle', label: 'Action Title', type: 'text', required: true },
    { name: 'pm_actiondescription', label: 'Description', type: 'multiline', rows: 2 },
    { name: 'pm_actionowner', label: 'Owner', type: 'user-select', gridSize: 6 },
    { name: 'pm_duedate', label: 'Due Date', type: 'date', gridSize: 6 },
    { name: 'pm_actionstatus', label: 'Status', type: 'select', defaultValue: '1', options: [
      { value: '1', label: 'In Progress' }, { value: '0', label: 'Complete' }
    ]}
  ]

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
