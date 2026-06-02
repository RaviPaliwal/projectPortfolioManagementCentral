import {
  Pm_changerequestsService,
  Pm_programmesService,
  Pm_projectsService,
} from '@/generated'
import type { Pm_changerequests } from '@/generated/models/Pm_changerequestsModel'
import {
  Pm_changerequestspm_changetype,
  Pm_changerequestspm_prioritylevel,
  Pm_changerequestspm_status,
} from '@/generated/models/Pm_changerequestsModel'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { ChangeRequestModel } from '@/types/dataverse'
import { unwrapList, unwrapSingle } from './common'

export const mapChangeRequest = (item: Pm_changerequests): ChangeRequestModel => ({
  pm_changerequestid: item.pm_changerequestid,
  pm_changerequesttitle: item.pm_changerequesttitle,
  pm_changerequestreference: item.pm_changerequestreference,
  pm_changetype: item.pm_changetype,
  pm_changetypename: item.pm_changetypename,
  pm_prioritylevel: item.pm_prioritylevel,
  pm_prioritylevelname: item.pm_prioritylevelname,
  pm_status: item.pm_status,
  pm_statusname: item.pm_statusname,
  pm_changedescription: item.pm_changedescription,
  pm_justification: item.pm_justification,
  pm_costimpacteur: item.pm_costimpacteur,
  pm_scheduleimpactdays: item.pm_scheduleimpactdays,
  pm_baselineupdated: item.pm_baselineupdated,
  pm_benefitsimpact: item.pm_benefitsimpact,
  pm_requestorname: item.pm_requestorname,
  pm_submissiondate: item.pm_submissiondate,
  pm_decisiondate: item.pm_decisiondate,
  pm_decisionmaker: item.pm_decisionmaker,
  pm_versionnumber: item.pm_versionnumber,
  pm_projectcode: item.pm_projectcode,
  pm_programmename: item.pm_programmename,
  pm_projectname: item.pm_projectname,
  pm_programmelookupname: item.pm_programmelookupname,
  pm_changerequestname: item.pm_changerequestname,
  _pm_project_value: item._pm_project_value,
  _pm_programmelookup_value: item._pm_programmelookup_value,
  statecode: item.statecode,
})

export async function fetchChangeRequests(): Promise<ChangeRequestModel[]> {
  const selectFields = [
    'pm_changerequestid', 'pm_changerequesttitle', 'pm_changerequestreference',
    'pm_changetype',
    'pm_prioritylevel',
    'pm_status',
    'pm_changedescription', 'pm_justification',
    'pm_costimpacteur', 'pm_scheduleimpactdays',
    'pm_baselineupdated', 'pm_benefitsimpact',
    'pm_requestorname', 'pm_submissiondate',
    'pm_decisiondate', 'pm_decisionmaker',
    'pm_projectcode',
    '_pm_project_value', '_pm_programmelookup_value',
  ]
  const options = {
    select: selectFields,
    orderBy: ['pm_submissiondate desc', 'pm_changerequesttitle asc'],
    top: 500,
  }
  const result = await Pm_changerequestsService.getAll({ ...options, filter: "statecode eq 0" })
  let list = unwrapList<Pm_changerequests>(result).map(mapChangeRequest)
  if (list.length === 0) {
    const fallbackResult = await Pm_changerequestsService.getAll(options)
    list = unwrapList<Pm_changerequests>(fallbackResult).map(mapChangeRequest)
  }

  for (const cr of list) {
    if (cr.pm_changetype != null) cr.pm_changetypename = Pm_changerequestspm_changetype[cr.pm_changetype as keyof typeof Pm_changerequestspm_changetype]
    if (cr.pm_prioritylevel != null) cr.pm_prioritylevelname = Pm_changerequestspm_prioritylevel[cr.pm_prioritylevel as keyof typeof Pm_changerequestspm_prioritylevel]
    if (cr.pm_status != null) cr.pm_statusname = Pm_changerequestspm_status[cr.pm_status as keyof typeof Pm_changerequestspm_status]
  }

  try {
    const programmeIds = Array.from(new Set(list.map((e) => e._pm_programmelookup_value).filter(Boolean))) as string[]
    const projectIds = Array.from(new Set(list.map((e) => e._pm_project_value).filter(Boolean))) as string[]

    const [programmesResult, projectsResult] = await Promise.all([
      programmeIds.length > 0
        ? Pm_programmesService.getAll({ filter: programmeIds.map((id) => `pm_programmeid eq '${id}'`).join(' or '), select: ['pm_programmeid', 'pm_programmename'], top: 500 })
        : Promise.resolve(null),
      projectIds.length > 0
        ? Pm_projectsService.getAll({ filter: projectIds.map((id) => `pm_projectid eq '${id}'`).join(' or '), select: ['pm_projectid', 'pm_projectname'], top: 500 })
        : Promise.resolve(null),
    ])

    const programmeNameById = new Map<string, string>()
    if (programmesResult) {
      const programmes = unwrapList<Pm_programmes>(programmesResult)
      for (const p of programmes) {
        if (p.pm_programmeid && p.pm_programmename) programmeNameById.set(p.pm_programmeid.replace(/[{}]/g, '').trim().toLowerCase(), p.pm_programmename)
      }
    }

    const projectNameById = new Map<string, string>()
    if (projectsResult) {
      const projects = unwrapList<Pm_projects>(projectsResult)
      for (const p of projects) {
        if (p.pm_projectid && p.pm_projectname) projectNameById.set(p.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase(), p.pm_projectname)
      }
    }

    for (const cr of list) {
      const normProgId = cr._pm_programmelookup_value?.replace(/[{}]/g, '').trim().toLowerCase()
      const normProjId = cr._pm_project_value?.replace(/[{}]/g, '').trim().toLowerCase()
      if (normProgId && programmeNameById.has(normProgId)) {
        cr.pm_programmename = programmeNameById.get(normProgId)
        cr.pm_programmelookupname = programmeNameById.get(normProgId)
      }
      if (normProjId && projectNameById.has(normProjId)) {
        cr.pm_projectname = projectNameById.get(normProjId)
      }
    }
  } catch (err) {
    try { console.warn('[dataverseService] fetchChangeRequests: failed to resolve lookup names', err) } catch (e) {}
  }

  return list
}

export async function createChangeRequest(payload: Partial<ChangeRequestModel>): Promise<ChangeRequestModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '' &&
        key !== '_pm_project_value' && key !== '_pm_programmelookup_value') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  if (payload._pm_programmelookup_value) {
    const programmeId = payload._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (programmeId) {
      cleanPayload['pm_ProgrammeLookup@odata.bind'] = '/pm_programmes(' + programmeId + ')'
    }
  }
  if (payload._pm_project_value) {
    const projectId = payload._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = '/pm_projects(' + projectId + ')'
    }
  }
  const result = await Pm_changerequestsService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_changerequests>(result)
  return item ? mapChangeRequest(item) : null
}

export async function updateChangeRequest(id: string, changes: Partial<ChangeRequestModel>): Promise<ChangeRequestModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined && value !== null &&
        key !== 'pm_changerequestid' && key !== '_pm_project_value' && key !== '_pm_programmelookup_value') {
      cleanPayload[key] = value
    }
  }
  if (changes._pm_programmelookup_value) {
    const programmeId = changes._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (programmeId) {
      cleanPayload['pm_ProgrammeLookup@odata.bind'] = '/pm_programmes(' + programmeId + ')'
    }
  }
  if (changes._pm_project_value) {
    const projectId = changes._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
    if (projectId) {
      cleanPayload['pm_project@odata.bind'] = '/pm_projects(' + projectId + ')'
    }
  }
  const result = await Pm_changerequestsService.update(id, cleanPayload as any)
  const item = unwrapSingle<Pm_changerequests>(result)
  return item ? mapChangeRequest(item) : null
}

export async function deleteChangeRequest(id: string): Promise<void> {
  await Pm_changerequestsService.delete(id)
}
