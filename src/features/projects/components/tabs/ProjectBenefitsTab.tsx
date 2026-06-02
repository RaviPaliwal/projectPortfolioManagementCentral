import React from 'react'
import {
  Box,
  Typography,
  Paper,
} from '@mui/material'
import { StatusChip, StatusTag } from '@/components/common'
import type { BenefitModel } from '@/types/dataverse'

interface ProjectBenefitsTabProps {
  benefits: BenefitModel[]
}

export const ProjectBenefitsTab: React.FC<ProjectBenefitsTabProps> = ({ benefits }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Planned Benefits</Typography>
        <StatusTag label={`${benefits.length} benefit(s)`} size="small" color="success" variant="outlined" />
      </Box>
      {benefits.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {benefits.map((b) => (
            <Paper key={b.pm_benefitid} variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.pm_benefitname}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {b.pm_benefitcategory === '1' ? 'Financial' : b.pm_benefitcategory === '2' ? 'Strategic' : 'Operational'}
                  {b.pm_unitofmeasure ? ` · Target: ${b.pm_targetvalue ?? '—'} ${b.pm_unitofmeasure}` : ''}
                  {b.pm_realisationenddate ? ` · Due: ${new Date(b.pm_realisationenddate).toLocaleDateString()}` : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusChip status={b.pm_ragstatus} type="rag" />
                <StatusTag label={b.pm_benefitstatus === '0' ? 'Not Started' : b.pm_benefitstatus === '1' ? 'In Progress' : 'Achieved'} size="small" variant="outlined" />
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No benefits yet. Use the Actions bar above to add one.
        </Typography>
      )}
    </Box>
  )
}
