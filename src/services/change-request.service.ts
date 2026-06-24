import {
  Pm_changerequestsService,
  Pm_programmesService,
  Pm_projectsService,
} from '@/generated'
import { writeAuditLog } from './changelog.service'
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
import type { IGetAllOptions } from '@/generated/models/CommonModels'

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
  try {
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
    const options: IGetAllOptions = {
      select: selectFields,
      orderBy: ['pm_submissiondate desc', 'pm_changerequesttitle asc'],
      top: 500,
    }
    const result = await Pm_changerequestsService.getAll({ ...options, filter: "statecode eq 0" })
    if (!result.success) {
      console.error('[ChangeRequestService] fetchChangeRequests failed:', result.error)
      return []
    }
    let list = unwrapList<Pm_changerequests>(result).map(mapChangeRequest)
    if (list.length === 0) {
      const fallbackResult = await Pm_changerequestsService.getAll(options)
      if (fallbackResult.success) {
        list = unwrapList<Pm_changerequests>(fallbackResult).map(mapChangeRequest)
      }
    }

    for (const cr of list) {
      if (cr.pm_changetype != null) {
        cr.pm_changetypename = Pm_changerequestspm_changetype[cr.pm_changetype as keyof typeof Pm_changerequestspm_changetype]
      }
      if (cr.pm_prioritylevel != null) {
        cr.pm_prioritylevelname = Pm_changerequestspm_prioritylevel[cr.pm_prioritylevel as keyof typeof Pm_changerequestspm_prioritylevel]
      }
      if (cr.pm_status != null) {
        cr.pm_statusname = Pm_changerequestspm_status[cr.pm_status as keyof typeof Pm_changerequestspm_status]
      }
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
      if (programmesResult && programmesResult.success) {
        const programmes = unwrapList<Pm_programmes>(programmesResult)
        for (const p of programmes) {
          if (p.pm_programmeid && p.pm_programmename) {
            programmeNameById.set(p.pm_programmeid.replace(/[{}]/g, '').trim().toLowerCase(), p.pm_programmename)
          }
        }
      }

      const projectNameById = new Map<string, string>()
      if (projectsResult && projectsResult.success) {
        const projects = unwrapList<Pm_projects>(projectsResult)
        for (const p of projects) {
          if (p.pm_projectid && p.pm_projectname) {
            projectNameById.set(p.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase(), p.pm_projectname)
          }
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
      console.error('[ChangeRequestService] fetchChangeRequests lookups failed:', err)
    }

    return list
  } catch (err) {
    console.error('[ChangeRequestService] fetchChangeRequests exception:', err)
    return []
  }
}

export async function createChangeRequest(payload: Partial<ChangeRequestModel>): Promise<ChangeRequestModel | null> {
  try {
    const cleanPayload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '' &&
          key !== '_pm_project_value' && key !== '_pm_programmelookup_value') {
        cleanPayload[key] = value
      }
    }
    const defaults: Record<string, unknown> = {
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

    const result = await Pm_changerequestsService.create({ ...defaults, ...cleanPayload } as unknown as Pm_changerequests)
    if (!result.success) {
      console.error('[ChangeRequestService] createChangeRequest failed:', result.error)
      throw new Error(`Failed to create change request: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_changerequests>(result)
    if (item && item.pm_changerequestid) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_changerequests',
        recordId: item.pm_changerequestid,
        recordName: item.pm_changerequesttitle || '',
        newValue: `Change Request created: ${item.pm_changerequesttitle || ''}`
      })
    }
    return item ? mapChangeRequest(item) : null
  } catch (err) {
    console.error('[ChangeRequestService] createChangeRequest exception:', err)
    throw err;
  }
}

export async function updateChangeRequest(id: string, changes: Partial<ChangeRequestModel>): Promise<ChangeRequestModel | null> {
  try {
    let original: ChangeRequestModel | null = null
    try {
      original = await fetchChangeRequestById(id)
    } catch (e) {
      console.error('[ChangeRequestService] updateChangeRequest failed to fetch original:', e)
    }

    const cleanPayload: Record<string, unknown> = {}
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

    const result = await Pm_changerequestsService.update(id, cleanPayload as unknown as Pm_changerequests)
    if (!result.success) {
      console.error('[ChangeRequestService] updateChangeRequest failed:', result.error)
      throw new Error(`Failed to update change request: ${result.error?.message || 'Unknown error'}`)
    }
    const item = unwrapSingle<Pm_changerequests>(result)

    // Log audit entries for changed fields
    if (original) {
      const formatVal = (val: unknown): string => {
        if (val === undefined || val === null) return ''
        if (typeof val === 'object') return JSON.stringify(val)
        return String(val)
      }

      for (const [key, value] of Object.entries(changes)) {
        if (key === 'pm_changerequestid') continue
        const oldVal = (original as Record<string, unknown>)[key]
        if (formatVal(oldVal) !== formatVal(value)) {
          const isStatus = key === 'pm_status' || key === 'statecode'
          writeAuditLog({
            actionType: isStatus ? 'StatusChange' : 'Update',
            entityName: 'pm_changerequests',
            recordId: id,
            recordName: original.pm_changerequesttitle || '',
            fieldName: key,
            oldValue: formatVal(oldVal),
            newValue: formatVal(value)
          })
        }
      }
    }

    return item ? mapChangeRequest(item) : null
  } catch (err) {
    console.error('[ChangeRequestService] updateChangeRequest exception:', err)
    throw err
  }
}

export async function deleteChangeRequest(id: string): Promise<void> {
  try {
    let recordName = id
    try {
      const details = await fetchChangeRequestById(id)
      if (details?.pm_changerequesttitle) recordName = details.pm_changerequesttitle
    } catch (e) {
      console.error('[ChangeRequestService] deleteChangeRequest details fetch exception:', e)
    }

    await Pm_changerequestsService.delete(id)

    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_changerequests',
      recordId: id,
      recordName: recordName,
      fieldName: 'deleted',
      oldValue: 'Active',
      newValue: 'Deleted'
    })
  } catch (err) {
    console.error('[ChangeRequestService] deleteChangeRequest exception:', err)
    throw err
  }
}

export async function fetchChangeRequestById(id: string): Promise<ChangeRequestModel | null> {
  const normalizedId = id.replace(/[{}]/g, '').trim().toLowerCase()
  if (!normalizedId) return null

  try {
    const result = await Pm_changerequestsService.get(normalizedId, {
      select: [
        'pm_changerequestid', 'pm_changerequesttitle', 'pm_changerequestreference',
        'pm_changetype',
        'pm_prioritylevel',
        'pm_status',
        'pm_changedescription', 'pm_justification',
        'pm_costimpacteur', 'pm_scheduleimpactdays',
        'pm_baselineupdated', 'pm_benefitsimpact',
        'pm_requestorname', 'pm_submissiondate',
        'pm_decisiondate', 'pm_decisionmaker',
        'pm_projectcode', 'pm_versionnumber',
        '_pm_project_value', '_pm_programmelookup_value',
      ],
    })
    if (!result.success) {
      console.error('[ChangeRequestService] fetchChangeRequestById failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_changerequests>(result)
    if (!item || !item.pm_changerequestid) return null
    const mapped = mapChangeRequest(item)

    // Resolve option-set display names
    if (mapped.pm_changetype != null) {
      mapped.pm_changetypename = Pm_changerequestspm_changetype[mapped.pm_changetype as keyof typeof Pm_changerequestspm_changetype]
    }
    if (mapped.pm_prioritylevel != null) {
      mapped.pm_prioritylevelname = Pm_changerequestspm_prioritylevel[mapped.pm_prioritylevel as keyof typeof Pm_changerequestspm_prioritylevel]
    }
    if (mapped.pm_status != null) {
      mapped.pm_statusname = Pm_changerequestspm_status[mapped.pm_status as keyof typeof Pm_changerequestspm_status]
    }

    // Resolve lookup names
    try {
      if (mapped._pm_programmelookup_value) {
        const progResult = await Pm_programmesService.get(mapped._pm_programmelookup_value, { select: ['pm_programmeid', 'pm_programmename'] })
        if (progResult.success) {
          const prog = unwrapSingle<Pm_programmes>(progResult)
          if (prog?.pm_programmename) {
            mapped.pm_programmename = prog.pm_programmename
            mapped.pm_programmelookupname = prog.pm_programmename
          }
        }
      }
      if (mapped._pm_project_value) {
        const projResult = await Pm_projectsService.get(mapped._pm_project_value, { select: ['pm_projectid', 'pm_projectname', 'pm_projectcode'] })
        if (projResult.success) {
          const proj = unwrapSingle<Pm_projects>(projResult)
          if (proj?.pm_projectname) {
            mapped.pm_projectname = proj.pm_projectname
            mapped.pm_projectcode = proj.pm_projectcode || mapped.pm_projectcode
          }
        }
      }
    } catch (e) {
      console.error('[ChangeRequestService] fetchChangeRequestById lookup details failed:', e)
    }

    return mapped
  } catch (err) {
    console.error('[ChangeRequestService] fetchChangeRequestById exception:', err)
    return null
  }
}
