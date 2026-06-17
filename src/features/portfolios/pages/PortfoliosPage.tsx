import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Alert,
  Typography,
  IconButton,
  Button,
  Grid,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
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
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'

import { fetchPortfolioHierarchy } from '@/services'

import {
  PageHeader,
  HealthSplitBar,
  DetailDrawer,
  ExportButton,
  KpiCardRow,
  Breadcrumbs,
  ActionIcon,
} from '@/components/common'
import type { PortfolioModel, ProgrammeModel, ProjectModel } from '@/types/dataverse'
import type { ExportColumn } from '@/utils/exportUtils'
import { currencyFormatter } from '@/utils/formatters'

// Sub-components
import { PortfolioGrid } from '../components/PortfolioGrid'
import { PortfolioFormDialog } from '../components/PortfolioFormDialog'
import { PortfolioSummaryTab } from '../components/tabs/PortfolioSummaryTab'
import { PortfolioProgrammesTab } from '../components/tabs/PortfolioProgrammesTab'
import { PortfolioProjectsTab } from '../components/tabs/PortfolioProjectsTab'
import { PortfolioFinancialsTab } from '../components/tabs/PortfolioFinancialsTab'
import { PortfolioApprovalTasksTab } from '../components/tabs/PortfolioApprovalTasksTab'

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

  // Data state
  const [hierarchy, setHierarchy] = useState<{ portfolios: PortfolioModel[]; programmes: ProgrammeModel[]; projects: ProjectModel[] }>({ portfolios: [], programmes: [], projects: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Grid state
  const [filteredPortfolios, setFilteredPortfolios] = useState<PortfolioModel[]>([])

  // Detail panel state
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)
  const [editInfo, setEditInfo] = useState<string | null>(null)

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioModel | null>(null)

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

  // ── Render ────────────────────────────────────────────────────────────────
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
        onFilteredDataChange={setFilteredPortfolios}
      />

      {/* ── 3. Slide-Out Detail Panel ──────────────────────────────────── */}
      <DetailDrawer
        open={!!selectedPortfolio}
        onClose={() => setSelectedPortfolio(null)}
        icon={<AccountTreeIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
        title={selectedPortfolio?.pm_portfolioname ?? ''}
        subtitle={selectedPortfolio && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {selectedPortfolio.pm_ownerlookupname && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {selectedPortfolio.pm_ownerlookupname}
                </Typography>
              </Box>
            )}
            {selectedPortfolio.pm_businessunit && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BusinessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {selectedPortfolio.pm_businessunit}
                </Typography>
              </Box>
            )}
          </Box>
        )}
        headerActions={
          canEdit && (
            <ActionIcon
              icon={<EditIcon />}
              onClick={() => selectedPortfolio && openEditForm(selectedPortfolio)}
              label="Edit Portfolio"
              color="primary"
            />
          )
        }
        tabs={[
          { label: 'Summary' },
          { label: 'Programmes', count: detailProgrammes.length },
          { label: 'Projects', count: detailProjects.length },
          { label: 'Financials' },
          { label: 'Tasks' },
        ]}
        tabValue={detailTab}
        onTabChange={setDetailTab}
      >
        {selectedPortfolio && (
          <>
            {editInfo && (
              <Alert severity="info" onClose={() => setEditInfo(null)} sx={{ mb: 2 }}>
                {editInfo}
              </Alert>
            )}

            <PortfolioSummaryTab
              portfolio={selectedPortfolio}
              tabValue={detailTab}
              index={0}
              programmeCount={detailProgrammes.length}
              projectCount={detailProjects.length}
            />

            <PortfolioProgrammesTab
              programmes={detailProgrammes}
              tabValue={detailTab}
              index={1}
            />

            <PortfolioProjectsTab
              projects={detailProjects}
              tabValue={detailTab}
              index={2}
            />

            <PortfolioFinancialsTab
              portfolio={selectedPortfolio}
              tabValue={detailTab}
              index={3}
            />

            <PortfolioApprovalTasksTab
              portfolioId={selectedPortfolio.pm_portfolioid ?? ''}
              tabValue={detailTab}
              index={4}
            />
          </>
        )}
      </DetailDrawer>

      {/* ── 4. Create/Edit Portfolio Modal & Confirmation ──────────────── */}
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
