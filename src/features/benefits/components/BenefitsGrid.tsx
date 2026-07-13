import { useMemo } from 'react'
import { useUser } from '@/context/UserContext'
import {
  Box,
  Avatar,
  Typography,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import PersonIcon from '@mui/icons-material/Person'
import type { BenefitModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { DataverseTable, StatusTag, type Column } from '@/components/common'
import { CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS } from '../constants'
import { RAG_LABELS, RAG_COLORS } from '@/constants/mappings'
import { numberFormatter } from '@/utils/formatters'

interface BenefitsGridProps {
  benefits: BenefitModel[]
  loading: boolean
  onRowClick: (benefit: BenefitModel) => void
  selectedId?: string
  onCreateClick: () => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  categoryFilter: string
  onCategoryFilterChange: (category: string) => void
}

export const BenefitsGrid = ({
  benefits,
  loading,
  onRowClick,
  categoryFilter,
  statusFilter,
}: BenefitsGridProps) => {
  const { users } = useUser()

  const filteredBenefits = useMemo(() => {
    return benefits.filter(item => {
      const statusMatch = !statusFilter || String(item.pm_benefitstatus) === statusFilter
      const categoryMatch = !categoryFilter || String(item.pm_benefitcategory) === categoryFilter
      return statusMatch && categoryMatch
    })
  }, [benefits, statusFilter, categoryFilter])

  const columns: Column<BenefitModel>[] = [
    {
      key: 'pm_benefitname',
      label: 'Benefit',
      format: (val, item) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ 
            width: 32, height: 32, 
            bgcolor: RAG_COLORS[String(item.pm_ragstatus) as keyof typeof RAG_COLORS] || 'warning.main', 
            fontSize: fontSizes.sm, fontWeight: 700 
          }}>
            {(val ?? 'B').charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{val ?? 'Unnamed Benefit'}</Typography>
            <Typography variant="caption" color="text.secondary">
              {item.pm_unitofmeasure || item.pm_benefitreference || '—'}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'pm_benefitcategory',
      label: 'Category',
      format: (val) => (
        <StatusTag
          label={CATEGORY_LABELS[String(val ?? '')] ?? '—'}
          color={CATEGORY_COLORS[String(val ?? '')] ?? 'default'}
          variant="outlined"
        />
      )
    },
    {
      key: 'pm_benefitstatus',
      label: 'Status',
      format: (val) => (
        <StatusTag
          label={STATUS_LABELS[String(val ?? '')] ?? '—'}
          color={STATUS_COLORS[String(val ?? '')] ?? 'default'}
          variant={String(val) === '2' ? 'filled' : 'outlined'}
        />
      )
    },
    {
      key: 'pm_baselinevalue',
      label: 'Baseline',
      align: 'right',
      format: (val) => (
        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
          {val != null ? numberFormatter.format(val) : '—'}
        </Typography>
      )
    },
    {
      key: 'pm_targetvalue',
      label: 'Target',
      align: 'right',
      format: (val) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', fontSize: fontSizes.sm }}>
          {val != null ? numberFormatter.format(val) : '—'}
        </Typography>
      )
    },

    {
      key: 'pm_benifitownername',
      label: 'Owner',
      format: (val, item) => {
        const resolvedName = val || users.find(u => u.systemuserid === item._pm_benifitowner_value)?.fullname || '—'
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">{resolvedName}</Typography>
          </Box>
        )
      }
    }
  ]

  return (
    <DataverseTable
      data={filteredBenefits}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search by name, description, owner, entity..."
      searchFields={[
        'pm_benefitname',
        'pm_benefitdescription',
        'pm_benifitownername',
        'pm_projectcode',
        'pm_programmename',
      ]}
      emptyIcon={<EmojiEventsIcon />}
      onRowClick={onRowClick}
      exportFileName="benefits_register"
    />
  )
}
