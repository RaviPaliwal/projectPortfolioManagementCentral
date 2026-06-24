import { useEffect, type ReactNode } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useUser } from '@/context/UserContext'
import { PERSONA_PERMISSIONS } from '@/constants/permissions'
import type { TabKey } from '@/components/layout/PrimaryShell'

function guardActiveTab(tab: TabKey, allowedTabs: TabKey[]): TabKey {
  if (allowedTabs.length === 0) return tab
  if (allowedTabs.includes(tab)) return tab
  return allowedTabs.includes('dashboard' as TabKey) ? 'dashboard' as TabKey : allowedTabs[0]
}

interface RouteGuardProps {
  children: ReactNode
  activeTab: TabKey
  onChangeTab: (tab: TabKey) => void
}

/**
 * RouteGuard — prevents unauthorized page content from mounting.
 *
 * While UserContext is still loading (fetching users/roles/teams/personas),
 * shows a centered loading spinner. Once the persona is resolved,
 * checks if `activeTab` is in the persona's allowed tabs.
 *
 * If the tab is NOT allowed → triggers a redirect via `onChangeTab`
 * and returns `null` (never renders the page children).
 *
 * If the tab IS allowed → renders children as-is.
 *
 * This eliminates the "flash of unauthorized content" that occurred with
 * the previous approach (useEffect redirect after page mount).
 */
export default function RouteGuard({ children, activeTab, onChangeTab }: RouteGuardProps) {
  const { currentUserPersona, loading, currentUser } = useUser()

  // Compute allowed tabs and guarded tab unconditionally (used by both effect and JSX)
  const allowedTabs = PERSONA_PERMISSIONS[currentUserPersona] || []
  const guardedTab = guardActiveTab(activeTab, allowedTabs)

  // ── Hooks must be before any conditional returns ───────────────────────
  // When persona resolves and the tab is not allowed, redirect via onChangeTab.
  // The page children never render because we return null below.
  useEffect(() => {
    if (loading) return
    if (guardedTab !== activeTab) {
      onChangeTab(guardedTab)
    }
  }, [loading, guardedTab, activeTab, onChangeTab])

  // ── Context still loading → show spinner (prevents flash of wrong content)
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading user context…
          </Typography>
        </Box>
      </Box>
    )
  }

  // ── Tab not allowed → render nothing (effect above handles redirect)
  if (guardedTab !== activeTab) {
    return null
  }

  // ── Allowed → render children (keyed to force unmount/remount on user change) ──
  return (
    <div key={currentUser?.systemuserid || 'none'} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
