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
  subtitle?: ReactNode
  /** Optional action button shown on the right */
  action?: PageHeaderAction
  /** Custom action element (overrides action prop if provided) */
  actionElement?: ReactNode
  /** Optional breadcrumb or caption above title */
  caption?: string
  /** Style overrides */
  sx?: any
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, actionElement, caption, sx }) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', ...sx }}>
      <Box>
        {caption && (
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '10px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {caption}
          </Typography>
        )}
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.03em', mb: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography component="div" variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
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
