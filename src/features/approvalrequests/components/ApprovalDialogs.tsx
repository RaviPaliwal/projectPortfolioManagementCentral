import {
  Box,
  Typography,
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
import ChecklistIcon from '@mui/icons-material/Checklist'
import DescriptionIcon from '@mui/icons-material/Description'
import PersonIcon from '@mui/icons-material/Person'
import type { ApprovalRequestModel } from '@/types/dataverse'
import { Button, ConfirmDialog } from '@/components/common'
import { fontSizes } from '@/styles'

interface ApprovalDialogsProps {
  dialogMode: 'create' | 'edit' | null
  onClose: () => void
  formData: Partial<ApprovalRequestModel>
  onFieldChange: (field: keyof ApprovalRequestModel, value: any) => void
  formErrors: Record<string, string>
  loading: boolean
  onSave: () => void
  deleteTarget: ApprovalRequestModel | null
  onDeleteClose: () => void
  onDeleteConfirm: () => void
  actionLoading: boolean
  stageOptions: any[]
  entityOptions: any[]
  priorityOptions: any[]
}

export const ApprovalDialogs: React.FC<ApprovalDialogsProps> = ({
  dialogMode,
  onClose,
  formData,
  onFieldChange,
  formErrors,
  loading,
  onSave,
  deleteTarget,
  onDeleteClose,
  onDeleteConfirm,
  actionLoading,
  stageOptions,
  entityOptions,
  priorityOptions,
}) => {
  return (
    <>
      {/* Create / Edit Dialog */}
      <Dialog 
        open={!!dialogMode} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {dialogMode === 'create' ? 'Create Approval Request' : 'Edit Approval Request'}
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3 }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ChecklistIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                Request Details
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Request Title *"
                fullWidth
                size="small"
                value={formData.pm_requesttitle || ''}
                onChange={(e) => onFieldChange('pm_requesttitle', e.target.value)}
                error={!!formErrors.pm_requesttitle}
                helperText={formErrors.pm_requesttitle}
              />
            </Grid>

            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Stage</InputLabel>
                <Select
                  value={String(formData.pm_approvalstage ?? '0')}
                  label="Stage"
                  onChange={(e) => onFieldChange('pm_approvalstage', e.target.value)}
                >
                  {stageOptions.filter(o => o.value !== '').map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={String(formData.pm_entitytype ?? '0')}
                  label="Entity Type"
                  onChange={(e) => onFieldChange('pm_entitytype', e.target.value)}
                >
                  {entityOptions.filter(o => o.value !== '').map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={String(formData.pm_prioritylevel ?? '0')}
                  label="Priority"
                  onChange={(e) => onFieldChange('pm_prioritylevel', e.target.value)}
                >
                  {priorityOptions.filter(o => o.value !== '').map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 1 }}>
                <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                Description & Timeline
              </Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                fullWidth
                size="small"
                multiline
                rows={3}
                value={formData.pm_decisionnotes || ''}
                onChange={(e) => onFieldChange('pm_decisionnotes', e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                size="small"
                value={formData.pm_duedate ? formData.pm_duedate.split('T')[0] : ''}
                onChange={(e) => onFieldChange('pm_duedate', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField
                label="Approver Name"
                fullWidth
                size="small"
                value={formData.pm_approvername || ''}
                onChange={(e) => onFieldChange('pm_approvername', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
          <Button onClick={onSave} variant="contained" disabled={loading} sx={{ fontWeight: 600 }}>
            {loading ? 'Saving...' : dialogMode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Confirm Deletion"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.pm_requesttitle}? This action cannot be undone.` : ''}
        confirmLabel={actionLoading ? 'Deleting...' : 'Delete'}
        confirmColor="error"
        loading={actionLoading}
        onConfirm={onDeleteConfirm}
        onClose={onDeleteClose}
      />
    </>
  )
}
