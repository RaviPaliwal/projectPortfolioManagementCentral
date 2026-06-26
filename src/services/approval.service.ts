import { Pm_projectapprovalrequestsService } from '@/generated'
import type { Pm_projectapprovalrequests } from '@/generated/models/Pm_projectapprovalrequestsModel'
import type { ApprovalRequestModel } from '@/types/dataverse'
import type { IGetAllOptions } from '@/generated/models/CommonModels'
import { unwrapList, unwrapSingle } from './common'
import { writeAuditLog } from './changelog.service'

export const mapApprovalRequest = (item: Pm_projectapprovalrequests): ApprovalRequestModel => ({
  pm_projectapprovalrequestid: item.pm_projectapprovalrequestid,
  pm_requesttitle: item.pm_requesttitle,
  pm_approvalstage: item.pm_approvalstage,
  pm_approvalstagename: item.pm_approvalstagename,
  pm_decisionstatus: item.pm_decisionstatus,
  pm_decisionstatusname: item.pm_decisionstatusname,
  pm_entitytype: item.pm_entitytype,
  pm_entitytypename: item.pm_entitytypename,
  pm_prioritylevel: item.pm_prioritylevel,
  pm_prioritylevelname: item.pm_prioritylevelname,
  pm_approvername: item.pm_approvername,
  pm_decisiondate: item.pm_decisiondate,
  pm_decisionnotes: item.pm_decisionnotes,
  pm_duedate: item.pm_duedate,
  pm_entityid: item.pm_entityid,
  pm_requestorname: item.pm_requestorname,
  statecode: item.statecode,
})

export async function fetchApprovalRequests(): Promise<ApprovalRequestModel[]> {
  try {
    const options: IGetAllOptions = {
      select: [
        'pm_projectapprovalrequestid', 'pm_requesttitle',
        'pm_approvalstage',
        'pm_decisionstatus',
        'pm_entitytype',
        'pm_prioritylevel',
        'pm_approvername',
        'pm_decisiondate', 'pm_decisionnotes',
        'pm_duedate',
        'pm_entityid',
        'pm_requestorname',
      ],
      orderBy: ['pm_requesttitle asc'],
      top: 500,
    }
    const result = await Pm_projectapprovalrequestsService.getAll(options)
    if (!result.success) {
      console.error('[ApprovalService] fetchApprovalRequests failed:', result.error)
      return []
    }
    return unwrapList<Pm_projectapprovalrequests>(result).map(mapApprovalRequest)
  } catch (err) {
    console.error('[ApprovalService] fetchApprovalRequests exception:', err)
    return []
  }
}

export async function createApprovalRequest(payload: Partial<ApprovalRequestModel>): Promise<ApprovalRequestModel | null> {
  const cleanPayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, unknown> = {
    statecode: 0,
    statuscode: 1,
  }
  try {
    const result = await Pm_projectapprovalrequestsService.create({ ...defaults, ...cleanPayload } as any)
    if (!result.success) {
      console.error('[ApprovalService] createApprovalRequest failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_projectapprovalrequests>(result)
    if (item) {
      writeAuditLog({
        actionType: 'Create',
        entityName: 'pm_projectapprovalrequests',
        recordId: item.pm_projectapprovalrequestid || id,
        recordName: item.pm_requesttitle || payload.pm_requesttitle,
        moduleName: 'Approval Requests',
      })
    }
    return item ? mapApprovalRequest(item) : null
  } catch (err) {
    console.error('[ApprovalService] createApprovalRequest exception:', err)
    return null
  }
}

export async function updateApprovalRequest(id: string, changes: Partial<ApprovalRequestModel>): Promise<ApprovalRequestModel | null> {
  try {
    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_projectapprovalrequests',
      recordId: id,
      recordName: changes.pm_requesttitle,
      moduleName: 'Approval Requests',
    })
    const result = await Pm_projectapprovalrequestsService.update(id, changes as any)
    if (!result.success) {
      console.error('[ApprovalService] updateApprovalRequest failed:', result.error)
      return null
    }
    const item = unwrapSingle<Pm_projectapprovalrequests>(result)
    return item ? mapApprovalRequest(item) : null
  } catch (err) {
    console.error('[ApprovalService] updateApprovalRequest exception:', err)
    return null
  }
}

export async function deleteApprovalRequest(id: string): Promise<void> {
  try {
    writeAuditLog({
      actionType: 'Update',
      entityName: 'pm_projectapprovalrequests',
      recordId: id,
      moduleName: 'Approval Requests',
      description: `Deleted approval request ${id}`,
    })
    await Pm_projectapprovalrequestsService.delete(id)
  } catch (err) {
    console.error('[ApprovalService] deleteApprovalRequest exception:', err)
    throw err
  }
}

