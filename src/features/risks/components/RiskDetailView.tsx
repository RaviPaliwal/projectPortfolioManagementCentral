import {
  Typography,
  Box,
  Divider,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material'
import FlagIcon from '@mui/icons-material/Flag'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import type { RiskModel, RiskMitigationActionModel } from '@/types/dataverse'
import {
  PROBABILITY_LABELS,
  IMPACT_LABELS,
  RESIDUAL_PROB_LABELS,
  RESIDUAL_IMPACT_LABELS,
  STRATEGY_LABELS,
  riskScore,
  getScoreLabel,
  getScoreColor,
} from '../constants'
import { MetricTile, StatusTag } from '@/components/common'

interface RiskDetailViewProps {
  selectedRisk: RiskModel
  drawerTab: number
  mitigationActions: RiskMitigationActionModel[]
  mitigationLoading: boolean
}

export const RiskDetailView = ({
  selectedRisk,
  drawerTab,
  mitigationActions,
  mitigationLoading,
}: RiskDetailViewProps) => {
  const selectedRiskScore = riskScore(selectedRisk.pm_inherentprobability, selectedRisk.pm_inherentimpact)
  const selectedResidualScore = riskScore(selectedRisk.pm_residualprobability, selectedRisk.pm_residualimpact)

  if (drawerTab === 0) {
    return (
      <Box>
        {/* Score cards using MetricTile */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={6}>
            <MetricTile
              label="Inherent Score"
              value={selectedRiskScore > 0 ? selectedRiskScore : '—'}
              subtitle={selectedRiskScore > 0 ? getScoreLabel(selectedRiskScore) : 'Unscored'}
              color={getScoreColor(selectedRiskScore)}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 1, px: 1 }}>
              <Typography variant="caption" color="text.secondary">
                P: {PROBABILITY_LABELS[String(selectedRisk.pm_inherentprobability ?? '')] ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                I: {IMPACT_LABELS[String(selectedRisk.pm_inherentimpact ?? '')] ?? '—'}
              </Typography>
            </Box>
          </Grid>
          <Grid size={6}>
            <MetricTile
              label="Residual Score"
              value={selectedResidualScore > 0 ? selectedResidualScore : '—'}
              subtitle={selectedResidualScore > 0 ? getScoreLabel(selectedResidualScore) : 'Unscored'}
              color={getScoreColor(selectedResidualScore)}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 1, px: 1 }}>
              <Typography variant="caption" color="text.secondary">
                P: {RESIDUAL_PROB_LABELS[String(selectedRisk.pm_residualprobability ?? '')] ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                I: {RESIDUAL_IMPACT_LABELS[String(selectedRisk.pm_residualimpact ?? '')] ?? '—'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Info grid */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Risk Details</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary">Reference</Typography>
            <Typography variant="body2">{selectedRisk.pm_riskreference ?? '—'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary">Risk Owner</Typography>
            <Typography variant="body2">{selectedRisk.pm_riskowner ?? '—'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary">Identified Date</Typography>
            <Typography variant="body2">{selectedRisk.pm_identifieddate ?? '—'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary">Target Close Date</Typography>
            <Typography variant="body2">{selectedRisk.pm_targetclosedate ?? '—'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary">Programme</Typography>
            <Typography variant="body2">{selectedRisk.pm_programme ?? '—'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary">Project</Typography>
            <Typography variant="body2">{selectedRisk.pm_projectcode ?? '—'}</Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Cause / Effect */}
        {selectedRisk.pm_riskcause && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Cause</Typography>
            <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskcause}</Typography>
          </Box>
        )}
        {selectedRisk.pm_riskeffect && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Effect</Typography>
            <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskeffect}</Typography>
          </Box>
        )}
        {selectedRisk.pm_riskdescription && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Description</Typography>
            <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskdescription}</Typography>
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Box>
      {/* Strategy comparison using Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={6}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: `${getScoreColor(selectedRiskScore)}10` }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Before
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: getScoreColor(selectedRiskScore), mt: 0.5 }}>
                {selectedRiskScore > 0 ? selectedRiskScore : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                P: {PROBABILITY_LABELS[String(selectedRisk.pm_inherentprobability ?? '')] ?? '—'} / I: {IMPACT_LABELS[String(selectedRisk.pm_inherentimpact ?? '')] ?? '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={6}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: `${getScoreColor(selectedResidualScore)}10` }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                After
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: getScoreColor(selectedResidualScore), mt: 0.5 }}>
                {selectedResidualScore > 0 ? selectedResidualScore : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                P: {RESIDUAL_PROB_LABELS[String(selectedRisk.pm_residualprobability ?? '')] ?? '—'} / I: {RESIDUAL_IMPACT_LABELS[String(selectedRisk.pm_residualimpact ?? '')] ?? '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Response Strategy */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">Response Strategy</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {STRATEGY_LABELS[String(selectedRisk.pm_responsestrategy ?? '')] ?? 'Not Defined'}
        </Typography>
      </Box>

      {selectedRisk.pm_escalated && (
        <Alert severity="error" icon={<FlagIcon />} sx={{ borderRadius: 2, mb: 2 }}>
          This risk has been escalated.
        </Alert>
      )}

      {/* Mitigation Actions */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssignmentIcon fontSize="small" />
        Mitigation Actions
        {mitigationActions.length > 0 && (
          <StatusTag label={mitigationActions.length} color="primary" sx={{ fontWeight: 700 }} />
        )}
      </Typography>

      {mitigationLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : mitigationActions.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
          {mitigationActions.map((action) => {
            const actionStatus = String(action.pm_status ?? '')
            return (
              <Card key={action.pm_riskmitigationactionid} variant="outlined" sx={{ borderRadius: 2, '&:hover': { borderColor: 'primary.light' } }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {action.pm_actiontitle || 'Untitled Action'}
                    </Typography>
                    <StatusTag
                      label={actionStatus === '0' ? 'Complete' : actionStatus === '1' ? 'In Progress' : '—'}
                      color={actionStatus === '0' ? 'success' : actionStatus === '1' ? 'info' : 'default'}
                      icon={actionStatus === '0' ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <HourglassEmptyIcon sx={{ fontSize: 14 }} />}
                    />
                  </Box>
                  {action.pm_actiondescription && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
                      {action.pm_actiondescription}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {action.pm_actionowner && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">{action.pm_actionowner}</Typography>
                      </Box>
                    )}
                    {action.pm_duedate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          Due: {new Date(action.pm_duedate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                    {action.pm_effectiveness !== undefined && action.pm_effectiveness !== '' && (
                      <StatusTag
                        label={{
                          '0': 'High Effectiveness',
                          '1': 'Medium Effectiveness',
                          '2': 'Not Assessed',
                        }[String(action.pm_effectiveness)] ?? '—'}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      ) : (
        <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50', textAlign: 'center', mb: 3 }}>
          <AssignmentIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No mitigation actions recorded for this risk.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Mitigation actions help track and manage risk reduction activities.
          </Typography>
        </Box>
      )}

      {/* Strategy summary alert */}
      {(selectedRisk.pm_responsestrategy === undefined || String(selectedRisk.pm_responsestrategy) === '') ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No mitigation strategy has been defined for this risk. Edit the risk to add a response strategy and residual scores.
        </Alert>
      ) : (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2 }}>
          Risk has a defined response strategy ({STRATEGY_LABELS[String(selectedRisk.pm_responsestrategy)] ?? '—'}).
          {selectedResidualScore > 0 && selectedRiskScore > 0 && selectedResidualScore < selectedRiskScore
            ? ` Expected score reduction: ${selectedRiskScore} → ${selectedResidualScore}`
            : ''}
        </Alert>
      )}
    </Box>
  )
}
