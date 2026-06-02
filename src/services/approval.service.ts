import { Pm_projectapprovalrequestsService } from '@/generated'
import type { Pm_projectapprovalrequests } from '@/generated/models/Pm_projectapprovalrequestsModel'
import type { ApprovalRequestModel } from '@/types/dataverse'
import { unwrapList, unwrapSingle } from './common'

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
  const result = await Pm_projectapprovalrequestsService.getAll({
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
  })
  return unwrapList<Pm_projectapprovalrequests>(result).map(mapApprovalRequest)
}

export async function createApprovalRequest(payload: Partial<ApprovalRequestModel>): Promise<ApprovalRequestModel | null> {
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
  const result = await Pm_projectapprovalrequestsService.create({ ...defaults, ...cleanPayload } as any)
  const item = unwrapSingle<Pm_projectapprovalrequests>(result)
  return item ? mapApprovalRequest(item) : null
}

export async function updateApprovalRequest(id: string, changes: Partial<ApprovalRequestModel>): Promise<ApprovalRequestModel | null> {
  const result = await Pm_projectapprovalrequestsService.update(id, changes as any)
  const item = unwrapSingle<Pm_projectapprovalrequests>(result)
  return item ? mapApprovalRequest(item) : null
}

export async function deleteApprovalRequest(id: string): Promise<void> {
  await Pm_projectapprovalrequestsService.delete(id)
}
