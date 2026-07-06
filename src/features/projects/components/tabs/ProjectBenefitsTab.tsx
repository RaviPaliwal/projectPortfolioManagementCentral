import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Chip,
  useTheme,
  Button
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import StarIcon from '@mui/icons-material/Star'
import PersonIcon from '@mui/icons-material/Person'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CategoryIcon from '@mui/icons-material/Category'
import DescriptionIcon from '@mui/icons-material/Description'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import TimelineIcon from '@mui/icons-material/Timeline'

import { StatusChip, StatusTag } from '@/components/common'
import type { BenefitModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

interface ProjectBenefitsTabProps {
  benefits: BenefitModel[]
  onAddBenefit?: () => void
  selectedBenefit: BenefitModel | null
  setSelectedBenefit: (benefit: BenefitModel | null) => void
}

// Mappings matching BenefitsPage.tsx
const CATEGORY_LABELS: Record<string, string> = {
  '1': 'Financial',
  '2': 'Strategic',
  '3': 'Operational',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'secondary' | 'warning' | 'default'> = {
  '1': 'primary',
  '2': 'secondary',
  '3': 'warning',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Not Started',
  '1': 'In Progress',
  '2': 'Achieved',
}

const STATUS_COLORS: Record<string, 'default' | 'info' | 'success'> = {
  '0': 'default',
  '1': 'info',
  '2': 'success',
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
  setSelectedBenefit
}) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const achievedBenefits = benefits.filter(b => String(b.pm_benefitstatus) === '2' || b.pm_benefitstatus === 2).length

  // Number formatter for values
  const numberFormatter = new Intl.NumberFormat('en-GB')

  // Inline Benefit Detail View (matching BenefitsPage.tsx layout)
  if (selectedBenefit) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Status Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <StatusTag label={CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory)] || 'General'} color={CATEGORY_COLORS[String(selectedBenefit.pm_benefitcategory)] || 'default'} />
          <StatusTag label={STATUS_LABELS[String(selectedBenefit.pm_benefitstatus)] || 'Open'} color={STATUS_COLORS[String(selectedBenefit.pm_benefitstatus)] || 'default'} />
        </Box>

        <Grid container spacing={3}>
          {/* Block 1: Benefit Info & Description (Horizontal Full Width) */}
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
              <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
                {/* Left sub-column: Benefit Information */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Benefit Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Reference / ID</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benefitreference || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Category</Typography>
                      <Typography variant="body2">{CATEGORY_LABELS[String(selectedBenefit.pm_benefitcategory)] || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Benefit Type</Typography>
                      <Typography variant="body2">
                        {selectedBenefit.pm_benefittype === 0 || String(selectedBenefit.pm_benefittype) === '0' ? 'Quantitative' :
                          selectedBenefit.pm_benefittype === 1 || String(selectedBenefit.pm_benefittype) === '1' ? 'Qualitative' : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Owner</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_benifitownername || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Project / Programme</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_projectname || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>RAG Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <StatusTag
                          label={RAG_LABELS[String(selectedBenefit.pm_ragstatus) as keyof typeof RAG_LABELS] ?? '—'}
                          color={RAG_COLORS[String(selectedBenefit.pm_ragstatus) as keyof typeof RAG_COLORS]}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                {/* Right sub-column: Description */}
                <Grid 
                  size={{ xs: 12, md: 5 }}
                  sx={{ 
                    borderLeft: { md: `1px solid ${theme.palette.divider}` },
                    pl: { md: 3 },
                    pt: { xs: 2, md: 0 },
                    borderTop: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Description
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {selectedBenefit.pm_benefitdescription || 'No description provided.'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Block 2: Targets, Baseline & Timeline */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
                {/* Target & Baseline values */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrackChangesIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Target & Baseline
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Unit of Measure</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBenefit.pm_unitofmeasure || '—'}</Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.text.secondary}` }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Baseline</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                          {selectedBenefit.pm_baselinevalue != null ? numberFormatter.format(selectedBenefit.pm_baselinevalue) : '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderLeft: (theme) => `3px solid ${theme.palette.primary.main}` }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Target</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                          {selectedBenefit.pm_targetvalue != null ? numberFormatter.format(selectedBenefit.pm_targetvalue) : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                {/* Timeline */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Realisation Timeline
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Start Date</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_realisationstartdate ? new Date(selectedBenefit.pm_realisationstartdate).toLocaleDateString() : '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>End Date</Typography>
                      <Typography variant="body2">{selectedBenefit.pm_realisationenddate ? new Date(selectedBenefit.pm_realisationenddate).toLocaleDateString() : '—'}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    )
  }

  // Summary and Lists view
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Action Buttons */}
      {onAddBenefit && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: -2 }}>
          <Button size="small" variant="outlined" startIcon={<EmojiEventsIcon />} onClick={onAddBenefit}>Benefit</Button>
        </Box>
      )}

      {/* Benefit KPI Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
          <StarIcon sx={{ fontSize: 20, color: 'success.main', mb: 0.5 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
            {benefits.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total Benefits (Defined in business case)
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
          <EmojiEventsIcon sx={{ fontSize: 20, color: 'primary.main', mb: 0.5 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
            {achievedBenefits}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Benefits Realized ({((achievedBenefits / (benefits.length || 1)) * 100).toFixed(0)}% achievement)
          </Typography>
        </Paper>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Planned Benefits
        </Typography>
        
        {benefits.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {benefits.map((b) => (
              <Paper 
                key={b.pm_benefitid} 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  borderRadius: 1.5, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  transition: 'all 0.15s ease', 
                  '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } 
                }}
                onClick={() => setSelectedBenefit(b)}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.pm_benefitname}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSizes.xs }}>
                    {CATEGORY_LABELS[String(b.pm_benefitcategory)] || 'General'}
                    {b.pm_unitofmeasure ? ` · Target: ${b.pm_targetvalue ?? '—'} ${b.pm_unitofmeasure}` : ''}
                    {b.pm_realisationenddate ? ` · Due: ${new Date(b.pm_realisationenddate).toLocaleDateString()}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <StatusChip status={b.pm_ragstatus} type="rag" size="small" />
                  <StatusTag label={STATUS_LABELS[String(b.pm_benefitstatus)] || 'Open'} size="small" variant="outlined" color={String(b.pm_benefitstatus) === '2' ? 'success' : 'default'} />
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 1.5, textAlign: 'center', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default', borderStyle: 'dashed' }}>
            <EmojiEventsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary">
              No benefits yet. Use the Actions bar above to add one.
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  )
}
