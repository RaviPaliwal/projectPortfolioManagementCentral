import { Chip as MuiChip } from '@mui/material'
import type { ChipProps as MuiChipProps } from '@mui/material/Chip'

export interface ChipProps extends MuiChipProps {
  label: string
  variant?: 'filled' | 'outlined'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'small' | 'medium'
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'filled',
  color = 'default',
  size = 'small',
  ...props
}) => {
  return (
    <MuiChip
      label={label}
      variant={variant}
      color={color as any}
      size={size}
      {...props}
    />
  )
}

export default Chip
