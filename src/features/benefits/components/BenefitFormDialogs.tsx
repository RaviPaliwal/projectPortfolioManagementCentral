import React from 'react'
import { DynamicFormDialog } from '@/components/common'
import type { FormField } from '@/components/common'
import type { BenefitModel } from '@/types/dataverse'

interface BenefitDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  initialData?: BenefitModel | null
}

export const BenefitDialog: React.FC<BenefitDialogProps> = ({ open, onClose, onSave, initialData }) => {
  const fields: FormField[] = [
    { name: 'pm_benefitname', label: 'Benefit Name', type: 'text', required: true, gridSize: 6 },
    { name: 'pm_benefitcategory', label: 'Category', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'Financial' }, { value: '1', label: 'Operational' }, { value: '2', label: 'Strategic' }, { value: '3', label: 'Customer' }, { value: '4', label: 'Innovation' }
    ]},
    { name: 'pm_benefitreference', label: 'Reference / ID', type: 'text', gridSize: 6 },
    { name: 'pm_benefitstatus', label: 'Status', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'Identified' }, { value: '1', label: 'In Progress' }, { value: '2', label: 'Realised' }, { value: '3', label: 'Not Yet Achieved' }, { value: '4', label: 'Cancelled' }
    ]},
    { name: 'pm_ragstatus', label: 'Assessment (RAG)', type: 'select', defaultValue: 1, gridSize: 6, options: [
      { value: '1', label: 'Green — On Track' }, { value: '0', label: 'Amber — At Risk' }, { value: '2', label: 'Red — Off Track' }
    ]},
    { name: 'pm_benefittype', label: 'Benefit Type', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'Quantitative' }, { value: '1', label: 'Qualitative' }
    ]},
    { name: '_pm_benifitowner_value', label: 'Benefit Owner', type: 'user-select', gridSize: 6 },
    { name: 'pm_projectcode', label: 'Entity (Project / Programme)', type: 'text', gridSize: 6 },
    { name: 'pm_baselinevalue', label: 'Baseline Value', type: 'number', defaultValue: 0, gridSize: 4 },
    { name: 'pm_targetvalue', label: 'Target Value', type: 'number', defaultValue: 0, gridSize: 4 },
    { name: 'pm_unitofmeasure', label: 'Unit of Measure', type: 'text', gridSize: 4 },
    { name: 'pm_realisationstartdate', label: 'Realisation Start Date', type: 'date', gridSize: 6 },
    { name: 'pm_realisationenddate', label: 'Realisation End Date', type: 'date', gridSize: 6 },
    { name: 'pm_benefitdescription', label: 'Benefit Description', type: 'multiline', rows: 3 }
  ]

  return (
    <DynamicFormDialog
      open={open}
      title={initialData ? 'Edit Benefit' : 'Register Benefit'}
      fields={fields}
      initialData={initialData || {}}
      onClose={onClose}
      onSubmit={onSave}
      submitText={initialData ? 'Update Benefit' : 'Register Benefit'}
    />
  )
}

interface MeasureDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
}

export const MeasureDialog: React.FC<MeasureDialogProps> = ({ open, onClose, onSave }) => {
  const fields: FormField[] = [
    { name: 'pm_measurename', label: 'Measure Name', type: 'text', required: true },
    { name: 'pm_reportingperiod', label: 'Reporting Period', type: 'date', gridSize: 6 },
    { name: 'pm_evidenced', label: 'Evidenced', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'No' }, { value: '1', label: 'Yes' }
    ]},
    { name: 'pm_plannedvalue', label: 'Planned Value (This Period)', type: 'number', defaultValue: 0, gridSize: 6 },
    { name: 'pm_actualvalue', label: 'Actual Value (This Period)', type: 'number', defaultValue: 0, gridSize: 6 },
    { name: 'pm_cumulativeplanned', label: 'Cumulative Planned', type: 'number', defaultValue: 0, gridSize: 6 },
    { name: 'pm_cumulativeactual', label: 'Cumulative Actual', type: 'number', defaultValue: 0, gridSize: 6 },
    { name: 'pm_notes', label: 'Notes', type: 'multiline', rows: 2 }
  ]

  return (
    <DynamicFormDialog
      open={open}
      title="Add Performance Measure"
      fields={fields}
      onClose={onClose}
      onSubmit={onSave}
      submitText="Add Measure"
    />
  )
}
