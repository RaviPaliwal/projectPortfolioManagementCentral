import { Box, Typography, Button, useTheme } from '@mui/material'
import type { ReactNode } from 'react'
import { fontSizes } from '../../../styles'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  sx?: any
}

export const EmptyState = ({ icon, title, description, action, sx = {} }: EmptyStateProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 2,
        ...sx,
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 2.5,
            color: 'text.disabled',
            display: 'flex',
            '& svg': { fontSize: 64, opacity: 0.5 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}
        >
          {description}
        </Typography>
      )}
      {action && (
        <Button
          variant="outlined"
          startIcon={action.icon}
          onClick={action.onClick}
          sx={{ borderRadius: 1.15, px: 3 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  )
}

export default EmptyState
