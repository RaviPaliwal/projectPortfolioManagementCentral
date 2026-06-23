import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Alert,
  Typography,
  IconButton,
  Button,
  Grid,
  Tabs,
  Tab,
  Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import FolderIcon from '@mui/icons-material/Folder'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import ErrorIcon from '@mui/icons-material/Error'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import DescriptionIcon from '@mui/icons-material/Description'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'

import { fetchPortfolioHierarchy, deletePortfolio } from '@/services'

import {
  PageHeader,
  HealthSplitBar,
  ExportButton,
  KpiCardRow,
  Breadcrumbs,
  ActionIcon,
  TabPanel,
  EntityDocumentsTab,
  StatusChip,
  StatusTag,
  VarianceDisplay,
  StatusProgressBar,
  DataverseTable,
  ConfirmDialog,
  MasterScheduleTab,
} from '@/components/common'
import { MODULE_NAMES } from '@/constants/moduleNames'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import type { ExportColumn } from '@/utils/exportUtils'
import { currencyFormatter } from '@/utils/formatters'
import { navigateToProgramme, navigateToProject } from '@/utils/navigation'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'

// Sub-components
import { PortfolioGrid } from '../components/PortfolioGrid'
import { PortfolioFormDialog } from '../components/PortfolioFormDialog'

// ── Export columns ────────────────────────────────────────────────────────────
const portfolioExportColumns: ExportColumn[] = [
  { key: 'pm_portfolioname', label: 'Portfolio Name' },
  { key: '_pm_ownerlookup_value', label: 'Owner' },
  { key: 'pm_portfoliostatus', label: 'Status' },
  { key: 'pm_ragstatus', label: 'RAG' },
  { key: 'pm_approvedbudgeteur', label: 'Budget (EUR)' },
  { key: 'pm_actualspendeur', label: 'Actual Spend (EUR)' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfoliosPage() {
  const { allowed: canCreate } = useAuthorization('PORTFOLIOS', 'create')
  const { allowed: canEdit } = useAuthorization('PORTFOLIOS', 'update')
  const { allowed: canDelete } = useAuthorization('PORTFOLIOS', 'delete')

  // Data state
  const [hierarchy, setHierarchy] = useState<{ portfolios: PortfolioModel[]; programmes: ProgrammeModel[]; projects: ProjectModel[] }>({ portfolios: [], programmes: [], projects: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Grid state
  const [filteredPortfolios, setFilteredPortfolios] = useState<PortfolioModel[]>([])

  // Detail panel state
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)
  const [editInfo, setEditInfo] = useState<string | null>(null)

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioModel | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<PortfolioModel | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const data = await fetchPortfolioHierarchy()
      setHierarchy(data)
    } catch {
      setError('Unable to load portfolio data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Derived Data ──────────────────────────────────────────────────────────
  const portfolioList = hierarchy.portfolios

  const programmesByPortfolio = useMemo(() => {
    const map: Record<string, ProgrammeModel[]> = {}
    for (const prog of hierarchy.programmes) {
      const key = prog._pm_portfolio_value ?? ''
      if (!map[key]) map[key] = []
      map[key].push(prog)
    }
    return map
  }, [hierarchy.programmes])

  const projectsByPortfolio = useMemo(() => {
    const map: Record<string, ProjectModel[]> = {}
    for (const proj of hierarchy.projects) {
      const key = proj._pm_portfolio_value ?? ''
      if (!map[key]) map[key] = []
      map[key].push(proj)
    }
    return map
  }, [hierarchy.projects])

  // KPI calculations
  const totalBudget = useMemo(() => portfolioList.reduce((s, p) => s + (p.pm_approvedbudgeteur ?? 0), 0), [portfolioList])
  const totalConsumed = useMemo(() => portfolioList.reduce((s, p) => s + (p.pm_actualspendeur ?? 0), 0), [portfolioList])
  
  const kpiHealth = useMemo(() => {
    let green = 0, amber = 0, red = 0
    for (const p of portfolioList) {
      const rag = p.pm_ragstatus?.toString()
      if (rag === '1') green++
      else if (rag === '0') amber++
      else if (rag === '2') red++
    }
    return { green, amber, red }
  }, [portfolioList])

  // ── Detail panel data ─────────────────────────────────────────────────────
  const detailProgrammes = useMemo(() => {
    if (!selectedPortfolio?.pm_portfolioid) return []
    return programmesByPortfolio[selectedPortfolio.pm_portfolioid] ?? []
  }, [selectedPortfolio, programmesByPortfolio])

  const detailProjects = useMemo(() => {
    if (!selectedPortfolio?.pm_portfolioid) return []
    return projectsByPortfolio[selectedPortfolio.pm_portfolioid] ?? []
  }, [selectedPortfolio, projectsByPortfolio])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRowClick = useCallback((portfolio: PortfolioModel) => {
    setSelectedPortfolio(portfolio)
    setDetailTab(0)
  }, [])

  const handleSuccess = (freshPortfolios: PortfolioModel[]) => {
    setHierarchy(prev => ({ ...prev, portfolios: freshPortfolios }))
    // If we were editing, update selected portfolio too
    if (editingPortfolio && selectedPortfolio?.pm_portfolioid === editingPortfolio.pm_portfolioid) {
      const updated = freshPortfolios.find(p => p.pm_portfolioid === editingPortfolio.pm_portfolioid)
      if (updated) setSelectedPortfolio(updated)
    }
  }

  const openCreateForm = () => {
    setEditingPortfolio(null)
    setShowFormModal(true)
  }

  const openEditForm = (portfolio: PortfolioModel) => {
    setEditingPortfolio(portfolio)
    setShowFormModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget?.pm_portfolioid) return
    setDeleteLoading(true)
    setError(null)
    try {
      await deletePortfolio(deleteTarget.pm_portfolioid)
      setHierarchy(prev => ({ ...prev, portfolios: prev.portfolios.filter(p => p.pm_portfolioid !== deleteTarget.pm_portfolioid) }))
      setSuccessMsg('Portfolio deleted.')
      setDeleteTarget(null)
      if (selectedPortfolio?.pm_portfolioid === deleteTarget.pm_portfolioid) {
        setSelectedPortfolio(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setError('Unable to delete portfolio.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (selectedPortfolio) {
    const detailProgrammes = programmesByPortfolio[selectedPortfolio.pm_portfolioid ?? ''] ?? []
    const detailProjects = projectsByPortfolio[selectedPortfolio.pm_portfolioid ?? ''] ?? []

    const STATUS_LABELS: Record<string, string> = {
      '0': 'Active',
      '1': 'Under Approval',
      '2': 'Rejected',
    }

    const programmeColumns = [
      {
        key: 'pm_programmename',
        label: 'Programme Name',
        format: (val: any, item: ProgrammeModel) => (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => item.pm_programmeid && navigateToProgramme(item.pm_programmeid)}
          >
            {val}
            <OpenInNewIcon sx={{ fontSize: 12 }} />
          </Typography>
        )
      },
      {
        key: 'pm_programmephase',
        label: 'Phase',
        format: (val: any) => <StatusChip status={val} type="prog_phase" size="small" />
      },
      {
        key: 'pm_ragstatus',
        label: 'RAG',
        format: (val: any) => <StatusChip status={val} type="rag" size="small" />
      },
      {
        key: 'pm_startdate',
        label: 'Start Date',
        format: (val: any) => val ? new Date(val).toLocaleDateString() : '—'
      },
      {
        key: 'pm_enddate',
        label: 'End Date',
        format: (val: any) => val ? new Date(val).toLocaleDateString() : '—'
      }
    ]

    const projectColumns = [
      {
        key: 'pm_projectname',
        label: 'Project Name',
        format: (val: any, item: ProjectModel) => (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => item.pm_projectid && navigateToProject(item.pm_projectid)}
          >
            {val}
            <OpenInNewIcon sx={{ fontSize: 12 }} />
          </Typography>
        )
      },
      {
        key: 'pm_projectcode',
        label: 'Project Code',
        format: (val: any) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {val || '—'}
          </Typography>
        )
      },
      {
        key: 'pm_projectphase',
        label: 'Phase',
        format: (val: any) => <StatusChip status={val} type="phase" size="small" />
      },
      {
        key: 'pm_ragstatus',
        label: 'RAG',
        format: (val: any) => <StatusChip status={val} type="rag" size="small" />
      },
      {
        key: 'pm_projectmanager',
        label: 'Project Manager',
        format: (val: any) => val || '—'
      }
    ]

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        <Breadcrumbs
          items={[
            { label: 'Portfolios', path: 'list' },
            { label: selectedPortfolio.pm_portfolioname ?? 'Detail' }
          ]}
          onNavigate={() => setSelectedPortfolio(null)}
        />
        <PageHeader
          title={selectedPortfolio.pm_portfolioname ?? 'Portfolio Detail'}
          subtitle={selectedPortfolio.pm_businessunit ? `Business Unit: ${selectedPortfolio.pm_businessunit}` : undefined}
          actionElement={
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              {canEdit && (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => openEditForm(selectedPortfolio)}
                  sx={{ borderRadius: 1.5 }}
                >
                  Edit Portfolio
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteTarget(selectedPortfolio)}
                  sx={{ borderRadius: 1.5 }}
                >
                  Delete Portfolio
                </Button>
              )}
            </Box>
          }
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: -1.5 }}>
          <StatusChip status={selectedPortfolio.pm_ragstatus} type="rag" size="medium" />
          <StatusTag
            label={STATUS_LABELS[selectedPortfolio.pm_portfoliostatus?.toString() ?? ''] ?? 'Active'}
            size="small"
            variant="outlined"
            color={selectedPortfolio.pm_portfoliostatus === 0 || selectedPortfolio.pm_portfoliostatus === '0' ? 'success' : selectedPortfolio.pm_portfoliostatus === 1 || selectedPortfolio.pm_portfoliostatus === '1' ? 'warning' : 'error'}
          />
          {selectedPortfolio.pm_prioritylevel !== undefined && (
            <StatusTag
              label={`Priority: ${selectedPortfolio.pm_prioritylevel}`}
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
          {(selectedPortfolio.pm_startdate || selectedPortfolio.pm_enddate) && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', fontWeight: 600 }}>
              Timeline: {selectedPortfolio.pm_startdate ? new Date(selectedPortfolio.pm_startdate).toLocaleDateString() : '—'} — {selectedPortfolio.pm_enddate ? new Date(selectedPortfolio.pm_enddate).toLocaleDateString() : '—'}
            </Typography>
          )}
        </Box>

        <Tabs
          value={detailTab}
          onChange={(_, v) => setDetailTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mt: 1 }}
        >
          <Tab label="Overview & Projects" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Master Schedule" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Documents & Tasks" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {detailTab === 0 && (
          <>
            {/* Block 1: Details & Overview Grouping */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Overview
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Details
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Owner</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{selectedPortfolio.pm_ownerlookupname || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Business Unit</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{selectedPortfolio.pm_businessunit || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Programmes Linked</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{detailProgrammes.length}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Projects Linked</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{detailProjects.length}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedPortfolio.pm_portfoliodescription && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <DescriptionIcon sx={{ fontSize: 18, color: 'primary.main' }} /> Description
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          {selectedPortfolio.pm_portfoliodescription}
                        </Typography>
                      </Box>
                    )}
                    {selectedPortfolio.pm_strategicobjective && (
                      <Box sx={{ mt: 'auto' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <LightbulbIcon sx={{ fontSize: 18, color: 'warning.main' }} /> Strategic Objective
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                          "{selectedPortfolio.pm_strategicobjective}"
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Block 2: Financials */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Financials
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                      Budget Overview
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Approved Budget</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {currencyFormatter.format(selectedPortfolio.pm_approvedbudgeteur ?? 0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Actual Spend</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>
                          {currencyFormatter.format(selectedPortfolio.pm_actualspendeur ?? 0)}
                        </Typography>
                      </Box>
                    </Box>
                    <StatusProgressBar
                      value={selectedPortfolio.pm_actualspendeur ?? 0}
                      total={selectedPortfolio.pm_approvedbudgeteur ?? 0}
                      label="Budget Utilization"
                    />
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Budget Variance
                    </Typography>
                    <VarianceDisplay budget={selectedPortfolio.pm_approvedbudgeteur} consumed={selectedPortfolio.pm_actualspendeur} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                      {selectedPortfolio.pm_approvedbudgeteur && selectedPortfolio.pm_approvedbudgeteur > 0
                        ? `${((selectedPortfolio.pm_actualspendeur ?? 0) / selectedPortfolio.pm_approvedbudgeteur * 100).toFixed(1)}% of budget consumed`
                        : 'No budget data available'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Block 3: Linked Programmes Grid */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Programmes
              </Typography>
              <Paper variant="outlined" sx={{ p: 0, borderRadius: 1.5, overflow: 'hidden' }}>
                <Box sx={{
                  '& .MuiPaper-root': {
                    boxShadow: 'none',
                    border: 'none',
                    bgcolor: 'transparent',
                    backgroundImage: 'none',
                    borderRadius: 0,
                    mb: 0
                  }
                }}>
                  <DataverseTable
                    data={detailProgrammes}
                    columns={programmeColumns}
                    loading={loading}
                    emptyIcon={<FolderIcon />}
                    emptyTitle="No programmes linked to this portfolio."
                    searchPlaceholder="Search programmes..."
                    searchFields={['pm_programmename']}
                  />
                </Box>
              </Paper>
            </Box>

            {/* Block 4: Linked Projects Grid */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Projects
              </Typography>
              <Paper variant="outlined" sx={{ p: 0, borderRadius: 1.5, overflow: 'hidden' }}>
                <Box sx={{
                  '& .MuiPaper-root': {
                    boxShadow: 'none',
                    border: 'none',
                    bgcolor: 'transparent',
                    backgroundImage: 'none',
                    borderRadius: 0,
                    mb: 0
                  }
                }}>
                  <DataverseTable
                    data={detailProjects}
                    columns={projectColumns}
                    loading={loading}
                    emptyIcon={<AccountTreeIcon />}
                    emptyTitle="No projects linked to this portfolio."
                    searchPlaceholder="Search projects..."
                    searchFields={['pm_projectname', 'pm_projectcode']}
                  />
                </Box>
              </Paper>
            </Box>
          </>
        )}

        {detailTab === 1 && (
          <MasterScheduleTab projects={detailProjects} />
        )}

        {detailTab === 2 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Approval Tasks
                </Typography>
                <EntityApprovalTasks
                  entityId={selectedPortfolio.pm_portfolioid ?? ''}
                  moduleName={MODULE_NAMES.PORTFOLIOS.value}
                  entityLabel="Portfolio"
                  tabValue={0}
                  index={0}
                />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Documents
                </Typography>
                <EntityDocumentsTab
                  entityId={selectedPortfolio.pm_portfolioid ?? ''}
                  moduleName={MODULE_NAMES.PORTFOLIOS.value}
                  canEdit={canEdit}
                />
              </Paper>
            </Grid>
          </Grid>
        )}

        <PortfolioFormDialog
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSuccess={handleSuccess}
          onError={(msg) => setError(msg)}
          initialData={editingPortfolio}
        />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Portfolios"
        subtitle="Master view of all portfolios — aggregate health, budget tracking, and drill-down details."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                New Portfolio
              </Button>
            )}
            <ExportButton filename="portfolios" columns={portfolioExportColumns} data={filteredPortfolios} />
          </Box>
        }
      />

      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ── 1. Executive Roll-Up KPI Ribbon ──────────────────────────── */}
      {!loading && (
        <>
          <KpiCardRow
            items={[
              {
                label: "Total Portfolios",
                value: portfolioList.length,
                subtitle: "Active portfolios",
                icon: <FolderIcon />,
                color: "secondary.main"
              },
              {
                label: "Green Health",
                value: kpiHealth.green,
                subtitle: "On track",
                icon: <CheckCircleIcon />,
                color: "success.main"
              },
              {
                label: "Amber Health",
                value: kpiHealth.amber,
                subtitle: "At risk",
                icon: <GppMaybeIcon />,
                color: "warning.main"
              },
              {
                label: "Red Health",
                value: kpiHealth.red,
                subtitle: "Critical",
                icon: <ErrorIcon />,
                color: "error.main"
              },
              {
                label: "Total Portfolio Value",
                value: currencyFormatter.format(totalBudget),
                subtitle: `Across ${portfolioList.length} portfolios`,
                icon: <AccountBalanceWalletIcon />,
                color: "primary.main"
              },
              {
                label: "Total Consumed",
                value: currencyFormatter.format(totalConsumed),
                subtitle: totalBudget > 0 ? `${((totalConsumed / totalBudget) * 100).toFixed(1)}% consumed` : 'No budget data',
                icon: <TrendingDownIcon />,
                color: "warning.main"
              }
            ]}
            loading={loading}
          />
          <HealthSplitBar green={kpiHealth.green} amber={kpiHealth.amber} red={kpiHealth.red} sx={{ mb: 3 }} />
        </>
      )}

      {/* ── 2. Dense Master Portfolio Grid ────────────────────────────── */}
      <PortfolioGrid
        portfolios={portfolioList}
        loading={loading}
        onRowClick={handleRowClick}
        onCreateClick={openCreateForm}
        onEditClick={openEditForm}
        onDeleteClick={setDeleteTarget}
        onFilteredDataChange={setFilteredPortfolios}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* ── 4. Create/Edit Portfolio Modal ──────────────── */}
      <PortfolioFormDialog
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setError(msg)}
        initialData={editingPortfolio}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Portfolio"
        message={`Are you sure you want to delete ${deleteTarget?.pm_portfolioname || 'this portfolio'}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </Box>
  )
}
