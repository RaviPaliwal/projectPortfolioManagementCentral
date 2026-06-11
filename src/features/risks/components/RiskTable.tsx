import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
  Table,
  TableHead,
  TextField,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
  useTheme,
  TableSortLabel,
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
import { TableFooter, TableShell, SearchFilterBar, StatusTag } from '@/components/common'
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
    searchFields: ['pm_risktitle', 'pm_riskowner', 'pm_riskreference', 'pm_riskdescription', 'pm_projectcode'],
    filterFn: (r) => {
      if (categoryFilter && String(r.pm_riskcategory ?? '') !== categoryFilter) return false
      if (ragFilter && String(r.pm_ragstatus ?? '') !== ragFilter) return false
      if (statusFilter && String(r.pm_riskstatus ?? '') !== statusFilter) return false
      return true
    },
  })

  return (
    <Paper sx={{ overflow: 'hidden', mb: 3 }}>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by title, owner, reference, description, project…"
        onClear={() => {
          reset()
          setCategoryFilter('')
          setRagFilter('')
          setStatusFilter('')
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
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value="">All</MenuItem>
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
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value="">All</MenuItem>
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
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value="">All</MenuItem>
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
        emptyTitle={searchQuery || categoryFilter || ragFilter || statusFilter
          ? 'No risks match your criteria.'
          : 'No risks found.'}
        emptyAction={!searchQuery && !categoryFilter && !ragFilter && !statusFilter && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
            Add your first risk
          </Button>
        )}
      >
        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5, width: 50 }}>
                #
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_risktitle'} direction={sort.field === 'pm_risktitle' ? sort.dir : 'asc'} onClick={() => setSort('pm_risktitle')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                  Risk Title
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_riskcategory'} direction={sort.field === 'pm_riskcategory' ? sort.dir : 'asc'} onClick={() => setSort('pm_riskcategory')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_ragstatus'} direction={sort.field === 'pm_ragstatus' ? sort.dir : 'asc'} onClick={() => setSort('pm_ragstatus')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                  RAG
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Owner
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Probability
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Impact
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_inherentscore'} direction={sort.field === 'pm_inherentscore' ? sort.dir : 'asc'} onClick={() => setSort('pm_inherentscore')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                  Score
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                <TableSortLabel active={sort.field === 'pm_riskstatus'} direction={sort.field === 'pm_riskstatus' ? sort.dir : 'asc'} onClick={() => setSort('pm_riskstatus')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
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
                        {risk.pm_riskreference && (
                          <Typography variant="caption" color="text.secondary">
                            {risk.pm_riskreference}
                          </Typography>
                        )}
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
                    <Typography variant="body2">{risk.pm_riskowner ?? '—'}</Typography>
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
                      variant={String(risk.pm_riskstatus) === '0' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      {risk.pm_escalated && (
                        <Tooltip title="Escalated">
                          <FlagIcon sx={{ fontSize: 18, color: 'error.main' }} />
                        </Tooltip>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onEdit(risk) }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onDelete(risk) }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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

