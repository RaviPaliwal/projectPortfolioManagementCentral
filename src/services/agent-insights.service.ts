import { Pm_agentinsightsService } from '@/generated'
import type { Pm_agentinsights } from '@/generated/models/Pm_agentinsightsModel'
import {
  Pm_agentinsightspm_insighttype,
  Pm_agentinsightspm_priority,
  Pm_agentinsightspm_actionstatus,
} from '@/generated/models/Pm_agentinsightsModel'
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

export const mapAgentInsight = (item: Pm_agentinsights): AgentInsightModel => ({
  id: item.pm_agentinsightid,
  title: item.pm_insighttitle || '',
  description: item.pm_insightdescription || '',
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
    const result = await Pm_agentinsightsService.getAll({
      select: [
        'pm_agentinsightid', 'pm_insighttitle', 'pm_insightdescription',
        'pm_insighttype', 'pm_priority', 'pm_actionstatus',
        'pm_confidencescore', 'pm_sourceagent',
        'createdon',
      ],
      orderBy: ['createdon desc'],
      top: 100,
    })
    const items = unwrapList<Pm_agentinsights>(result)
    const unreviewed = items.filter(
      (i) => i.pm_actionstatus === undefined || i.pm_actionstatus === null || String(i.pm_actionstatus) === '125570000'
    )
    return unreviewed.map(mapAgentInsight)
  } catch (err) {
    return []
  }
}
