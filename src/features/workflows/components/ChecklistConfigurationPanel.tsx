import React, { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, TextField, Button, IconButton, Paper,
  CircularProgress, Switch, Divider, Alert
} from '@mui/material'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  fetchChecklistConfigurations,
  createChecklistConfiguration,
  deleteChecklistConfiguration
} from '@/services/checklist.service'
import type { ChecklistConfigurationModel } from '@/types/dataverse'

interface ChecklistConfigurationPanelProps {
  stepTemplateId: string
}

export const ChecklistConfigurationPanel: React.FC<ChecklistConfigurationPanelProps> = ({ stepTemplateId }) => {
  const [configs, setConfigs] = useState<ChecklistConfigurationModel[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  
  const [newItemName, setNewItemName] = useState('')
  const [newItemRequired, setNewItemRequired] = useState(true)

  const loadConfigs = useCallback(async () => {
    setLoading(true)
    const data = await fetchChecklistConfigurations(stepTemplateId)
    setConfigs(data)
    setLoading(false)
  }, [stepTemplateId])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const handleAdd = async () => {
    if (!newItemName.trim()) return
    setAdding(true)
    const newConfig = await createChecklistConfiguration(stepTemplateId, newItemName.trim(), newItemRequired)
    if (newConfig) {
      setConfigs(prev => [...prev, newConfig])
      setNewItemName('')
      setNewItemRequired(true)
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    const success = await deleteChecklistConfiguration(id)
    if (success) {
      setConfigs(prev => prev.filter(c => c.pm_workflowchecklistconfigurationid !== id))
    }
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ p: 1, bgcolor: 'primary.50', color: 'primary.main', borderRadius: 2, display: 'flex' }}>
          <PlaylistAddCheckIcon />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Checklist Items</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the required and optional checklist items for this step.
          </Typography>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : configs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No checklist items configured yet.</Typography>
          </Box>
        ) : (
          <Box>
            {configs.map((cfg, idx) => (
              <Box key={cfg.pm_workflowchecklistconfigurationid}>
                <Box sx={{ 
                  p: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  '&:hover': { bgcolor: 'action.hover' }
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {cfg.pm_itemname || cfg.pm_name}
                      {cfg.pm_isrequired && <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>*</Typography>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cfg.pm_isrequired ? 'Required' : 'Optional'}
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleDelete(cfg.pm_workflowchecklistconfigurationid!)}>
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
                {idx < configs.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Add New Item */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <TextField 
          size="small" 
          fullWidth 
          placeholder="New checklist item..." 
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          disabled={adding}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1, height: 40 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, mr: 1, color: newItemRequired ? 'text.primary' : 'text.secondary' }}>Req</Typography>
          <Switch 
            size="small" 
            checked={newItemRequired} 
            onChange={(e) => setNewItemRequired(e.target.checked)} 
            disabled={adding}
          />
        </Box>
        <Button 
          variant="contained" 
          onClick={handleAdd} 
          disabled={!newItemName.trim() || adding}
          sx={{ height: 40, minWidth: 'auto', px: 2 }}
        >
          {adding ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
        </Button>
      </Box>
    </Box>
  )
}
