import { Card as MuiCard, CardContent, CardHeader } from '@mui/material'
import type { CardProps as MuiCardProps } from '@mui/material/Card'

export interface CardProps extends Omit<MuiCardProps, 'title'> {
  title?: string
  subtitle?: string
  children: React.ReactNode
  elevation?: number
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  elevation = 1,
  ...props
}) => {
  return (
    <MuiCard elevation={elevation} {...props}>
      {title && (
        <CardHeader
          title={title}
          subheader={subtitle}
          titleTypographyProps={{ variant: 'h6' }}
          subheaderTypographyProps={{ variant: 'body2' }}
        />
      )}
      <CardContent>{children}</CardContent>
    </MuiCard>
  )
}

export default Card
