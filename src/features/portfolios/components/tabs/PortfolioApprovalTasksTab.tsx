import React from 'react'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import { MODULE_NAMES } from '@/constants/moduleNames'

interface PortfolioApprovalTasksTabProps {
  portfolioId: string
  tabValue: number
  index: number
}

export const PortfolioApprovalTasksTab: React.FC<PortfolioApprovalTasksTabProps> = ({
  portfolioId,
  tabValue,
  index,
}) => {
  return (
    <EntityApprovalTasks
      entityId={portfolioId}
      moduleName={MODULE_NAMES.PORTFOLIOS.value}
      entityLabel="Portfolio"
      tabValue={tabValue}
      index={index}
    />
  )
}

export default PortfolioApprovalTasksTab
