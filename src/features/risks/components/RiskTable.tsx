import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
  Table,
  TextField,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
  useTheme,
  MenuItem,
  Button,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AddIcon from '@mui/icons-material/Add'
import FlagIcon from '@mui/icons-material/Flag'
import type { RiskModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { TableFooter, TableShell, SearchFilterBar, StatusTag, TableHeader } from '@/components/common'
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
import { useDataGrid } from '@/hooks/useDataGrid'

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
}: RiskTableProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const {
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredData,
    paginatedData,
    filteredCount,
    totalCount,
    reset,
  } = useDataGrid(risks, {
    initialSort: { field: 'pm_risktitle', dir: 'asc' },
    searchFields: ['pm_risktitle', 'pm_riskownername', 'pm_riskdescription'],
    filterFn: (r) => {
      if (categoryFilter !== 'all' && String(r.pm_riskcategory ?? '') !== categoryFilter) return false
      if (ragFilter !== 'all' && String(r.pm_ragstatus ?? '') !== ragFilter) return false
      if (statusFilter !== 'all' && String(r.pm_riskstatus ?? '') !== statusFilter) return false
      return true
    },
  })

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3 }}>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by title, owner, description…"
        onClear={() => {
          reset()
          setCategoryFilter('all')
          setRagFilter('all')
          setStatusFilter('all')
        }}
        extraFilters={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ minWidth: 130 }}>
              <TextField
                select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ minWidth: 110 }}>
              <TextField
                select
                label="RAG"
                value={ragFilter}
                onChange={(e) => setRagFilter(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(RAG_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ minWidth: 140 }}>
              <TextField
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        }
      />

      <TableShell
        loading={loading}
        empty={filteredCount === 0}
        emptyIcon={<WarningAmberIcon />}
        emptyTitle={searchQuery || categoryFilter !== 'all' || ragFilter !== 'all' || statusFilter !== 'all'
          ? 'No risks match your criteria.'
          : 'No risks found.'}
        emptyAction={!searchQuery && categoryFilter === 'all' && ragFilter === 'all' && statusFilter === 'all' && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
            Add your first risk
          </Button>
        )}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHeader cells={[
            { label: '#', width: 50 },
            { label: 'Risk Title', sortable: true, active: sort.field === 'pm_risktitle', dir: sort.dir, onClick: () => setSort('pm_risktitle') },
            { label: 'Category', sortable: true, active: sort.field === 'pm_riskcategory', dir: sort.dir, onClick: () => setSort('pm_riskcategory') },
            { label: 'RAG', sortable: true, active: sort.field === 'pm_ragstatus', dir: sort.dir, onClick: () => setSort('pm_ragstatus') },
            { label: 'Owner' },
            { label: 'Probability' },
            { label: 'Impact' },
            { label: 'Score', align: 'right', sortable: true, active: sort.field === 'pm_inherentscore', dir: sort.dir, onClick: () => setSort('pm_inherentscore') },
            { label: 'Status', sortable: true, active: sort.field === 'pm_riskstatus', dir: sort.dir, onClick: () => setSort('pm_riskstatus') },
            { label: 'Actions', align: 'right' },
          ]} />
          <TableBody>
            {paginatedData.map((risk, idx) => {
              const score = riskScore(risk.pm_inherentprobability, risk.pm_inherentimpact)
              return (
                <TableRow
                  key={risk.pm_riskid}
                  hover
                  onClick={() => onSelect(risk)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                    '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                    transition: 'background-color 0.15s ease',
                    '& td': { px: 2.5, py: 1.25 },
                  }}
                >
                  <TableCell sx={{ color: 'text.secondary', fontSize: fontSizes.xs }}>{page * rowsPerPage + idx + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: getScoreColor(score),
                          fontSize: fontSizes.xs,
                          fontWeight: 700,
                        }}
                      >
                        {score > 0 ? score : '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {risk.pm_risktitle ?? '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={RISK_CATEGORY_LABELS[String(risk.pm_riskcategory ?? '')] ?? '—'}
                      color={RISK_CATEGORY_COLORS[String(risk.pm_riskcategory ?? '')] ?? 'text.disabled'}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={RAG_LABELS[String(risk.pm_ragstatus ?? '')] ?? '—'}
                      color={RAG_COLORS[String(risk.pm_ragstatus ?? '')] ?? 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{risk.pm_riskownername ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{PROBABILITY_LABELS[String(risk.pm_inherentprobability ?? '')] ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{IMPACT_LABELS[String(risk.pm_inherentimpact ?? '')] ?? '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <StatusTag
                      label={getScoreLabel(score)}
                      color={getScoreColor(score)}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusTag
                      label={RISK_STATUS_LABELS[String(risk.pm_riskstatus ?? '')] ?? '—'}
                      color={RISK_STATUS_COLORS[String(risk.pm_riskstatus ?? '')] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      {risk.pm_escalated && (
                        <Tooltip title="Escalated">
                          <FlagIcon sx={{ fontSize: 18, color: 'error.main' }} />
                        </Tooltip>
                      )}
                      {canEdit && (
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); onEdit(risk) }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); onDelete(risk) }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableShell>

      {!loading && filteredCount > 0 && (
        <TableFooter
          filteredCount={filteredCount}
          totalCount={totalCount}
          itemLabel="risk"
        />
      )}
      {!loading && filteredCount > 0 && (
        <TablePagination
          component="div"
          count={filteredCount}
          page={page}
          onPageChange={setPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
        />
      )}
    </Paper>
  )
}

