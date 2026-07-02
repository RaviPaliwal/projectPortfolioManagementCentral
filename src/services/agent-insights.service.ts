import { Pm_agentinsightsService } from '@/generated'
import type { Pm_agentinsights } from '@/generated/models/Pm_agentinsightsModel'
import {
  Pm_agentinsightspm_insighttype,
  Pm_agentinsightspm_priority,
  Pm_agentinsightspm_actionstatus,
} from '@/generated/models/Pm_agentinsightsModel'
import type { IGetAllOptions } from '@/generated/models/CommonModels'
import { unwrapList } from '@/services/common'

export interface AgentInsightModel {
  id: string
  title: string
  description: string
  type: 'Alert' | 'Suggestion'
  priority: 'Low' | 'Medium' | 'High'
  typeCode: number
  priorityCode: number
  actionStatus: string
  confidenceScore: number
  sourceAgent: string
  createdOn?: string
}

const sanitizeText = (text: string) => {
  if (!text) return ''
  return text
    .replace(/\(Project ID: [0-9a-fA-F\-]{36}\)/gi, '')
    .replace(/Project[ -][0-9a-fA-F]{8}\b/gi, 'Project')
    .replace(/Project[ -][0-9a-fA-F\-]{36}/gi, 'Project')
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/ — $/g, '')
    .trim()
}

export const mapAgentInsight = (item: Pm_agentinsights): AgentInsightModel => ({
  id: item.pm_agentinsightid,
  title: sanitizeText(item.pm_insighttitle || ''),
  description: sanitizeText(item.pm_insightdescription || ''),
  type: Pm_agentinsightspm_insighttype[item.pm_insighttype as keyof typeof Pm_agentinsightspm_insighttype] || 'Suggestion',
  priority: Pm_agentinsightspm_priority[item.pm_priority as keyof typeof Pm_agentinsightspm_priority] || 'Medium',
  typeCode: Number(item.pm_insighttype ?? 125570001),
  priorityCode: Number(item.pm_priority ?? 1),
  actionStatus: Pm_agentinsightspm_actionstatus[item.pm_actionstatus as keyof typeof Pm_agentinsightspm_actionstatus] || 'Unreviewed',
  confidenceScore: item.pm_confidencescore ?? 0,
  sourceAgent: item.pm_sourceagent || 'AI',
  createdOn: item.createdon,
})

export async function fetchAgentInsights(): Promise<AgentInsightModel[]> {
  try {
    const options: IGetAllOptions = {
      select: [
        'pm_agentinsightid', 'pm_insighttitle', 'pm_insightdescription',
        'pm_insighttype', 'pm_priority', 'pm_actionstatus',
        'pm_confidencescore', 'pm_sourceagent',
        'createdon',
      ],
      orderBy: ['createdon desc'],
      top: 100,
    }
    const result = await Pm_agentinsightsService.getAll(options)
    if (!result.success) {
      console.error('[AgentInsightsService] fetchAgentInsights failed:', result.error)
      return []
    }
    const items = unwrapList<Pm_agentinsights>(result)
    const unreviewed = items.filter(
      (i) => i.pm_actionstatus === undefined || i.pm_actionstatus === null || String(i.pm_actionstatus) === '125570000'
    )
    return unreviewed.map(mapAgentInsight)
  } catch (err) {
    console.error('[AgentInsightsService] fetchAgentInsights exception:', err)
    return []
  }
}

