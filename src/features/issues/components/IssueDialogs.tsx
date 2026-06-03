import React from 'react'
import {
  Box, Typography, TextField, Select, MenuItem,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  FormControl, InputLabel, FormControlLabel, Switch,
} from '@mui/material'
import NewReleasesIcon from '@mui/icons-material/NewReleases'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import LowPriorityIcon from '@mui/icons-material/LowPriority'
import type { IssueModel } from '@/types/dataverse'

interface IssueDialogsProps {
  dialogOpen: boolean
  onClose: () => void
  editingIssue: IssueModel | null
  form: Partial<IssueModel>
  setForm: (form: Partial<IssueModel>) => void
  handleSave: () => Promise<void>
  actionLoading: boolean
  deleteTarget: IssueModel | null
  setDeleteTarget: (target: IssueModel | null) => void
  handleDelete: () => Promise<void>
}

export const IssueDialogs: React.FC<IssueDialogsProps> = ({
  dialogOpen,
  onClose,
  editingIssue,
  form,
  setForm,
  handleSave,
  actionLoading,
  deleteTarget,
  setDeleteTarget,
  handleDelete,
}) => {
  return (
    <>
      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIssue ? 'Edit Issue' : 'Create New Issue'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Section: Basic Information */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>
              Basic Information
            </Typography>
            <TextField
              label="Issue Title"
              value={form.pm_issuetitle ?? ''}
              onChange={(e) => setForm({ ...form, pm_issuetitle: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={form.pm_issuecategory ?? '0'}
                  label="Category"
                  onChange={(e) => setForm({ ...form, pm_issuecategory: e.target.value })}
                >
                  <MenuItem value="0">Dependency</MenuItem>
                  <MenuItem value="1">Technical</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={form.pm_prioritylevel ?? '2'}
                  label="Priority"
                  onChange={(e) => setForm({ ...form, pm_prioritylevel: e.target.value })}
                >
                  <MenuItem value="1">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NewReleasesIcon color="error" fontSize="small" /> Critical
                    </Box>
                  </MenuItem>
                  <MenuItem value="0">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PriorityHighIcon color="warning" fontSize="small" /> High
                    </Box>
                  </MenuItem>
                  <MenuItem value="2">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LowPriorityIcon color="info" fontSize="small" /> Medium
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Impact</InputLabel>
                <Select
                  value={form.pm_impactlevel ?? '2'}
                  label="Impact"
                  onChange={(e) => setForm({ ...form, pm_impactlevel: e.target.value })}
                >
                  <MenuItem value="1">Major</MenuItem>
                  <MenuItem value="0">Moderate</MenuItem>
                  <MenuItem value="2">Minor</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>RAG Status</InputLabel>
              <Select
                value={form.pm_ragstatus ?? '1'}
                label="RAG Status"
                onChange={(e) => setForm({ ...form, pm_ragstatus: e.target.value })}
              >
                <MenuItem value="2">Red</MenuItem>
                <MenuItem value="0">Amber</MenuItem>
                <MenuItem value="1">Green</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.pm_escalationstatus}
                  onChange={(e) => setForm({ ...form, pm_escalationstatus: e.target.checked })}
                  color="error"
                />
              }
              label="Escalated"
            />

            {/* Section: Assignment & Dates */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>
              Assignment & Dates
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Issue Owner"
                value={form.pm_issueowner ?? ''}
                onChange={(e) => setForm({ ...form, pm_issueowner: e.target.value })}
                fullWidth
              />
              <TextField
                label="Issue Reference"
                value={form.pm_issuereference ?? ''}
                onChange={(e) => setForm({ ...form, pm_issuereference: e.target.value })}
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Raised Date"
                type="date"
                value={form.pm_dateraised ?? ''}
                onChange={(e) => setForm({ ...form, pm_dateraised: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Target Resolution Date"
                type="date"
                value={form.pm_targetresolutiondate ?? ''}
                onChange={(e) => setForm({ ...form, pm_targetresolutiondate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Actual Resolution Date"
                type="date"
                value={form.pm_actualresolutiondate ?? ''}
                onChange={(e) => setForm({ ...form, pm_actualresolutiondate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Box>

            {/* Section: Details */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mt: 1 }}>
              Details
            </Typography>
            <TextField
              label="Description"
              value={form.pm_issuedescription ?? ''}
              onChange={(e) => setForm({ ...form, pm_issuedescription: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Resolution Details"
              value={form.pm_resolutiondetails ?? ''}
              onChange={(e) => setForm({ ...form, pm_resolutiondetails: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Linked Risk"
              value={form.pm_linkedrisk ?? ''}
              onChange={(e) => setForm({ ...form, pm_linkedrisk: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.pm_issuetitle || actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : undefined}
          >
            {editingIssue ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Issue</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteTarget?.pm_issuetitle}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : undefined}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
