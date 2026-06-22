import React, { useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material'
import CategoryIcon from '@mui/icons-material/Category'
import DescriptionIcon from '@mui/icons-material/Description'
import BusinessIcon from '@mui/icons-material/Business'
import type { CashflowEntryModel, FinancialPeriodModel, BudgetLineModel } from '@/types/dataverse'
import type { ProgrammeLookupItem, ProjectLookupItem } from '@/services'
import { DIRECTION_FILTERS, TXN_TYPE_FILTERS, CATEGORY_FILTERS } from '../constants'

interface CashflowEntryFormProps {
  open: boolean
  mode: 'create' | 'edit'
  onClose: () => void
  formData: Partial<CashflowEntryModel>
  onFieldChange: (field: keyof CashflowEntryModel, value: any) => void
  formErrors: Record<string, string>
  loading: boolean
  programmes: ProgrammeLookupItem[]
  projects: ProjectLookupItem[]
  fiscalPeriods: FinancialPeriodModel[]
  budgetLines: BudgetLineModel[]
  onSave: () => void
}

export const CashflowEntryForm: React.FC<CashflowEntryFormProps> = ({
  open,
  mode,
  onClose,
  formData,
  onFieldChange,
  formErrors,
  loading,
  programmes,
  projects,
  fiscalPeriods,
  budgetLines,
  onSave,
}) => {
  const filteredProjects = useMemo(() => {
    let list = projects
    if (formData._pm_programmelookup_value) {
      const normalizedProgId = formData._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
      list = projects.filter((proj) => proj._pm_programme_value?.replace(/[{}]/g, '').trim().toLowerCase() === normalizedProgId)
    }
    // Always include the currently selected project if it exists
    if (formData._pm_project_value) {
      const currentProjId = formData._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (!list.some(p => p.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase() === currentProjId)) {
        const found = projects.find(p => p.pm_projectid.replace(/[{}]/g, '').trim().toLowerCase() === currentProjId)
        if (found) {
          list = [...list, found]
        } else {
          list = [...list, {
            pm_projectid: currentProjId,
            pm_projectname: formData.pm_projectname || 'Inactive Project',
            _pm_programme_value: formData._pm_programmelookup_value
          }]
        }
      }
    }
    return list
  }, [projects, formData._pm_programmelookup_value, formData._pm_project_value, formData.pm_projectname])

  const filteredBudgetLines = useMemo(() => {
    let list = budgetLines
    if (formData._pm_project_value) {
      const normalizedProjId = formData._pm_project_value.replace(/[{}]/g, '').trim().toLowerCase()
      list = budgetLines.filter((bl) => bl._pm_project_value?.replace(/[{}]/g, '').trim().toLowerCase() === normalizedProjId)
    }
    // Always include the currently selected budget line if it exists
    if (formData._pm_budgetline_value) {
      const currentBLId = formData._pm_budgetline_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (!list.some(bl => bl.pm_budgetlineid?.replace(/[{}]/g, '').trim().toLowerCase() === currentBLId)) {
        const found = budgetLines.find(bl => bl.pm_budgetlineid?.replace(/[{}]/g, '').trim().toLowerCase() === currentBLId)
        if (found) {
          list = [...list, found]
        } else {
          list = [...list, {
            pm_budgetlineid: currentBLId,
            pm_budgetlinename: formData.pm_budgetlinename || 'Inactive Budget Line',
            _pm_project_value: formData._pm_project_value
          } as any]
        }
      }
    }
    return list
  }, [budgetLines, formData._pm_project_value, formData._pm_budgetline_value, formData.pm_budgetlinename])

  const resolvedProgrammes = useMemo(() => {
    let list = programmes
    if (formData._pm_programmelookup_value) {
      const currentProgId = formData._pm_programmelookup_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (!list.some(p => p.pm_programmeid.replace(/[{}]/g, '').trim().toLowerCase() === currentProgId)) {
        const found = programmes.find(p => p.pm_programmeid.replace(/[{}]/g, '').trim().toLowerCase() === currentProgId)
        if (found) {
          list = [...list, found]
        } else {
          list = [...list, {
            pm_programmeid: currentProgId,
            pm_programmename: formData.pm_programmelookupname || 'Inactive Programme'
          }]
        }
      }
    }
    return list
  }, [programmes, formData._pm_programmelookup_value, formData.pm_programmelookupname])

  const resolvedFiscalPeriods = useMemo(() => {
    let list = fiscalPeriods
    if (formData._pm_fiscalperiod_value) {
      const currentFpId = formData._pm_fiscalperiod_value.replace(/[{}]/g, '').trim().toLowerCase()
      if (!list.some(fp => fp.pm_fiscalperiodid?.replace(/[{}]/g, '').trim().toLowerCase() === currentFpId)) {
        const found = fiscalPeriods.find(fp => fp.pm_fiscalperiodid?.replace(/[{}]/g, '').trim().toLowerCase() === currentFpId)
        if (found) {
          list = [...list, found]
        } else {
          list = [...list, {
            pm_fiscalperiodid: currentFpId,
            pm_periodname: formData.pm_fiscalperiodname || 'Inactive Period'
          } as any]
        }
      }
    }
    return list
  }, [fiscalPeriods, formData._pm_fiscalperiod_value, formData.pm_fiscalperiodname])

  React.useEffect(() => {
    if (open) {
      console.log('[CashflowEntryForm] open=true. Mode:', mode)
      console.log('[CashflowEntryForm] formData input:', formData)
      console.log('[CashflowEntryForm] projects count:', projects.length, 'sample project programme:', projects[0]?._pm_programme_value)
      console.log('[CashflowEntryForm] filteredProjects count:', filteredProjects.length)
      console.log('[CashflowEntryForm] budgetLines count:', budgetLines.length, 'sample bl project:', budgetLines[0]?._pm_project_value)
      console.log('[CashflowEntryForm] filteredBudgetLines count:', filteredBudgetLines.length)
    }
  }, [open, mode, formData, projects, filteredProjects, budgetLines, filteredBudgetLines])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {mode === 'create' ? 'New Cashflow Entry' : 'Edit Cashflow Entry'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 3 }}>
        <Grid container spacing={2.5}>
          {/* Basic Info Section */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CategoryIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Entry Name *"
              fullWidth
              size="small"
              value={formData.pm_entryname || ''}
              onChange={(e) => onFieldChange('pm_entryname', e.target.value)}
              error={!!formErrors.pm_entryname}
              helperText={formErrors.pm_entryname}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Amount (EUR) *"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_amounteur ?? ''}
              onChange={(e) => onFieldChange('pm_amounteur', parseFloat(e.target.value) || 0)}
              error={!!formErrors.pm_amounteur}
              helperText={formErrors.pm_amounteur}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Direction</InputLabel>
              <Select
                value={String(formData.pm_transactiondirection ?? '1')}
                label="Direction"
                onChange={(e) => onFieldChange('pm_transactiondirection', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                {DIRECTION_FILTERS.filter((o) => o.value !== '').map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={String(formData.pm_transactiontype ?? '0')}
                label="Transaction Type"
                onChange={(e) => onFieldChange('pm_transactiontype', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                {TXN_TYPE_FILTERS.filter((o) => o.value !== '').map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={String(formData.pm_category ?? '0')}
                label="Category"
                onChange={(e) => onFieldChange('pm_category', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                {CATEGORY_FILTERS.filter((o) => o.value !== '').map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Details Section */}
          <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Transaction Date"
              type="date"
              fullWidth
              size="small"
              value={formData.pm_transactiondate ? formData.pm_transactiondate.split('T')[0] : ''}
              onChange={(e) => onFieldChange('pm_transactiondate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Invoice Number"
              fullWidth
              size="small"
              value={formData.pm_invoicenumber || ''}
              onChange={(e) => onFieldChange('pm_invoicenumber', e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Description"
              fullWidth
              size="small"
              multiline
              rows={3}
              value={formData.pm_description || ''}
              onChange={(e) => onFieldChange('pm_description', e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Financial Period</InputLabel>
              <Select
                value={formData._pm_fiscalperiod_value || ''}
                label="Financial Period"
                onChange={(e) => onFieldChange('_pm_fiscalperiod_value', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {resolvedFiscalPeriods.map((period) => (
                  <MenuItem key={period.pm_fiscalperiodid} value={period.pm_fiscalperiodid}>
                    {period.pm_periodname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Linked Entities Section */}
          <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              Linked Entities
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Programme</InputLabel>
              <Select
                value={formData._pm_programmelookup_value || ''}
                label="Programme"
                onChange={(e) => onFieldChange('_pm_programmelookup_value', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {resolvedProgrammes.map((prog) => (
                  <MenuItem key={prog.pm_programmeid} value={prog.pm_programmeid}>
                    {prog.pm_programmename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Project</InputLabel>
              <Select
                value={formData._pm_project_value || ''}
                label="Project"
                onChange={(e) => {
                  const val = e.target.value
                  onFieldChange('_pm_project_value', val)
                  onFieldChange('_pm_budgetline_value', '')
                }}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {filteredProjects.map((proj) => (
                  <MenuItem key={proj.pm_projectid} value={proj.pm_projectid}>
                    {proj.pm_projectname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Budget Line</InputLabel>
              <Select
                value={formData._pm_budgetline_value || ''}
                label="Budget Line"
                onChange={(e) => {
                  const val = e.target.value
                  onFieldChange('_pm_budgetline_value', val)
                  if (val) {
                    const selectedBL = budgetLines.find((bl) => bl.pm_budgetlineid === val)
                    if (selectedBL) {
                      const blCat = Number(selectedBL.pm_costcategory)
                      let cashflowCat: string | number = '0'
                      if (blCat === 0) cashflowCat = '0' // Staff -> Staff
                      else if (blCat === 1) cashflowCat = '1' // Contractors -> Contractors
                      else if (blCat === 2) cashflowCat = '2' // Licences -> Licences
                      else if (blCat === 3) cashflowCat = '4' // Infrastructure -> Infrastructure
                      onFieldChange('pm_category', cashflowCat)
                    }
                  }
                }}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {filteredBudgetLines.map((bl) => (
                  <MenuItem key={bl.pm_budgetlineid} value={bl.pm_budgetlineid}>
                    {bl.pm_budgetlinename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button onClick={onSave} variant="contained" disabled={loading} sx={{ fontWeight: 600 }}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create Entry' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
