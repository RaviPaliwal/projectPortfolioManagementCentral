import { Button as MuiButton } from '@mui/material'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'

export interface ButtonProps extends MuiButtonProps {
  variant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  isLoading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  size = 'medium',
  isLoading = false,
  disabled,
  children,
  ...props
}) => {
  return (
    <MuiButton
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </MuiButton>
  )
}

export default Button
