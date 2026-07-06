import React from 'react'
import {
  Box,
  Typography,
  Paper,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import StarIcon from '@mui/icons-material/Star'

import { StatusChip, StatusTag } from '@/components/common'
import type { BenefitModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'

import { Button } from '@mui/material'

interface ProjectBenefitsTabProps {
  benefits: BenefitModel[]
  onAddBenefit?: () => void
}

export const ProjectBenefitsTab: React.FC<ProjectBenefitsTabProps> = ({ benefits, onAddBenefit }) => {
  const achievedBenefits = benefits.filter(b => String(b.pm_benefitstatus) === '2' || b.pm_benefitstatus === 2).length

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
              <Paper key={b.pm_benefitid} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s ease', '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.default' } }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.pm_benefitname}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSizes.xs }}>
                    {b.pm_benefitcategory === '1' ? 'Financial' : b.pm_benefitcategory === '2' ? 'Strategic' : 'Operational'}
                    {b.pm_unitofmeasure ? ` · Target: ${b.pm_targetvalue ?? '—'} ${b.pm_unitofmeasure}` : ''}
                    {b.pm_realisationenddate ? ` · Due: ${new Date(b.pm_realisationenddate).toLocaleDateString()}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <StatusChip status={b.pm_ragstatus} type="rag" size="small" />
                  <StatusTag label={String(b.pm_benefitstatus) === '0' ? 'Not Started' : String(b.pm_benefitstatus) === '1' ? 'In Progress' : 'Achieved'} size="small" variant="outlined" color={String(b.pm_benefitstatus) === '2' ? 'success' : 'default'} />
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
