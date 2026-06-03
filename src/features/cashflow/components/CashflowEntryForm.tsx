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
import type { CashflowEntryModel } from '@/types/dataverse'
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
  onSave,
}) => {
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
            <TextField
              label="Financial Period"
              fullWidth
              size="small"
              value={formData.pm_financialperiod || ''}
              onChange={(e) => onFieldChange('pm_financialperiod', e.target.value)}
              placeholder="e.g. FY2026-Q1"
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
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
                {programmes.map((prog) => (
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
                onChange={(e) => onFieldChange('_pm_project_value', e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {projects.map((proj) => (
                  <MenuItem key={proj.pm_projectid} value={proj.pm_projectid}>
                    {proj.pm_projectname}
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
