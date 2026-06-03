import { Box, Tooltip, useTheme, alpha } from '@mui/material'
import type { ReactNode } from 'react'

interface ActionIconProps {
  icon: ReactNode
  onClick: () => void
  label?: string
  color?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'default'
  size?: number
}

export const ActionIcon: React.FC<ActionIconProps> = ({
  icon,
  onClick,
  label,
  color = 'default',
  size = 20
}) => {
  const theme = useTheme()

  const getColor = () => {
    if (color === 'default') return theme.palette.text.secondary
    return theme.palette[color].main
  }

  const hoverColor = color === 'default' ? theme.palette.primary.main : theme.palette[color].dark

  return (
    <Tooltip title={label ?? ''} disableHoverListener={!label}>
      <Box
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: getColor(),
          transition: 'all 0.2s ease',
          p: 0.5,
          borderRadius: '4px',
          '&:hover': {
            color: hoverColor,
            bgcolor: alpha(hoverColor, 0.08),
          },
          '& svg': {
            fontSize: size,
          }
        }}
      >
        {icon}
      </Box>
    </Tooltip>
  )
}

export default ActionIcon
