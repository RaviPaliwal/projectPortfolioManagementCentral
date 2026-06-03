import { Box, Typography, Drawer, Tabs, Tab, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { ReactNode, SyntheticEvent } from 'react'
import { ActionIcon } from '../ActionIcon/ActionIcon'
import { fontSizes } from '@/styles'

export interface DetailDrawerTab {
  label: string
  count?: number
}

export interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  /** Icon displayed next to the title */
  icon?: ReactNode
  /** Primary title text */
  title: string
  /** Subtitle nodes (e.g., meta info, chips, dates) */
  subtitle?: ReactNode
  /** Extra header action elements (e.g., edit button) */
  headerActions?: ReactNode
  /** Tab configuration */
  tabs?: DetailDrawerTab[]
  /** Current tab index (controlled by parent) */
  tabValue?: number
  /** Tab change handler (controlled by parent). Supports either `(value: number) => void` or `(event, value) => void` */
  onTabChange?: ((event: SyntheticEvent, value: number) => void) | ((value: number) => void)
  /** Content to render in the drawer body */
  children?: ReactNode
  /** Drawer width */
  width?: number | Record<string, number | string>
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  open,
  onClose,
  icon,
  title,
  subtitle,
  headerActions,
  tabs,
  tabValue,
  onTabChange,
  children,
  width = { xs: '100%', sm: 560, md: 640 },
}) => {
  const theme = useTheme()

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { invisible: true },
        paper: {
          sx: {
            width,
            p: 0,
            bgcolor: 'background.paper',
            borderLeft: `1px solid ${theme.palette.divider}`,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: subtitle ? 0.5 : 0 }}>
                {icon && icon}
                <Typography variant="h6" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {title}
                </Typography>
              </Box>
              {subtitle && (
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                  {subtitle}
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0, ml: 2 }}>
              {headerActions}
              <ActionIcon icon={<CloseIcon />} onClick={onClose} label="Close" />
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <Tabs
            value={tabValue ?? 0}
            onChange={(e, v) => {
              if (!onTabChange) return
              if ((onTabChange as Function).length >= 2) {
                (onTabChange as (e: SyntheticEvent, v: number) => void)(e, v)
              } else {
                (onTabChange as (v: number) => void)(v)
              }
            }}
            variant="fullWidth"
            sx={{
              borderBottom: `1px solid ${theme.palette.divider}`,
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: fontSizes.smMd, minHeight: 44 },
            }}
          >
            {tabs.map((tab, idx) => (
              <Tab
                key={idx}
                label={tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label}
              />
            ))}
          </Tabs>
        )}

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
          {children}
        </Box>
      </Box>
    </Drawer>
  )
}

export default DetailDrawer
