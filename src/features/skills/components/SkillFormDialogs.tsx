import React from 'react'
import { DynamicFormDialog } from '@/components/common'
import type { FormField } from '@/components/common'
import type { SkillModel, ResourceSkillModel } from '@/types/dataverse'

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

  return (
    <DynamicFormDialog
      open={open}
      title={initialData ? 'Edit Skill' : 'Add New Skill'}
      fields={fields}
      initialData={initialData || undefined}
      onClose={onClose}
      onSubmit={onSave}
      submitText={initialData ? 'Update Skill' : 'Create Skill'}
    />
  )
}

interface ResourceSkillDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => Promise<void>
  initialData?: ResourceSkillModel | null
  skills: SkillModel[]
}

export const ResourceSkillDialog: React.FC<ResourceSkillDialogProps> = ({ open, onClose, onSave, initialData, skills }) => {
  const fields: FormField[] = [
    { name: 'pm_skillid', label: 'Skill', type: 'select', required: true, gridSize: 6, options: skills.map(s => ({ value: s.pm_skillid || '', label: s.pm_skillname || '' })) },
    { name: 'pm_resourcename', label: 'Resource Name', type: 'text', required: true, gridSize: 6 },
    { name: 'pm_proficiencylevel', label: 'Proficiency Level', type: 'select', defaultValue: 0, gridSize: 4, options: [
      { value: '0', label: 'Beginner' }, { value: '1', label: 'Intermediate' }, { value: '2', label: 'Advanced' }, { value: '3', label: 'Expert' }
    ]},
    { name: 'pm_yearsofexperience', label: 'Years of Experience', type: 'number', defaultValue: 0, gridSize: 4 },
    { name: 'pm_certificationname', label: 'Certification Name', type: 'text', gridSize: 4 },
    { name: 'pm_certificationexpirydate', label: 'Certification Expiry', type: 'date', gridSize: 6 },
    { name: 'pm_certified', label: 'Certified', type: 'select', defaultValue: 0, gridSize: 3, options: [
      { value: 0, label: 'No' }, { value: 1, label: 'Yes' }
    ]},
    { name: 'pm_primaryskill', label: 'Primary Skill', type: 'select', defaultValue: 0, gridSize: 3, options: [
      { value: 1, label: 'Yes' }, { value: 0, label: 'No' }
    ]}
  ]

  // Dataverse references
  const handleSubmit = async (data: Record<string, any>) => {
    const payload = {
      ...data,
      pm_proficiencylevel: Number(data.pm_proficiencylevel),
      _pm_resource_value: data.pm_resourcename, // Assuming the backend maps this to a GUID or we just store the name
      _pm_skill_value: data.pm_skillid,
      // Find the name of the selected skill
      pm_skillname: skills.find(s => s.pm_skillid === data.pm_skillid)?.pm_skillname || ''
    }
    await onSave(payload)
  }

  return (
    <DynamicFormDialog
      open={open}
      title={initialData ? 'Edit Mapping' : 'Add Resource-Skill Mapping'}
      fields={fields}
      initialData={initialData || undefined}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={initialData ? 'Update Mapping' : 'Create Mapping'}
    />
  )
}
