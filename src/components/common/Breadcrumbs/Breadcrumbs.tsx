import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material'

export interface BreadcrumbItem {
  label: string
  path?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  onNavigate?: (path: string) => void
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  const handleClick = (path?: string) => {
    if (path) {
      if (onNavigate) {
        onNavigate(path)
      }
    }
  }

  return (
    <MuiBreadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        if (isLast) {
          return (
            <Typography key={index} color="textPrimary" sx={{ fontWeight: 500 }}>
              {item.label}
            </Typography>
          )
        }

        return (
          <Link
            key={index}
            underline="hover"
            color="primary"
            sx={{ cursor: 'pointer' }}
            onClick={() => handleClick(item.path)}
          >
            {item.label}
          </Link>
        )
      })}
    </MuiBreadcrumbs>
  )
}

export default Breadcrumbs
