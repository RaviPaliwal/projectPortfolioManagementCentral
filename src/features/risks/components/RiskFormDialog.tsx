import {
  Typography,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Switch,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Box,
  Avatar,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import type { RiskModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import { useUser } from '@/context/UserContext'
import {
  RISK_CATEGORY_LABELS,
  RAG_LABELS,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
  RESIDUAL_PROB_LABELS,
  RESIDUAL_IMPACT_LABELS,
  STRATEGY_LABELS,
  probNumeric,
  impactNumeric,
  riskScore,
  getScoreLabel,
  getScoreColor,
} from '../constants'

interface RiskFormDialogProps {
  open: boolean
  onClose: () => void
  editingRisk: RiskModel | null
  form: Partial<RiskModel>
  setForm: (form: Partial<RiskModel> | ((f: Partial<RiskModel>) => Partial<RiskModel>)) => void
  onSave: () => Promise<void>
  saving: boolean
}

export const RiskFormDialog = ({
  open,
  onClose,
  editingRisk,
  form,
  setForm,
  onSave,
  saving,
}: RiskFormDialogProps) => {
  const { users } = useUser()
  const inherentScore = riskScore(form.pm_inherentprobability, form.pm_inherentimpact)
  const residualScore = riskScore(form.pm_residualprobability, form.pm_residualimpact)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editingRisk ? 'Edit Risk' : 'Add New Risk'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2.5}>
          {/* Basic Information */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Basic Information
            </Typography>
          </Grid>
          <Grid size={8}>
            <TextField
              label="Risk Title"
              value={form.pm_risktitle ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_risktitle: e.target.value }))}
              fullWidth
              required
              size="small"
            />
          </Grid>
          <Grid size={4}>
            <TextField
              label="Reference"
              value={form.pm_riskreference ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_riskreference: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid size={4}>
            <TextField
              label="Category"
              value={form.pm_riskcategory ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_riskcategory: e.target.value }))}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="">— Select —</MenuItem>
              {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={4}>
            <TextField
              label="RAG Status"
              value={form.pm_ragstatus ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_ragstatus: e.target.value }))}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="">— Select —</MenuItem>
              {Object.entries(RAG_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Risk Owner</InputLabel>
              <Select
                value={users.find(u => u.fullname === form.pm_riskowner)?.systemuserid || ''}
                label="Risk Owner"
                onChange={(e) => {
                  const user = users.find(u => u.systemuserid === e.target.value)
                  setForm((f) => ({ ...f, pm_riskowner: user?.fullname || '' }))
                }}
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
                <MenuItem value="">— Select —</MenuItem>
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
          <Grid size={6}>
            <TextField
              label="Identified Date"
              type="date"
              value={form.pm_identifieddate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_identifieddate: e.target.value }))}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Target Close Date"
              type="date"
              value={form.pm_targetclosedate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_targetclosedate: e.target.value }))}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Cause"
              value={form.pm_riskcause ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_riskcause: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Effect"
              value={form.pm_riskeffect ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_riskeffect: e.target.value }))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Description"
              value={form.pm_riskdescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_riskdescription: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.pm_escalated ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, pm_escalated: e.target.checked }))}
                />
              }
              label="Escalated"
            />
          </Grid>

          {/* Probability & Impact Scoring */}
          <Grid size={12}>
            <Divider />
          </Grid>
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Inherent Risk Scoring
            </Typography>
          </Grid>
          <Grid size={4}>
            <TextField
              label="Inherent Probability"
              value={form.pm_inherentprobability ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_inherentprobability: e.target.value }))}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="">— Select —</MenuItem>
              {Object.entries(PROBABILITY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v} ({probNumeric(k)})</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={4}>
            <TextField
              label="Inherent Impact"
              value={form.pm_inherentimpact ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_inherentimpact: e.target.value }))}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="">— Select —</MenuItem>
              {Object.entries(IMPACT_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v} ({impactNumeric(k)})</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pt: 1 }}>
              <StatusTag
                label={`Score: ${inherentScore} — ${getScoreLabel(inherentScore)}`}
                color={inherentScore > 0 ? getScoreColor(inherentScore) : 'default'}
                sx={{ fontWeight: 700, px: 1 }}
              />
            </Box>
          </Grid>

          {/* Residual Scoring */}
          <Grid size={12}>
            <Divider />
          </Grid>
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Residual (Post-Mitigation) Scoring
            </Typography>
          </Grid>
          <Grid size={4}>
            <TextField
              label="Residual Probability"
              value={form.pm_residualprobability ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_residualprobability: e.target.value }))}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="">— Select —</MenuItem>
              {Object.entries(RESIDUAL_PROB_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={4}>
            <TextField
              label="Residual Impact"
              value={form.pm_residualimpact ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_residualimpact: e.target.value }))}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="">— Select —</MenuItem>
              {Object.entries(RESIDUAL_IMPACT_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pt: 1 }}>
              <StatusTag
                label={`Score: ${residualScore} — ${getScoreLabel(residualScore)}`}
                color={residualScore > 0 ? getScoreColor(residualScore) : 'default'}
                sx={{ fontWeight: 700, px: 1 }}
              />
            </Box>
          </Grid>
          <Grid size={4}>
            <TextField
              label="Response Strategy"
              value={form.pm_responsestrategy ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, pm_responsestrategy: e.target.value }))}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="">— Select —</MenuItem>
              {Object.entries(STRATEGY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Entity References */}
          <Grid size={12}>
            <Divider />
          </Grid>
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Entity References (Optional)
            </Typography>
          </Grid>
          <Grid size={6}>
            <TextField
              label="Programme FK (GUID)"
              value={form._pm_programmefk_value ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, _pm_programmefk_value: e.target.value }))}
              fullWidth
              size="small"
              placeholder="Programme GUID"
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Project FK (GUID)"
              value={form._pm_project_value ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, _pm_project_value: e.target.value }))}
              fullWidth
              size="small"
              placeholder="Project GUID"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving || !form.pm_risktitle?.trim()}>
          {saving ? <CircularProgress size={20} /> : editingRisk ? 'Update Risk' : 'Create Risk'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
