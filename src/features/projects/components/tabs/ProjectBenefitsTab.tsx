import React from 'react'
import { useUser } from '@/context/UserContext'
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  useTheme,
  Button,
  Avatar
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import StarIcon from '@mui/icons-material/Star'
import DescriptionIcon from '@mui/icons-material/Description'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import TimelineIcon from '@mui/icons-material/Timeline'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

import { StatusTag, KpiCardRow } from '@/components/common'
import type { BenefitModel } from '@/types/dataverse'
import { RiskDetailView } from '@/features/risks/components/RiskDetailView'
import { BenefitsGrid } from '@/features/benefits/components/BenefitsGrid'
import PieChartIcon from '@mui/icons-material/PieChart'
import VerifiedIcon from '@mui/icons-material/Verified'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import SpeedIcon from '@mui/icons-material/Speed'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { LinearProgress } from '@mui/material'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

interface ProjectBenefitsTabProps {
  benefits: BenefitModel[]
  onAddBenefit?: () => void
  selectedBenefit: BenefitModel | null
  setSelectedBenefit: (benefit: BenefitModel | null) => void
  canEdit?: boolean
  canDelete?: boolean
  onEditBenefit?: (benefit: BenefitModel) => void
  onDeleteBenefit?: (benefitId: string) => void
}

// Mappings matching BenefitsPage.tsx and constants.ts
const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Financial',
  '1': 'Non Financial',
  '2': 'Strategic',
}

const CATEGORY_COLORS: Record<string, 'success' | 'primary' | 'secondary' | 'default'> = {
  '0': 'success',
  '1': 'primary',
  '2': 'secondary',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'On Track',
  '1': 'Planned',
  '2': 'At Risk',
}

const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning'> = {
  '0': 'success',
  '1': 'info',
  '2': 'warning',
}

const RAG_LABELS: Record<string, string> = {
  '0': 'On Track',
  '1': 'Warning',
  '2': 'Critical',
}

const RAG_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  '0': 'success',
  '1': 'warning',
  '2': 'error',
}

export const ProjectBenefitsTab: React.FC<ProjectBenefitsTabProps> = ({
  benefits,
  onAddBenefit,
  selectedBenefit,
  setSelectedBenefit,
  canEdit = false,
  canDelete = false,
  onEditBenefit,
  onDeleteBenefit
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { users } = useUser()

  // Realized is status "0" (On Track) or whatever matches realization status
  const achievedBenefits = benefits.filter(b => String(b.pm_benefitstatus) === '0' || b.pm_benefitstatus === 0).length
  const achievementRate = benefits.length > 0 ? Math.round((achievedBenefits / benefits.length) * 100) : 0

  const categorySummary = React.useMemo(() => {
    const summaryMap: Record<string, { name: string; value: number; color: string }> = {
      '0': { name: 'Financial', value: 0, color: theme.palette.success.main },
      '1': { name: 'Non Financial', value: 0, color: theme.palette.primary.main },
      '2': { name: 'Strategic', value: 0, color: theme.palette.secondary.main }
    }

    for (const b of benefits) {
      const cat = String(b.pm_benefitcategory ?? '')
      if (summaryMap[cat]) {
        summaryMap[cat].value += 1
      }
    }

    return Object.values(summaryMap).filter(c => c.value > 0)
  }, [benefits, theme])

  const criticalCount = React.useMemo(() => {
    return benefits.filter(b => String(b.pm_ragstatus) === '2' || b.pm_ragstatus === 2).length
  }, [benefits])

  // Number formatter for values
  const numberFormatter = new Intl.NumberFormat('en-GB')

  // Filter dropdown states
  const [benefitCategoryFilter, setBenefitCategoryFilter] = React.useState('')
  const [benefitStatusFilter, setBenefitStatusFilter] = React.useState('')

  // Inline Benefit Detail View (matching BenefitsPage.tsx layout)
  if (selectedBenefit) {
    const startDate = selectedBenefit.pm_realisationstartdate ? new Date(selectedBenefit.pm_realisationstartdate) : null
    const endDate = selectedBenefit.pm_realisationenddate ? new Date(selectedBenefit.pm_realisationenddate) : null
    const today = new Date()
    let timeProgress = 0
    let durationDays = 0
    if (startDate && endDate && endDate > startDate) {
      const total = endDate.getTime() - startDate.getTime()
      const current = today.getTime() - startDate.getTime()
      timeProgress = Math.min(100, Math.max(0, Math.round((current / total) * 100)))
      durationDays = Math.ceil(total / (1000 * 60 * 60 * 24))
    }

    const ragColor = RAG_COLORS[String(selectedBenefit.pm_ragstatus) as keyof typeof RAG_COLORS] || 'text.secondary'
    const ragLabel = RAG_LABELS[String(selectedBenefit.pm_ragstatus) as keyof typeof RAG_LABELS] ?? 'Not Set'

    const ownerName = selectedBenefit.pm_benifitownername || users.find(u => u.systemuserid === selectedBenefit._pm_benifitowner_value)?.fullname || 'Unassigned'

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Back navigation & Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => setSelectedBenefit(null)}
            variant="text"
            color="primary"
            sx={{ fontWeight: 600, px: 1.5 }}
          >
            Back to Benefits
          </Button>
        </Box>

        <Grid container spacing={3.5}>
          {/* Left Column: Benefit Metadata, Description, and Targets */}
          <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {/* Main Header & Description Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, bgcolor: ragColor }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, fontFamily: '"Outfit", sans-serif' }}>
                    {selectedBenefit.pm_benefitname || 'Unnamed Benefit'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <StatusTag label={CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory)] || 'General'} color={CATEGORY_COLORS[String(selectedBenefit.pm_benefitcategory)] || 'default'} />
                    <StatusTag label={STATUS_LABELS[String(selectedBenefit.pm_benefitstatus)] || 'Open'} color={STATUS_COLORS[String(selectedBenefit.pm_benefitstatus)] || 'default'} />
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18 }} /> Description
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {selectedBenefit.pm_benefitdescription || 'No description provided for this benefit.'}
                  </Typography>
                </Box>

                <Divider />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Reference / ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{selectedBenefit.pm_benefitreference || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Benefit Type</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {selectedBenefit.pm_benefittype === 0 || String(selectedBenefit.pm_benefittype) === '0' ? 'Quantitative' :
                        selectedBenefit.pm_benefittype === 1 || String(selectedBenefit.pm_benefittype) === '1' ? 'Qualitative' : '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Owner</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                        {ownerName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{ownerName}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Associated Project</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{selectedBenefit.pm_projectname || '—'}</Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>

            {/* Targets & Baseline Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <TrackChangesIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Target & Baseline Details
                  </Typography>
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Unit of Measure</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', bgcolor: 'action.hover', display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1 }}>
                      {selectedBenefit.pm_unitofmeasure || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'action.hover', borderLeft: (theme) => `4px solid ${theme.palette.text.secondary}` }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>Baseline</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
                        {selectedBenefit.pm_baselinevalue != null ? numberFormatter.format(selectedBenefit.pm_baselinevalue) : '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'action.hover', borderLeft: (theme) => `4px solid ${theme.palette.primary.main}` }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>Target</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                        {selectedBenefit.pm_targetvalue != null ? numberFormatter.format(selectedBenefit.pm_targetvalue) : '—'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>

            {/* Realisation Timeline & Visual Progress Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <TimelineIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Realisation Timeline
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Start Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {startDate ? startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>End Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {endDate ? endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </Typography>
                  </Box>
                </Box>

                {startDate && endDate && (
                  <Box sx={{ mt: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Realisation Period Progress</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{timeProgress}% ({durationDays} days total)</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={timeProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'action.selected',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor: timeProgress >= 100 ? 'success.main' : 'primary.main'
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Right Column: Status Summary & Quick Actions */}
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {/* Prominent RAG Status Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Current Assessment
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: '12px', bgcolor: 'action.hover' }}>
                <Avatar sx={{ bgcolor: ragColor, width: 44, height: 44 }}>
                  <EmojiEventsIcon sx={{ color: '#fff' }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>RAG STATUS</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: ragColor }}>{ragLabel}</Typography>
                </Box>
              </Box>
            </Paper>

            {/* Actions Card */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {canEdit && onEditBenefit && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => onEditBenefit(selectedBenefit)}
                    sx={{ py: 1.2, borderRadius: '8px', fontWeight: 600 }}
                  >
                    Edit Benefit
                  </Button>
                )}
                {canDelete && onDeleteBenefit && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => onDeleteBenefit(selectedBenefit.pm_benefitid!)}
                    sx={{ py: 1.2, borderRadius: '8px', fontWeight: 600 }}
                  >
                    Delete Benefit
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    )
  }

  // Summary and Lists view
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <StarIcon sx={{ fontSize: 20, color: 'warning.main' }} /> Planned Benefits
        </Typography>
        {onAddBenefit && (
          <Button size="small" variant="outlined" startIcon={<StarIcon />} onClick={onAddBenefit}>Benefit</Button>
        )}
      </Box>

      {/* 2-Column Side-by-Side Benefits Grid */}
      <Grid container spacing={3.5} sx={{ display: 'flex', alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 8.5 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          <BenefitsGrid
            benefits={benefits}
            loading={false}
            onRowClick={setSelectedBenefit}
            onCreateClick={onAddBenefit || (() => { })}
            statusFilter={benefitStatusFilter}
            onStatusFilterChange={setBenefitStatusFilter}
            categoryFilter={benefitCategoryFilter}
            onCategoryFilterChange={setBenefitCategoryFilter}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3.5 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: '24px',
              bgcolor: isDark ? 'background.paper' : '#fff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 3
            }}
          >
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Category Breakdown
              </Typography>

              <Box sx={{ height: 180, width: '100%', mb: 2, flexGrow: 1, display: 'block', position: 'relative' }}>
                {categorySummary.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={categorySummary}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {categorySummary.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`${value} Benefit(s)`]} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none'
                      }}
                    >
                      <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: '"Outfit", sans-serif', color: 'text.primary', lineHeight: 1 }}>
                        {benefits.length}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Total
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">No category data</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Summary Indicators
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                  <VerifiedIcon fontSize="small" sx={{ color: 'primary.main' }} /> Realisation Progress
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 120 }}>
                  <LinearProgress
                    variant="determinate"
                    value={achievementRate}
                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                    color={achievementRate >= 100 ? 'success' : 'primary'}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {achievementRate}%
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                  <WarningAmberIcon fontSize="small" sx={{ color: criticalCount > 0 ? 'error.main' : 'success.main' }} /> Benefits RAG
                </Typography>
                <StatusTag
                  label={criticalCount > 0 ? `${criticalCount} Critical` : 'On Track'}
                  color={criticalCount > 0 ? 'error' : 'success'}
                  size="small"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
