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
import { fetchOwnerTeams, fetchTeamMembers, addTeamMember, removeTeamMember } from '@/lib/dataverseClient'
import type { TeamOption } from '@/lib/dataverseClient'

// 1. Import the useUser hook and SystemUser type from your context file
// IMPORTANT: Update this import path to match where your UserContext is saved
import { useUser, type SystemUser } from '@/context/UserContext' 

export default function TeamUserManagementPage() {
  // 2. Consume the users from the context instead of fetching them manually
  const { users } = useUser() 

  const [teams, setTeams] = useState<TeamOption[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null)
  const [teamMembers, setTeamMembers] = useState<Systemusers[]>([])
  
  // 3. Update selectedUser to use the SystemUser type from context
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
        // 4. Removed fetchSystemUsers() since we get them from useUser()
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
    // 5. Use the context 'users' to generate the available list
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
      const success = await addTeamMember(selectedTeam.id, selectedUser.systemuserid)
      if (success) {
        setMessage(`${selectedUser.fullname || 'The user'} has been added to ${selectedTeam.name}.`)
        setSelectedUser(null) // Clear the selection after adding
        const refreshed = await fetchTeamMembers(selectedTeam.id)
        setTeamMembers(refreshed)
      } else {
        setError('Add member is not available in this client implementation.')
      }
    } catch (err) {
      setError('Failed to add member to the selected team.')
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
      const success = await removeTeamMember(selectedTeam.id, member.systemuserid)
      if (success) {
        setMessage(`${member.fullname || 'The user'} has been removed from ${selectedTeam.name}.`)
        const refreshed = await fetchTeamMembers(selectedTeam.id)
        setTeamMembers(refreshed)
      } else {
        setError('Remove member is not available in this client implementation.')
      }
    } catch (err) {
      setError('Failed to remove the member from the selected team.')
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
          Use this page to browse teams and users. Membership list retrieval is enabled, while add/remove operations currently require custom Dataverse association support.
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