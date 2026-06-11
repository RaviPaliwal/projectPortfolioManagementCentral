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
import { PageHeader, KpiCardRow, TableFooter, TableShell, DetailDrawer, SearchFilterBar, TabPanel, ExportButton, StatusTag, ActionIcon, ConfirmDialog } from '@/components/common'
import type { KpiCardItem, FilterOption } from '@/components/common'
import { SkillDialog, ResourceSkillDialog } from '../components'

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

  // Create/Edit Resource-Skill modal
  const [showRsForm, setShowRsForm] = useState(false)
  const [editingRs, setEditingRs] = useState<ResourceSkillModel | null>(null)

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
        color: 'primary.main',
      },
      {
        label: 'Active',
        value: activeSkills,
        subtitle: `${totalSkills > 0 ? ((activeSkills / totalSkills) * 100).toFixed(0) : 0}% of catalog`,
        icon: <CheckCircleIcon />,
        color: 'success.main',
      },
      {
        label: 'Resource-Skill Mappings',
        value: totalMappings,
        subtitle: 'Across all resources',
        icon: <LinkIcon />,
        color: 'secondary.main',
      },
      {
        label: 'Certifications',
        value: certifiedSkills,
        subtitle: `${primarySkills > 0 ? primarySkills : 0} marked as primary skill`,
        icon: <WorkspacePremiumIcon />,
        color: 'warning.main',
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
    setShowSkillForm(true)
  }, [])

  const openEditSkill = useCallback((skill: SkillModel) => {
    setEditingSkill(skill)
    setShowSkillForm(true)
  }, [])

  const handleSaveSkill = async (data: Record<string, any>) => {
    if (!data.pm_skillname.trim()) {
      setError('Skill name is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      if (editingSkill?.pm_skillid) {
        await updateSkill(editingSkill.pm_skillid, data as any)
        setSuccessMsg('Skill updated successfully.')
      } else {
        await createSkill(data as any)
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
    setShowRsForm(true)
  }, [])

  const openEditRs = useCallback((rs: ResourceSkillModel) => {
    setEditingRs(rs)
    setShowRsForm(true)
  }, [])

  const handleSaveRs = async (data: Record<string, any>) => {
    if (!data.pm_skillid && !data.pm_skillname) {
      setError('Skill is required.')
      return
    }
    if (!data._pm_resource_value && !data.pm_resourcename) {
      setError('Resource is required.')
      return
    }
    setError(null)
    setActionLoading(true)
    try {
      const payload: any = { ...data }
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
      case 0: return 'text.disabled'
      case 1: return 'primary.main'
      case 2: return 'secondary.main'
      case 3: return 'success.main'
      default: return 'text.disabled'
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
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={skillSort.field === 'name'}
                      direction={skillSort.field === 'name' ? skillSort.dir : 'asc'}
                      onClick={() => handleSkillSort('name')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Skill
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={skillSort.field === 'category'}
                      direction={skillSort.field === 'category' ? skillSort.dir : 'asc'}
                      onClick={() => handleSkillSort('category')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Category
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    Description
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
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
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
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
          icon={<PsychologyIcon sx={{ color: 'secondary.main', fontSize: 22 }} />}
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
              <ActionIcon
                icon={<EditIcon />}
                onClick={() => selectedSkill && openEditSkill(selectedSkill)}
                label="Edit Skill"
                color="primary"
              />
              <ActionIcon
                icon={<DeleteIcon />}
                onClick={() => { setDeleteType('skill'); selectedSkill?.pm_skillid && setDeleteConfirm(selectedSkill.pm_skillid) }}
                label="Delete Skill"
                color="error"
              />
            </Box>
          }
        >
          {selectedSkill && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Skill Details */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
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
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
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
      <SkillDialog
        open={showSkillForm}
        onClose={() => !actionLoading && setShowSkillForm(false)}
        initialData={editingSkill}
        onSave={handleSaveSkill}
      />
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
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={rsSort.field === 'skill'}
                      direction={rsSort.field === 'skill' ? rsSort.dir : 'asc'}
                      onClick={() => handleRsSort('skill')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Skill
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={rsSort.field === 'resource'}
                      direction={rsSort.field === 'resource' ? rsSort.dir : 'asc'}
                      onClick={() => handleRsSort('resource')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Resource
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={rsSort.field === 'proficiency'}
                      direction={rsSort.field === 'proficiency' ? rsSort.dir : 'asc'}
                      onClick={() => handleRsSort('proficiency')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Proficiency
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    <TableSortLabel
                      active={rsSort.field === 'experience'}
                      direction={rsSort.field === 'experience' ? rsSort.dir : 'asc'}
                      onClick={() => handleRsSort('experience')}
                      sx={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#475569' }}
                    >
                      Years
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
                    Certification
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, bgcolor: isDark ? 'background.paper' : 'background.default', borderBottom: `2px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
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
                      bgcolor: idx % 2 === 1 ? (isDark ? '#1a2332' : 'background.default') : 'transparent',
                      '&:hover': { bgcolor: isDark ? '#1e3a5f !important' : '#eef2ff !important' },
                      transition: 'background-color 0.15s ease',
                      '& td': { px: 2.5, py: 1.25 },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: fontSizes.sm, fontWeight: 700 }}>
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
                          <VerifiedIcon sx={{ fontSize: 16, color: 'success.main' }} />
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
                        <StarIcon sx={{ fontSize: 20, color: 'warning.main' }} />
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
        <ResourceSkillDialog
          open={showRsForm}
          onClose={() => !actionLoading && setShowRsForm(false)}
          initialData={editingRs}
          skills={skills}
          onSave={handleSaveRs}
        />
      </TabPanel>

      {/* ── Delete Confirmation ────────────────────── */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => !actionLoading && setDeleteConfirm(null)}
        title={deleteType === 'skill' ? 'Remove Skill' : 'Remove Mapping'}
        message={deleteType === 'skill'
          ? 'Are you sure you want to remove this skill from the catalog? This action cannot be undone.'
          : 'Are you sure you want to remove this resource-skill mapping? This action cannot be undone.'}
        confirmLabel="Remove"
        confirmColor="error"
        loading={actionLoading}
        onConfirm={handleDelete}
      />
    </Box>
  )
}
