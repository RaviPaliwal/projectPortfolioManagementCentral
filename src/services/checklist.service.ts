import type { ChecklistConfigurationModel, ChecklistResponseModel } from '@/types/dataverse'
import { Pm_workflowchecklistconfigurationsService, Pm_checklistresponsesService } from '@/generated'
import type { Pm_workflowchecklistconfigurations } from '@/generated/models/Pm_workflowchecklistconfigurationsModel'
import type { Pm_checklistresponses } from '@/generated/models/Pm_checklistresponsesModel'
import { unwrapList } from './common'

// ─── Mappers ────────────────────────────────────────────────────────────

const mapChecklistConfiguration = (item: Pm_workflowchecklistconfigurations): ChecklistConfigurationModel => {
  const rawItem = item as unknown as Record<string, unknown>
  return {
    pm_workflowchecklistconfigurationid: item.pm_workflowchecklistconfigurationid,
    pm_name: item.pm_name,
    pm_itemname: item.pm_itemname,
    pm_isrequired: item.pm_isrequired,
    _pm_workflowsteptemplate_value: rawItem._pm_workflowsteptemplate_value as string | undefined,
    statecode: item.statecode,
  }
}

const mapChecklistResponse = (item: Pm_checklistresponses): ChecklistResponseModel => {
  const rawItem = item as unknown as Record<string, unknown>
  return {
    pm_checklistresponseid: item.pm_checklistresponseid,
    pm_name: item.pm_name,
    pm_checklistitem: item.pm_checklistitem,
    pm_responseflag: item.pm_responseflag,
    _pm_checklistconfiguration_value: rawItem._pm_checklistconfiguration_value as string | undefined,
    _pm_workflowapprovalstep_value: rawItem._pm_workflowapprovalstep_value as string | undefined,
    statecode: item.statecode,
  }
}

// ─── Service Functions ────────────────────────────────────────────────

export async function fetchChecklistConfigurations(templateId: string): Promise<ChecklistConfigurationModel[]> {
  try {
    const result = await Pm_workflowchecklistconfigurationsService.getAll({
      filter: `_pm_workflowsteptemplate_value eq '${templateId}' and statecode eq 0`,
      select: ['pm_workflowchecklistconfigurationid', 'pm_name', 'pm_itemname', 'pm_isrequired', '_pm_workflowsteptemplate_value', 'statecode'],
      orderBy: ['createdon asc']
    })
    
    if (!result.success) {
      console.error('[ChecklistService] fetchChecklistConfigurations failed:', result.error)
      return []
    }
    const items = unwrapList<Pm_workflowchecklistconfigurations>(result)
    return items.map(mapChecklistConfiguration)
  } catch (err) {
    console.error('[ChecklistService] fetchChecklistConfigurations exception:', err)
    return []
  }
}

export async function fetchChecklistResponses(stepId: string): Promise<ChecklistResponseModel[]> {
  try {
    const result = await Pm_checklistresponsesService.getAll({
      filter: `_pm_workflowapprovalstep_value eq '${stepId}' and statecode eq 0`,
      select: ['pm_checklistresponseid', 'pm_name', 'pm_checklistitem', 'pm_responseflag', '_pm_checklistconfiguration_value', '_pm_workflowapprovalstep_value', 'statecode']
    })
    
    if (!result.success) {
      console.error('[ChecklistService] fetchChecklistResponses failed:', result.error)
      return []
    }
    const items = unwrapList<Pm_checklistresponses>(result)
    return items.map(mapChecklistResponse)
  } catch (err) {
    console.error('[ChecklistService] fetchChecklistResponses exception:', err)
    return []
  }
}

export interface SaveChecklistResponseDto {
  responseId?: string
  configId: string
  itemName: string
  isChecked: boolean
}

export async function saveChecklistResponses(stepId: string, responses: SaveChecklistResponseDto[]): Promise<void> {
  try {
    // We could use Promise.all to save them concurrently
    await Promise.all(responses.map(async (res) => {
      const payload: any = {
        pm_name: res.itemName,
        pm_checklistitem: res.itemName,
        pm_responseflag: res.isChecked,
        'pm_WorkflowApprovalStep@odata.bind': `/pm_workflowapprovalsteps(${stepId})`,
        'pm_ChecklistConfiguration@odata.bind': `/pm_workflowchecklistconfigurations(${res.configId})`
      }

      if (res.responseId) {
        // Update existing
        const updateResult = await Pm_checklistresponsesService.update(res.responseId, payload)
        if (!updateResult.success) {
           console.error('[ChecklistService] Failed to update response', updateResult.error)
        }
      } else {
        // Create new
        const createResult = await Pm_checklistresponsesService.create(payload)
        if (!createResult.success) {
           console.error('[ChecklistService] Failed to create response', createResult.error)
        }
      }
    }))
  } catch (err) {
    console.error('[ChecklistService] saveChecklistResponses exception:', err)
    throw err
  }
}

export async function createChecklistConfiguration(
  templateId: string, 
  name: string, 
  isRequired: boolean
): Promise<ChecklistConfigurationModel | null> {
  try {
    const payload: any = {
      pm_name: name,
      pm_itemname: name,
      pm_isrequired: isRequired,
      'pm_WorkflowStepTemplate@odata.bind': `/pm_workflowsteptemplates(${templateId})`
    }
    const result = await Pm_workflowchecklistconfigurationsService.create(payload)
    if (!result.success || !result.data) {
      console.error('[ChecklistService] createChecklistConfiguration failed:', result.error)
      return null
    }
    return mapChecklistConfiguration(result.data)
  } catch (err) {
    console.error('[ChecklistService] createChecklistConfiguration exception:', err)
    return null
  }
}

export async function deleteChecklistConfiguration(configId: string): Promise<boolean> {
  try {
    const result = await Pm_workflowchecklistconfigurationsService.delete(configId)
    // the delete method in the generated service returns void or success result depending on version
    return true
  } catch (err) {
    console.error('[ChecklistService] deleteChecklistConfiguration exception:', err)
    return false
  }
}
