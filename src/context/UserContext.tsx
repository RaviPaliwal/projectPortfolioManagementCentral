import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  Box, Typography, Avatar, Select, MenuItem, FormControl,
  Tooltip, Popover, List, ListItemButton, ListItemAvatar,
  ListItemText, Badge,
} from '@mui/material'
import { SystemusersService } from '@/generated'
import { StatusTag } from '@/components/common'


export interface SystemUser {
  systemuserid: string
  fullname: string
  domainname?: string
  internalemailaddress?: string
  jobtitle?: string
  firstname?: string
  lastname?: string
}

interface UserContextValue {
  currentUser: SystemUser | null
  setCurrentUser: (user: SystemUser) => void
  users: SystemUser[]
  loading: boolean
  refreshUsers: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  setCurrentUser: () => {},
  users: [],
  loading: true,
  refreshUsers: async () => {},
})

export function useUser() {
  return useContext(UserContext)
}

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null)
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await SystemusersService.getAll({
        select: ['systemuserid', 'fullname', 'domainname', 'internalemailaddress', 'jobtitle', 'firstname', 'lastname'],
        filter: "isdisabled eq false",
        orderBy: ['fullname asc'],
        top: 200,
      })
      const list = unwrapUserList(result).filter(u => !u.fullname?.startsWith('#'))
      setUsers(list)
      if (!currentUser && list.length > 0) {
        setCurrentUser(list[0])
      }
    } catch {
      console.warn('[UserContext] Failed to fetch system users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, users, loading, refreshUsers: fetchUsers }}>
      {children}
    </UserContext.Provider>
  )
}

function unwrapUserList(result: any): SystemUser[] {
  if (!result) return []
  if ('value' in result) return result.value as SystemUser[]
  if ('data' in result) return result.data as SystemUser[]
  if (Array.isArray(result)) return result
  return []
}

// ── User Selector Widget ─────────────────────────────────────────────────────

interface UserSelectorProps {
  variant?: 'compact' | 'full'
}

export function UserSelector({ variant = 'compact' }: UserSelectorProps) {
  const { currentUser, setCurrentUser, users } = useUser()

  if (variant === 'full') {
    return (
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <Select
          value={currentUser?.systemuserid ?? ''}
          onChange={(e) => {
            const user = users.find((u) => u.systemuserid === e.target.value)
            if (user) setCurrentUser(user)
          }}
          displayEmpty
          renderValue={(selected) => {
            if (!selected) return <Typography variant="body2" color="text.secondary">Select user…</Typography>
            const user = users.find((u) => u.systemuserid === selected)
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: '#0ea5e9' }}>
                  {user?.fullname?.charAt(0)?.toUpperCase() ?? '?'}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.fullname ?? 'Unknown'}</Typography>
              </Box>
            )
          }}
          sx={{ borderRadius: 1.15 }}
        >
          {users.map((user) => (
            <MenuItem key={user.systemuserid} value={user.systemuserid}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#0ea5e9' }}>
                  {user.fullname?.charAt(0)?.toUpperCase() ?? '?'}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.fullname}</Typography>
                  {user.jobtitle && (
                    <Typography variant="caption" color="text.secondary">{user.jobtitle}</Typography>
                  )}
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  // Compact variant — a clickable avatar chip
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  return (
    <>
      <Tooltip title={`Signed in as ${currentUser?.fullname ?? 'Unknown'}`}>
        <StatusTag
          icon={
            <Avatar sx={{ bgcolor: '#0ea5e9', width: 24, height: 24 }}>
              {currentUser?.fullname?.charAt(0)?.toUpperCase() ?? '?'}
            </Avatar>
          }
          label={currentUser?.fullname?.split(' ')[0] ?? 'User'}
          variant="outlined"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            fontWeight: 600,
            cursor: 'pointer',
          }}
        />
      </Tooltip>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: 1.15, minWidth: 260, maxHeight: 400, mt: 1 } } }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Switch User</Typography>
          <Typography variant="caption" color="text.secondary">Select a user to view their tasks</Typography>
        </Box>
        <List dense sx={{ py: 0.5 }}>
          {users.map((user) => {
            const isActive = user.systemuserid === currentUser?.systemuserid
            return (
              <ListItemButton
                key={user.systemuserid}
                selected={isActive}
                onClick={() => { setCurrentUser(user); setAnchorEl(null) }}
                sx={{ borderRadius: 1.15, mx: 0.5, my: 0.25 }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color={isActive ? 'success' : 'default'}
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: isActive ? '#0ea5e9' : '#94a3b8', fontSize: 14 }}>
                      {user.fullname?.charAt(0)?.toUpperCase() ?? '?'}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={user.fullname}
                  secondary={user.jobtitle || user.domainname || ''}
                  slotProps={{
                    primary: { sx: { fontWeight: isActive ? 700 : 500, fontSize: '0.875rem' } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
                {isActive && (
                  <StatusTag label="Active" color="success" variant="outlined" />
                )}
              </ListItemButton>
            )
          })}
        </List>
      </Popover>
    </>
  )
}

export default UserContextProvider
