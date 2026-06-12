import React, { useState, useEffect, useMemo } from 'react'
import {
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Avatar,
  Typography,
} from '@mui/material'
import { Dialog } from '../Dialog/Dialog'
import { useUser } from '@/context/UserContext'

export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'user-select' | 'user-select-id' | 'multiline'

export interface FormFieldOption {
  value: string | number
  label: string
}

export interface FormField {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  options?: FormFieldOption[] // For 'select'
  gridSize?: number // xs grid size (default 12)
  defaultValue?: any
  min?: number
  max?: number
  placeholder?: string
  rows?: number // For 'multiline'
  disabled?: boolean
}

export interface DynamicFormDialogProps {
  open: boolean
  title: string
  fields: FormField[]
  initialData?: Record<string, any>
  onClose: () => void
  onSubmit: (data: Record<string, any>) => Promise<void>
  submitText?: string
  cancelText?: string
}

export const DynamicFormDialog: React.FC<DynamicFormDialogProps> = ({
  open,
  title,
  fields,
  initialData = {},
  onClose,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
}) => {
  const { users } = useUser()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data
  useEffect(() => {
    if (open) {
      const init: Record<string, any> = { ...initialData }
      fields.forEach((field) => {
        if (init[field.name] === undefined) {
          init[field.name] = field.defaultValue !== undefined ? field.defaultValue : ''
        }
      })
      setFormData(init)
      setIsSubmitting(false)
    }
  }, [open, fields, initialData])

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const isFormValid = useMemo(() => {
    return fields.every((field) => {
      if (field.required) {
        const val = formData[field.name]
        if (val === undefined || val === null || val === '') return false
      }
      return true
    })
  }, [fields, formData])

  const handleSubmit = async () => {
    if (!isFormValid) return
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.name] !== undefined ? formData[field.name] : ''
    const isRequired = field.required ? ' *' : ''
    const label = `${field.label}${isRequired}`

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={label}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        )
      case 'multiline':
        return (
          <TextField
            fullWidth
            multiline
            rows={field.rows || 3}
            label={label}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        )
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={label}
            value={value}
            slotProps={{ htmlInput: { min: field.min, max: field.max } }}
            onChange={(e) => handleChange(field.name, Number(e.target.value))}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        )
      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            label={label}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={field.disabled}
          />
        )
      case 'select':
        return (
          <TextField
            select
            fullWidth
            label={label}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={field.disabled}
          >
            {!field.required && <MenuItem value="">— None —</MenuItem>}
            {field.options?.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        )
      case 'user-select':
        return (
          <FormControl fullWidth size="medium" disabled={field.disabled}>
            <InputLabel>{label}</InputLabel>
            <Select
              value={users.find((u) => u.fullname === value || u.systemuserid === value)?.systemuserid || ''}
              label={label}
              onChange={(e) => {
                const user = users.find((u) => u.systemuserid === e.target.value)
                // We store the fullname as that seems to be the convention in the old dialogs,
                // but we could make this configurable. We'll store fullname for now.
                handleChange(field.name, user?.fullname || '')
              }}
              renderValue={(selected) => {
                const user = users.find((u) => u.systemuserid === selected)
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                      {user?.fullname?.charAt(0) || '?'}
                    </Avatar>
                    {user?.fullname || 'Select Owner'}
                  </Box>
                )
              }}
            >
              {!field.required && <MenuItem value="">— Select —</MenuItem>}
              {users.map((user) => (
                <MenuItem key={user.systemuserid} value={user.systemuserid}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                      {user.fullname?.charAt(0) || '?'}
                    </Avatar>
                    <Typography variant="body2">{user.fullname}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      case 'user-select-id':
        return (
          <FormControl fullWidth size="medium" disabled={field.disabled}>
            <InputLabel>{label}</InputLabel>
            <Select
              value={users.find((u) => u.systemuserid === value)?.systemuserid || ''}
              label={label}
              onChange={(e) => {
                handleChange(field.name, e.target.value)
              }}
              renderValue={(selected) => {
                const user = users.find((u) => u.systemuserid === selected)
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                      {user?.fullname?.charAt(0) || '?'}
                    </Avatar>
                    {user?.fullname || 'Select User'}
                  </Box>
                )
              }}
            >
              {!field.required && <MenuItem value="">— Select —</MenuItem>}
              {users.map((user) => (
                <MenuItem key={user.systemuserid} value={user.systemuserid}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                      {user.fullname?.charAt(0) || '?'}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.fullname}</Typography>
                      {user.jobtitle && <Typography variant="caption" color="text.secondary">{user.jobtitle}</Typography>}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      default:
        return null
    }
  }

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      onConfirm={handleSubmit}
      confirmText={submitText}
      cancelText={cancelText}
      confirmDisabled={!isFormValid || isSubmitting}
      isLoading={isSubmitting}
      content={
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {fields.map((field) => (
            <Grid size={{ xs: field.gridSize || 12 }} key={field.name}>
              {renderField(field)}
            </Grid>
          ))}
        </Grid>
      }
    />
  )
}
