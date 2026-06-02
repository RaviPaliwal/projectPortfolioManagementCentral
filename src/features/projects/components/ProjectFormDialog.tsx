import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Button,
} from '@mui/material'
import type { ProjectModel } from '@/types/dataverse'

const defaultProjectForm: Partial<ProjectModel> = {
  pm_projectname: '',
  pm_projectcode: '',
  pm_projectmanager: '',
  pm_projectsponsor: '',
  pm_projectphase: '1',
  pm_ragstatus: '1',
  pm_approvedbudgeteur: 0,
  pm_plannedstartdate: '',
  pm_plannedenddate: '',
}

interface ProjectFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (project: Partial<ProjectModel>) => Promise<void>
  isSaving: boolean
  initialData?: Partial<ProjectModel> | null
}

export const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({
  open,
  onClose,
  onSave,
  isSaving,
  initialData
}) => {
  const [form, setForm] = useState<Partial<ProjectModel>>(defaultProjectForm)

  useEffect(() => {
    if (open) {
      setForm(initialData || defaultProjectForm)
    }
  }, [open, initialData])

  const handleSave = () => {
    onSave(form)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initialData ? 'Edit Project' : 'Create New Project'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Project name *" value={form.pm_projectname ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectname: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Project code" value={form.pm_projectcode ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectcode: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Project manager" value={form.pm_projectmanager ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectmanager: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Sponsor" value={form.pm_projectsponsor ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectsponsor: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="number" label="Budget (EUR)" value={form.pm_approvedbudgeteur ?? 0}
              onChange={(e) => setForm((p) => ({ ...p, pm_approvedbudgeteur: Number(e.target.value) }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Phase" value={form.pm_projectphase ?? '1'}
              onChange={(e) => setForm((p) => ({ ...p, pm_projectphase: e.target.value }))}>
              <MenuItem value="1">Planning</MenuItem>
              <MenuItem value="0">Execution</MenuItem>
              <MenuItem value="2">Closure</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="RAG status" value={form.pm_ragstatus ?? '1'}
              onChange={(e) => setForm((p) => ({ ...p, pm_ragstatus: e.target.value }))}>
              <MenuItem value="1">Green</MenuItem>
              <MenuItem value="0">Amber</MenuItem>
              <MenuItem value="2">Red</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="Start date"
              value={form.pm_plannedstartdate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_plannedstartdate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} label="End date"
              value={form.pm_plannedenddate ?? ''} onChange={(e) => setForm((p) => ({ ...p, pm_plannedenddate: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving || !form.pm_projectname}>
          {isSaving ? 'Saving...' : 'Save Project'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
