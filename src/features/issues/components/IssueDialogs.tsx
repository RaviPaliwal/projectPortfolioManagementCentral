import React from 'react'
import { DynamicFormDialog } from '@/components/common'
import type { FormField } from '@/components/common'
import type { IssueModel } from '@/types/dataverse'

interface IssueDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  initialData?: IssueModel | null
}

export const IssueDialog: React.FC<IssueDialogProps> = ({ open, onClose, onSave, initialData }) => {
  const fields: FormField[] = [
    { name: 'pm_issuetitle', label: 'Issue Title', type: 'text', required: true, gridSize: 12 },
    { name: 'pm_issuecategory', label: 'Category', type: 'select', defaultValue: '0', gridSize: 4, options: [
      { value: '0', label: 'Dependency' }, { value: '1', label: 'Technical' }
    ]},
    { name: 'pm_prioritylevel', label: 'Priority', type: 'select', defaultValue: '2', gridSize: 4, options: [
      { value: '1', label: 'Critical' }, { value: '0', label: 'High' }, { value: '2', label: 'Medium' }
    ]},
    { name: 'pm_impactlevel', label: 'Impact', type: 'select', defaultValue: '2', gridSize: 4, options: [
      { value: '1', label: 'Major' }, { value: '0', label: 'Moderate' }, { value: '2', label: 'Minor' }
    ]},
    { name: 'pm_ragstatus', label: 'RAG Status', type: 'select', defaultValue: '1', gridSize: 6, options: [
      { value: '2', label: 'Red' }, { value: '0', label: 'Amber' }, { value: '1', label: 'Green' }
    ]},
    { name: 'pm_escalationstatus', label: 'Escalated', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'No' }, { value: '1', label: 'Yes' }
    ]},
    { name: 'pm_issueowner', label: 'Issue Owner', type: 'user-select', gridSize: 6 },
    { name: 'pm_issuereference', label: 'Issue Reference', type: 'text', gridSize: 6 },
    { name: 'pm_dateraised', label: 'Raised Date', type: 'date', gridSize: 4 },
    { name: 'pm_targetresolutiondate', label: 'Target Resolution Date', type: 'date', gridSize: 4 },
    { name: 'pm_actualresolutiondate', label: 'Actual Resolution Date', type: 'date', gridSize: 4 },
    { name: 'pm_issuedescription', label: 'Description', type: 'multiline', rows: 3 },
    { name: 'pm_resolutiondetails', label: 'Resolution Details', type: 'multiline', rows: 2 },
    { name: 'pm_linkedrisk', label: 'Linked Risk', type: 'text', gridSize: 12 },
    { name: '_pm_programmefk_value', label: 'Programme FK (GUID)', type: 'text', gridSize: 6 },
    { name: '_pm_project_value', label: 'Project FK (GUID)', type: 'text', gridSize: 6 },
  ]

  // Convert pm_escalationstatus from boolean to 0/1 if necessary when displaying
  const processedData = initialData ? { ...initialData, pm_escalationstatus: initialData.pm_escalationstatus ? 1 : 0 } : {}

  const handleSubmit = async (data: Record<string, any>) => {
    // Convert pm_escalationstatus back to boolean
    const payload = { ...data, pm_escalationstatus: data.pm_escalationstatus === 1 || data.pm_escalationstatus === '1' }
    await onSave(payload)
  }

  return (
    <DynamicFormDialog
      open={open}
      title={initialData ? 'Edit Issue' : 'Create New Issue'}
      fields={fields}
      initialData={processedData}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={initialData ? 'Update' : 'Create'}
    />
  )
}
