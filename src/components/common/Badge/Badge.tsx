import { Badge as MuiBadge } from '@mui/material'
import type { BadgeProps as MuiBadgeProps } from '@mui/material/Badge'

export interface BadgeProps extends MuiBadgeProps {
  variant?: 'standard' | 'dot'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  children: React.ReactElement
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'standard',
  color = 'primary',
  ...props
}) => {
  return (
    <MuiBadge
      variant={variant}
      color={color as any}
      {...props}
    />
  )
}

export default Badge
