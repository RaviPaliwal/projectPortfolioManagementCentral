import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Switch,
  Radio,
  IconButton,
  Alert
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { Dialog } from '@/components/common'
import type { SkillModel, ResourceSkillModel, ResourceModel } from '@/types/dataverse'
import { createResourceSkill, updateResourceSkill, deleteResourceSkill } from '@/services/skill.service'

interface ResourceSkillsManagerDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => Promise<void>
  initialResourceId?: string
  skills: SkillModel[]
  resources: ResourceModel[]
  allResourceSkills: ResourceSkillModel[]
}

export const ResourceSkillsManagerDialog: React.FC<ResourceSkillsManagerDialogProps> = ({
  open,
  onClose,
  onSaved,
  initialResourceId,
  skills,
  resources,
  allResourceSkills
}) => {
  const [selectedResource, setSelectedResource] = useState<string>('')
  const [rows, setRows] = useState<Partial<ResourceSkillModel>[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      if (initialResourceId) {
        setSelectedResource(initialResourceId)
        loadResourceSkills(initialResourceId)
      } else {
        setSelectedResource('')
        setRows([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialResourceId])

  const loadResourceSkills = (resourceId: string) => {
    const existing = allResourceSkills.filter(rs => {
      const rsVal = rs._pm_resource_value?.replace(/[{}]/g, '').toLowerCase()
      const selVal = resourceId.replace(/[{}]/g, '').toLowerCase()
      return rsVal === selVal
    })
    setRows(existing.map(r => ({ ...r })))
  }

  const handleResourceChange = (newResourceId: string) => {
    setSelectedResource(newResourceId)
    loadResourceSkills(newResourceId)
  }

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        _pm_skill_value: '',
        pm_proficiencylevel: 0,
        pm_yearsofexperience: 0,
        pm_certified: false,
        pm_certificationname: '',
        pm_certificationexpirydate: '',
        pm_primaryskill: false
      }
    ])
  }

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleRowChange = (index: number, field: keyof ResourceSkillModel, value: any) => {
    setRows(prev => {
      const newRows = [...prev]
      newRows[index] = { ...newRows[index], [field]: value }

      // Enforce single primary skill
      if (field === 'pm_primaryskill' && value === true) {
        for (let i = 0; i < newRows.length; i++) {
          if (i !== index) {
            newRows[i].pm_primaryskill = false
          }
        }
      }

      return newRows
    })
  }

  const handleSave = async () => {
    if (!selectedResource) {
      setError('Please select a resource.')
      return
    }

    // Validate rows
    let primaryCount = 0
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]._pm_skill_value) {
        setError(`Please select a skill for row ${i + 1}.`)
        return
      }
      if (rows[i].pm_primaryskill) {
        primaryCount++
      }
    }

    if (primaryCount > 1) {
      setError('Only one skill can be marked as Primary. Please unselect extra primary skills.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const originalSkills = allResourceSkills.filter(rs => {
        const rsVal = rs._pm_resource_value?.replace(/[{}]/g, '').toLowerCase()
        const selVal = selectedResource.replace(/[{}]/g, '').toLowerCase()
        return rsVal === selVal
      })

      const currentIds = new Set(rows.map(r => r.pm_resourceskillid).filter(Boolean))

      // Determine deletes
      const toDelete = originalSkills.filter(s => s.pm_resourceskillid && !currentIds.has(s.pm_resourceskillid))
      
      for (const del of toDelete) {
        if (del.pm_resourceskillid) {
          await deleteResourceSkill(del.pm_resourceskillid)
        }
      }

      // Determine creates/updates
      for (const row of rows) {
        const payload = {
          _pm_resource_value: selectedResource,
          _pm_skill_value: row._pm_skill_value,
          pm_proficiencylevel: Number(row.pm_proficiencylevel) || 0,
          pm_yearsofexperience: Number(row.pm_yearsofexperience) || 0,
          pm_certified: Boolean(row.pm_certified),
          pm_certificationname: Boolean(row.pm_certified) ? (row.pm_certificationname || '') : '',
          pm_certificationexpirydate: Boolean(row.pm_certified) ? (row.pm_certificationexpirydate || '') : '',
          pm_primaryskill: Boolean(row.pm_primaryskill)
        }

        if (row.pm_resourceskillid) {
          await updateResourceSkill(row.pm_resourceskillid, payload)
        } else {
          await createResourceSkill(payload)
        }
      }

      await onSaved()
      onClose()
    } catch (err) {
      setError('An error occurred while saving the mappings.')
    } finally {
      setIsSaving(false)
    }
  }

  const formatOptions = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return ''
    return String(val)
  }

  return (
    <Dialog
      open={open}
      title="Manage Resource Skills"
      onClose={onClose}
      onConfirm={handleSave}
      confirmText="Save Mappings"
      maxWidth="lg"
      isLoading={isSaving}
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <Box sx={{ width: 300 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Resource</InputLabel>
              <Select
                value={selectedResource}
                label="Select Resource"
                onChange={e => handleResourceChange(e.target.value)}
              >
                {resources.map(r => (
                  <MenuItem key={r.pm_resourceid} value={r.pm_resourceid || ''}>
                    {r.pm_fullname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Skills</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow} disabled={!selectedResource}>
                Add Skill
              </Button>
            </Box>

            {rows.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {selectedResource ? 'No skills assigned. Click "Add Skill" to add one.' : 'Select a resource to manage their skills.'}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 200 }}>Skill</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>Proficiency</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>Years Exp.</TableCell>
                      <TableCell align="center">Certified</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>Cert. Name</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>Cert. Expiry</TableCell>
                      <TableCell align="center">Primary</TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={row._pm_skill_value || ''}
                              displayEmpty
                              onChange={e => handleRowChange(idx, '_pm_skill_value', e.target.value)}
                            >
                              <MenuItem value="" disabled>Select Skill</MenuItem>
                              {skills.map(s => (
                                <MenuItem key={s.pm_skillid} value={s.pm_skillid || ''}>{s.pm_skillname}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={formatOptions(row.pm_proficiencylevel)}
                              displayEmpty
                              onChange={e => handleRowChange(idx, 'pm_proficiencylevel', Number(e.target.value))}
                            >
                              <MenuItem value="0">Beginner</MenuItem>
                              <MenuItem value="1">Intermediate</MenuItem>
                              <MenuItem value="2">Advanced</MenuItem>
                              <MenuItem value="3">Expert</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={row.pm_yearsofexperience || 0}
                            onChange={e => handleRowChange(idx, 'pm_yearsofexperience', Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={!!row.pm_certified}
                            onChange={e => handleRowChange(idx, 'pm_certified', e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            placeholder="Cert Name"
                            value={row.pm_certificationname || ''}
                            onChange={e => handleRowChange(idx, 'pm_certificationname', e.target.value)}
                            disabled={!row.pm_certified}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="date"
                            value={row.pm_certificationexpirydate ? String(row.pm_certificationexpirydate).split('T')[0] : ''}
                            onChange={e => handleRowChange(idx, 'pm_certificationexpirydate', e.target.value)}
                            disabled={!row.pm_certified}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Radio
                            checked={!!row.pm_primaryskill}
                            onClick={() => handleRowChange(idx, 'pm_primaryskill', !row.pm_primaryskill)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => handleRemoveRow(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Box>
      }
    />
  )
}
