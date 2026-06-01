const fs = require('fs');
let c = fs.readFileSync('src/features/workflows/pages/WorkflowsPage.tsx', 'utf8');

// Add Step Configuration tab content before Create/Edit Dialog
if (!c.includes('STEP 3: Step Config')) {
  const tab = `
      {/* STEP 3: Step Configuration */}
      <TabPanel value={pageTab} index={3} pt={0}>
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 2 }}>Select Workflow</Typography>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Workflow Template</InputLabel>
              <Select value={selectedWorkflowId ?? ''} label="Workflow Template" onChange={(e) => setSelectedWorkflowId(e.target.value || null)} sx={{ borderRadius: 2 }}>
                <MenuItem value="">All Templates</MenuItem>
                {workflows.map((wf) => (<MenuItem key={wf.pm_workflowid} value={wf.pm_workflowid}>{wf.pm_workflowname}</MenuItem>))}
              </Select>
            </FormControl>
            {selectedWorkflowId && (
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => openCreateStep(selectedWorkflowId)}
                sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, borderRadius: 2, fontWeight: 600, ml: 'auto' }}>Add Step</Button>
            )}
          </Box>
          {selectedWorkflowId && (() => {
            const wfSteps = stepTemplates.filter((s) => s.pm_module === selectedWorkflowId).sort((a, b) => (a.pm_steporder ?? 0) - (b.pm_steporder ?? 0))
            const wfName = workflows.find((w) => w.pm_workflowid === selectedWorkflowId)?.pm_workflowname ?? ''
            if (wfSteps.length === 0) {
              return (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <SettingsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>No Steps Configured</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Define approval steps for “{wfName}”.</Typography>
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openCreateStep(selectedWorkflowId)}>Configure First Step</Button>
                </Box>
              )
            }
            return (
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {wfName} — {wfSteps.length} Step{wfSteps.length !== 1 ? 's' : ''}
                </Typography>
                {wfSteps.map((step, idx) => (
                  <Paper key={step.pm_workflowsteptemplateid} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { bgcolor: isDark ? '#1e3a5f22' : '#f8fafc' } }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: idx === wfSteps.length - 1 ? '#22c55e' : '#6366f1', fontSize: '0.85rem', fontWeight: 700 }}>{step.pm_steporder ?? idx + 1}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.pm_workflowname ?? 'Unnamed'}</Typography>
                        {step.pm_displayname && <Chip size="small" label={step.pm_displayname} sx={{ fontSize: '0.7rem', height: 20 }} />}
                        {step.pm_approvalrequired ? <Chip size="small" label="Approval" color="warning" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} /> : null}
                        {step.pm_isparallel ? <Chip size="small" label="Parallel" color="info" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} /> : null}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {Number(step.pm_assignetype) === 1 ? <GroupIcon sx={{ fontSize: 14, color: '#f59e0b' }} /> : <PersonIcon sx={{ fontSize: 14, color: '#0ea5e9' }} />}
                          <Typography variant="caption" color="text.secondary">{Number(step.pm_assignetype) === 1 ? 'Team' : 'User'}: {step.pm_assigneeid || 'Not set'}</Typography>
                        </Box>
                        {step.pm_sladays != null && step.pm_sladays > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TimerIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                            <Typography variant="caption" color="text.secondary">SLA: {step.pm_sladays}d</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => openEditStep(step)} sx={{ borderRadius: 1.5 }}><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteStepConfirm(step.pm_workflowsteptemplateid!)} sx={{ borderRadius: 1.5 }}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )
          })()}
          {!selectedWorkflowId && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">Select a workflow template to configure its approval steps.</Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>
`;
  c = c.replace('{/* Create/Edit Dialog */}', tab + '      {/* Create/Edit Dialog */}');
  console.log('Added step config tab content');
}

// Add Step Template Create/Edit Dialog + Delete Confirmation before Delete Confirmation
if (!c.includes('Step Template Create/Edit')) {
  const dlg = `
      {/* Step Template Create/Edit Dialog */}
      <Dialog open={showStepForm} onClose={() => !actionLoading && setShowStepForm(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', borderRadius: 1.5 }}>
            {editingStep ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <SettingsIcon sx={{ fontSize: 18, color: '#fff' }} />}
          </Avatar>
          {editingStep ? 'Edit Step Template' : 'Create Step Template'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField label="Step Name" required fullWidth size="small" value={stepFormData.pm_workflowname}
              onChange={(e) => setStepFormData((f) => ({ ...f, pm_workflowname: e.target.value }))}
              placeholder="e.g. PMO Review, Sponsor Approval" slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <TextField label="Description" fullWidth multiline rows={2} size="small" value={stepFormData.pm_description}
              onChange={(e) => setStepFormData((f) => ({ ...f, pm_description: e.target.value }))}
              slotProps={{ input: { sx: { borderRadius: 2 } } }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Order" type="number" size="small" value={stepFormData.pm_steporder}
                onChange={(e) => setStepFormData((f) => ({ ...f, pm_steporder: Number(e.target.value) }))}
                sx={{ minWidth: 80 }} slotProps={{ input: { sx: { borderRadius: 2 } } }} />
              <TextField label="SLA Days" type="number" size="small" value={stepFormData.pm_sladays}
                on
