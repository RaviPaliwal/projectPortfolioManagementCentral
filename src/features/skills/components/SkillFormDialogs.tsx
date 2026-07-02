import React from 'react'
import { DynamicFormDialog } from '@/components/common'
import type { FormField } from '@/components/common'
import type { SkillModel, ResourceSkillModel, ResourceModel } from '@/types/dataverse'

interface SkillDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  initialData?: SkillModel | null
}

export const SkillDialog: React.FC<SkillDialogProps> = ({ open, onClose, onSave, initialData }) => {
  const fields: FormField[] = [
    { name: 'pm_skillname', label: 'Skill Name', type: 'text', required: true, gridSize: 6 },
    { name: 'pm_skillcategory', label: 'Category', type: 'select', defaultValue: 0, gridSize: 6, options: [
      { value: '0', label: 'Technical' }, { value: '1', label: 'Functional' }, { value: '2', label: 'Management' }, { value: '3', label: 'Domain' }
    ]},
    { name: 'pm_skilldescription', label: 'Description', type: 'multiline', rows: 2, gridSize: 12 },
    { name: 'pm_isactive', label: 'Active', type: 'select', defaultValue: 1, gridSize: 6, options: [
      { value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }
    ]}
  ]

  const formInitialData = initialData ? {
    ...initialData,
    pm_isactive: initialData.pm_isactive !== false ? 1 : 0
  } : undefined;

  const handleSubmit = async (data: Record<string, any>) => {
    const payload = {
      ...data,
      pm_isactive: data.pm_isactive === 1 || data.pm_isactive === '1' || data.pm_isactive === true
    }
    await onSave(payload)
  }

  return (
    <DynamicFormDialog
      open={open}
      title={initialData ? 'Edit Skill' : 'Add New Skill'}
      fields={fields}
      initialData={formInitialData}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={initialData ? 'Update Skill' : 'Create Skill'}
    />
  )
}

