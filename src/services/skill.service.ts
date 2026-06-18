import {
  Pm_skillsService,
  Pm_resourceskillsService,
  Pm_resourcesService,
} from '@/generated'
import type { Pm_skills } from '@/generated/models/Pm_skillsModel'
import { Pm_skillspm_skillcategory } from '@/generated/models/Pm_skillsModel'
import type { Pm_resourceskills } from '@/generated/models/Pm_resourceskillsModel'
import type { SkillModel, ResourceSkillModel } from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { writeAuditLog } from './changelog.service'

export const mapSkill = (item: Pm_skills): SkillModel => ({
  pm_skillid: item.pm_skillid,
  pm_skillname: item.pm_skillname,
  pm_skillcategory: item.pm_skillcategory,
  pm_skillcategoryname: Pm_skillspm_skillcategory[Number(item.pm_skillcategory)] ?? item.pm_skillcategoryname,
  pm_skilldescription: item.pm_skilldescription,
  pm_isactive: item.pm_isactive,
  statecode: item.statecode,
})

export const mapResourceSkill = (item: Pm_resourceskills): ResourceSkillModel => ({
  pm_resourceskillid: item.pm_resourceskillid,
  pm_skillid: item.pm_skillid,
  pm_skillname: item.pm_skillname,
  pm_resourceid: item.pm_resourceid,
  pm_resourcename: item.pm_resourcename,
  pm_proficiencylevel: item.pm_proficiencylevel,
  pm_proficiencylevelname: undefined,
  pm_yearsofexperience: item.pm_yearsofexperience,
  pm_certificationexpirydate: item.pm_certificationexpirydate,
  pm_certificationname: item.pm_certificationname,
  pm_certified: item.pm_certified,
  pm_primaryskill: item.pm_primaryskill,
  _pm_resource_value: item._pm_resource_value,
  _pm_skill_value: item._pm_skill_value,
  statecode: item.statecode,
})

export async function fetchSkills(): Promise<SkillModel[]> {
  const result = await Pm_skillsService.getAll({
    select: ['pm_skillid', 'pm_skillname', 'pm_skillcategory', 'pm_skilldescription', 'pm_isactive'],
    orderBy: ['pm_skillname asc'],
    top: 500,
  })
  try { console.debug('[dataverseService] fetchSkills result:', result) } catch (e) {}
  return unwrapList<Pm_skills>(result).map(mapSkill)
}

export async function createSkill(payload: Partial<SkillModel>): Promise<SkillModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  const result = await Pm_skillsService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createSkill payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_skills>(result)
  if (item && item.pm_skillid) {
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_skills',
      recordId: item.pm_skillid,
      recordName: item.pm_skillname || '',
      newValue: `Skill created: ${item.pm_skillname || ''}`
    })
  }
  return item ? mapSkill(item) : null
}

export async function updateSkill(id: string, changes: Partial<SkillModel>): Promise<SkillModel | null> {
  let original: SkillModel | null = null
  try {
    const details = await Pm_skillsService.get(id, { select: ['pm_skillid', 'pm_skillname', 'pm_skillcategory', 'pm_skilldescription', 'pm_isactive'] })
    const uItem = unwrapSingle<Pm_skills>(details)
    if (uItem) original = mapSkill(uItem)
  } catch (e) {}

  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && value !== '' && key !== 'pm_skillid') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_skillsService.update(id, cleanPayload as any)
  try { console.debug('[dataverseService] updateSkill id/changes/result:', id, cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_skills>(result)

  if (item && original) {
    const formatVal = (val: any): string => {
      if (val === undefined || val === null) return ''
      if (typeof val === 'object') return JSON.stringify(val)
      return String(val)
    }

    for (const [key, value] of Object.entries(changes)) {
      if (key === 'pm_skillid') continue
      const oldVal = (original as any)[key]
      if (formatVal(oldVal) !== formatVal(value)) {
        writeAuditLog({
          actionType: 'Update',
          entityName: 'pm_skills',
          recordId: id,
          recordName: original.pm_skillname || '',
          fieldName: key,
          oldValue: formatVal(oldVal),
          newValue: formatVal(value)
        })
      }
    }
  }
  return item ? mapSkill(item) : null
}

export async function deleteSkill(id: string): Promise<void> {
  let recordName = id
  try {
    const details = await Pm_skillsService.get(id, { select: ['pm_skillname'] })
    const uItem = unwrapSingle<Pm_skills>(details)
    if (uItem?.pm_skillname) recordName = uItem.pm_skillname
  } catch (e) {}

  try { console.debug('[dataverseService] deleteSkill id:', id) } catch (e) {}
  await Pm_skillsService.delete(id)

  writeAuditLog({
    actionType: 'Update',
    entityName: 'pm_skills',
    recordId: id,
    recordName: recordName,
    fieldName: 'deleted',
    oldValue: 'Active',
    newValue: 'Deleted'
  })
}

export async function fetchResourceSkills(): Promise<ResourceSkillModel[]> {
  const result = await Pm_resourceskillsService.getAll({
    select: ['pm_resourceskillid', 'pm_skillid', 'pm_resourceid', 'pm_proficiencylevel', 'pm_yearsofexperience', 'pm_certificationexpirydate', 'pm_certificationname', 'pm_certified', 'pm_primaryskill', '_pm_resource_value', '_pm_skill_value', 'statecode'],
    orderBy: ['pm_skillid asc', 'pm_resourceid asc'],
    top: 500,
  })
  try { console.debug('[dataverseService] fetchResourceSkills result:', result) } catch (e) {}
  let list = unwrapList<Pm_resourceskills>(result).map(mapResourceSkill)

  try {
    const resourceIds = Array.from(new Set(list.map((rs) => normalizeLookupId(rs._pm_resource_value)).filter(Boolean))) as string[]
    if (resourceIds.length > 0) {
      const resourcesResult = await Pm_resourcesService.getAll({
        filter: resourceIds.map((id) => `pm_resourceid eq '${id}'`).join(' or '),
        select: ['pm_resourceid', 'pm_fullname'],
        top: 500,
      })
      const resources = unwrapList<any>(resourcesResult)
      const resourceNameById = new Map<string, string>()
      for (const res of resources) {
        if (res.pm_resourceid && res.pm_fullname) {
          const normalizedId = normalizeLookupId(res.pm_resourceid)
          if (normalizedId) {
            resourceNameById.set(normalizedId, res.pm_fullname.trim())
          }
        }
      }
      for (const rs of list) {
        const normalizedValue = normalizeLookupId(rs._pm_resource_value)
        if (normalizedValue && resourceNameById.has(normalizedValue)) {
          (rs as any).pm_resourcename = resourceNameById.get(normalizedValue)
        }
      }
    }
  } catch (err) {
    try { console.warn('[dataverseService] fetchResourceSkills: failed to resolve resource names', err) } catch (e) {}
  }

  try {
    const skillIds = Array.from(new Set(list.map((rs) => normalizeLookupId(rs._pm_skill_value)).filter(Boolean))) as string[]
    if (skillIds.length > 0) {
      const skillsResult = await Pm_skillsService.getAll({
        filter: skillIds.map((id) => `pm_skillid eq '${id}'`).join(' or '),
        select: ['pm_skillid', 'pm_skillname'],
        top: 500,
      })
      const skills = unwrapList<any>(skillsResult)
      const skillNameById = new Map<string, string>()
      for (const sk of skills) {
        if (sk.pm_skillid && sk.pm_skillname) {
          const normalizedId = normalizeLookupId(sk.pm_skillid)
          if (normalizedId) {
            skillNameById.set(normalizedId, sk.pm_skillname.trim())
          }
        }
      }
      for (const rs of list) {
        const normalizedValue = normalizeLookupId(rs._pm_skill_value)
        if (normalizedValue && skillNameById.has(normalizedValue)) {
          (rs as any).pm_skillname = skillNameById.get(normalizedValue)
        }
      }
    }
  } catch (err) {
    try { console.warn('[dataverseService] fetchResourceSkills: failed to resolve skill names', err) } catch (e) {}
  }

  return list
}

export async function createResourceSkill(payload: Partial<ResourceSkillModel>): Promise<ResourceSkillModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_resource_value' && key !== '_pm_skill_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_resource_value) {
    const resourceId = payload._pm_resource_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (resourceId) {
      cleanPayload['pm_resource@odata.bind'] = '/pm_resources(' + resourceId + ')'
    }
  }
  if (payload._pm_skill_value) {
    const skillId = payload._pm_skill_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (skillId) {
      cleanPayload['pm_skill@odata.bind'] = '/pm_skills(' + skillId + ')'
    }
  }
  const result = await Pm_resourceskillsService.create({ ...defaults, ...cleanPayload } as any)
  try { console.debug('[dataverseService] createResourceSkill payload/result:', cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_resourceskills>(result)
  if (item && item.pm_resourceskillid) {
    writeAuditLog({
      actionType: 'Create',
      entityName: 'pm_resourceskills',
      recordId: item.pm_resourceskillid,
      recordName: `Resource skill mapping`,
      newValue: `Linked resource ${payload._pm_resource_value} to skill ${payload._pm_skill_value}`
    })
  }
  return item ? mapResourceSkill(item) : null
}

export async function updateResourceSkill(id: string, changes: Partial<ResourceSkillModel>): Promise<ResourceSkillModel | null> {
  let original: ResourceSkillModel | null = null
  try {
    const details = await Pm_resourceskillsService.get(id, {
      select: ['pm_resourceskillid', 'pm_proficiencylevel', 'pm_yearsofexperience', 'pm_certificationexpirydate', 'pm_certificationname', 'pm_certified', 'pm_primaryskill', '_pm_resource_value', '_pm_skill_value']
    })
    const uItem = unwrapSingle<Pm_resourceskills>(details)
    if (uItem) original = mapResourceSkill(uItem)
  } catch (e) {}

  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== 'pm_resourceskillid' && key !== '_pm_resource_value' && key !== '_pm_skill_value') {
      cleanPayload[key] = value
    }
  }
  const result = await Pm_resourceskillsService.update(id, cleanPayload as any)
  try { console.debug('[dataverseService] updateResourceSkill id/changes/result:', id, cleanPayload, result) } catch (e) {}
  const item = unwrapSingle<Pm_resourceskills>(result)

  if (item && original) {
    const formatVal = (val: any): string => {
      if (val === undefined || val === null) return ''
      if (typeof val === 'object') return JSON.stringify(val)
      return String(val)
    }

    for (const [key, value] of Object.entries(changes)) {
      if (key === 'pm_resourceskillid') continue
      const oldVal = (original as any)[key]
      if (formatVal(oldVal) !== formatVal(value)) {
        writeAuditLog({
          actionType: 'Update',
          entityName: 'pm_resourceskills',
          recordId: id,
          recordName: `Resource skill mapping ${id}`,
          fieldName: key,
          oldValue: formatVal(oldVal),
          newValue: formatVal(value)
        })
      }
    }
  }
  return item ? mapResourceSkill(item) : null
}

export async function deleteResourceSkill(id: string): Promise<void> {
  try { console.debug('[dataverseService] deleteResourceSkill id:', id) } catch (e) {}
  await Pm_resourceskillsService.delete(id)

  writeAuditLog({
    actionType: 'Update',
    entityName: 'pm_resourceskills',
    recordId: id,
    recordName: `Resource skill mapping ${id}`,
    fieldName: 'deleted',
    oldValue: 'Active',
    newValue: 'Deleted'
  })
}
