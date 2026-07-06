import React, { useState, useEffect, useRef, type ComponentType } from 'react'
import {
  Dialog, DialogContent, DialogActions, Box, Typography,
  CircularProgress, Divider, Paper, Checkbox,
  Alert, Chip, IconButton
} from '@mui/material'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import CloseIcon from '@mui/icons-material/Close'
import { fetchApprovalStepById } from '@/services/task-resolver.service'
import {
  fetchChecklistConfigurations,
  fetchChecklistResponses,
  saveChecklistResponses,
  type SaveChecklistResponseDto
} from '@/services/checklist.service'
import { fetchWorkflowStepTemplates } from '@/services/workflow.service'
import type { ChecklistConfigurationModel, ChecklistResponseModel } from '@/types/dataverse'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { dispatchFormDialogDecision } from '@/utils/formDialogEvents'
import { fontSizes } from '@/styles'

interface ChecklistTaskModalProps {
  approvalStepId: string
  onClose: () => void
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
  entityId?: string | null
  DecisionBox: ComponentType<DecisionBoxProps>
}

export const ChecklistTaskModal: React.FC<ChecklistTaskModalProps> = ({
  onClose, approvalStepId, onSuccess, onError, DecisionBox: DecisionBoxProp
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [configs, setConfigs] = useState<ChecklistConfigurationModel[]>([])
  const [responses, setResponses] = useState<Record<string, { isChecked: boolean, responseId?: string }>>({})
  const [stepName, setStepName] = useState<string>('Required Checklist')
  
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!approvalStepId) return
    setLoading(true)

    const loadData = async () => {
      try {
        const step = await fetchApprovalStepById(approvalStepId)
        if (!step) throw new Error('Approval step not found.')
        if (!step._pm_workflowtemplate_value) throw new Error('No template linked to this step.')

        const workflowId = step._pm_workflowtemplate_value
        
        // _pm_workflowtemplate_value on the step actually stores the Workflow ID.
        // We must fetch the templates for this workflow and match by name to get the true Step Template ID.
        const templates = await fetchWorkflowStepTemplates(workflowId)
        const template = templates.find((t) => t.pm_workflowname === step.pm_stepname)
        
        if (!template || !template.pm_workflowsteptemplateid) {
          throw new Error(`Step template for "${step.pm_stepname}" not found.`)
        }
        
        const trueTemplateId = template.pm_workflowsteptemplateid

        const [loadedConfigs, loadedResponses] = await Promise.all([
          fetchChecklistConfigurations(trueTemplateId),
          fetchChecklistResponses(approvalStepId)
        ])
        if (!mountedRef.current) return

        setConfigs(loadedConfigs)
        setStepName(step.pm_stepname || 'Required Checklist')

        const initialResponses: Record<string, { isChecked: boolean, responseId?: string }> = {}
        
        // Initialize all configs to false or their existing response
        loadedConfigs.forEach(cfg => {
          if (!cfg.pm_workflowchecklistconfigurationid) return
          initialResponses[cfg.pm_workflowchecklistconfigurationid] = { isChecked: false }
        })

        // Apply loaded responses
        loadedResponses.forEach(res => {
          if (res._pm_checklistconfiguration_value) {
            initialResponses[res._pm_checklistconfiguration_value] = {
              isChecked: !!res.pm_responseflag,
              responseId: res.pm_checklistresponseid
            }
          }
        })
        
        setResponses(initialResponses)
      } catch (err) {
        if (mountedRef.current) {
           console.error('[ChecklistTaskModal]', err)
           onError?.('Failed to load checklist data.')
        }
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    loadData()
  }, [approvalStepId, onError])

  const handleToggle = (configId: string, checked: boolean) => {
    setResponses(prev => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        isChecked: checked
      }
    }))
  }

  // Determine if all required are checked
  const missingRequired = configs.filter(cfg => 
    cfg.pm_isrequired && 
    cfg.pm_workflowchecklistconfigurationid && 
    !responses[cfg.pm_workflowchecklistconfigurationid]?.isChecked
  )

  const canApprove = missingRequired.length === 0

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">Loading checklist...</Typography>
          </Box>
        ) : (
          <Box>
            <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: 'primary.50', color: 'primary.main', borderRadius: 2, display: 'flex' }}>
                  <PlaylistAddCheckIcon />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{stepName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please complete the required checklist items before approving this step.
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ p: 2.5 }}>
              {!canApprove && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 1.5 }}>
                  You must complete all required checklist items before you can approve this task.
                </Alert>
              )}

              {configs.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No checklist configurations found for this step.</Typography>
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  {configs.map((cfg, index) => {
                    const configId = cfg.pm_workflowchecklistconfigurationid!
                    const isChecked = responses[configId]?.isChecked || false
                    return (
                      <Box key={configId}>
                        <Box sx={{ p: 1.5, px: 2, display: 'flex', alignItems: 'flex-start', bgcolor: isChecked ? 'success.50' : 'transparent', transition: 'background-color 0.2s' }}>
                           <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                               <Typography variant="body2" sx={{ fontWeight: 600, color: isChecked ? 'success.main' : 'text.primary' }}>
                                 {cfg.pm_itemname || cfg.pm_name}
                               </Typography>
                               {cfg.pm_isrequired && (
                                 <Chip label="Required" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                               )}
                             </Box>
                             <Checkbox 
                               checked={isChecked} 
                               onChange={(e) => handleToggle(configId, e.target.checked)}
                               color="primary"
                               sx={{ p: 0.5 }}
                             />
                           </Box>
                        </Box>
                        {index < configs.length - 1 && <Divider />}
                      </Box>
                    )
                  })}
                </Paper>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ p: 2.5, bgcolor: 'background.paper', flexDirection: 'column', alignItems: 'stretch' }}>
        {DecisionBoxProp && approvalStepId ? (
          <DecisionBoxProp
            approvalStepId={approvalStepId}
            onBeforeDecision={async (decision) => {
              // 0 = Approve
              if (decision === 0 && !canApprove) {
                onError?.('Please complete all required checklist items before approving.')
                return false
              }
              
              setSaving(true)
              try {
                // Save checklist responses
                const payload: SaveChecklistResponseDto[] = configs.map(cfg => {
                  const configId = cfg.pm_workflowchecklistconfigurationid!
                  const state = responses[configId]
                  return {
                    configId,
                    itemName: cfg.pm_itemname || cfg.pm_name || 'Checklist Item',
                    isChecked: state.isChecked,
                    responseId: state.responseId
                  }
                })
                
                await saveChecklistResponses(approvalStepId, payload)
                onSuccess?.('Checklist responses saved.')
                return true
              } catch (err) {
                onError?.('Failed to save checklist responses.')
                return false
              } finally {
                setSaving(false)
              }
            }}
            onDecisionComplete={(decision) => {
              dispatchFormDialogDecision({ formKey: 'CHECKLIST_APPROVAL_TASK', decision })
              onClose()
            }}
            onDecisionError={(msg) => onError?.(msg)}
            disabled={loading || saving}
            approveDisabled={!canApprove}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
            No decision options available for this step.
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  )
}
