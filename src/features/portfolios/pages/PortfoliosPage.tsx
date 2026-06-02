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
import { fetchPortfolioHierarchy } from '@/services'

import {
  PageHeader,
  HealthSplitBar,
  DetailDrawer,
  ExportButton,
  KpiCardRow,
  Breadcrumbs,
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

// ── Export columns ────────────────────────────────────────────────────────────
const portfolioExportColumns: ExportColumn[] = [
  { key: 'pm_portfolioname', label: 'Portfolio Name' },
  { key: 'pm_portfolioowner', label: 'Owner' },
  { key: 'pm_portfoliostatus', label: 'Status' },
  { key: 'pm_ragstatus', label: 'RAG' },
  { key: 'pm_approvedbudgeteur', label: 'Budget (EUR)' },
  { key: 'pm_actualspendeur', label: 'Actual Spend (EUR)' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfoliosPage() {
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

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)

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
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Portfolios"
        subtitle="Master view of all portfolios — aggregate health, budget tracking, and drill-down details."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>
              New Portfolio
            </Button>
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
                color: "#6366f1"
              },
              {
                label: "Green Health",
                value: kpiHealth.green,
                subtitle: "On track",
                icon: <CheckCircleIcon />,
                color: "#22c55e"
              },
              {
                label: "Amber Health",
                value: kpiHealth.amber,
                subtitle: "At risk",
                icon: <GppMaybeIcon />,
                color: "#f59e0b"
              },
              {
                label: "Red Health",
                value: kpiHealth.red,
                subtitle: "Critical",
                icon: <ErrorIcon />,
                color: "#ef4444"
              },
              {
                label: "Total Portfolio Value",
                value: currencyFormatter.format(totalBudget),
                subtitle: `Across ${portfolioList.length} portfolios`,
                icon: <AccountBalanceWalletIcon />,
                color: "#0ea5e9"
              },
              {
                label: "Total Consumed",
                value: currencyFormatter.format(totalConsumed),
                subtitle: totalBudget > 0 ? `${((totalConsumed / totalBudget) * 100).toFixed(1)}% consumed` : 'No budget data',
                icon: <TrendingDownIcon />,
                color: "#f59e0b"
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
        onCreateClick={() => setShowCreateModal(true)}
        onFilteredDataChange={setFilteredPortfolios}
      />

      {/* ── 3. Slide-Out Detail Panel ──────────────────────────────────── */}
      <DetailDrawer
        open={!!selectedPortfolio}
        onClose={() => setSelectedPortfolio(null)}
        icon={<AccountTreeIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
        title={selectedPortfolio?.pm_portfolioname ?? ''}
        subtitle={selectedPortfolio && (
          <>
            {selectedPortfolio.pm_portfolioowner && (
              <Typography variant="body2" color="text.secondary">
                <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                {selectedPortfolio.pm_portfolioowner}
              </Typography>
            )}
            {selectedPortfolio.pm_businessunit && (
              <Typography variant="body2" color="text.secondary">
                <BusinessIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                {selectedPortfolio.pm_businessunit}
              </Typography>
            )}
          </>
        )}
        headerActions={
          <IconButton
            size="small"
            onClick={() => setEditInfo('Edit functionality will be available in a future update.')}
            sx={{ borderRadius: 1.15 }}
          >
            <EditIcon />
          </IconButton>
        }
        tabs={[
          { label: 'Summary' },
          { label: 'Programmes', count: detailProgrammes.length },
          { label: 'Projects', count: detailProjects.length },
          { label: 'Financials' },
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
          </>
        )}
      </DetailDrawer>

      {/* ── 4. Create Portfolio Modal & Confirmation ──────────────────── */}
      <PortfolioFormDialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setError(msg)}
      />
    </Box>
  )
}
