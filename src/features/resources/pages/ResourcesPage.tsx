import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
  Chip,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonIcon from '@mui/icons-material/Person'
import GroupsIcon from '@mui/icons-material/Groups'
import BadgeIcon from '@mui/icons-material/Badge'
import EngineeringIcon from '@mui/icons-material/Engineering'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EmailIcon from '@mui/icons-material/Email'
import WorkIcon from '@mui/icons-material/Work'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import LocalAtmIcon from '@mui/icons-material/LocalAtm'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TimelineIcon from '@mui/icons-material/Timeline'
import InsightsIcon from '@mui/icons-material/Insights'
import EuroIcon from '@mui/icons-material/Euro'
import { useAuthorization } from '@/hooks/useAuthorization'
import type { CrudModule } from '@/constants/permissions'
import {
  fetchResources,
  createResource,
  updateResource,
  deleteResource,
  fetchResourceAllocations,
  fetchResourceBySystemUserId,
} from '@/services/resource.service'
import {
  fetchCapacityAllocationData,
  fetchPlannedVsActualData,
  fetchUtilizationByProjectData,
  fetchDepartmentDemandData
} from '@/services/chart.service'
import type { ExportColumn } from '@/utils/exportUtils'
import type { ResourceModel, ResourceAllocationModel } from '@/types/dataverse'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel, ExportButton, ActionIcon, WorkflowMilestone } from '@/components/common'
import { EntityApprovalTasks } from '@/features/dashboard/components/EntityApprovalTasks'
import type { KpiCardItem, FilterOption } from '@/components/common'
import { StatusTag } from '@/components/common'
import { MODULE_NAMES } from '@/constants/moduleNames'
import { useUser } from '@/context/UserContext'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Internal Staff',
  '1': 'Contractor',
  '2': 'Supplier',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'warning' | 'info'> = {
  '0': 'primary',
  '1': 'warning',
  '2': 'info',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Active',
}

const CATEGORY_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Categories' },
  { value: '0', label: 'Internal Staff' },
  { value: '1', label: 'Contractor' },
  { value: '2', label: 'Supplier' },
]

const DEPARTMENT_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Departments' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Design', label: 'Design' },
  { value: 'QA', label: 'QA' },
  { value: 'Product', label: 'Product' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'HR' },
]

type SortField = 'name' | 'department' | 'role' | 'category' | 'capacity' | 'costrate'
type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const resourceExportColumns: ExportColumn[] = [
  { key: 'pm_fullname', label: 'Name' },
  { key: 'pm_departmentname', label: 'Department' },
  { key: 'pm_primaryrole', label: 'Role' },
  { key: 'pm_resourcecategory', label: 'Category' },
  { key: 'pm_positiontitle', label: 'Position' },
  { key: 'pm_dailyworkcapacity', label: 'Daily Capacity (h)' },
  { key: 'pm_dailycostrate', label: 'Daily Rate (EUR)' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { currentUser, currentUserPersona, users } = useUser()

  const { allowed: canCreate } = useAuthorization('RESOURCES', 'create')
  const { allowed: canEdit } = useAuthorization('RESOURCES', 'update')
  const { allowed: canDelete } = useAuthorization('RESOURCES', 'delete')

  // Data state
  const [resources, setResources] = useState<ResourceModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Page tab (0 = Directory, 1 = Forecasting)
  const [pageTab, setPageTab] = useState(0)

  // Chart data for forecasting
  const [capacityData, setCapacityData] = useState<Array<{ resource: string; capacity: number; allocated: number; percentage: number }>>([])
  const [plannedVsActual, setPlannedVsActual] = useState<Array<{ month: string; planned: number; actual: number }>>([])
  const [utilizationByProject, setUtilizationByProject] = useState<Array<{ name: string; hours: number }>>([])
  const [deptDemand, setDeptDemand] = useState<Array<{ month: string; role: string; hours: number }>>([])
  const [chartsLoading, setChartsLoading] = useState(false)

  // Grid state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })

  // Detail panel state
  const [selectedResource, setSelectedResource] = useState<ResourceModel | null>(null)
  const [detailTab, setDetailTab] = useState(0)
  const [resourceAllocations, setResourceAllocations] = useState<ResourceAllocationModel[]>([])

  // Create/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingResource, setEditingResource] = useState<ResourceModel | null>(null)
  const [systemUserConflict, setSystemUserConflict] = useState<string | null>(null)
  const [checkingUser, setCheckingUser] = useState(false)
  const [formData, setFormData] = useState({
    pm_fullname: '',
    pm_departmentname: '',
    pm_primaryrole: '',
    pm_resourcecategory: 0,
    pm_positiontitle: '',
    _pm_systemuser_value: '',
    pm_dailyworkcapacity: 8,
    pm_dailycostrate: 0,
    pm_suppliercompany: '',
    pm_contractstartdate: '',
    pm_contractenddate: '',
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Reactive System User conflict check
  useEffect(() => {
    if (!formData._pm_systemuser_value) {
      setSystemUserConflict(null)
      return
    }
    setCheckingUser(true)
    let cancelled = false
    fetchResourceBySystemUserId(formData._pm_systemuser_value).then((existing) => {
      if (cancelled) return
      if (existing && existing.pm_resourceid !== editingResource?.pm_resourceid) {
        setSystemUserConflict(existing.pm_fullname ?? 'another resource')
      } else {
        setSystemUserConflict(null)
      }
    }).catch(() => {
      if (!cancelled) setSystemUserConflict(null)
    }).finally(() => {
      if (!cancelled) setCheckingUser(false)
    })
    return () => { cancelled = true }
  }, [formData._pm_systemuser_value, editingResource])

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const isTeamMember = currentUserPersona === 'TeamMember'
      let list: ResourceModel[] = []
      if (isTeamMember && currentUser?.systemuserid) {
        const resource = await fetchResourceBySystemUserId(currentUser.systemuserid)
        list = resource ? [resource] : []
      } else {
        list = await fetchResources()
      }
      setResources(list)
    } catch {
      setError('Unable to load resource data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, currentUserPersona])

  const loadChartsData = useCallback(async () => {
    setChartsLoading(true)
    try {
      const [cap, pva, ubp, dd] = await Promise.all([
        fetchCapacityAllocationData(),
        fetchPlannedVsActualData(),
        fetchUtilizationByProjectData(),
        fetchDepartmentDemandData(),
      ])
      setCapacityData(cap)
      setPlannedVsActual(pva)
      setUtilizationByProject(ubp)
      setDeptDemand(dd)
    } catch {
      // silently fail — charts will show empty state
    } finally {
      setChartsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (pageTab === 1) {
      loadChartsData()
    }
  }, [pageTab, loadChartsData])

  // ── KPIs ────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => {
    const total = resources.length
    const internal = resources.filter((r) => String(r.pm_resourcecategory) === '0').length
    const contractors = resources.filter((r) => String(r.pm_resourcecategory) === '1').length
    const totalCapacity = resources.reduce((s, r) => s + (r.pm_dailyworkcapacity ?? 0), 0)
    return [
      {
        label: 'Total Resources',
        value: total,
        subtitle: 'Active team members',
        icon: <GroupsIcon />,
        color: 'primary.main',
      },
      {
        label: 'Internal Staff',
        value: internal,
        subtitle: `${total > 0 ? ((internal / total) * 100).toFixed(0) : 0}% of workforce`,
        icon: <BadgeIcon />,
        color: 'success.main',
      },
      {
        label: 'Contractors',
        value: contractors,
        subtitle: `${total > 0 ? ((contractors / total) * 100).toFixed(0) : 0}% of workforce`,
        icon: <EngineeringIcon />,
        color: 'warning.main',
      },
      {
        label: 'Total Daily Capacity',
        value: `${totalCapacity} hrs`,
        subtitle: 'Across all active resources',
        icon: <WorkIcon />,
        color: 'secondary.main',
      },
    ]
  }, [resources])

  // ── Derived filter options from data ──
  const departmentOptions = useMemo(() => {
    const depts = Array.from(new Set(resources.map((r) => r.pm_departmentname).filter(Boolean))) as string[]
    return [
      { value: '', label: 'All Departments' },
      ...depts.sort().map((d) => ({ value: d, label: d })),
    ]
  }, [resources])

  // ── Filtered & Sorted Resources ──────────────────────────────────────────
  const filteredResources = useMemo(() => {
    let list = [...resources]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          r.pm_fullname?.toLowerCase().includes(q) ||
          r.pm_departmentname?.toLowerCase().includes(q) ||
          r.pm_primaryrole?.toLowerCase().includes(q) ||
          r.pm_positiontitle?.toLowerCase().includes(q)
      )
    }

    if (categoryFilter) {
      list = list.filter((r) => String(r.pm_resourcecategory) === categoryFilter)
    }

    if (departmentFilter) {
      list = list.filter((r) => r.pm_departmentname === departmentFilter)
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'name':
          cmp = (a.pm_fullname ?? '').localeCompare(b.pm_fullname ?? '')
          break
        case 'department':
          cmp = (a.pm_departmentname ?? '').localeCompare(b.pm_departmentname ?? '')
          break
        case 'role':
          cmp = (a.pm_primaryrole ?? '').localeCompare(b.pm_primaryrole ?? '')
          break
        case 'category':
          cmp = String(a.pm_resourcecategory ?? '').localeCompare(String(b.pm_resourcecategory ?? ''))
          break
        case 'capacity':
          cmp = (a.pm_dailyworkcapacity ?? 0) - (b.pm_dailyworkcapacity ?? 0)
          break
        case 'costrate':
          cmp = (a.pm_dailycostrate ?? 0) - (b.pm_dailycostrate ?? 0)
          break
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [resources, searchQuery, categoryFilter, departmentFilter, sort])

  const paginatedResources = useMemo(
    () => filteredResources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredResources, page, rowsPerPage]
  )

  const handleChangePage = useCallback((_e: unknown, newPage: number) => setPage(newPage), [])
  const handleChangeRowsPerPage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }, [])
  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); setPage(0) }, [])
  const handleCategoryFilterChange = useCallback((value: string) => { setCategoryFilter(value); setPage(0) }, [])
  const handleDepartmentFilterChange = useCallback((value: string) => { setDepartmentFilter(value); setPage(0) }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRowClick = useCallback(async (resource: ResourceModel) => {
    setSelectedResource(resource)
    setDetailTab(0)
    setError(null)
    // Load allocations
    if (resource.pm_resourceid) {
      try {
        const allocs = await fetchResourceAllocations(resource.pm_resourceid)
        setResourceAllocations(allocs)
      } catch {
        setResourceAllocations([])
      }
    }
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedResource(null)
    setDetailTab(0)
    setResourceAllocations([])
  }, [])

  // ── Form open for create/edit ──
  const openCreateForm = useCallback(() => {
    setEditingResource(null)
    setFormData({
      pm_fullname: '',
      pm_departmentname: '',
      pm_primaryrole: '',
      pm_resourcecategory: 0,
      pm_positiontitle: '',
      _pm_systemuser_value: '',
      pm_dailyworkcapacity: 8,
      pm_dailycostrate: 0,
      pm_suppliercompany: '',
      pm_contractstartdate: '',
      pm_contractenddate: '',
    })
    setShowFormModal(true)
  }, [])

  const openEditForm = useCallback((resource: ResourceModel) => {
    setEditingResource(resource)
    setFormData({
      pm_fullname: resource.pm_fullname ?? '',
      pm_departmentname: resource.pm_departmentname ?? '',
      pm_primaryrole: resource.pm_primaryrole ?? '',
      pm_resourcecategory: Number(resource.pm_resourcecategory) || 0,
      pm_positiontitle: resource.pm_positiontitle ?? '',
      _pm_systemuser_value: resource._pm_systemuser_value ?? '',
      pm_dailyworkcapacity: resource.pm_dailyworkcapacity ?? 8,
      pm_dailycostrate: resource.pm_dailycostrate ?? 0,
      pm_suppliercompany: resource.pm_suppliercompany ?? '',
      pm_contractstartdate: resource.pm_contractstartdate ?? '',
      pm_contractenddate: resource.pm_contractenddate ?? '',
    })
    setShowFormModal(true)
  }, [])

  const handleSaveResource = async () => {
    if (!formData.pm_fullname.trim()) {
      setError('Resource name is required.')
      return
    }
    if (formData.pm_dailyworkcapacity < 0) {
      setError('Daily capacity cannot be negative.')
      return
    }
    if (formData.pm_dailyworkcapacity > 24) {
      setError('Daily capacity cannot exceed 24 hours.')
      return
    }
    if (formData.pm_dailycostrate < 0) {
      setError('Daily cost rate cannot be negative.')
      return
    }
    if (systemUserConflict) {
      setError(`System user is already linked to resource "${systemUserConflict}".`)
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      if (editingResource?.pm_resourceid) {
        await updateResource(editingResource.pm_resourceid, formData as any)
        setSuccessMsg('Resource updated successfully.')
      } else {
        await createResource(formData as any)
        setSuccessMsg('Resource created successfully.')
      }
      setShowFormModal(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch (err) {
      console.error('[ResourcesPage] handleSaveResource error:', err)
      setError(editingResource ? 'Unable to update resource.' : 'Unable to create resource.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteResource = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      await deleteResource(deleteConfirm)
      setSuccessMsg('Resource removed successfully.')
      setDeleteConfirm(null)
      if (selectedResource?.pm_resourceid === deleteConfirm) {
        setSelectedResource(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError('Unable to delete resource.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Resources"
        subtitle="Manage your workforce — staff, contractors, and suppliers across departments and roles."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
                Add Resource
              </Button>
            )}
            <ExportButton filename="resources" columns={resourceExportColumns} data={filteredResources} />
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── Page Tabs (Directory / Forecasting) ──────── */}
      <Tabs
        value={pageTab}
        onChange={(_, v) => setPageTab(v)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40, px: 3 },
          '& .Mui-selected': { color: 'primary.main' },
        }}
      >
        <Tab icon={<GroupsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Directory" />
        <Tab icon={<TrendingUpIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Demand & Forecasting" />
      </Tabs>

      {pageTab === 1 && (
        <ForecastingView
          capacityData={capacityData}
          plannedVsActual={plannedVsActual}
          utilizationByProject={utilizationByProject}
          deptDemand={deptDemand}
          loading={chartsLoading}
          resources={resources}
          isDark={isDark}
          theme={theme}
        />
      )}

      {pageTab === 0 && (
        <Box>
          {/* ── KPI Row ──────────────────────────────────── */}
          {!loading && <KpiCardRow items={kpiItems} />}

          {/* ── Resource Grid ─────────────────────────────── */}
          <Paper sx={{ overflow: 'hidden', mb: 3 }}>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search by name, role, department, email..."
              filterValue={categoryFilter}
              onFilterChange={handleCategoryFilterChange}
              filterLabel="Category"
              filterOptions={CATEGORY_FILTER_OPTIONS}
              secondaryFilterValue={departmentFilter}
              onSecondaryFilterChange={handleDepartmentFilterChange}
              secondaryFilterLabel="Department"
              secondaryFilterOptions={departmentOptions}
              onClear={() => { setSearchQuery(''); setCategoryFilter(''); setDepartmentFilter(''); setPage(0) }}
            />
            <TableShell
              loading={loading}
              empty={filteredResources.length === 0}
              emptyIcon={<GroupsIcon />}
              emptyTitle={searchQuery || categoryFilter || departmentFilter ? 'No resources match your criteria.' : 'No resources found.'}
              emptyAction={!searchQuery && !categoryFilter && !departmentFilter ? (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateForm}>
                  Add your first resource
                </Button>
              ) : undefined}
            >
              <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'name'} direction={sort.field === 'name' ? sort.dir : 'asc'} onClick={() => handleSort('name')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'department'} direction={sort.field === 'department' ? sort.dir : 'asc'} onClick={() => handleSort('department')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Department
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'role'} direction={sort.field === 'role' ? sort.dir : 'asc'} onClick={() => handleSort('role')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Role
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'category'} direction={sort.field === 'category' ? sort.dir : 'asc'} onClick={() => handleSort('category')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Category
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'capacity'} direction={sort.field === 'capacity' ? sort.dir : 'asc'} onClick={() => handleSort('capacity')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Daily Capacity
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <TableSortLabel active={sort.field === 'costrate'} direction={sort.field === 'costrate' ? sort.dir : 'asc'} onClick={() => handleSort('costrate')} sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>
                        Daily Rate
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}>Actions</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedResources.map((resource, idx) => (
                    <TableRow
                      key={resource.pm_resourceid}
                      hover
                      onClick={() => handleRowClick(resource)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                        '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                        transition: 'background-color 0.15s ease',
                        '& td': { px: 2.5, py: 1.25 },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
                            {(resource.pm_fullname ?? '?').charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {resource.pm_fullname ?? 'Unnamed'}
                            </Typography>
                            {resource.pm_positiontitle && (
                              <Typography variant="caption" color="text.secondary">
                                {resource.pm_positiontitle}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {resource.pm_departmentname || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {resource.pm_primaryrole || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusTag
                          label={CATEGORY_LABELS[String(resource.pm_resourcecategory ?? '')] ?? 'Unknown'}
                          color={CATEGORY_COLORS[String(resource.pm_resourcecategory ?? '')] ?? 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                          {resource.pm_dailyworkcapacity ?? '—'}h
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}>
                          {resource.pm_dailycostrate ? currencyFormatter.format(resource.pm_dailycostrate) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          {canEdit && (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => { e.stopPropagation(); openEditForm(resource) }}
                            >
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          )}
                          {canDelete && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => { e.stopPropagation(); if (resource.pm_resourceid) setDeleteConfirm(resource.pm_resourceid) }}
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>

            {!loading && filteredResources.length > 0 && (
              <TableFooter
                filteredCount={filteredResources.length}
                totalCount={resources.length}
                itemLabel="resource"
              />
            )}
            {!loading && filteredResources.length > 0 && (
              <TablePagination
                component="div"
                count={filteredResources.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            )}
          </Paper>

          {/* ── Detail Drawer ────────────────────────────── */}
          <DetailDrawer
            open={!!selectedResource}
            onClose={handleCloseDetail}
            icon={<PersonIcon sx={{ color: 'primary.main', fontSize: 22 }} />}
            title={selectedResource?.pm_fullname ?? ''}
            subtitle={selectedResource && (
              <>
                {selectedResource.pm_positiontitle && (
                  <Typography variant="body2" color="text.secondary">
                    <BadgeIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                    {selectedResource.pm_positiontitle}
                  </Typography>
                )}
                {selectedResource.pm_departmentname && (
                  <Typography variant="body2" color="text.secondary">
                    <BusinessCenterIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                    {selectedResource.pm_departmentname}
                  </Typography>
                )}

                <StatusTag
                  label={CATEGORY_LABELS[String(selectedResource.pm_resourcecategory ?? '')] ?? 'Unknown'}
                  color={CATEGORY_COLORS[String(selectedResource.pm_resourcecategory ?? '')] ?? 'default'}
                  size="small"
                  variant="outlined"
                />
              </>
            )}
            headerActions={
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {canEdit && (
                  <ActionIcon
                    icon={<EditIcon />}
                    onClick={() => selectedResource && openEditForm(selectedResource)}
                    label="Edit Resource"
                    color="primary"
                  />
                )}
                {canDelete && (
                  <ActionIcon
                    icon={<DeleteIcon />}
                    onClick={() => selectedResource?.pm_resourceid && setDeleteConfirm(selectedResource.pm_resourceid)}
                    label="Delete Resource"
                    color="error"
                  />
                )}
              </Box>
            }
            tabs={[
              { label: 'Overview' },
              { label: 'Allocations', count: resourceAllocations.length },
            ]}
            tabValue={detailTab}
            onTabChange={(v) => { setDetailTab(v); setError(null) }}
          >
            {selectedResource && (
              <>
                {/* Overview Tab */}
                <TabPanel value={detailTab} index={0} pt={0}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Quick Stats */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                          Daily Capacity
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                          {selectedResource.pm_dailyworkcapacity ?? '—'}h
                        </Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'success.main' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: fontSizes.xs, letterSpacing: 0.3 }}>
                          Daily Rate
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                          {selectedResource.pm_dailycostrate ? currencyFormatter.format(selectedResource.pm_dailycostrate) : '—'}
                        </Typography>
                      </Paper>
                    </Box>

                    {/* Details */}
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 16 }} /> Resource Details
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Primary Role</Typography>
                          <Typography variant="body2">{selectedResource.pm_primaryrole || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Department</Typography>
                          <Typography variant="body2">{selectedResource.pm_departmentname || '—'}</Typography>
                        </Box>
                        {selectedResource.pm_contractstartdate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Contract Start</Typography>
                            <Typography variant="body2">{new Date(selectedResource.pm_contractstartdate).toLocaleDateString()}</Typography>
                          </Box>
                        )}
                        {selectedResource.pm_contractenddate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Contract End</Typography>
                            <Typography variant="body2">{new Date(selectedResource.pm_contractenddate).toLocaleDateString()}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>

                    {/* Total Allocations Summary */}
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WorkIcon sx={{ fontSize: 16 }} /> Current Allocation
                      </Typography>
                      {resourceAllocations.length > 0 ? (
                        <>
                          <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                            {resourceAllocations.reduce((s, a) => s + (a.pm_allocatedhours ?? 0), 0)}h
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total allocated hours across {resourceAllocations.length} allocation{resourceAllocations.length !== 1 ? 's' : ''}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No current allocations. Allocate this resource to projects from the Allocations tab.
                        </Typography>
                      )}
                    </Paper>
                  </Box>
                </TabPanel>

                {/* Allocations Tab */}
                <TabPanel value={detailTab} index={1} pt={0}>
                  {resourceAllocations.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 1 }}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Hours Allocated</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', fontFamily: '"JetBrains Mono", monospace' }}>
                            {resourceAllocations.reduce((acc, curr) => acc + (curr.pm_allocatedhours || 0), 0)}h
                          </Typography>
                          <LinearProgress variant="determinate" value={100} sx={{ height: 6, borderRadius: 3 }} />
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Average Allocation %</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main', fontFamily: '"JetBrains Mono", monospace' }}>
                            {Math.round(resourceAllocations.reduce((acc, curr) => acc + (curr.pm_allocationpercentage || 0), 0) / resourceAllocations.length)}%
                          </Typography>
                          <LinearProgress variant="determinate" value={Math.round(resourceAllocations.reduce((acc, curr) => acc + (curr.pm_allocationpercentage || 0), 0) / resourceAllocations.length)} color="success" sx={{ height: 6, borderRadius: 3 }} />
                        </Paper>
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WorkIcon sx={{ fontSize: 16 }} /> Detailed Allocations
                      </Typography>
                      {resourceAllocations.map((alloc) => (
                        <Paper key={alloc.pm_resourceallocationid} variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {alloc.pm_assignmentrole || 'Unspecified Role'}
                              </Typography>
                              {(alloc.pm_startdate || alloc.pm_enddate) && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                  <CalendarTodayIcon sx={{ fontSize: 12 }} />
                                  {alloc.pm_startdate ? new Date(alloc.pm_startdate).toLocaleDateString() : '—'}
                                  {' → '}
                                  {alloc.pm_enddate ? new Date(alloc.pm_enddate).toLocaleDateString() : '—'}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>
                                {alloc.pm_allocatedhours ?? 0}h
                              </Typography>
                              {alloc.pm_allocationpercentage != null && (
                                <Typography variant="caption" color="text.secondary">
                                  {alloc.pm_allocationpercentage}%
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                      No allocations for this resource yet.
                    </Typography>
                  )}
                </TabPanel>

              </>
            )}
          </DetailDrawer>

          {/* ── Create/Edit Modal ──────────────────────── */}
          <Dialog
            open={showFormModal}
            onClose={() => !actionLoading && setShowFormModal(false)}
            maxWidth="md"
            fullWidth
            slotProps={{
              paper: { sx: { borderRadius: 1.5 } },
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 1.5 }}>
                {editingResource ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <PersonIcon sx={{ fontSize: 18, color: '#fff' }} />}
              </Avatar>
              {editingResource ? 'Edit Resource' : 'Add New Resource'}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {editingResource ? `Update details for ${editingResource.pm_fullname}.` : 'Add a new team member, contractor, or supplier to the resource pool.'}
              </Typography>

              {/* Basic Information */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                  Basic Information
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Full Name"
                    required
                    fullWidth
                    size="small"
                    value={formData.pm_fullname}
                    onChange={(e) => setFormData((f) => ({ ...f, pm_fullname: e.target.value }))}
                    slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="resource-category-label">Category</InputLabel>
                    <Select
                      id="resource-category-select"
                      labelId="resource-category-label"
                      value={formData.pm_resourcecategory}
                      label="Category"
                      onChange={(e) => setFormData((f) => ({ ...f, pm_resourcecategory: e.target.value as number }))}
                      sx={{ borderRadius: 1.5 }}
                    >
                      <MenuItem value={0}>Internal Staff</MenuItem>
                      <MenuItem value={1}>Contractor</MenuItem>
                      <MenuItem value={2}>Supplier</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Department"
                    fullWidth
                    size="small"
                    value={formData.pm_departmentname}
                    onChange={(e) => setFormData((f) => ({ ...f, pm_departmentname: e.target.value }))}
                    slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Position / Title"
                    fullWidth
                    size="small"
                    value={formData.pm_positiontitle}
                    onChange={(e) => setFormData((f) => ({ ...f, pm_positiontitle: e.target.value }))}
                    slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Primary Role"
                    fullWidth
                    size="small"
                    value={formData.pm_primaryrole}
                    onChange={(e) => setFormData((f) => ({ ...f, pm_primaryrole: e.target.value }))}
                    slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small" error={!!systemUserConflict}>
                    <InputLabel id="resource-system-user-label">System User</InputLabel>
                    <Select
                      id="resource-system-user-select"
                      labelId="resource-system-user-label"
                      value={users.find((u) => u.systemuserid === formData._pm_systemuser_value)?.systemuserid || ''}
                      label="System User"
                      onChange={(e) => setFormData(f => ({ ...f, _pm_systemuser_value: e.target.value }))}
                      sx={{ borderRadius: 1.5 }}
                      renderValue={(selected) => {
                        const user = users.find((u) => u.systemuserid === selected)
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                              {user?.fullname?.charAt(0) || '?'}
                            </Avatar>
                            {user?.fullname || 'Select User'}
                          </Box>
                        )
                      }}
                    >
                      <MenuItem value="">— None —</MenuItem>
                      {users.map((user) => (
                        <MenuItem key={user.systemuserid} value={user.systemuserid}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'primary.main' }}>
                              {user.fullname?.charAt(0) || '?'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.fullname}</Typography>
                              {user.jobtitle && <Typography variant="caption" color="text.secondary">{user.jobtitle}</Typography>}
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {systemUserConflict && (
                      <FormHelperText>Already linked to "{systemUserConflict}"</FormHelperText>
                    )}
                    {checkingUser && !systemUserConflict && (
                      <FormHelperText>Checking...</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                {formData.pm_resourcecategory === 1 && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Supplier / Company"
                      fullWidth
                      size="small"
                      value={formData.pm_suppliercompany}
                      onChange={(e) => setFormData((f) => ({ ...f, pm_suppliercompany: e.target.value }))}
                      slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                    />
                  </Grid>
                )}
              </Grid>

              {/* Capacity & Rate */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalAtmIcon sx={{ fontSize: 18, color: 'success.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                  Capacity & Rate
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Daily Capacity (hours)"
                    type="number"
                    fullWidth
                    size="small"
                    value={formData.pm_dailyworkcapacity}
                    onChange={(e) => setFormData((f) => ({ ...f, pm_dailyworkcapacity: Number(e.target.value) }))}
                    slotProps={{ htmlInput: { min: 0, max: 24 }, input: { sx: { borderRadius: 1.5 } } }}
                    helperText={formData.pm_dailyworkcapacity > 24 ? 'Maximum 24 hours' : ' '}
                    error={formData.pm_dailyworkcapacity > 24}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Daily Cost Rate (EUR)"
                    type="number"
                    fullWidth
                    size="small"
                    value={formData.pm_dailycostrate}
                    onChange={(e) => setFormData((f) => ({ ...f, pm_dailycostrate: Number(e.target.value) }))}
                    slotProps={{ input: { sx: { borderRadius: 1.5 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Contract End Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={formData.pm_contractenddate}
                    onChange={(e) => setFormData((f) => ({ ...f, pm_contractenddate: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.5 } } }}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button onClick={() => setShowFormModal(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveResource}
                variant="contained"
                disabled={!formData.pm_fullname.trim() || !!systemUserConflict || actionLoading}
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1.5, fontWeight: 600 }}
              >
                {actionLoading ? 'Saving...' : editingResource ? 'Update Resource' : 'Create Resource'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* ── Delete Confirmation ────────────────────── */}
          <Dialog
            open={!!deleteConfirm}
            onClose={() => !actionLoading && setDeleteConfirm(null)}
            maxWidth="xs"
            fullWidth
            slotProps={{
              paper: { sx: { borderRadius: 1.5 } },
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove Resource</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">
                Are you sure you want to remove this resource? This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, gap: 1 }}>
              <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
                Cancel
              </Button>
              <Button onClick={handleDeleteResource} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.5 }}>
                {actionLoading ? 'Removing...' : 'Remove'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  )
}

// ─── Forecasting View Sub-Component ────────────────────────────────────────────

interface ForecastingViewProps {
  capacityData: Array<{ resource: string; capacity: number; allocated: number; percentage: number }>
  plannedVsActual: Array<{ month: string; planned: number; actual: number }>
  utilizationByProject: Array<{ name: string; hours: number }>
  deptDemand: Array<{ month: string; role: string; hours: number }>
  loading: boolean
  resources: ResourceModel[]
  isDark: boolean
  theme: any
}

const DONUT_COLORS = [
  'primary.main', 'secondary.main', '#f97316', '#06b6d4',
  '#ec4899', '#14b8a6', '#eab308', 'secondary.main', '#84cc16', '#a855f7',
]

const ROLE_COLORS = [
  'primary.main', 'secondary.main', '#f97316', '#06b6d4',
  '#ec4899', '#14b8a6', '#eab308', 'secondary.main',
  '#84cc16', '#a855f7',
]

function ForecastingView({ capacityData, plannedVsActual, utilizationByProject, deptDemand, loading, resources, isDark, theme }: ForecastingViewProps) {
  const textColor = isDark ? 'background.default' : '#0f172a'
  const gridColor = isDark ? '#334155' : '#e6eef7'

  const tooltipStyle = {
    backgroundColor: isDark ? 'background.paper' : '#ffffff',
    border: `1px solid ${gridColor}`,
    color: textColor,
    borderRadius: 1.5,
    fontSize: 13,
  }

  // ── Forecasting KPIs ────────────────────────────────────────────────────
  const forecasterKpis: KpiCardItem[] = useMemo(() => {
    const totalCapacity = capacityData.reduce((s, d) => s + d.capacity, 0)
    const totalAllocated = capacityData.reduce((s, d) => s + d.allocated, 0)
    const overallUtilization = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0
    const overAllocated = capacityData.filter((d) => d.percentage > 100).length
    return [
      {
        label: 'Overall Utilization',
        value: `${overallUtilization}%`,
        icon: <TrendingUpIcon />,
        color: overallUtilization > 100 ? 'error.main' : overallUtilization > 80 ? 'warning.main' : 'success.main',
        trend: `${totalAllocated}h / ${totalCapacity}h`,
      },
      {
        label: 'Total Capacity (monthly)',
        value: `${totalCapacity}h`,
        icon: <TimelineIcon />,
        color: 'primary.main',
      },
      {
        label: 'Total Allocated',
        value: `${totalAllocated}h`,
        icon: <WorkIcon />,
        color: 'secondary.main',
        trend: `${capacityData.length} resources`,
      },
      {
        label: 'Over-allocated',
        value: overAllocated,
        icon: <InsightsIcon />,
        color: overAllocated > 0 ? 'error.main' : 'success.main',
        trend: overAllocated > 0 ? 'Needs attention' : 'All clear',
      },
    ]
  }, [capacityData])

  // ── Capacity Allocation Heatmap (Horizontal Stacked Bar) ────────────────
  const renderCapacityAllocation = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <LinearProgress sx={{ width: 200 }} />
        </Box>
      )
    }
    const hasData = capacityData.length > 0
    const stackedData = hasData
      ? capacityData.map((d) => {
        const capped = Math.min(d.allocated, d.capacity)
        const available = Math.max(0, d.capacity - d.allocated)
        const overage = Math.max(0, d.allocated - d.capacity)
        return { resource: d.resource, allocated: capped, available, overage, percentage: d.percentage }
      })
      : [{ resource: 'No Data', allocated: 0, available: 160, overage: 0, percentage: 0 }]

    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Monthly capacity vs. allocated hours per resource. Color indicates utilization: green ≤ 80%, amber 80–100%, red &gt; 100% (over-allocated).
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={stackedData} layout="vertical" barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis type="number" stroke={textColor} />
            <YAxis type="category" dataKey="resource" width={140} stroke={textColor} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: any) => {
              if (name === 'allocated') return [`${value}h`, 'Allocated']
              if (name === 'available') return [`${value}h`, 'Available']
              if (name === 'overage') return [`${value}h`, 'Over-allocated']
              return [value, name]
            }} />
            <Legend formatter={(value: string) => {
              if (value === 'allocated') return 'Allocated Hours'
              if (value === 'available') return 'Available Capacity'
              if (value === 'overage') return 'Over-allocated'
              return value
            }} />
            <Bar dataKey="available" stackId="a" fill={isDark ? '#334155' : '#e2e8f0'} />
            <Bar
              dataKey="allocated"
              stackId="a"
              shape={(props: any) => {
                const { x, y, width, height, payload } = props
                if (!hasData) return null
                const pct = payload.percentage
                const fill = pct > 100 ? 'error.main' : pct > 80 ? 'warning.main' : 'success.main'
                return <rect x={x} y={y} width={width} height={height} fill={fill} />
              }}
            />
            <Bar dataKey="overage" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {hasData && (
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'success.main' }} />
              <Typography variant="caption">≤ 80% (Healthy)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'warning.main' }} />
              <Typography variant="caption">80–100% (At Risk)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'error.main' }} />
              <Typography variant="caption">&gt; 100% (Over-allocated)</Typography>
            </Box>
          </Box>
        )}
      </>
    )
  }

  // ── Planned vs Actual (Clustered Column) ────────────────────────────────
  const renderPlannedVsActual = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <LinearProgress sx={{ width: 200 }} />
        </Box>
      )
    }
    const hasData = plannedVsActual.length > 0
    const data = hasData ? plannedVsActual : [{ month: 'No Data', planned: 0, actual: 0 }]
    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Forecasted (planned) hours from resource allocations vs. actual logged hours from timesheets, grouped by month.
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} barGap={4} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis stroke={textColor} dataKey="month" />
            <YAxis stroke={textColor} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: textColor }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: any) => {
              if (name === 'planned') return [`${value}h`, 'Planned']
              return [`${value}h`, 'Actual']
            }} />
            <Legend formatter={(value: string) => (value === 'planned' ? 'Planned Hours' : 'Actual Hours')} />
            <Bar dataKey="planned" fill="'primary.main'" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="'warning.main'" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </>
    )
  }

  // ── Utilization by Project (Donut) ──────────────────────────────────────
  const renderUtilizationByProject = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <LinearProgress sx={{ width: 200 }} />
        </Box>
      )
    }
    const hasData = utilizationByProject.length > 0
    const data = hasData ? utilizationByProject : [{ name: 'No Data', hours: 1 }]
    const totalHours = data.reduce((sum, d) => sum + d.hours, 0)
    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Where workforce time is actually being spent, grouped by project.
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={60} outerRadius={100}
              labelLine={false}
              label={({ name, hours }: any) => {
                const pct = totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : '0'
                return `${name}: ${pct}%`
              }}
              dataKey="hours"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}h`, 'Hours']} />
            <Legend formatter={(value: string) => {
              const item = data.find((d) => d.name === value)
              if (item) return `${value} (${item.hours}h)`
              return value
            }} />
          </PieChart>
        </ResponsiveContainer>
      </>
    )
  }

  // ── Department/Role Demand Forecast (Area Chart) ────────────────────────
  const renderDeptDemand = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <LinearProgress sx={{ width: 200 }} />
        </Box>
      )
    }
    const hasData = deptDemand.length > 0
    const months = hasData ? Array.from(new Set(deptDemand.map((d) => d.month))) : []
    const roles = hasData ? Array.from(new Set(deptDemand.map((d) => d.role))) : []

    const areaData = months.map((month) => {
      const point: any = { month }
      for (const role of roles) {
        const match = deptDemand.find((d) => d.month === month && d.role === role)
        point[role] = match?.hours ?? 0
      }
      return point
    })

    const noDataPlaceholder = [{ month: 'No Data', 'No Data': 1 }]

    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Forward-looking allocation demand trend grouped by department/role. This shows how resource demand is forecasted across departments over time.
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={hasData ? areaData : noDataPlaceholder}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis stroke={textColor} dataKey="month" />
            <YAxis stroke={textColor} label={{ value: 'Allocated Hours', angle: -90, position: 'insideLeft', fill: textColor }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {hasData
              ? roles.map((role, idx) => (
                <Area
                  key={role}
                  type="monotone"
                  dataKey={role}
                  stroke={ROLE_COLORS[idx % ROLE_COLORS.length]}
                  fill={ROLE_COLORS[idx % ROLE_COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              ))
              : (
                <Area
                  type="monotone"
                  dataKey="No Data"
                  stroke="'text.disabled'"
                  fill="'text.disabled'"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              )
            }
          </AreaChart>
        </ResponsiveContainer>
      </>
    )
  }

  // ── Monthly Demand Forecast Table ───────────────────────────────────────
  const renderDemandTable = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <LinearProgress sx={{ width: 200 }} />
        </Box>
      )
    }
    const hasData = deptDemand.length > 0

    // Build a month x role matrix
    const months = hasData ? Array.from(new Set(deptDemand.map((d) => d.month))) : []
    const roles = hasData ? Array.from(new Set(deptDemand.map((d) => d.role))) : []

    if (!hasData) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No demand forecast data available. Allocate resources to projects to generate forecasts.
        </Typography>
      )
    }

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default' }}>Month</TableCell>
              {roles.map((role) => (
                <TableCell key={role} align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default' }}>
                  {role}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', color: 'primary.main' }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {months.map((month) => {
              let total = 0
              return (
                <TableRow key={month} hover sx={{ '& td': { py: 1 } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{month}</TableCell>
                  {roles.map((role) => {
                    const match = deptDemand.find((d) => d.month === month && d.role === role)
                    const hours = match?.hours ?? 0
                    total += hours
                    return (
                      <TableCell key={role} align="right" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {hours > 0 ? `${hours}h` : '—'}
                      </TableCell>
                    )
                  })}
                  <TableCell align="right" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                    {total}h
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    )
  }

  return (
    <Box>
      {/* Forecasting KPIs */}
      <KpiCardRow items={forecasterKpis} />

      {/* Two-column chart layout */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <Paper elevation={1} sx={{ p: 3, borderRadius: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <WorkIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Capacity vs. Allocation</Typography>
          </Box>
          {renderCapacityAllocation()}
        </Paper>

        <Paper elevation={1} sx={{ p: 3, borderRadius: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TimelineIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Planned vs. Actual</Typography>
          </Box>
          {renderPlannedVsActual()}
        </Paper>

        <Paper elevation={1} sx={{ p: 3, borderRadius: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InsightsIcon sx={{ color: '#f97316', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Utilization by Project</Typography>
          </Box>
          {renderUtilizationByProject()}
        </Paper>

        <Paper elevation={1} sx={{ p: 3, borderRadius: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <GroupsIcon sx={{ color: 'success.main', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Department Demand Forecast</Typography>
          </Box>
          {renderDeptDemand()}
        </Paper>
      </Box>

      {/* Monthly Demand Table */}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 1.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalendarTodayIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Monthly Demand Forecast — Role Breakdown</Typography>
        </Box>
        {renderDemandTable()}
      </Paper>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
        <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Most Allocated Resource
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
              {capacityData.length > 0
                ? capacityData.reduce((max, d) => d.allocated > max.allocated ? d : max, capacityData[0]).resource
                : '—'}
            </Typography>
            {capacityData.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {capacityData.reduce((max, d) => d.allocated > max.allocated ? d : max, capacityData[0]).allocated}h allocated
              </Typography>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Peak Demand Month
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
              {deptDemand.length > 0
                ? (() => {
                  const byMonth = new Map<string, number>()
                  for (const d of deptDemand) {
                    byMonth.set(d.month, (byMonth.get(d.month) ?? 0) + d.hours)
                  }
                  let maxMonth = ''
                  let maxHours = 0
                  for (const [m, h] of byMonth) {
                    if (h > maxHours) { maxMonth = m; maxHours = h }
                  }
                  return `${maxMonth} (${maxHours}h)`
                })()
                : '—'}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Resource Count
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
              {resources.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active resources in pool
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
