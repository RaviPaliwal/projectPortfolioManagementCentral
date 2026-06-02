import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Alert,
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
  Divider,
  Avatar,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PsychologyIcon from '@mui/icons-material/Psychology'
import LinkIcon from '@mui/icons-material/Link'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import GroupsIcon from '@mui/icons-material/Groups'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import VerifiedIcon from '@mui/icons-material/Verified'
import SchoolIcon from '@mui/icons-material/School'
import StarIcon from '@mui/icons-material/Star'
import PersonIcon from '@mui/icons-material/Person'
import EngineeringIcon from '@mui/icons-material/Engineering'
import type { SkillModel, ResourceSkillModel } from '@/types/dataverse'
import type { ExportColumn } from '@/components/common'
import {
  fetchSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  fetchResourceSkills,
  createResourceSkill,
  updateResourceSkill,
  deleteResourceSkill,
} from '@/services/skill.service'
import { fontSizes } from '@/styles'
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel, ExportButton, StatusTag } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  '0': 'Technical',
  '1': 'Functional',
  '2': 'Management',
  '3': 'Domain',
}

const CATEGORY_COLORS: Record<string, 'primary' | 'warning' | 'success' | 'info'> = {
  '0': 'primary',
  '1': 'warning',
  '2': 'success',
  '3': 'info',
}

const CATEGORY_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Categories' },
  { value: '0', label: 'Technical' },
  { value: '1', label: 'Functional' },
  { value: '2', label: 'Management' },
  { value: '3', label: 'Domain' },
]

const skillExportColumns: ExportColumn[] = [
  { key: 'pm_skillname', label: 'Skill' },
  { key: 'pm_skilldescription', label: 'Description' },
  { key: 'pm_skillcategoryname', label: 'Category' },
  { key: 'pm_isactive', label: 'Active' },
]

const PROFICIENCY_LABELS: Record<string, string> = {
  '0': 'Beginner',
  '1': 'Intermediate',
  '2': 'Advanced',
  '3': 'Expert',
}

const PROFICIENCY_COLORS: Record<string, 'default' | 'info' | 'primary' | 'success'> = {
  '0': 'default',
  '1': 'info',
  '2': 'primary',
  '3': 'success',
}

type SkillSortField = 'name' | 'category'
type RSortField = 'skill' | 'resource' | 'proficiency' | 'experience'
type SortDir = 'asc' | 'desc'

interface SortState<T> {
  field: T
  dir: SortDir
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SkillsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // Data state
  const [skills, setSkills] = useState<SkillModel[]>([])
  const [resourceSkills, setResourceSkills] = useState<ResourceSkillModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Page tab (0 = Skills Catalog, 1 = Mapping)
  const [pageTab, setPageTab] = useState(0)

  // ── Skills Table State ───────────────────────────────────────────────────
  const [skillSearch, setSkillSearch] = useState('')
  const [skillCategoryFilter, setSkillCategoryFilter] = useState('')
  const [skillSort, setSkillSort] = useState<SortState<SkillSortField>>({ field: 'name', dir: 'asc' })
  const [skillPage, setSkillPage] = useState(0)
  const [skillRowsPerPage, setSkillRowsPerPage] = useState(25)

  // ── Resource-Skill Table State ───────────────────────────────────────────
  const [rsSearch, setRsSearch] = useState('')
  const [rsSort, setRsSort] = useState<SortState<RSortField>>({ field: 'skill', dir: 'asc' })
  const [rsPage, setRsPage] = useState(0)
  const [rsRowsPerPage, setRsRowsPerPage] = useState(25)

  // Detail panel for skills
  const [selectedSkill, setSelectedSkill] = useState<SkillModel | null>(null)

  // Create/Edit Skill modal
  const [showSkillForm, setShowSkillForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SkillModel | null>(null)
  const [skillFormData, setSkillFormData] = useState({
    pm_skillname: '',
    pm_skillcategory: 0,
    pm_skilldescription: '',
    pm_isactive: true,
  })

  // Create/Edit Resource-Skill modal
  const [showRsForm, setShowRsForm] = useState(false)
  const [editingRs, setEditingRs] = useState<ResourceSkillModel | null>(null)
  const [rsFormData, setRsFormData] = useState({
    pm_skillid: '',
    pm_skillname: '',
    pm_resourceid: '',
    pm_resourcename: '',
    pm_proficiencylevel: 0,
    pm_yearsofexperience: 0,
    pm_certificationname: '',
    pm_certificationexpirydate: '',
    pm_certified: false,
    pm_primaryskill: false,
    _pm_resource_value: '',
    _pm_skill_value: '',
  })

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteType, setDeleteType] = useState<'skill' | 'resource-skill'>('skill')

  // ── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [skillsList, rsList] = await Promise.all([
        fetchSkills(),
        fetchResourceSkills(),
      ])
      setSkills(skillsList)
      setResourceSkills(rsList)
    } catch {
      setError('Unable to load skills data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiItems = useMemo((): KpiCardItem[] => {
    const totalSkills = skills.length
    const activeSkills = skills.filter((s) => s.pm_isactive !== false).length
    const totalMappings = resourceSkills.length
    const certifiedSkills = resourceSkills.filter((rs) => rs.pm_certified).length
    const primarySkills = resourceSkills.filter((rs) => rs.pm_primaryskill).length
    return [
      {
        label: 'Total Skills',
        value: totalSkills,
        subtitle: 'In the skills catalog',
        icon: <PsychologyIcon />,
        color: '#0ea5e9',
      },
      {
        label: 'Active',
        value: activeSkills,
        subtitle: `${totalSkills > 0 ? ((activeSkills / totalSkills) * 100).toFixed(0) : 0}% of catalog`,
        icon: <CheckCircleIcon />,
        color: '#22c55e',
      },
      {
        label: 'Resource-Skill Mappings',
        value: totalMappings,
        subtitle: 'Across all resources',
        icon: <LinkIcon />,
        color: '#8b5cf6',
      },
      {
        label: 'Certifications',
        value: certifiedSkills,
        subtitle: `${primarySkills > 0 ? primarySkills : 0} marked as primary skill`,
        icon: <WorkspacePremiumIcon />,
        color: '#f59e0b',
      },
    ]
  }, [skills, resourceSkills])

  // ── Skills Filtering & Sorting ───────────────────────────────────────────
  const filteredSkills = useMemo(() => {
    let list = [...skills]
    if (skillSearch.trim()) {
      const q = skillSearch.toLowerCase()
      list = list.filter(
        (s) =>
          s.pm_skillname?.toLowerCase().includes(q) ||
          s.pm_skilldescription?.toLowerCase().includes(q) ||
          s.pm_skillcategoryname?.toLowerCase().includes(q) ||
          CATEGORY_LABELS[String(s.pm_skillcategory ?? '')]?.toLowerCase().includes(q)
      )
    }
    if (skillCategoryFilter) {
      list = list.filter((s) => String(s.pm_skillcategory) === skillCategoryFilter)
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (skillSort.field) {
        case 'name':
          cmp = (a.pm_skillname ?? '').localeCompare(b.pm_skillname ?? '')
          break
        case 'category':
          cmp = String(a.pm_skillcategory ?? '').localeCompare(String(b.pm_skillcategory ?? ''))
          break
      }
      return skillSort.dir === 'asc' ? cmp : -cmp
    })
  }, [skills, skillSearch, skillCategoryFilter, skillSort])

  const paginatedSkills = useMemo(
    () => filteredSkills.slice(skillPage * skillRowsPerPage, skillPage * skillRowsPerPage + skillRowsPerPage),
    [filteredSkills, skillPage, skillRowsPerPage]
  )

  // ── Resource-Skill Filtering & Sorting ───────────────────────────────────
  const filteredRS = useMemo(() => {
    let list = [...resourceSkills]
    if (rsSearch.trim()) {
      const q = rsSearch.toLowerCase()
      list = list.filter(
        (rs) =>
          rs.pm_skillname?.toLowerCase().includes(q) ||
          rs.pm_resourcename?.toLowerCase().includes(q) ||
          rs.pm_proficiencylevelname?.toLowerCase().includes(q) ||
          rs.pm_certificationname?.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (rsSort.field) {
        case 'skill':
          cmp = (a.pm_skillname ?? '').localeCompare(b.pm_skillname ?? '')
          break
        case 'resource':
          cmp = (a.pm_resourcename ?? '').localeCompare(b.pm_resourcename ?? '')
          break
        case 'proficiency':
          cmp = String(a.pm_proficiencylevel ?? '').localeCompare(String(b.pm_proficiencylevel ?? ''))
          break
        case 'experience':
          cmp = (a.pm_yearsofexperience ?? 0) - (b.pm_yearsofexperience ?? 0)
          break
      }
      return rsSort.dir === 'asc' ? cmp : -cmp
    })
  }, [resourceSkills, rsSearch, rsSort])

  const paginatedRS = useMemo(
    () => filteredRS.slice(rsPage * rsRowsPerPage, rsPage * rsRowsPerPage + rsRowsPerPage),
    [filteredRS, rsPage, rsRowsPerPage]
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSkillSort = useCallback((field: SkillSortField) => {
    setSkillSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleRsSort = useCallback((field: RSortField) => {
    setRsSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  // ── Skill Form ──
  const openCreateSkill = useCallback(() => {
    setEditingSkill(null)
    setSkillFormData({ pm_skillname: '', pm_skillcategory: 0, pm_skilldescription: '', pm_isactive: true })
    setShowSkillForm(true)
  }, [])

  const openEditSkill = useCallback((skill: SkillModel) => {
    setEditingSkill(skill)
    setSkillFormData({
      pm_skillname: skill.pm_skillname ?? '',
      pm_skillcategory: Number(skill.pm_skillcategory) || 0,
      pm_skilldescription: skill.pm_skilldescription ?? '',
      pm_isactive: skill.pm_isactive ?? true,
    })
    setShowSkillForm(true)
  }, [])

  const handleSaveSkill = async () => {
    if (!skillFormData.pm_skillname.trim()) {
      setError('Skill name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      if (editingSkill?.pm_skillid) {
        await updateSkill(editingSkill.pm_skillid, skillFormData as any)
        setSuccessMsg('Skill updated successfully.')
      } else {
        await createSkill(skillFormData as any)
        setSuccessMsg('Skill created successfully.')
      }
      setShowSkillForm(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingSkill ? 'Unable to update skill.' : 'Unable to create skill.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Resource-Skill Form ──
  const openCreateRs = useCallback(() => {
    setEditingRs(null)
    setRsFormData({
      pm_skillid: '', pm_skillname: '', pm_resourceid: '', pm_resourcename: '',
      pm_proficiencylevel: 0, pm_yearsofexperience: 0,
      pm_certificationname: '', pm_certificationexpirydate: '',
      pm_certified: false, pm_primaryskill: false,
      _pm_resource_value: '', _pm_skill_value: '',
    })
    setShowRsForm(true)
  }, [])

  const openEditRs = useCallback((rs: ResourceSkillModel) => {
    setEditingRs(rs)
    setRsFormData({
      pm_skillid: rs.pm_skillid ?? '',
      pm_skillname: rs.pm_skillname ?? '',
      pm_resourceid: rs.pm_resourceid ?? '',
      pm_resourcename: rs.pm_resourcename ?? '',
      pm_proficiencylevel: Number(rs.pm_proficiencylevel) || 0,
      pm_yearsofexperience: rs.pm_yearsofexperience ?? 0,
      pm_certificationname: rs.pm_certificationname ?? '',
      pm_certificationexpirydate: rs.pm_certificationexpirydate ?? '',
      pm_certified: rs.pm_certified ?? false,
      pm_primaryskill: rs.pm_primaryskill ?? false,
      _pm_resource_value: rs._pm_resource_value ?? '',
      _pm_skill_value: rs._pm_skill_value ?? '',
    })
    setShowRsForm(true)
  }, [])

  const handleSaveRs = async () => {
    if (!rsFormData.pm_skillid && !rsFormData.pm_skillname) {
      setError('Skill is required.')
      return
    }
    if (!rsFormData._pm_resource_value && !rsFormData.pm_resourcename) {
      setError('Resource is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const payload: any = { ...rsFormData }
      if (editingRs?.pm_resourceskillid) {
        await updateResourceSkill(editingRs.pm_resourceskillid, payload)
        setSuccessMsg('Resource-Skill mapping updated successfully.')
      } else {
        await createResourceSkill(payload)
        setSuccessMsg('Resource-Skill mapping created successfully.')
      }
      setShowRsForm(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(editingRs ? 'Unable to update mapping.' : 'Unable to create mapping.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      if (deleteType === 'skill') {
        await deleteSkill(deleteConfirm)
        setSuccessMsg('Skill removed successfully.')
      } else {
        await deleteResourceSkill(deleteConfirm)
        setSuccessMsg('Mapping removed successfully.')
      }
      setDeleteConfirm(null)
      if (deleteType === 'skill' && selectedSkill?.pm_skillid === deleteConfirm) {
        setSelectedSkill(null)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch {
      setError(deleteType === 'skill' ? 'Unable to delete skill.' : 'Unable to delete mapping.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Helpers to determine proficiency color ──
  const getProficiencyColor = (level?: number | string): string => {
    const lvl = Number(level) || 0
    switch (lvl) {
      case 0: return '#94a3b8'
      case 1: return '#0ea5e9'
      case 2: return '#8b5cf6'
      case 3: return '#22c55e'
      default: return '#94a3b8'
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Skills & Resource Skills"
        subtitle="Manage the skills catalog and map skills to resources — track certifications, proficiency levels, and primary skills."
        actionElement={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton data={filteredSkills} columns={skillExportColumns} filename="SkillsCatalog" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={pageTab === 0 ? openCreateSkill : openCreateRs}>
              {pageTab === 0 ? 'Add Skill' : 'Add Mapping'}
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── KPI Row ──────────────────────────────────── */}
      {!loading && <KpiCardRow items={kpiItems} />}

      {/* ── Page Tabs ────────────────────────────────── */}
      <Tabs
        value={pageTab}
        onChange={(_, v) => { setPageTab(v); setError(null) }}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14, minHeight: 40, px: 3 },
          '& .Mui-selected': { color: 'primary.main' },
        }}
      >
        <Tab icon={<PsychologyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Skills Catalog" />
        <Tab icon={<LinkIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Resource-Skill Mapping" />
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 0: Skills Catalog                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <TabPanel value={pageTab} index={0} pt={0}>
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <SearchFilterBar
            searchQuery={skillSearch}
            onSearchChange={(v) => { setSkillSearch(v); setSkillPage(0) }}
            searchPlaceholder="Search by name, category, description..."
            filterValue={skillCategoryFilter}
            onFilterChange={(v) => { setSkillCategoryFilter(v); setSkillPage(0) }}
            filterLabel="Category"
            filterOptions={CATEGORY_FILTER_OPTIONS}
            onClear={() => { setSkillSearch(''); setSkillCategoryFilter(''); setSkillPage(0) }}
          />

          <TableShell
            loading={loading}
            empty={filteredSkills.length === 0}
            emptyIcon={<PsychologyIcon />}
            emptyTitle={skillSearch || skillCategoryFilter ? 'No skills match your criteria.' : 'No skills in the catalog yet.'}
            emptyAction={!skillSearch && !skillCategoryFilter ? (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateSkill}>
                Add your first skill
              </Button>
            ) : undefined}
          >
            <Table stickyHeader size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={skillSort.field === 'name'}
                      direction={skillSort.field === 'name' ? skillSort.dir : 'asc'}
                      onClick={() => handleSkillSort('name')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Skill
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={skillSort.field === 'category'}
                      direction={skillSort.field === 'category' ? skillSort.dir : 'asc'}
                      onClick={() => handleSkillSort('category')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Category
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    Description
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSkills.map((skill, idx) => (
                  <TableRow
                    key={skill.pm_skillid}
                    hover
                    onClick={() => setSelectedSkill(skill)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', fontSize: fontSizes.sm, fontWeight: 700 }}>
                          {(skill.pm_skillname ?? 'S').charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {skill.pm_skillname ?? 'Unnamed'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={CATEGORY_LABELS[String(skill.pm_skillcategory ?? '')] ?? 'Unknown'}
                        color={CATEGORY_COLORS[String(skill.pm_skillcategory ?? '')] ?? 'default'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {skill.pm_skilldescription || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <StatusTag
                        label={skill.pm_isactive !== false ? 'Active' : 'Inactive'}
                        color={skill.pm_isactive !== false ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>

          {!loading && filteredSkills.length > 0 && (
            <TableFooter
              filteredCount={filteredSkills.length}
              totalCount={skills.length}
              itemLabel="skill"
            />
          )}
          {!loading && filteredSkills.length > 0 && (
            <TablePagination
              component="div"
              count={filteredSkills.length}
              page={skillPage}
              onPageChange={(_, p) => setSkillPage(p)}
              rowsPerPage={skillRowsPerPage}
              onRowsPerPageChange={(e) => { setSkillRowsPerPage(parseInt(e.target.value, 10)); setSkillPage(0) }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          )}
        </Paper>

        {/* ── Detail Drawer (Skills) ──────────────── */}
        <DetailDrawer
          open={!!selectedSkill}
          onClose={() => setSelectedSkill(null)}
          icon={<PsychologyIcon sx={{ color: '#8b5cf6', fontSize: 22 }} />}
          title={selectedSkill?.pm_skillname ?? ''}
          subtitle={selectedSkill && (
            <StatusTag
              label={CATEGORY_LABELS[String(selectedSkill.pm_skillcategory ?? '')] ?? 'Unknown'}
              color={CATEGORY_COLORS[String(selectedSkill.pm_skillcategory ?? '')] ?? 'default'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
          headerActions={
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                color="error"
                onClick={() => { setDeleteType('skill'); selectedSkill?.pm_skillid && setDeleteConfirm(selectedSkill.pm_skillid) }}
                sx={{ borderRadius: 1.15 }}
              >
                <DeleteIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => selectedSkill && openEditSkill(selectedSkill)}
                sx={{ bgcolor: '#0078D4', color: '#fff', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15 }}
              >
                <EditIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          }
        >
          {selectedSkill && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Skill Details */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 16 }} /> Skill Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Category</Typography>
                    <Typography variant="body2">{CATEGORY_LABELS[String(selectedSkill.pm_skillcategory ?? '')] || selectedSkill.pm_skillcategoryname || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Status</Typography>
                    <StatusTag
                      label={selectedSkill.pm_isactive !== false ? 'Active' : 'Inactive'}
                      color={selectedSkill.pm_isactive !== false ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                </Box>
                {selectedSkill.pm_skilldescription && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.25 }}>Description</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>{selectedSkill.pm_skilldescription}</Typography>
                  </Box>
                )}
              </Paper>

              {/* Resource Count */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.15 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 16 }} /> Resources with this Skill
                </Typography>
                {(() => {
                  const count = resourceSkills.filter((rs) => {
                    // Match by GUID lookup reference (_pm_skill_value → pm_skillid)
                    const rsGuid = (rs._pm_skill_value || '').replace(/[{}]/g, '').trim().toLowerCase()
                    const selGuid = (selectedSkill.pm_skillid || '').replace(/[{}]/g, '').trim().toLowerCase()
                    if (rsGuid && selGuid && rsGuid === selGuid) return true
                    // Fallback: match by resolved skill name (case-insensitive)
                    const rsName = rs.pm_skillname?.trim().toLowerCase()
                    const selName = selectedSkill.pm_skillname?.trim().toLowerCase()
                    if (rsName && selName && rsName === selName) return true
                    return false
                  }).length
                  return (
                    <>
                      <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'primary.main' }}>
                        {count}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {count === 1 ? 'Resource has' : 'Resources have'} this skill mapped
                      </Typography>
                    </>
                  )
                })()}
              </Paper>
            </Box>
          )}
        </DetailDrawer>

        {/* ── Create/Edit Skill Dialog ──────────────── */}
        <Dialog
          open={showSkillForm}
          onClose={() => !actionLoading && setShowSkillForm(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', borderRadius: 1.15 }}>
              {editingSkill ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <PsychologyIcon sx={{ fontSize: 18, color: '#fff' }} />}
            </Avatar>
            {editingSkill ? 'Edit Skill' : 'Add New Skill'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {editingSkill ? `Update details for ${editingSkill.pm_skillname}.` : 'Add a new skill to the catalog for tracking resource capabilities.'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PsychologyIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                Skill Information
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Skill Name"
                  required
                  fullWidth
                  size="small"
                  value={skillFormData.pm_skillname}
                  onChange={(e) => setSkillFormData((f) => ({ ...f, pm_skillname: e.target.value }))}
                  slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={skillFormData.pm_skillcategory}
                    label="Category"
                    onChange={(e) => setSkillFormData((f) => ({ ...f, pm_skillcategory: e.target.value as number }))}
                    sx={{ borderRadius: 1.15 }}
                  >
                    <MenuItem value={0}>Technical</MenuItem>
                    <MenuItem value={1}>Functional</MenuItem>
                    <MenuItem value={2}>Management</MenuItem>
                    <MenuItem value={3}>Domain</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  value={skillFormData.pm_skilldescription}
                  onChange={(e) => setSkillFormData((f) => ({ ...f, pm_skilldescription: e.target.value }))}
                  placeholder="Brief description of the skill and what it encompasses..."
                  slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={() => setShowSkillForm(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSkill}
              variant="contained"
              disabled={!skillFormData.pm_skillname.trim() || actionLoading}
              sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15, fontWeight: 600 }}
            >
              {actionLoading ? 'Saving...' : editingSkill ? 'Update Skill' : 'Create Skill'}
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: Resource-Skill Mapping                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <TabPanel value={pageTab} index={1} pt={0}>
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <SearchFilterBar
            searchQuery={rsSearch}
            onSearchChange={(v) => { setRsSearch(v); setRsPage(0) }}
            searchPlaceholder="Search by skill, resource, proficiency, certification..."
            onClear={() => { setRsSearch(''); setRsPage(0) }}
          />

          <TableShell
            loading={loading}
            empty={filteredRS.length === 0}
            emptyIcon={<LinkIcon />}
            emptyTitle={rsSearch ? 'No mappings match your criteria.' : 'No resource-skill mappings yet.'}
            emptyAction={!rsSearch ? (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateRs}>
                Add your first mapping
              </Button>
            ) : undefined}
          >
            <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={rsSort.field === 'skill'}
                      direction={rsSort.field === 'skill' ? rsSort.dir : 'asc'}
                      onClick={() => handleRsSort('skill')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Skill
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={rsSort.field === 'resource'}
                      direction={rsSort.field === 'resource' ? rsSort.dir : 'asc'}
                      onClick={() => handleRsSort('resource')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Resource
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={rsSort.field === 'proficiency'}
                      direction={rsSort.field === 'proficiency' ? rsSort.dir : 'asc'}
                      onClick={() => handleRsSort('proficiency')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Proficiency
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={rsSort.field === 'experience'}
                      direction={rsSort.field === 'experience' ? rsSort.dir : 'asc'}
                      onClick={() => handleRsSort('experience')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Years
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    Certification
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? '#1e293b' : '#f8fafc', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    Primary
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRS.map((rs, idx) => (
                  <TableRow
                    key={rs.pm_resourceskillid}
                    hover
                    sx={{
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : '#f8fafc') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#8b5cf6', fontSize: fontSizes.sm, fontWeight: 700 }}>
                          {(rs.pm_skillname ?? 'S').charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {rs.pm_skillname ?? '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{rs.pm_resourcename || '—'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusTag
                        label={PROFICIENCY_LABELS[String(rs.pm_proficiencylevel ?? '')] ?? 'Unknown'}
                        color={PROFICIENCY_COLORS[String(rs.pm_proficiencylevel ?? '')] ?? 'default'}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontWeight: 600,
                          borderColor: getProficiencyColor(rs.pm_proficiencylevel),
                          color: getProficiencyColor(rs.pm_proficiencylevel),
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                        {rs.pm_yearsofexperience ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {rs.pm_certified ? (
                          <VerifiedIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                        ) : (
                          <SchoolIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        )}
                        <Typography variant="body2" color="text.secondary">
                          {rs.pm_certificationname || (rs.pm_certified ? 'Certified' : '—')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {rs.pm_primaryskill ? (
                        <StarIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>

          {!loading && filteredRS.length > 0 && (
            <TableFooter
              filteredCount={filteredRS.length}
              totalCount={resourceSkills.length}
              itemLabel="mapping"
            />
          )}
          {!loading && filteredRS.length > 0 && (
            <TablePagination
              component="div"
              count={filteredRS.length}
              page={rsPage}
              onPageChange={(_, p) => setRsPage(p)}
              rowsPerPage={rsRowsPerPage}
              onRowsPerPageChange={(e) => { setRsRowsPerPage(parseInt(e.target.value, 10)); setRsPage(0) }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          )}
        </Paper>

        {/* ── Create/Edit Resource-Skill Dialog ────── */}
        <Dialog
          open={showRsForm}
          onClose={() => !actionLoading && setShowRsForm(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', borderRadius: 1.15 }}>
              {editingRs ? <EditIcon sx={{ fontSize: 18, color: '#fff' }} /> : <LinkIcon sx={{ fontSize: 18, color: '#fff' }} />}
            </Avatar>
            {editingRs ? 'Edit Mapping' : 'Add Resource-Skill Mapping'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {editingRs ? `Update the mapping for ${editingRs.pm_resourcename} → ${editingRs.pm_skillname}.` : 'Map a skill to a resource, including proficiency level and certification details.'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LinkIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: fontSizes.xs, color: 'text.secondary' }}>
                Mapping Information
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Skill</InputLabel>
                  <Select
                    value={rsFormData.pm_skillid}
                    label="Skill"
                    onChange={(e) => {
                      const skillId = e.target.value as string
                      const skill = skills.find((s) => s.pm_skillid === skillId)
                      setRsFormData((f) => ({
                        ...f,
                        pm_skillid: skillId,
                        pm_skillname: skill?.pm_skillname ?? '',
                        _pm_skill_value: skillId,
                      }))
                    }}
                    sx={{ borderRadius: 1.15 }}
                  >
                    {skills.map((s) => (
                      <MenuItem key={s.pm_skillid} value={s.pm_skillid ?? ''}>
                        {s.pm_skillname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Resource Name"
                  fullWidth
                  size="small"
                  value={rsFormData.pm_resourcename}
                  onChange={(e) => setRsFormData((f) => ({ ...f, pm_resourcename: e.target.value, _pm_resource_value: e.target.value }))}
                  placeholder="e.g., John Doe"
                  slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Proficiency Level</InputLabel>
                  <Select
                    value={rsFormData.pm_proficiencylevel}
                    label="Proficiency Level"
                    onChange={(e) => setRsFormData((f) => ({ ...f, pm_proficiencylevel: e.target.value as number }))}
                    sx={{ borderRadius: 1.15 }}
                  >
                    <MenuItem value={0}>Beginner</MenuItem>
                    <MenuItem value={1}>Intermediate</MenuItem>
                    <MenuItem value={2}>Advanced</MenuItem>
                    <MenuItem value={3}>Expert</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Years of Experience"
                  type="number"
                  fullWidth
                  size="small"
                  value={rsFormData.pm_yearsofexperience}
                  onChange={(e) => setRsFormData((f) => ({ ...f, pm_yearsofexperience: Number(e.target.value) }))}
                  slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Certification Name"
                  fullWidth
                  size="small"
                  value={rsFormData.pm_certificationname}
                  onChange={(e) => setRsFormData((f) => ({ ...f, pm_certificationname: e.target.value }))}
                  placeholder="e.g., AWS Certified"
                  slotProps={{ input: { sx: { borderRadius: 1.15 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Certification Expiry"
                  type="date"
                  fullWidth
                  size="small"
                  value={rsFormData.pm_certificationexpirydate}
                  onChange={(e) => setRsFormData((f) => ({ ...f, pm_certificationexpirydate: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 1.15 } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', height: '100%', pt: 1 }}>
                  <FormControl size="small">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Certified</Typography>
                      <Select
                        value={rsFormData.pm_certified ? 'yes' : 'no'}
                        onChange={(e) => setRsFormData((f) => ({ ...f, pm_certified: e.target.value === 'yes' }))}
                        size="small"
                        sx={{ borderRadius: 1.15, minWidth: 100 }}
                      >
                        <MenuItem value="yes">Yes</MenuItem>
                        <MenuItem value="no">No</MenuItem>
                      </Select>
                    </Box>
                  </FormControl>
                  <FormControl size="small">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Primary Skill</Typography>
                      <Select
                        value={rsFormData.pm_primaryskill ? 'yes' : 'no'}
                        onChange={(e) => setRsFormData((f) => ({ ...f, pm_primaryskill: e.target.value === 'yes' }))}
                        size="small"
                        sx={{ borderRadius: 1.15, minWidth: 100 }}
                      >
                        <MenuItem value="yes">Yes</MenuItem>
                        <MenuItem value="no">No</MenuItem>
                      </Select>
                    </Box>
                  </FormControl>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={() => setShowRsForm(false)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRs}
              variant="contained"
              disabled={actionLoading}
              sx={{ bgcolor: '#0078D4', '&:hover': { bgcolor: '#006cbe' }, borderRadius: 1.15, fontWeight: 600 }}
            >
              {actionLoading ? 'Saving...' : editingRs ? 'Update Mapping' : 'Create Mapping'}
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* ── Delete Confirmation ────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => !actionLoading && setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.15 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {deleteType === 'skill' ? 'Remove Skill' : 'Remove Mapping'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteType === 'skill'
              ? 'Are you sure you want to remove this skill from the catalog? This action cannot be undone.'
              : 'Are you sure you want to remove this resource-skill mapping? This action cannot be undone.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={actionLoading} sx={{ borderRadius: 1.15 }}>
            {actionLoading ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
