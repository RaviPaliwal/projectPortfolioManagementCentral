import { Box } from '@mui/material'
import type { ReactNode } from 'react'

export interface TabPanelProps {
  children: ReactNode
  value: number
  index: number
  /** Padding top value. Default 2 (theme spacing) */
  pt?: number
}

export const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, pt }) => {
  return value === index ? <Box sx={{ pt: pt ?? 2 }}>{children}</Box> : null
}

export default TabPanel
