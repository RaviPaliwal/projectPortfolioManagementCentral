import { Box, useTheme, alpha } from '@mui/material'
import { forwardRef, type ReactNode } from 'react'

export type StatusTagColor = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary' | 'default' | string

export interface StatusTagProps {
  label: string | number
  color?: StatusTagColor
  icon?: ReactNode
  variant?: 'subtle' | 'filled' | 'outlined'
  size?: 'small' | 'medium'
  sx?: any
  [key: string]: any
}

export const StatusTag = forwardRef<HTMLSpanElement, StatusTagProps>(({ 
  label, 
  color = 'default', 
  icon, 
  variant = 'subtle', 
  size = 'small', 
  sx = {},
  ...props 
}, ref) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Resolve semantic color to hex
  let baseColor = color
  let textBaseColor = color
  if (['success', 'warning', 'error', 'info', 'primary', 'secondary', 'default'].includes(color)) {
    const paletteKey = color === 'default' ? 'grey' : color
    baseColor = (theme.palette as any)[paletteKey]?.main || theme.palette.text.secondary
    textBaseColor = isDark 
      ? ((theme.palette as any)[paletteKey]?.light || baseColor)
      : baseColor
    if (color === 'default') {
      baseColor = isDark ? theme.palette.grey[500] : theme.palette.grey[700]
      textBaseColor = isDark ? theme.palette.grey[300] : theme.palette.grey[800]
    }
  }

  const styles: any = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.75,
    px: size === 'small' ? 1 : 1.5,
    py: size === 'small' ? 0.25 : 0.5,
    borderRadius: 1.15, // 12px with default spacing
    fontWeight: 700,
    fontSize: size === 'small' ? '0.725rem' : '0.8125rem',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
    ...sx,
  }

  if (variant === 'subtle') {
    Object.assign(styles, {
      bgcolor: alpha(baseColor, isDark ? 0.15 : 0.08),
      color: textBaseColor,
      border: `1px solid ${alpha(baseColor, isDark ? 0.3 : 0.15)}`,
      boxShadow: `0 1px 2px 0 ${alpha(baseColor, 0.1)}`,
    })
  } else if (variant === 'outlined') {
    Object.assign(styles, {
      border: `1px solid ${alpha(baseColor, 0.5)}`,
      color: textBaseColor,
      boxShadow: `0 1px 2px 0 ${alpha(baseColor, 0.05)}`,
    })
  } else {
    // Filled
    Object.assign(styles, {
      bgcolor: baseColor,
      color: theme.palette.getContrastText(baseColor),
    })
  }

  return (
    <Box ref={ref} component="span" sx={styles} {...props}>
      {icon && (
        <Box sx={{ 
          display: 'flex', 
          '& svg': { fontSize: size === 'small' ? 14 : 16 } 
        }}>
          {icon}
        </Box>
      )}
      {(label ?? '—').toString().toUpperCase()}
    </Box>
  )
})

export default StatusTag
