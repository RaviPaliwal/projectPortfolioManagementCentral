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
} from '@mui/material'
import type { Systemusers } from '@/generated/models/SystemusersModel'
import DeleteIcon from '@mui/icons-material/Delete'
import GroupIcon from '@mui/icons-material/Group'
 
// 1. Import the unified manageTeamMember function
import { fetchOwnerTeams, fetchTeamMembers, manageTeamMember } from '@/services'
import type { TeamOption } from '@/services'
import { useUser, type SystemUser } from '@/context/UserContext'
export default function TeamUserManagementPage() {
  const { users } = useUser()
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null)
  const [teamMembers, setTeamMembers] = useState<Systemusers[]>([])
 
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)
 
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
 
  const handleAddMember = async () => {
    setError(null)
    setMessage(null)
    if (!selectedTeam || !selectedUser || !selectedUser.systemuserid) {
      setError('Please select a team and a user to add.')
      return
    }
    setSaving(true)
    try {
      // 1. Force lowercase 'add' to match Power Automate conditions
      const success = await manageTeamMember(selectedTeam.id, selectedUser.systemuserid, 'Add')
 
      if (success) {
        setMessage(`${selectedUser.fullname || 'The user'} has been successfully added to ${selectedTeam.name}.`)
        setSelectedUser(null)
 
        // Auto-clear success notification after 5 seconds
        setTimeout(() => setMessage(null), 5000)
 
        // 2. Turn on the list skeleton loader and fetch updated data after a short
        // backend processing window to guarantee Dataverse has written the N:N link
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
      // 1. Force lowercase 'remove' to match Power Automate conditions
      const success = await manageTeamMember(selectedTeam.id, member.systemuserid, 'Remove')
 
      if (success) {
        setMessage(`${member.fullname || 'The user'} has been successfully removed from ${selectedTeam.name}.`)
 
        // Auto-clear success notification after 5 seconds
        setTimeout(() => setMessage(null), 5000)
 
        // 2. Optimistic UI: Filter out the user locally right away so the button click
        // feels instantaneous to the user
        setTeamMembers((prev) => prev.filter((m) => m.systemuserid !== member.systemuserid))
 
        // 3. Double check and re-sync cleanly with Dataverse after a brief pause
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
      <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupIcon fontSize="inherit" /> Team User Administration
      </Typography>
 
      <Stack spacing={2}>
        <Alert severity="info">
          Use this page to browse teams and manage users. Add/remove operations are processed securely via Power Automate.
        </Alert>
 
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
 
        <Card>
          <CardHeader title="Team Selection" />
          <CardContent>
            <Autocomplete
              options={teams}
              value={selectedTeam}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => setSelectedTeam(value)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Select a team" />}
              loading={loading}
              disabled={loading}
            />
          </CardContent>
        </Card>
 
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Card>
              <CardHeader title="Team Members" />
              <CardContent>
                {selectedTeam ? (
                  loadingMembers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                      <CircularProgress />
                    </Box>
                  ) : teamMembers.length === 0 ? (
                    <Typography color="text.secondary">No members found for this team.</Typography>
                  ) : (
                    <List>
                      {teamMembers.map((member) => (
                        <ListItem key={member.systemuserid} divider>
                          <ListItemText
                            primary={member.fullname || 'Unknown User'}
                            secondary={member.internalemailaddress || 'No email available'}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="remove" onClick={() => handleRemoveMember(member)} disabled={saving}>
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )
                ) : (
                  <Typography color="text.secondary">Choose a team to load membership.</Typography>
                )}
              </CardContent>
            </Card>
          </Box>
 
          <Box>
            <Card>
              <CardHeader title="Add Team Member" />
              <CardContent>
                <Stack spacing={2}>
                  <Autocomplete
                    options={availableUsers}
                    value={selectedUser}
                    getOptionLabel={(option) => option.fullname || 'Unknown User'}
                    onChange={(_, value) => setSelectedUser(value)}
                    isOptionEqualToValue={(option, value) => option.systemuserid === value.systemuserid}
                    renderInput={(params) => <TextField {...params} label="Select a user" />}
                    disabled={!selectedTeam || loading}
                  />
                  <Button variant="contained" onClick={handleAddMember} disabled={!selectedTeam || !selectedUser || saving}>
                    Add User to Team
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTeam ? `${availableUsers.length} users available to add.` : 'Select a team to see available users.'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}
 