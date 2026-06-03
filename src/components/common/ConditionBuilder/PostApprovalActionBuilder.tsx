import React, { useState, useEffect } from 'react'
import { Box, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Typography, CircularProgress, Button, Stack } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { fetchEntityMetadataForModule } from '@/services'

interface WorkflowPostApprovalAction {
  field: string
  value: any
}

interface WorkflowConfig {
  onComplete?: WorkflowPostApprovalAction[]
  onReject?: WorkflowPostApprovalAction[]
}

interface Props {
  moduleName: string
  value: string // JSON string of WorkflowConfig
  onChange: (value: string) => void
}

export const PostApprovalActionBuilder: React.FC<Props> = ({ moduleName, value, onChange }) => {
  const [attributes, setAttributes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<WorkflowConfig>({ onComplete: [], onReject: [] })

  useEffect(() => {
    try {
      if (value) setConfig(JSON.parse(value))
    } catch {}
  }, [value])

  useEffect(() => {
    if (!moduleName) return
    const loadMeta = async () => {
      setLoading(true)
      try {
        const metaResult = await fetchEntityMetadataForModule(moduleName)
        
        let parsedMeta = metaResult
        if (metaResult?.data && typeof metaResult.data === 'string') {
          try { parsedMeta = JSON.parse(metaResult.data) } catch (e) { parsedMeta = metaResult.data }
        } else if (metaResult?.data) {
          parsedMeta = metaResult.data
        }

        const findAttributes = (obj: any): any[] => {
          if (!obj) return []
          if (Array.isArray(obj)) {
            if (obj.length > 0 && obj[0].LogicalName && obj[0].AttributeType) return obj
            for (const item of obj) {
              const res = findAttributes(item)
              if (res.length > 0) return res
            }
            return []
          }
          if (typeof obj === 'object') {
            if (Array.isArray(obj.Attributes) && obj.Attributes.length > 0 && obj.Attributes[0].LogicalName) return obj.Attributes
            for (const key of Object.keys(obj)) {
              const res = findAttributes(obj[key])
              if (res.length > 0) return res
            }
          }
          return []
        }

        const attrs = findAttributes(parsedMeta)
        
        const validAttrs = attrs
          .filter((a: any) => a.AttributeType !== 'Uniqueidentifier' && a.IsCustomAttribute === true)
          .sort((a: any, b: any) => {
            const labelA = a.DisplayName?.UserLocalizedLabel?.Label || a.LogicalName || ''
            const labelB = b.DisplayName?.UserLocalizedLabel?.Label || b.LogicalName || ''
            return labelA.localeCompare(labelB)
          })
        setAttributes(validAttrs)
      } catch (err) {
        console.error('Failed to parse metadata', err)
        setAttributes([])
      }
      setLoading(false)
    }
    loadMeta()
  }, [moduleName])

  const updateAction = (type: 'onComplete' | 'onReject', index: number, key: string, val: any) => {
    const newConfig = { ...config }
    if (!newConfig[type]) newConfig[type] = []
    newConfig[type]![index] = { ...newConfig[type]![index], [key]: val }
    if (key === 'field') newConfig[type]![index].value = ''
    setConfig(newConfig)
    onChange(JSON.stringify(newConfig))
  }

  const addAction = (type: 'onComplete' | 'onReject') => {
    const newConfig = { ...config }
    if (!newConfig[type]) newConfig[type] = []
    newConfig[type]!.push({ field: '', value: '' })
    setConfig(newConfig)
    onChange(JSON.stringify(newConfig))
  }

  const removeAction = (type: 'onComplete' | 'onReject', index: number) => {
    const newConfig = { ...config }
    if (newConfig[type]) {
      newConfig[type]!.splice(index, 1)
      if (newConfig[type]!.length === 0) delete newConfig[type]
    }
    setConfig(newConfig)
    onChange(Object.keys(newConfig).length > 0 ? JSON.stringify(newConfig) : '')
  }

  const renderValueInput = (action: WorkflowPostApprovalAction, index: number, type: 'onComplete' | 'onReject') => {
    const attr = attributes.find(a => a.LogicalName === action.field)
    
    if (!attr) {
      return <TextField size="small" label="New Value" value={action.value} onChange={e => updateAction(type, index, 'value', e.target.value)} sx={{ flex: 1 }} />
    }

    if (attr.AttributeType === 'Picklist' || attr.AttributeType === 'Status' || attr.AttributeType === 'State') {
      const options = attr.OptionSet?.Options || attr.GlobalOptionSet?.Options || []
      return (
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>New Value (Choice)</InputLabel>
          <Select value={action.value} label="New Value (Choice)" onChange={e => updateAction(type, index, 'value', e.target.value)}>
            {options.map((opt: any) => (
              <MenuItem key={opt.Value} value={opt.Value}>
                {opt.Label?.UserLocalizedLabel?.Label || opt.Value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )
    }

    if (attr.AttributeType === 'Boolean') {
      const trueOption = attr.OptionSet?.TrueOption || attr.GlobalOptionSet?.TrueOption || { Value: true, Label: { UserLocalizedLabel: { Label: 'True' } } }
      const falseOption = attr.OptionSet?.FalseOption || attr.GlobalOptionSet?.FalseOption || { Value: false, Label: { UserLocalizedLabel: { Label: 'False' } } }
      return (
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>New Value (Yes/No)</InputLabel>
          <Select value={action.value} label="New Value (Yes/No)" onChange={e => updateAction(type, index, 'value', e.target.value === 'true')}>
            <MenuItem value="true">{trueOption.Label?.UserLocalizedLabel?.Label || 'True'}</MenuItem>
            <MenuItem value="false">{falseOption.Label?.UserLocalizedLabel?.Label || 'False'}</MenuItem>
          </Select>
        </FormControl>
      )
    }

    if (attr.AttributeType === 'Lookup') {
      return <TextField size="small" label="Record ID (Lookup)" placeholder="Enter GUID" value={action.value} onChange={e => updateAction(type, index, 'value', e.target.value)} sx={{ flex: 1 }} />
    }

    return <TextField size="small" label="New Value" value={action.value} onChange={e => updateAction(type, index, 'value', e.target.value)} sx={{ flex: 1 }} />
  }

  const renderActionRow = (action: WorkflowPostApprovalAction, idx: number, type: 'onComplete' | 'onReject') => (
    <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', bgcolor: 'background.paper', p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider', mb: 1 }}>
      {loading ? <CircularProgress size={20} sx={{ mr: 2 }} /> : (
        attributes.length > 0 ? (
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Field to Update</InputLabel>
            <Select value={action.field} label="Field to Update" onChange={e => updateAction(type, idx, 'field', e.target.value)}>
              {attributes.map(a => <MenuItem key={a.LogicalName} value={a.LogicalName}>{a.DisplayName?.UserLocalizedLabel?.Label || a.LogicalName}</MenuItem>)}
            </Select>
          </FormControl>
        ) : (
          <TextField size="small" label="Field Name" value={action.field} onChange={e => updateAction(type, idx, 'field', e.target.value)} sx={{ flex: 1 }} />
        )
      )}
      
      <Typography variant="body2" sx={{ mx: 1, fontWeight: 800 }}>=</Typography>
      
      {renderValueInput(action, idx, type)}
      
      <IconButton size="small" color="error" onClick={() => removeAction(type, idx)}><DeleteIcon fontSize="small" /></IconButton>
    </Box>
  )

  return (
    <Stack spacing={3} sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', p: 2, borderRadius: 1.15, border: '1px solid', borderColor: 'divider' }}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'success.main' }}>On Completion Actions</Typography>
        {config.onComplete?.map((a, i) => renderActionRow(a, i, 'onComplete'))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => addAction('onComplete')} variant="outlined" sx={{ borderRadius: 1.15 }}>Add Completion Action</Button>
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'error.main' }}>On Rejection Actions</Typography>
        {config.onReject?.map((a, i) => renderActionRow(a, i, 'onReject'))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => addAction('onReject')} variant="outlined" sx={{ borderRadius: 1.15 }}>Add Rejection Action</Button>
      </Box>
    </Stack>
  )
}
