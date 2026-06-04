import React, { useState, useEffect } from 'react'
import { Box, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, CircularProgress, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { fetchEntityMetadataForModule } from '@/services'

interface Rule {
  field: string
  operator: string
  value: any
}

interface ConditionGroup {
  logic: 'AND' | 'OR'
  rules: Rule[]
}

interface ConditionBuilderProps {
  moduleName: string
  value: string // JSON string of ConditionGroup
  onChange: (value: string) => void
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ moduleName, value, onChange }) => {
  const [attributes, setAttributes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [group, setGroup] = useState<ConditionGroup>({ logic: 'AND', rules: [] })

  // Initialize from value
  useEffect(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value)
        if (parsed.logic && parsed.rules) {
          setGroup(parsed)
        } else if (parsed.field) {
          // Legacy single-rule fallback
          setGroup({ logic: 'AND', rules: [parsed] })
        }
      } else {
        setGroup({ logic: 'AND', rules: [] })
      }
    } catch {
      setGroup({ logic: 'AND', rules: [] })
    }
  }, [value])

  // Fetch Metadata
  useEffect(() => {
    if (!moduleName) return
    const loadMeta = async () => {
      setLoading(true)
      try {
        const metaResult = await fetchEntityMetadataForModule(moduleName)
        console.log('[ConditionBuilder] Fetched metadata', metaResult)
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
          .filter((a: any) => a.AttributeType !== 'Uniqueidentifier' && a.IsCustomAttribute === true &&  a.AttributeType !== "Virtual")
          .sort((a: any, b: any) => {
            const labelA = a.DisplayName?.UserLocalizedLabel?.Label || a.LogicalName || ''
            const labelB = b.DisplayName?.UserLocalizedLabel?.Label || b.LogicalName || ''
            return labelA.localeCompare(labelB)
          })
          
        setAttributes(validAttrs)
      } catch (err) {
        console.error('[ConditionBuilder] Failed to parse metadata', err)
        setAttributes([])
      }
      setLoading(false)
    }
    loadMeta()
  }, [moduleName])


  const triggerChange = (newGroup: ConditionGroup) => {
    setGroup(newGroup)
    if (newGroup.rules.length > 0) {
      onChange(JSON.stringify(newGroup))
    } else {
      onChange('')
    }
  }

  const addRule = () => {
    triggerChange({ ...group, rules: [...group.rules, { field: '', operator: 'eq', value: '' }] })
  }

  const removeRule = (index: number) => {
    const newRules = [...group.rules]
    newRules.splice(index, 1)
    triggerChange({ ...group, rules: newRules })
  }

  const updateRule = (index: number, key: keyof Rule, val: any) => {
    const newRules = [...group.rules]
    newRules[index] = { ...newRules[index], [key]: val }
    // Reset value if field changes to avoid type mismatches
    if (key === 'field') newRules[index].value = ''
    triggerChange({ ...group, rules: newRules })
  }

  const setLogic = (newLogic: 'AND' | 'OR') => {
    if (newLogic) triggerChange({ ...group, logic: newLogic })
  }

  const renderValueInput = (rule: Rule, index: number) => {
    const attr = attributes.find(a => a.LogicalName === rule.field)
    
    if (!attr) {
      return <TextField size="small" label="Value" value={rule.value} onChange={e => updateRule(index, 'value', e.target.value)} sx={{ flex: 1 }} />
    }

    // Lookup (Provide text input but hint it's a lookup)
    if (attr.AttributeType === 'Lookup') {
      return (
        <TextField 
          size="small" 
          label="Record ID (Lookup)" 
          placeholder="Enter GUID"
          value={rule.value} 
          onChange={e => updateRule(index, 'value', e.target.value)} 
          sx={{ flex: 1 }} 
        />
      )
    }

    // Default Text/Number for all others including Picklist/Boolean (due to SDK metadata limits)
    return <TextField size="small" label="Value" value={rule.value} onChange={e => updateRule(index, 'value', e.target.value)} sx={{ flex: 1 }} />
  }

  return (
    <Box sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', p: 2, borderRadius: 1.15, border: '1px solid', borderColor: 'divider' }}>
      
      {loading && <CircularProgress size={24} sx={{ mb: 2 }} />}

      {group.rules.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>MATCH</Typography>
          <ToggleButtonGroup
            size="small"
            value={group.logic}
            exclusive
            onChange={(_, val) => setLogic(val)}
            color="primary"
          >
            <ToggleButton value="AND" sx={{ px: 2, py: 0.5, fontWeight: 700 }}>ALL (AND)</ToggleButton>
            <ToggleButton value="OR" sx={{ px: 2, py: 0.5, fontWeight: 700 }}>ANY (OR)</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>OF THE FOLLOWING RULES:</Typography>
        </Box>
      )}

      <Stack spacing={1.5}>
        {group.rules.map((rule, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', bgcolor: 'background.paper', p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            
            {/* Field Picker */}
            {attributes.length > 0 ? (
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Field</InputLabel>
                <Select value={rule.field} label="Field" onChange={e => updateRule(idx, 'field', e.target.value)}>
                  {attributes.map(a => (
                    <MenuItem key={a.LogicalName} value={a.LogicalName}>
                      {a.DisplayName?.UserLocalizedLabel?.Label || a.LogicalName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField size="small" label="Field Name" value={rule.field} onChange={e => updateRule(idx, 'field', e.target.value)} sx={{ flex: 1 }} />
            )}
            
            {/* Operator Picker */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Operator</InputLabel>
              <Select value={rule.operator} label="Operator" onChange={e => updateRule(idx, 'operator', e.target.value)}>
                <MenuItem value="eq">Equals</MenuItem>
                <MenuItem value="ne">Not Equals</MenuItem>
                <MenuItem value="gt">Greater Than</MenuItem>
                <MenuItem value="lt">Less Than</MenuItem>
                <MenuItem value="contains">Contains</MenuItem>
              </Select>
            </FormControl>

            {/* Value Picker (Dynamic) */}
            {renderValueInput(rule, idx)}
            
            <IconButton size="small" color="error" onClick={() => removeRule(idx)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Stack>

      <Button 
        size="small" 
        startIcon={<AddIcon />} 
        onClick={addRule}
        variant={group.rules.length === 0 ? "contained" : "outlined"}
        sx={{ mt: 2, borderRadius: 1.15 }}
      >
        {group.rules.length === 0 ? 'Add Condition' : 'Add Another Condition'}
      </Button>
    </Box>
  )
}
