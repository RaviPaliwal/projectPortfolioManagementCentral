import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import {
  Box, Typography, Avatar, Select, MenuItem, FormControl,
  Tooltip, Popover, List, ListItemButton, ListItemAvatar,
  ListItemText, Badge,
} from '@mui/material'
import { SystemusersService, TeamsService, TeammembershipsService } from '@/generated'
import { StatusTag } from '@/components/common'
import { getPersonaFromUser } from '@/constants/permissions'
import type { Persona } from '@/constants/permissions'


export interface SystemUser {
  systemuserid: string
  fullname: string
  domainname?: string
  internalemailaddress?: string
  jobtitle?: string
  firstname?: string
  lastname?: string
  _businessunitid_value?: string
}

interface UserContextValue {
  currentUser: SystemUser | null
  setCurrentUser: (user: SystemUser) => void
  currentUserPersona: Persona
  userPersonas: Record<string, Persona>
  users: SystemUser[]
  loading: boolean
  refreshUsers: () => Promise<void>
  userRolesMap: Record<string, string[]>
  userTeams: Map<string, string[]>
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  setCurrentUser: () => {},
  currentUserPersona: 'TeamMember',
  userPersonas: {},
  users: [],
  loading: true,
  refreshUsers: async () => {},
  userRolesMap: {},
  userTeams: new Map(),
})

export function useUser() {
  return useContext(UserContext)
}

function normalizeGuid(id: string | undefined | null): string {
  if (!id) return ''
  return id.replace(/[{}]/g, '').toLowerCase()
}

function getLoggedInUserId(): string | null {
  try {
    const xrmContext = (window as any).Xrm?.Utility?.getGlobalContext() || (window.parent as any).Xrm?.Utility?.getGlobalContext()
    if (xrmContext?.userSettings?.userId) {
      return normalizeGuid(xrmContext.userSettings.userId)
    }
  } catch (e) {
    console.debug('[UserContext] Could not access Xrm context:', e)
  }
  return null
}

async function fetchUserRolesFromDataverse(): Promise<Record<string, string[]>> {
  const query = "?$select=systemuserid&$expand=systemuserroles_association($select=name,roleid)"
  const userRolesMap: Record<string, string[]> = {}

  // 1. Try Xrm.webApi (for production Power Apps context)
  try {
    const xrmContext = (window as any).Xrm || (window.parent as any).Xrm
    if (xrmContext?.webApi?.retrieveMultipleRecords) {
      console.info('[UserContext] Fetching user roles via Xrm.webApi...')
      const result = await xrmContext.webApi.retrieveMultipleRecords("systemuser", query)
      const entities = result?.entities || []
      for (const u of entities) {
        if (u.systemuserid && u.systemuserroles_association) {
          userRolesMap[normalizeGuid(u.systemuserid)] = u.systemuserroles_association.map((r: any) => (r && r.name) || '')
        }
      }
      console.info('[UserContext] Successfully fetched user roles via Xrm.webApi:', Object.keys(userRolesMap).length)
      return userRolesMap
    }
  } catch (e) {
    console.warn('[UserContext] Xrm.webApi failed to fetch user roles:', e)
  }

  // 2. Fall back to fetch (for local development proxy)
  try {
    console.info('[UserContext] Fetching user roles via relative Web API fetch...')
    const response = await fetch('/api/data/v9.2/systemusers' + query)
    if (response.ok) {
      const data = await response.json()
      const usersWithRoles = data.value || []
      for (const u of usersWithRoles) {
        if (u.systemuserid && u.systemuserroles_association) {
          userRolesMap[normalizeGuid(u.systemuserid)] = u.systemuserroles_association.map((r: any) => (r && r.name) || '')
        }
      }
      console.info('[UserContext] Successfully fetched user roles via fetch:', Object.keys(userRolesMap).length)
      return userRolesMap
    } else {
      console.warn('[UserContext] Failed to fetch user roles from Web API fetch, status:', response.status)
    }
  } catch (err) {
    console.warn('[UserContext] Error fetching user roles from Web API fetch:', err)
  }

  return userRolesMap
}

async function fetchTeamRolesFromDataverse(): Promise<Record<string, string[]>> {
  const query = "?$select=teamid,name&$expand=teamroles_association($select=name,roleid)"
  const teamRolesMap: Record<string, string[]> = {}

  // 1. Try Xrm.webApi (for production Power Apps context)
  try {
    const xrmContext = (window as any).Xrm || (window.parent as any).Xrm
    if (xrmContext?.webApi?.retrieveMultipleRecords) {
      console.info('[UserContext] Fetching team roles via Xrm.webApi...')
      const result = await xrmContext.webApi.retrieveMultipleRecords("team", query)
      const entities = result?.entities || []
      for (const t of entities) {
        if (t.teamid && t.teamroles_association) {
          teamRolesMap[normalizeGuid(t.teamid)] = t.teamroles_association.map((r: any) => (r && r.name) || '')
        }
      }
      console.info('[UserContext] Successfully fetched team roles via Xrm.webApi:', Object.keys(teamRolesMap).length)
      return teamRolesMap
    }
  } catch (e) {
    console.warn('[UserContext] Xrm.webApi failed to fetch team roles:', e)
  }

  // 2. Fall back to fetch (for local development proxy)
  try {
    console.info('[UserContext] Fetching team roles via relative Web API fetch...')
    const response = await fetch('/api/data/v9.2/teams' + query)
    if (response.ok) {
      const data = await response.json()
      const teamsWithRoles = data.value || []
      for (const t of teamsWithRoles) {
        if (t.teamid && t.teamroles_association) {
          teamRolesMap[normalizeGuid(t.teamid)] = t.teamroles_association.map((r: any) => (r && r.name) || '')
        }
      }
      console.info('[UserContext] Successfully fetched team roles via fetch:', Object.keys(teamRolesMap).length)
      return teamRolesMap
    } else {
      console.warn('[UserContext] Failed to fetch team roles from Web API fetch, status:', response.status)
    }
  } catch (err) {
    console.warn('[UserContext] Error fetching team roles from Web API fetch:', err)
  }

  return teamRolesMap
}

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null)
  const [users, setUsers] = useState<SystemUser[]>([])
  const [userPersonas, setUserPersonas] = useState<Record<string, Persona>>({})
  const [loading, setLoading] = useState(true)
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>({})
  const [userTeamsState, setUserTeamsState] = useState<Map<string, string[]>>(new Map())

  const handleSetCurrentUser = useCallback((user: SystemUser) => {
    setCurrentUser(user)
    if (user.systemuserid) {
      try {
        localStorage.setItem('ppm_selected_user_id', user.systemuserid)
      } catch (e) {
        console.debug('[UserContext] Failed to write to localStorage:', e)
      }
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [usersResult, teamsResult, membershipsResult] = await Promise.all([
        SystemusersService.getAll({
          select: ['systemuserid', 'fullname', 'domainname', 'internalemailaddress', 'jobtitle', 'firstname', 'lastname', '_businessunitid_value'] as any,
          filter: "isdisabled eq false",
          orderBy: ['fullname asc'],
          top: 200,
        }),
        TeamsService.getAll({
          select: ['teamid', 'name'],
          top: 500,
        }),
        TeammembershipsService.getAll({
          select: ['systemuserid', 'teamid'],
          top: 5000,
        })
      ])

      const list = unwrapUserList(usersResult).filter(u => !u.fullname?.startsWith('#'))
      const teams = unwrapList<any>(teamsResult)
      const memberships = unwrapList<any>(membershipsResult)

      // Build team lookup
      const teamIdToName = new Map<string, string>()
      for (const t of teams) {
        if (t.teamid && t.name) teamIdToName.set(normalizeGuid(t.teamid), t.name.toLowerCase())
      }

      // Build user to teams mapping (names and IDs)
      const userTeams = new Map<string, string[]>()
      const userTeamIds = new Map<string, string[]>()
      for (const m of memberships) {
        if (m.systemuserid && m.teamid) {
          const cleanUserId = normalizeGuid(m.systemuserid)
          const cleanTeamId = normalizeGuid(m.teamid)
          const teamName = teamIdToName.get(cleanTeamId)
          if (teamName) {
            if (!userTeams.has(cleanUserId)) {
              userTeams.set(cleanUserId, [])
            }
            userTeams.get(cleanUserId)!.push(teamName)
          }
          if (!userTeamIds.has(cleanUserId)) {
            userTeamIds.set(cleanUserId, [])
          }
          userTeamIds.get(cleanUserId)!.push(cleanTeamId)
        }
      }

      // Fetch user roles and team roles from Dataverse Web API
      const [userRolesMap, teamRolesMap] = await Promise.all([
        fetchUserRolesFromDataverse(),
        fetchTeamRolesFromDataverse()
      ])

      // Seed the logged-in user's roles from the Xrm context if available (instant and includes team-inherited roles)
      const loggedInId = getLoggedInUserId()
      if (loggedInId) {
        try {
          const xrmContext = (window as any).Xrm?.Utility?.getGlobalContext() || (window.parent as any).Xrm?.Utility?.getGlobalContext()
          const roleNames = xrmContext?.userSettings?.securityRoleNames
          if (roleNames && roleNames.length > 0) {
            userRolesMap[loggedInId] = roleNames
            console.info('[UserContext] Seeded logged-in user roles from Xrm userSettings:', roleNames)
          }
        } catch (e) {
          console.debug('[UserContext] Failed to get securityRoleNames from Xrm context:', e)
        }
      }

      // Resolve personas for all users
      const personas: Record<string, Persona> = {}
      console.info('[UserContext] --- Resolving Personas Diagnostic ---')
      for (const u of list) {
        const uId = u.systemuserid
        if (!uId) continue
        const cleanUserId = normalizeGuid(uId)

        const userTeamNames = [...(userTeams.get(cleanUserId) || [])]
        const uTeamIds = [...(userTeamIds.get(cleanUserId) || [])]

        // Implicitly inherit from the default business unit team (its ID matches the BU ID)
        if (u._businessunitid_value) {
          const cleanBuId = normalizeGuid(u._businessunitid_value)
          if (!uTeamIds.includes(cleanBuId)) {
            uTeamIds.push(cleanBuId)
          }
          const buTeamName = teamIdToName.get(cleanBuId)
          if (buTeamName && !userTeamNames.includes(buTeamName)) {
            userTeamNames.push(buTeamName)
          }
        }
        
        // Aggregate directly assigned roles and team-inherited roles
        const userRoleNames = [...(userRolesMap[cleanUserId] || [])]
        for (const teamId of uTeamIds) {
          const teamRoles = teamRolesMap[teamId] || []
          userRoleNames.push(...teamRoles)
        }
        
        const resolvedPersona = getPersonaFromUser(u, userTeamNames, userRoleNames)
        personas[cleanUserId] = resolvedPersona
        console.info(`User: "${u.fullname}", ID: "${cleanUserId}", JobTitle: "${u.jobtitle || ''}", Teams: [${userTeamNames.join(', ')}], Roles: [${userRoleNames.join(', ')}], Persona: "${resolvedPersona}"`)
      }
      console.info('[UserContext] -------------------------------------')

      setUserPersonas(personas)
      setUsers(list)
      setUserRolesMap(userRolesMap)
      setUserTeamsState(userTeams)
      
      if (!currentUser && list.length > 0) {
        let storedUserId: string | null = null
        try {
          storedUserId = localStorage.getItem('ppm_selected_user_id')
        } catch (e) {
          console.debug('[UserContext] Stored user ID not available from localStorage:', e)
        }
        
        let startingUser: SystemUser | null = null

        // Priority 1: Prioritize the detected logged-in user from Xrm context (production behavior)
        if (loggedInId) {
          startingUser = list.find(u => u.systemuserid?.toLowerCase() === loggedInId) || null
        }
        
        // Priority 2: Use stored selection from localStorage (local development fallback)
        if (!startingUser && storedUserId) {
          startingUser = list.find(u => u.systemuserid?.toLowerCase() === storedUserId.toLowerCase()) || null
        }
        
        // Priority 3: Fallback to the first user in the list
        if (!startingUser && list.length > 0) {
          startingUser = list[0]
        }
        
        if (startingUser) {
          setCurrentUser(startingUser)
        }
      }
    } catch (err) {
      console.warn('[UserContext] Failed to fetch system users and roles:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchUsers()
  }, [])

  const currentUserPersona = useMemo(() => {
    if (!currentUser || !currentUser.systemuserid) return 'TeamMember'
    return userPersonas[normalizeGuid(currentUser.systemuserid)] || 'TeamMember'
  }, [currentUser, userPersonas])

  return (
    <UserContext.Provider value={{
      currentUser,
      setCurrentUser: handleSetCurrentUser,
      currentUserPersona,
      userPersonas,
      users,
      loading,
      refreshUsers: fetchUsers,
      userRolesMap,
      userTeams: userTeamsState
    }}>
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

function unwrapList<T>(result: any): T[] {
  if (!result) return []
  if ('value' in result) return result.value as T[]
  if ('data' in result) return result.data as T[]
  if (Array.isArray(result)) return result
  return []
}

// ── User Selector Widget ─────────────────────────────────────────────────────

interface UserSelectorProps {
  variant?: 'compact' | 'full'
}

export function UserSelector({ variant = 'compact' }: UserSelectorProps) {
  const { currentUser, setCurrentUser, users, userPersonas, userRolesMap, userTeams, currentUserPersona } = useUser()

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
          {users.map((user) => {
            const cleanId = normalizeGuid(user.systemuserid)
            const persona = userPersonas[cleanId] || 'TeamMember'
            return (
              <MenuItem key={user.systemuserid} value={user.systemuserid}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#0ea5e9' }}>
                    {user.fullname?.charAt(0)?.toUpperCase() ?? '?'}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.fullname}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.jobtitle ? `${user.jobtitle} (${persona})` : persona}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            )
          })}
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
            const cleanId = normalizeGuid(user.systemuserid)
            const isActive = cleanId === normalizeGuid(currentUser?.systemuserid)
            const persona = userPersonas[cleanId] || 'TeamMember'
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
                  secondary={user.jobtitle ? `${user.jobtitle} • (${persona})` : `${user.domainname || ''} • (${persona})`}
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
