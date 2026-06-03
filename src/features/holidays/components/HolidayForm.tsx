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
  useTheme,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CelebrationIcon from '@mui/icons-material/Celebration'
import { fontSizes } from '@/styles'
import type { HolidayModel } from '@/types/dataverse'
import type { FilterOption } from '@/components/common'

interface HolidayFormProps {
  open: boolean
  onClose: () => void
  editingHoliday: HolidayModel | null
  formData: Omit<HolidayModel, 'pm_holidayid'>
  onFormDataChange: (data: any) => void
  countryOptions: FilterOption[]
  onSave: () => void
  actionLoading: boolean
}

export const HolidayForm: React.FC<HolidayFormProps> = ({
  open,
  onClose,
  editingHoliday,
  formData,
  onFormDataChange,
  countryOptions,
  onSave,
  actionLoading,
}) => {
  const theme = useTheme()

  return (
    <Dialog 
      open={open} 
      onClose={() => !actionLoading && onClose()} 
      maxWidth="sm" 
      fullWidth 
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ 
          width: 36, 
          height: 36, 
          bgcolor: editingHoliday ? 'primary.main' : 'warning.main', 
          borderRadius: 1.5 
        }}>
          {editingHoliday ? <EditIcon sx={{ fontSize: 20, color: '#fff' }} /> : <CelebrationIcon sx={{ fontSize: 20, color: '#fff' }} />}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {editingHoliday 
            ? `Update details for ${editingHoliday.pm_holidayname}.` 
            : 'Add a new public holiday to the calendar.'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CelebrationIcon sx={{ fontSize: 18, color: 'warning.main' }} />
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: 0.5, 
            fontSize: fontSizes.xs, 
            color: 'text.secondary' 
          }}>
            Holiday Information
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField 
              label="Holiday Name" 
              required 
              fullWidth 
              size="small" 
              value={formData.pm_holidayname}
              onChange={(e) => onFormDataChange({ pm_holidayname: e.target.value })}
              placeholder="e.g., Christmas Day" 
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }} 
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField 
              label="Date" 
              required 
              type="date" 
              fullWidth 
              size="small" 
              value={formData.pm_holidaydate}
              onChange={(e) => onFormDataChange({ pm_holidaydate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }} 
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Country</InputLabel>
              <Select 
                value={formData.pm_country} 
                label="Country" 
                onChange={(e) => onFormDataChange({ pm_country: e.target.value })} 
                sx={{ borderRadius: 1.5 }}
              >
                {countryOptions.filter((o) => o.value).map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Type</InputLabel>
              <Select 
                value={formData.pm_isfixeddate ? 'fixed' : 'variable'} 
                label="Date Type"
                onChange={(e) => onFormDataChange({ pm_isfixeddate: e.target.value === 'fixed' })} 
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value="fixed">Fixed Date</MenuItem>
                <MenuItem value="variable">Variable Date</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField 
              label="Year" 
              type="number" 
              fullWidth 
              size="small" 
              value={formData.pm_year}
              onChange={(e) => onFormDataChange({ pm_year: parseInt(e.target.value, 10) || new Date().getFullYear() })}
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }} 
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField 
              label="Notes" 
              fullWidth 
              multiline 
              rows={2} 
              size="small" 
              value={formData.pm_notes}
              onChange={(e) => onFormDataChange({ pm_notes: e.target.value })}
              placeholder="Additional information about this holiday..." 
              slotProps={{ input: { sx: { borderRadius: 1.5 } } }} 
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" disabled={actionLoading}>Cancel</Button>
        <Button 
          onClick={onSave} 
          variant="contained"
          disabled={!(formData.pm_holidayname?.trim()) || !formData.pm_holidaydate || actionLoading}
          sx={{ fontWeight: 600 }}
        >
          {actionLoading ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Create Holiday'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
