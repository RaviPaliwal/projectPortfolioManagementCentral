import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import {
  Box, Typography, Avatar, Select, MenuItem, FormControl,
  Tooltip, Popover, List, ListItemButton, ListItemAvatar,
  ListItemText, Badge,
} from '@mui/material'
import { SystemusersService, TeamsService, TeammembershipsService } from '@/generated'
import { StatusTag } from '@/components/common'
import { getPersonaFromUser, setPersonaOverride, getAllPersonaOverrides, getPersonaFromTeamName, formatPersonaName } from '@/constants/permissions'
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
  personaOverrides: Record<string, Persona>
  setPersonaOverride: (userId: string, persona: Persona | null) => void
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
  personaOverrides: {},
  setPersonaOverride: () => {},
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
      const result = await xrmContext.webApi.retrieveMultipleRecords("systemuser", query)
      const entities = result?.entities || []
      for (const u of entities) {
        if (u.systemuserid && u.systemuserroles_association) {
          userRolesMap[normalizeGuid(u.systemuserid)] = u.systemuserroles_association.map((r: any) => (r && r.name) || '')
        }
      }
      return userRolesMap
    }
  } catch (e) {
  }

  // 2. Fall back to fetch (for local development proxy)
  try {
    const response = await fetch('/api/data/v9.2/systemusers' + query)
    if (response.ok) {
      const data = await response.json()
      const usersWithRoles = data.value || []
      for (const u of usersWithRoles) {
        if (u.systemuserid && u.systemuserroles_association) {
          userRolesMap[normalizeGuid(u.systemuserid)] = u.systemuserroles_association.map((r: any) => (r && r.name) || '')
        }
      }
      return userRolesMap
    }
  } catch (err) {
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
      const result = await xrmContext.webApi.retrieveMultipleRecords("team", query)
      const entities = result?.entities || []
      for (const t of entities) {
        if (t.teamid && t.teamroles_association) {
          teamRolesMap[normalizeGuid(t.teamid)] = t.teamroles_association.map((r: any) => (r && r.name) || '')
        }
      }
      return teamRolesMap
    }
  } catch (e) {
  }

  // 2. Fall back to fetch (for local development proxy)
  try {
    const response = await fetch('/api/data/v9.2/teams' + query)
    if (response.ok) {
      const data = await response.json()
      const teamsWithRoles = data.value || []
      for (const t of teamsWithRoles) {
        if (t.teamid && t.teamroles_association) {
          teamRolesMap[normalizeGuid(t.teamid)] = t.teamroles_association.map((r: any) => (r && r.name) || '')
        }
      }
      return teamRolesMap
    }
  } catch (err) {
  }

  return teamRolesMap
}

function getSessionCachedData() {
  try {
    const cu = sessionStorage.getItem('ppm_cached_current_user')
    const u = sessionStorage.getItem('ppm_cached_users')
    const p = sessionStorage.getItem('ppm_cached_personas')
    const r = sessionStorage.getItem('ppm_cached_roles_map')
    const t = sessionStorage.getItem('ppm_cached_teams')
    
    if (cu && u && p && r && t) {
      return {
        currentUser: JSON.parse(cu) as SystemUser,
        users: JSON.parse(u) as SystemUser[],
        userPersonas: JSON.parse(p) as Record<string, Persona>,
        userRolesMap: JSON.parse(r) as Record<string, string[]>,
        userTeams: new Map<string, string[]>(Object.entries(JSON.parse(t))),
        loading: false
      }
    }
  } catch (e) {
    console.warn('[UserContext] Failed to parse cached session data', e)
  }
  return null
}

export function UserContextProvider({ children }: { children: ReactNode }) {
  const cached = getSessionCachedData()

  const [currentUser, setCurrentUser] = useState<SystemUser | null>(cached?.currentUser ?? null)
  const [users, setUsers] = useState<SystemUser[]>(cached?.users ?? [])
  const [userPersonas, setUserPersonas] = useState<Record<string, Persona>>(cached?.userPersonas ?? {})
  const [loading, setLoading] = useState(cached ? false : true)
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>(cached?.userRolesMap ?? {})
  const [userTeamsState, setUserTeamsState] = useState<Map<string, string[]>>(cached?.userTeams ?? new Map())

  // ── Refs to break circular deps and prevent stale closures ─────────────
  const currentUserRef = useRef<SystemUser | null>(null)
  const mountedRef = useRef(true)
  const initialLoadDoneRef = useRef(!!cached)

  // Keep ref in sync with state
  currentUserRef.current = currentUser

  const handleSetCurrentUser = useCallback((user: SystemUser) => {
    setCurrentUser(user)
    if (user.systemuserid) {
      try {
        localStorage.setItem('ppm_selected_user_id', user.systemuserid)
        localStorage.setItem('ppm_selected_user_fullname', user.fullname || '')
        sessionStorage.setItem('ppm_cached_current_user', JSON.stringify(user))
      } catch (e) {
        console.warn('[UserContext] Failed to persist user selection to localStorage/sessionStorage', e)
      }
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    // Skip loading spinner on re-fetches after initial load (e.g. HMR re-mount)
    if (!initialLoadDoneRef.current) {
      setLoading(true)
    }

    const executeWithRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        if (retries <= 0) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeWithRetry(fn, retries - 1, delay * 2);
      }
    };

    try {
      const [
        usersResult,
        teamsResult,
        membershipsResult,
        userRolesMap,
        teamRolesMap
      ] = await Promise.all([
        executeWithRetry(() => SystemusersService.getAll({
          select: ['systemuserid', 'fullname', 'domainname', 'internalemailaddress', 'jobtitle', 'firstname', 'lastname', '_businessunitid_value'] as any,
          filter: "isdisabled eq false",
          orderBy: ['fullname asc'],
          top: 200,
        })),
        executeWithRetry(() => TeamsService.getAll({
          select: ['teamid', 'name'],
          top: 500,
        })),
        executeWithRetry(() => TeammembershipsService.getAll({
          select: ['systemuserid', 'teamid'],
          top: 5000,
        })),
        executeWithRetry(() => fetchUserRolesFromDataverse()),
        executeWithRetry(() => fetchTeamRolesFromDataverse())
      ])

      if (!mountedRef.current) return

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

      // Seed the logged-in user's roles from the Xrm context if available (instant and includes team-inherited roles)
      const loggedInId = getLoggedInUserId()
      if (loggedInId) {
        try {
          const xrmContext = (window as any).Xrm?.Utility?.getGlobalContext() || (window.parent as any).Xrm?.Utility?.getGlobalContext()
          const roleNames = xrmContext?.userSettings?.securityRoleNames
          if (roleNames && roleNames.length > 0) {
            userRolesMap[loggedInId] = roleNames
          }
        } catch (e) {
        }
      }

      if (!mountedRef.current) return

      // Resolve personas for all users (overrides applied inside getPersonaFromUser)
      const personas: Record<string, Persona> = {}
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
      }
      
      // Apply any stored overrides (in case they were set while this list was cached)
      const storedOverrides = getAllPersonaOverrides()
      for (const [userId, persona] of Object.entries(storedOverrides)) {
        personas[userId] = persona
      }

      if (!mountedRef.current) return

      setUserPersonas(personas)
      setUsers(list)
      setUserRolesMap(userRolesMap)
      setUserTeamsState(userTeams)
      
      // Save to sessionStorage cache
      try {
        sessionStorage.setItem('ppm_cached_users', JSON.stringify(list))
        sessionStorage.setItem('ppm_cached_personas', JSON.stringify(personas))
        sessionStorage.setItem('ppm_cached_roles_map', JSON.stringify(userRolesMap))
        sessionStorage.setItem('ppm_cached_teams', JSON.stringify(Object.fromEntries(userTeams.entries())))
      } catch (e) {
        console.warn('[UserContext] Failed to save session cache', e)
      }
      
      // Use ref value instead of state for the guard to avoid stale closure issues
      let currentSelection = currentUserRef.current
      if (!currentSelection && list.length > 0) {
        let storedUserId: string | null = null
        try {
          storedUserId = localStorage.getItem('ppm_selected_user_id')
        } catch (e) {
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
          currentSelection = startingUser
          setCurrentUser(startingUser)
          if (startingUser.systemuserid) {
            try {
              localStorage.setItem('ppm_selected_user_id', startingUser.systemuserid)
              localStorage.setItem('ppm_selected_user_fullname', startingUser.fullname || '')
            } catch (e) {
              console.warn('[UserContext] Failed to persist user selection to localStorage', e)
            }
          }
        }
      }

      // Also ensure currentSelection is cached in sessionStorage
      if (currentSelection) {
        try {
          sessionStorage.setItem('ppm_cached_current_user', JSON.stringify(currentSelection))
        } catch (e) {
          console.warn('[UserContext] Failed to cache current user to sessionStorage', e)
        }
      }

      initialLoadDoneRef.current = true
    } catch (err) {
      console.error('[UserContext] Failed to fetch users/teams:', err)
      // Fallback: try loading cached session data to keep app usable
      const backup = getSessionCachedData()
      if (backup && mountedRef.current) {
        console.warn('[UserContext] Loading fallback cached session data.')
        setCurrentUser(backup.currentUser)
        setUsers(backup.users)
        setUserPersonas(backup.userPersonas)
        setUserRolesMap(backup.userRolesMap)
        setUserTeamsState(backup.userTeams)
      }
    } finally {
      setLoading(false)
      initialLoadDoneRef.current = true
    }
  }, []) // Stable — uses refs instead of state for guards

  useEffect(() => {
    mountedRef.current = true
    fetchUsers()
    return () => {
      mountedRef.current = false
    }
  }, [fetchUsers])

  const currentUserPersona = useMemo(() => {
    if (!currentUser || !currentUser.systemuserid) return 'TeamMember'
    return userPersonas[normalizeGuid(currentUser.systemuserid)] || 'TeamMember'
  }, [currentUser, userPersonas])

  useEffect(() => {
    try {
      sessionStorage.setItem('ppm_current_user_persona', currentUserPersona)
    } catch (e) {
      console.warn('[UserContext] Failed to save persona to sessionStorage', e)
    }
  }, [currentUserPersona])

  const handleSetPersonaOverride = useCallback((userId: string, persona: Persona | null) => {
    setPersonaOverride(userId, persona)
    // Re-fetch user data to recalculate personas
    fetchUsers()
  }, [fetchUsers])

  const personaOverrides = useMemo(() => getAllPersonaOverrides(), [userPersonas])

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
      userTeams: userTeamsState,
      personaOverrides,
      setPersonaOverride: handleSetPersonaOverride,
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
  const { currentUser, setCurrentUser, users, userPersonas, userRolesMap, userTeams, currentUserPersona, personaOverrides, setPersonaOverride: setOverride } = useUser()

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
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.fullname}
                    </Box>
                  }
                  secondary={user.jobtitle ? user.jobtitle : (user.domainname || '')}
                  slotProps={{
                    primary: { sx: { fontWeight: isActive ? 700 : 500, fontSize: '0.875rem' } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
                <Box sx={{ display: 'flex', gap: 0.25, ml: 1, flexShrink: 0, alignItems: 'center' }}>
                  {user.systemuserid && userTeams.has(cleanId) && userTeams.get(cleanId)!.length > 1 && (() => {
                    const teamNames = userTeams.get(cleanId)!
                    const currentOverride = personaOverrides[cleanId]
                    return (
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                          value={currentOverride || persona}
                          displayEmpty
                          onChange={(e) => {
                            const val = e.target.value
                            setOverride(user.systemuserid!, (val as Persona) || null)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          renderValue={(selected) => (
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                              {formatPersonaName(selected as Persona)}
                            </Typography>
                          )}
                          sx={{
                            fontSize: '0.7rem',
                            height: 22,
                            '& .MuiSelect-select': { py: 0, pr: '16px !important', pl: 0.5 },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: currentOverride ? 'warning.main' : 'divider' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'warning.main' },
                          }}
                        >
                          {currentOverride && (
                            <MenuItem value="">
                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Clear override
                              </Typography>
                            </MenuItem>
                          )}
                          {Array.from(new Set(teamNames.map(getPersonaFromTeamName))).map((p) => (
                            <MenuItem key={p} value={p}>
                              <Typography variant="caption" sx={{ fontWeight: currentOverride === p ? 700 : 400 }}>
                                {formatPersonaName(p)}
                              </Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )
                  })()}
                  {isActive && (
                    <StatusTag label="Active" color="success" variant="outlined" />
                  )}
                </Box>
              </ListItemButton>
            )
          })}
        </List>

      </Popover>
    </>
  )
}

export default UserContextProvider
