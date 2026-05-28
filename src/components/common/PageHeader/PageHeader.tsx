import { Box, Typography, Button } from '@mui/material'
import type { ReactNode } from 'react'
import { fontSizes } from '../../../styles'

export interface PageHeaderAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'contained' | 'outlined'
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Optional action button shown on the right */
  action?: PageHeaderAction
  /** Custom action element (overrides action prop if provided) */
  actionElement?: ReactNode
  /** Optional breadcrumb or caption above title */
  caption?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, actionElement, caption }) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        {caption && (
          <Typography variant="caption" color="primary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: fontSizes.sm }}>
            {caption}
          </Typography>
        )}
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actionElement}
      {!actionElement && action && (
        <Button
          variant={action.variant ?? 'contained'}
          startIcon={action.icon}
          onClick={action.onClick}
          disabled={action.disabled}
          color={action.color ?? 'primary'}
          sx={{ px: 3, whiteSpace: 'nowrap' }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  )
}

export default PageHeader
