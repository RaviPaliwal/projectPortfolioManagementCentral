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
  Avatar,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import EditIcon from '@mui/icons-material/Edit'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import DescriptionIcon from '@mui/icons-material/Description'
import type { BenefitModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { useUser } from '@/context/UserContext'

interface BenefitFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: any) => void
  editingBenefit: BenefitModel | null
  formData: any
  setFormData: (data: any) => void
  actionLoading: boolean
}

export const BenefitFormDialog = ({
  open,
  onClose,
  onSave,
  editingBenefit,
  formData,
  setFormData,
  actionLoading,
}: BenefitFormDialogProps) => {
  const { users } = useUser()

  return (
    <Dialog
      open={open}
      onClose={() => !actionLoading && onClose()}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 1.5 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', borderRadius: 1.5 }}>
          {editingBenefit ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <EmojiEventsIcon sx={{ fontSize: 18, color: '#fff' }} />}
        </Avatar>
        {editingBenefit ? 'Edit Benefit' : 'Register Benefit'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {editingBenefit
            ? `Update details for ${editingBenefit.pm_benefitname}.`
            : 'Register a new benefit with target values, category, owner, and entity association.'}
        </Typography>

        {/* Basic Information */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmojiEventsIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Basic Information
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Benefit Name"
              required
              fullWidth
              size="small"
              value={formData.pm_benefitname}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_benefitname: e.target.value }))}
              placeholder="e.g., Cost Savings from Automation"
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.pm_benefitcategory}
                label="Category"
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_benefitcategory: e.target.value as number }))}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value={0}>Financial</MenuItem>
                <MenuItem value={1}>Operational</MenuItem>
                <MenuItem value={2}>Strategic</MenuItem>
                <MenuItem value={3}>Customer</MenuItem>
                <MenuItem value={4}>Innovation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Reference / ID"
              fullWidth
              size="small"
              value={formData.pm_benefitreference}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_benefitreference: e.target.value }))}
              placeholder="e.g., BEN-001"
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.pm_benefitstatus}
                label="Status"
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_benefitstatus: e.target.value as number }))}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value={0}>Identified</MenuItem>
                <MenuItem value={1}>In Progress</MenuItem>
                <MenuItem value={2}>Realised</MenuItem>
                <MenuItem value={3}>Not Yet Achieved</MenuItem>
                <MenuItem value={4}>Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Assessment (RAG)</InputLabel>
              <Select
                value={formData.pm_ragstatus}
                label="Assessment (RAG)"
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_ragstatus: e.target.value as number }))}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value={1}>Green — On Track</MenuItem>
                <MenuItem value={0}>Amber — At Risk</MenuItem>
                <MenuItem value={2}>Red — Off Track</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Benefit Type</InputLabel>
              <Select
                value={formData.pm_benefittype}
                label="Benefit Type"
                onChange={(e) => setFormData((f: any) => ({ ...f, pm_benefittype: e.target.value as number }))}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value={0}>Quantitative</MenuItem>
                <MenuItem value={1}>Qualitative</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Benefit Owner</InputLabel>
              <Select
                value={formData._pm_benifitowner_value || ''}
                label="Benefit Owner"
                onChange={(e) => {
                  const user = users.find(u => u.systemuserid === e.target.value)
                  setFormData((f: any) => ({ 
                    ...f, 
                    _pm_benifitowner_value: e.target.value,
                    pm_benifitownername: user?.fullname || '' 
                  }))
                }}
                sx={{ borderRadius: 1.5 }}
                renderValue={(selected) => {
                  const user = users.find(u => u.systemuserid === selected)
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
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Entity (Project / Programme)"
              fullWidth
              size="small"
              value={formData.pm_projectcode}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_projectcode: e.target.value }))}
              placeholder="e.g., PRJ-001 or Programme Name"
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
        </Grid>

        {/* Targets & Measures */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrackChangesIcon sx={{ fontSize: 18, color: 'success.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Targets & Measures
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Baseline Value"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_baselinevalue}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_baselinevalue: Number(e.target.value) || 0 }))}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Target Value"
              type="number"
              fullWidth
              size="small"
              value={formData.pm_targetvalue}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_targetvalue: Number(e.target.value) || 0 }))}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Unit of Measure"
              fullWidth
              size="small"
              value={formData.pm_unitofmeasure}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_unitofmeasure: e.target.value }))}
              placeholder="e.g., EUR, %, hours, FTE"
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Realisation Start Date"
              type="date"
              fullWidth
              size="small"
              value={formData.pm_realisationstartdate}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_realisationstartdate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Realisation End Date"
              type="date"
              fullWidth
              size="small"
              value={formData.pm_realisationenddate}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_realisationenddate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
        </Grid>

        {/* Description */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DescriptionIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
            Description
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Benefit Description"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={formData.pm_benefitdescription}
              onChange={(e) => setFormData((f: any) => ({ ...f, pm_benefitdescription: e.target.value }))}
              placeholder="Describe the expected benefit, how it will be measured, and the approach to realisation..."
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={!formData.pm_benefitname.trim() || actionLoading}
          sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1.5, fontWeight: 600 }}
        >
          {actionLoading ? 'Saving...' : editingBenefit ? 'Update Benefit' : 'Register Benefit'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
