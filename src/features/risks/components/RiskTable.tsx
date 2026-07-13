import React, { useMemo, useCallback } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
  TextField,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import FlagIcon from '@mui/icons-material/Flag'
import AddIcon from '@mui/icons-material/Add'
import type { RiskModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { DataverseTable, StatusTag, type Column } from '@/components/common'
import {
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  RAG_LABELS,
  RAG_COLORS,
  RISK_STATUS_LABELS,
  RISK_STATUS_COLORS,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
  riskScore,
  getScoreLabel,
  getScoreColor,
} from '../constants'

interface RiskTableProps {
  risks: RiskModel[]
  loading: boolean
  onEdit: (risk: RiskModel) => void
  onDelete: (risk: RiskModel) => void
  onSelect: (risk: RiskModel) => void
  categoryFilter: string
  setCategoryFilter: (val: string) => void
  ragFilter: string
  setRagFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  openCreate: () => void
  canEdit?: boolean
  canDelete?: boolean
  onAddMitigationAction?: (risk: RiskModel) => void
}

export const RiskTable = ({
  risks,
  loading,
  onEdit,
  onDelete,
  onSelect,
  categoryFilter,
  setCategoryFilter,
  ragFilter,
  setRagFilter,
  statusFilter,
  setStatusFilter,
  openCreate,
  canEdit = true,
  canDelete = true,
  onAddMitigationAction,
}: RiskTableProps) => {
  const columns: Column<RiskModel>[] = useMemo(() => [
    {
      key: 'pm_risktitle',
      label: 'Risk Title',
      format: (val: any, risk: RiskModel) => {
        const scoreVal = riskScore(risk.pm_inherentprobability, risk.pm_inherentimpact)
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {val || 'Unnamed Risk'}
              </Typography>
              {risk.pm_projectname && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {risk.pm_regardingidtype === 'pm_projects' ? 'Project: ' :
                   risk.pm_regardingidtype === 'pm_programmes' ? 'Programme: ' :
                   risk.pm_regardingidtype === 'pm_portfolios' ? 'Portfolio: ' : ''}
                  {risk.pm_projectname}
                </Typography>
              )}
            </Box>
          </Box>
        )
      }
    },
    {
      key: 'pm_riskcategory',
      label: 'Category',
      format: (val: any) => (
        <StatusTag
          label={RISK_CATEGORY_LABELS[String(val ?? '')] ?? '—'}
          color={RISK_CATEGORY_COLORS[String(val ?? '')] ?? 'default'}
        />
      )
    },
    {
      key: 'pm_ragstatus',
      label: 'RAG',
      format: (val: any) => (
        <StatusTag
          label={RAG_LABELS[String(val ?? '')] ?? '—'}
          color={RAG_COLORS[String(val ?? '')] ?? 'default'}
        />
      )
    },
    {
      key: 'pm_riskownername',
      label: 'Owner',
      format: (val: any) => <Typography variant="body2" color="text.secondary">{val || '—'}</Typography>
    },
    {
      key: 'pm_inherentprobability',
      label: 'Probability',
      format: (val: any) => <Typography variant="body2" color="text.secondary">{PROBABILITY_LABELS[String(val ?? '')] || '—'}</Typography>
    },
    {
      key: 'pm_inherentimpact',
      label: 'Impact',
      format: (val: any) => <Typography variant="body2" color="text.secondary">{IMPACT_LABELS[String(val ?? '')] || '—'}</Typography>
    },
    {
      key: 'risk_score',
      label: 'Score',
      format: (val: any, risk: RiskModel) => {
        const scoreVal = riskScore(risk.pm_inherentprobability, risk.pm_inherentimpact)
        return (
          <StatusTag
            label={getScoreLabel(scoreVal)}
            color={scoreVal >= 12 ? 'error' : scoreVal >= 6 ? 'warning' : 'success'}
          />
        )
      }
    },
    {
      key: 'pm_riskstatus',
      label: 'Status',
      format: (val: any) => (
        <StatusTag
          label={RISK_STATUS_LABELS[String(val ?? '')] ?? '—'}
          color={RISK_STATUS_COLORS[String(val ?? '')] ?? 'default'}
        />
      )
    }
  ], [])

  const filteredData = useMemo(() => {
    return risks.filter((r) => {
      if (categoryFilter !== 'all' && String(r.pm_riskcategory ?? '') !== categoryFilter) return false
      if (ragFilter !== 'all' && String(r.pm_ragstatus ?? '') !== ragFilter) return false
      if (statusFilter !== 'all' && String(r.pm_riskstatus ?? '') !== statusFilter) return false
      return true
    })
  }, [risks, categoryFilter, ragFilter, statusFilter])

  const handleClear = useCallback(() => {
    setCategoryFilter('all')
    setRagFilter('all')
    setStatusFilter('all')
  }, [setCategoryFilter, setRagFilter, setStatusFilter])

  const actions = useCallback((risk: RiskModel) => (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
      {risk.pm_escalated === true && (
        <Tooltip title="Escalated Risk">
          <FlagIcon color="error" sx={{ mr: 0.5, alignSelf: 'center', fontSize: 16 }} />
        </Tooltip>
      )}
      {canEdit && (
        <Tooltip title="Edit Risk">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation()
              onEdit(risk)
            }}
            sx={{ color: 'primary.main' }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="Delete Risk">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation()
              onDelete(risk)
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  ), [canEdit, canDelete, onEdit, onDelete])

  return (
    <DataverseTable
      data={filteredData}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search by title, owner, description…"
      searchFields={['pm_risktitle', 'pm_riskownername', 'pm_riskdescription']}
      emptyIcon={<WarningAmberIcon />}
      emptyTitle="No risks found"
      onRowClick={onSelect}
      actions={actions}
      exportFileName="risks_register"
      itemLabel="risk"
      extraFilters={
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 130 }}
          >
            <option value="all">All Categories</option>
            {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="RAG"
            value={ragFilter}
            onChange={(e) => setRagFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 110 }}
          >
            <option value="all">All RAG</option>
            {Object.entries(RAG_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            sx={{ minWidth: 110 }}
          >
            <option value="all">All Statuses</option>
            {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </TextField>
        </Box>
      }
      onClearFilters={handleClear}
    />
  )
}
