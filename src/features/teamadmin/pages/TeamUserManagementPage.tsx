import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Paper,
  Divider,
  Avatar,
  useTheme,
  ListItemButton,
  ListItemIcon,
} from '@mui/material'
import type { Systemusers } from '@/generated/models/SystemusersModel'
import DeleteIcon from '@mui/icons-material/Delete'
import GroupIcon from '@mui/icons-material/Group'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import SearchIcon from '@mui/icons-material/Search'
import ShieldIcon from '@mui/icons-material/Shield'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import PeopleIcon from '@mui/icons-material/People'
 
// 1. Import the unified manageTeamMember function
import { fetchOwnerTeams, fetchTeamMembers, manageTeamMember } from '@/services'
import type { TeamOption } from '@/services'
import { useUser, type SystemUser } from '@/context/UserContext'
import { PageHeader, StatusTag } from '@/components/common'
import { fontSizes } from '@/styles'

export default function TeamUserManagementPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users } = useUser()
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null)
  const [teamMembers, setTeamMembers] = useState<Systemusers[]>([])
 
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)
  const [teamSearch, setTeamSearch] = useState('')
 
  const [loading, setLoading] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
 
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const teamResult = await fetchOwnerTeams()
        setTeams(teamResult)
        // Auto-select first team
        if (teamResult.length > 0 && !selectedTeam) {
          setSelectedTeam(teamResult[0])
        }
      } catch (err) {
        setError('Failed to load teams.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
 
  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedTeam) {
        setTeamMembers([])
        return
      }
      setLoadingMembers(true)
      try {
        const members = await fetchTeamMembers(selectedTeam.id)
        setTeamMembers(members)
      } catch (err) {
        setError('Failed to load team members.')
        console.error(err)
      } finally {
        setLoadingMembers(false)
      }
    }
    loadMembers()
  }, [selectedTeam])
 
  const availableUsers = useMemo(() => {
    const memberIds = new Set(teamMembers.map((member) => member.systemuserid))
    return users
      .filter((user) => user.systemuserid && !memberIds.has(user.systemuserid))
      .sort((a, b) => (a.fullname || '').localeCompare(b.fullname || ''))
  }, [teamMembers, users])

  const filteredTeams = useMemo(() => {
    if (!teamSearch.trim()) return teams
    return teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
  }, [teams, teamSearch])
 
  const handleAddMember = async () => {
    setError(null)
    setMessage(null)
    if (!selectedTeam || !selectedUser || !selectedUser.systemuserid) {
      setError('Please select a team and a user to add.')
      return
    }
    setSaving(true)
    try {
      const success = await manageTeamMember(selectedTeam.id, selectedUser.systemuserid, 'Add')
 
      if (success) {
        setMessage(`${selectedUser.fullname || 'The user'} has been successfully added to ${selectedTeam.name}.`)
        setSelectedUser(null)
 
        setTimeout(() => setMessage(null), 5000)
 
        setLoadingMembers(true)
        setTimeout(async () => {
          try {
            const refreshedData = await fetchTeamMembers(selectedTeam.id)
            setTeamMembers(refreshedData)
          } catch (err) {
            setError('Failed to refresh member list from database.')
          } finally {
            setLoadingMembers(false)
          }
        }, 1500)
 
      } else {
        setError('Failed to process the add request via workflow.')
      }
    } catch (err) {
      setError('An error occurred while adding the member.')
    } finally {
      setSaving(false)
    }
  }
 
  const handleRemoveMember = async (member: Systemusers) => {
    if (!selectedTeam || !member.systemuserid) return
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      const success = await manageTeamMember(selectedTeam.id, member.systemuserid, 'Remove')
 
      if (success) {
        setMessage(`${member.fullname || 'The user'} has been successfully removed from ${selectedTeam.name}.`)
        setTimeout(() => setMessage(null), 5000)
        setTeamMembers((prev) => prev.filter((m) => m.systemuserid !== member.systemuserid))
 
        setLoadingMembers(true)
        setTimeout(async () => {
          try {
            const refreshedData = await fetchTeamMembers(selectedTeam.id)
            setTeamMembers(refreshedData)
          } catch (err) {
            console.error('Dataverse background sync failed:', err)
          } finally {
            setLoadingMembers(false)
          }
        }, 1500)
 
      } else {
        setError('Failed to process the remove request via workflow.')
      }
    } catch (err) {
      setError('An error occurred while removing the member.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Team Administration"
        subtitle="Manage access and team assignments across the PPM ecosystem."
      />
 
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message}</Alert>}
 
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '300px 1fr' }, gap: 3, alignItems: 'flex-start' }}>
        
        {/* Left Column: Team List */}
        <Paper sx={{ borderRadius: 1.5, overflow: 'hidden', height: 'fit-content' }}>
          <Box sx={{ p: 2, bgcolor: isDark ? 'background.paper' : 'background.default' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupIcon sx={{ fontSize: 18 }} /> Security Teams
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search teams..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />,
                  sx: { borderRadius: 1.5, bgcolor: theme.palette.background.paper }
                }
              }}
            />
          </Box>
          <Divider />
          <List sx={{ py: 0, maxHeight: '600px', overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
            ) : filteredTeams.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">No teams found.</Typography></Box>
            ) : (
              filteredTeams.map((team) => (
                <ListItemButton 
                  key={team.id}
                  selected={selectedTeam?.id === team.id}
                  onClick={() => setSelectedTeam(team)}
                  sx={{ 
                    borderLeft: '4px solid',
                    borderColor: selectedTeam?.id === team.id ? 'primary.main' : 'transparent',
                    '&.Mui-selected': { bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <ShieldIcon sx={{ fontSize: 20, color: selectedTeam?.id === team.id ? 'primary.main' : 'text.secondary' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={team.name} 
                    slotProps={{ primary: { variant: 'body2', sx: { fontWeight: selectedTeam?.id === team.id ? 700 : 500 } } }}
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Paper>

        {/* Right Column: Member Management */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {selectedTeam ? (
            <>
              {/* Add Member Card */}
              <Card sx={{ borderRadius: 1.5, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <CardHeader 
                  title="Add New Member" 
                  titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
                  avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><PersonAddIcon sx={{ fontSize: 20 }} /></Avatar>}
                />
                <Divider />
                <CardContent>
                  <Stack component="div" direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                    <Autocomplete
                      fullWidth
                      options={availableUsers}
                      value={selectedUser}
                      getOptionLabel={(option) => option.fullname || 'Unknown User'}
                      onChange={(_, value) => setSelectedUser(value)}
                      isOptionEqualToValue={(option, value) => option.systemuserid === value.systemuserid}
                      renderInput={(params) => <TextField {...params} label="Select user to add" size="small" />}
                      disabled={saving}
                      slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleAddMember} 
                      disabled={!selectedUser || saving}
                      sx={{ borderRadius: 1.5, fontWeight: 600, whiteSpace: 'nowrap', px: 3, height: 40 }}
                    >
                      {saving ? 'Adding...' : 'Add to Team'}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {availableUsers.length} users available who are not currently in <strong>{selectedTeam.name}</strong>.
                  </Typography>
                </CardContent>
              </Card>

              {/* Members List Card */}
              <Card sx={{ borderRadius: 1.5, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <CardHeader 
                  title={`Members of ${selectedTeam.name}`}
                  titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
                  action={<StatusTag label={`${teamMembers.length} Total`} color="info" size="small" />}
                />
                <Divider />
                <CardContent sx={{ p: 0 }}>
                  {loadingMembers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
                  ) : teamMembers.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                      <Typography color="text.secondary">No members found in this team.</Typography>
                    </Box>
                  ) : (
                    <List sx={{ py: 0 }}>
                      {teamMembers.map((member, idx) => (
                        <ListItem 
                          key={member.systemuserid} 
                          divider={idx < teamMembers.length - 1}
                          sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <ListItemIcon>
                            <Avatar sx={{ width: 36, height: 32, bgcolor: isDark ? 'grey.800' : 'grey.100', color: 'text.secondary', borderRadius: 1.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {(member.fullname || '?').charAt(0).toUpperCase()}
                              </Typography>
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={member.fullname || 'Unknown User'}
                            secondary={member.internalemailaddress || 'No email available'}
                            slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              color="error" 
                              onClick={() => handleRemoveMember(member)} 
                              disabled={saving}
                              sx={{ '&:hover': { bgcolor: 'error.lighter' } }}
                            >
                              <DeleteIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 1.5, border: '2px dashed', borderColor: 'divider', bgcolor: 'transparent' }}>
              <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">Select a team from the left to manage members</Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  )
}
 