import { useEffect } from 'react'

export interface BreadcrumbItem {
  label: string
  path?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  onNavigate?: (path: string) => void
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  useEffect(() => {
    const event = new CustomEvent('set-breadcrumbs', { detail: { items, onNavigate } })
    window.dispatchEvent(event)
    
    return () => {
      window.dispatchEvent(new CustomEvent('set-breadcrumbs', { detail: null }))
    }
  }, [items, onNavigate])

  return null
}

export default Breadcrumbs
