import {
  Typography,
  Box,
  Divider,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Button,
  Paper,
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
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  RAG_LABELS,
  RAG_COLORS,
} from '../constants'
import { MetricTile, StatusTag } from '@/components/common'
import { formatDate } from '@/utils/formatters'

interface RiskDetailViewProps {
  selectedRisk: RiskModel
  drawerTab: number
  mitigationActions: RiskMitigationActionModel[]
  mitigationLoading: boolean
  onAddActionClick?: () => void
}

export const RiskDetailView = ({
  selectedRisk,
  drawerTab,
  mitigationActions,
  mitigationLoading,
  onAddActionClick,
}: RiskDetailViewProps) => {
  const selectedRiskScore = riskScore(selectedRisk.pm_inherentprobability, selectedRisk.pm_inherentimpact)
  const selectedResidualScore = riskScore(selectedRisk.pm_residualprobability, selectedRisk.pm_residualimpact)

  const renderMitigationSection = () => (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ my: 2 }} />
      {/* Mitigation Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon fontSize="small" />
          Mitigation Actions
          {mitigationActions.length > 0 && (
            <StatusTag label={mitigationActions.length} color="primary" sx={{ fontWeight: 700 }} />
          )}
        </Typography>
        {onAddActionClick && (
          <Button size="small" variant="outlined" onClick={onAddActionClick}>
            Add Action
          </Button>
        )}
      </Box>

      {mitigationLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : mitigationActions.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
          {mitigationActions.map((action) => {
            const actionStatus = String(action.pm_status ?? '')
            return (
              <Card key={action.pm_riskmitigationactionid} variant="outlined" sx={{ borderRadius: 1.5, '&:hover': { borderColor: 'primary.light' } }}>
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
                          Due: {formatDate(action.pm_duedate)}
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
        <Box sx={{ p: 3, borderRadius: 1.5, bgcolor: 'grey.50', textAlign: 'center', mb: 3 }}>
          <AssignmentIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No mitigation actions recorded for this risk.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Mitigation actions help track and manage risk reduction activities.
          </Typography>
        </Box>
      )}
    </Box>
  )

  if (drawerTab === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
        {selectedRisk.pm_escalated && (
          <Alert severity="error" icon={<FlagIcon />} sx={{ borderRadius: 1.5, mb: 2 }}>
            This risk has been escalated.
          </Alert>
        )}
        {/* Info grid */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>Risk Details</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Risk</Typography>
            <Typography variant="body2">{selectedRisk.pm_risktitle ?? '—'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Identified Date</Typography>
            <Typography variant="body2">{formatDate(selectedRisk.pm_identifieddate)}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Target Close Date</Typography>
            <Typography variant="body2">{formatDate(selectedRisk.pm_targetclosedate)}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Owner</Typography>
            <Typography variant="body2">{selectedRisk.pm_riskownername ?? '—'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
              {selectedRisk.pm_regardingidtype === 'pm_projects' ? 'Project' :
               selectedRisk.pm_regardingidtype === 'pm_programmes' ? 'Programme' :
               selectedRisk.pm_regardingidtype === 'pm_portfolios' ? 'Portfolio' : 'Project'}
            </Typography>
            <Typography variant="body2">{selectedRisk.pm_projectname ?? '—'}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Category</Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusTag
                label={RISK_CATEGORY_LABELS[String(selectedRisk.pm_riskcategory ?? '')] ?? '—'}
                color="default"
                sx={{
                  bgcolor: `${RISK_CATEGORY_COLORS[String(selectedRisk.pm_riskcategory ?? '')] ?? '#ccc'}20`,
                  color: RISK_CATEGORY_COLORS[String(selectedRisk.pm_riskcategory ?? '')] ?? 'text.disabled',
                  border: 'none',
                  fontWeight: 600
                }}
              />
            </Box>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>RAG Status</Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusTag
                label={RAG_LABELS[String(selectedRisk.pm_ragstatus ?? '')] ?? '—'}
                color={
                  RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'error' ? 'error' :
                  RAG_COLORS[String(selectedRisk.pm_ragstatus ?? '')] === 'warning' ? 'warning' : 'success'
                }
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Inherent Score</Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusTag
                label={selectedRiskScore > 0 ? `${selectedRiskScore} — ${getScoreLabel(selectedRiskScore)}` : '—'}
                color={getScoreColor(selectedRiskScore) as any}
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Grid>
          <Grid size={6}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Residual Score</Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusTag
                label={selectedResidualScore > 0 ? `${selectedResidualScore} — ${getScoreLabel(selectedResidualScore)}` : '—'}
                color={getScoreColor(selectedResidualScore) as any}
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Grid>
        </Grid>

        {(selectedRisk.pm_riskcause || selectedRisk.pm_riskeffect || selectedRisk.pm_riskdescription) && (
          <Divider sx={{ my: 2 }} />
        )}

        {/* Cause / Effect */}
        {selectedRisk.pm_riskcause && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>Cause</Typography>
            <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskcause}</Typography>
          </Box>
        )}
        {selectedRisk.pm_riskeffect && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>Effect</Typography>
            <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskeffect}</Typography>
          </Box>
        )}
        {selectedRisk.pm_riskdescription && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>Description</Typography>
            <Typography variant="body2" color="text.secondary">{selectedRisk.pm_riskdescription}</Typography>
          </Box>
        )}
        {renderMitigationSection()}
      </Paper>
    )
  }

  return (
    <Box>
      {/* Strategy comparison using Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={6}>
          <Card variant="outlined" sx={{ borderRadius: 1.5, bgcolor: `${getScoreColor(selectedRiskScore)}10` }}>
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
          <Card variant="outlined" sx={{ borderRadius: 1.5, bgcolor: `${getScoreColor(selectedResidualScore)}10` }}>
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
        <Alert severity="error" icon={<FlagIcon />} sx={{ borderRadius: 1.5, mb: 2 }}>
          This risk has been escalated.
        </Alert>
      )}

      {/* Mitigation Actions */}
      {renderMitigationSection()}

      {/* Strategy summary alert */}
      {(selectedRisk.pm_responsestrategy === undefined || String(selectedRisk.pm_responsestrategy) === '') ? (
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          No mitigation strategy has been defined for this risk. Edit the risk to add a response strategy and residual scores.
        </Alert>
      ) : (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 1.5 }}>
          Risk has a defined response strategy ({STRATEGY_LABELS[String(selectedRisk.pm_responsestrategy)] ?? '—'}).
          {selectedResidualScore > 0 && selectedRiskScore > 0 && selectedResidualScore < selectedRiskScore
            ? ` Expected score reduction: ${selectedRiskScore} → ${selectedResidualScore}`
            : ''}
        </Alert>
      )}
    </Box>
  )
}
