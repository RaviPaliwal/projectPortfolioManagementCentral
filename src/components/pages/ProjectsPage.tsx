import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Slider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Skeleton,
  useTheme,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import FlagIcon from '@mui/icons-material/Flag'
import {
  createProject,
  createProjectTask,
  createProjectMilestone,
  deleteProject,
  deleteProjectTask,
  deleteProjectMilestone,
  fetchProjectDetails,
  fetchProjectMilestones,
  fetchProjectTasks,
  fetchMyActiveProjects,
  updateProject,
  updateProjectTask,
} from '../../services/dataverseService'
import { StatusChip, ProjectDetailView } from '../common'
import type { ProjectModel, ProjectMilestoneModel, ProjectTaskModel } from '../../models/dataverse'

const defaultProjectForm = {
  pm_projectname: '',
  pm_projectcode: '',
  pm_projectmanager: '',
  pm_projectphase: '1',
  pm_ragstatus: '1',
}

export default function ProjectsPage() {
  const theme = useTheme()
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<ProjectModel | null>(null)
  const [tasks, setTasks] = useState<ProjectTaskModel[]>([])
  const [milestones, setMilestones] = useState<ProjectMilestoneModel[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState<Partial<ProjectModel>>(defaultProjectForm)
  const [isAddingProject, setIsAddingProject] = useState(false)
  const [taskForm, setTaskForm] = useState<Partial<ProjectTaskModel>>({ pm_taskname: '', pm_percentcomplete: 0 })
  const [milestoneForm, setMilestoneForm] = useState<Partial<ProjectMilestoneModel>>({ pm_milestonename: '', pm_milestonetype: '' })
  const [isSavingTask, setIsSavingTask] = useState(false)

  const loadProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchMyActiveProjects()
      setProjects(items)
      if (!selectedProjectId && items.length > 0) {
        setSelectedProjectId(items[0].pm_projectid ?? null)
      }
    } catch {
      setError('Unable to load project list.')
    } finally {
      setLoading(false)
    }
  }

  const loadSelectedProject = async (projectId: string | null) => {
    if (!projectId) {
      setSelectedProject(null)
      setTasks([])
      setMilestones([])
      return
    }
    setDetailLoading(true)
    setError(null)
    try {
      const [details, loadedTasks, loadedMilestones] = await Promise.all([
        fetchProjectDetails(projectId),
        fetchProjectTasks(projectId),
        fetchProjectMilestones(projectId),
      ])
      setSelectedProject(details)
      setTasks(loadedTasks)
      setMilestones(loadedMilestones)
    } catch {
      setError('Unable to load project details.')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => { loadProjects() }, [])
  useEffect(() => { loadSelectedProject(selectedProjectId) }, [selectedProjectId])

  const sidebarItems = useMemo(
    () => projects.map((project) => ({ id: project.pm_projectid, title: project.pm_projectname ?? 'Untitled', status: project.pm_ragstatus })),
    [projects],
  )

  const handleProjectCreate = async () => {
    if (!projectForm.pm_projectname) { setError('Project name is required.'); return }
    try {
      await createProject({ pm_projectname: projectForm.pm_projectname, pm_projectcode: projectForm.pm_projectcode, pm_projectmanager: projectForm.pm_projectmanager, pm_projectphase: projectForm.pm_projectphase, pm_ragstatus: projectForm.pm_ragstatus })
      setProjectForm(defaultProjectForm)
      setIsAddingProject(false)
      await loadProjects()
    } catch { setError('Unable to create project.') }
  }

  const handleProjectUpdate = async () => {
    if (!selectedProjectId) return
    try {
      await updateProject(selectedProjectId, { pm_projectmanager: projectForm.pm_projectmanager, pm_projectphase: projectForm.pm_projectphase, pm_ragstatus: projectForm.pm_ragstatus })
      await loadSelectedProject(selectedProjectId)
      await loadProjects()
    } catch { setError('Unable to update project.') }
  }

  const handleProjectDelete = async () => {
    if (!selectedProjectId) return
    try {
      await deleteProject(selectedProjectId)
      setSelectedProjectId(null)
      await loadProjects()
    } catch { setError('Unable to delete project.') }
  }

  const handleSaveTask = async () => {
    if (!selectedProjectId || !taskForm.pm_taskname) { setError('Task name is required.'); return }
    setIsSavingTask(true)
    try {
      await createProjectTask({ pm_taskname: taskForm.pm_taskname, pm_percentcomplete: taskForm.pm_percentcomplete, _pm_project_value: selectedProjectId, pm_plannedstartdate: taskForm.pm_plannedstartdate, pm_plannedenddate: taskForm.pm_plannedenddate, pm_assignedresource: taskForm.pm_assignedresource })
      setTaskForm({ pm_taskname: '', pm_percentcomplete: 0 })
      setTasks(await fetchProjectTasks(selectedProjectId))
    } catch { setError('Unable to save task.') }
    finally { setIsSavingTask(false) }
  }

  const handleTaskCompleteChange = async (task: ProjectTaskModel, value: number) => {
    if (!task.pm_projecttaskid) return
    try {
      await updateProjectTask(task.pm_projecttaskid, { pm_percentcomplete: value })
      setTasks((current) => current.map((item) => item.pm_projecttaskid === task.pm_projecttaskid ? { ...item, pm_percentcomplete: value } : item))
    } catch { setError('Unable to update task progress.') }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteProjectTask(taskId)
      setTasks((current) => current.filter((t) => t.pm_projecttaskid !== taskId))
    } catch { setError('Unable to delete task.') }
  }

  const handleMilestoneCreate = async () => {
    if (!selectedProjectId || !milestoneForm.pm_milestonename) { setError('Milestone name is required.'); return }
    try {
      await createProjectMilestone({ pm_milestonename: milestoneForm.pm_milestonename, pm_milestonetype: milestoneForm.pm_milestonetype, pm_planneddate: milestoneForm.pm_planneddate, _pm_project_value: selectedProjectId })
      setMilestoneForm({ pm_milestonename: '', pm_milestonetype: '' })
      setMilestones(await fetchProjectMilestones(selectedProjectId))
    } catch { setError('Unable to save milestone.') }
  }

  const handleMilestoneDelete = async (milestoneId: string) => {
    try {
      await deleteProjectMilestone(milestoneId)
      setMilestones((current) => current.filter((item) => item.pm_projectmilestoneid !== milestoneId))
    } catch { setError('Unable to delete milestone.') }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Project portfolio operations</Typography>
          <Typography variant="body2" color="text.secondary">Manage project details, tasks, and milestones in a single operational view.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddingProject(true)}>
          Add new project
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Create Project Dialog */}
      <Dialog open={isAddingProject} onClose={() => setIsAddingProject(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create a new project</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Project name" value={projectForm.pm_projectname ?? ''} onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectname: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Project code" value={projectForm.pm_projectcode ?? ''} onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectcode: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Project manager" value={projectForm.pm_projectmanager ?? ''} onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectmanager: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="RAG status" value={projectForm.pm_ragstatus ?? '1'} onChange={(e) => setProjectForm((p) => ({ ...p, pm_ragstatus: e.target.value }))}>
                <MenuItem value="1">Green</MenuItem>
                <MenuItem value="0">Amber</MenuItem>
                <MenuItem value="2">Red</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Phase" value={projectForm.pm_projectphase ?? '1'} onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectphase: e.target.value }))}>
                <MenuItem value="1">Planning</MenuItem>
                <MenuItem value="0">Execution</MenuItem>
                <MenuItem value="2">Closure</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddingProject(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleProjectCreate} variant="contained">Save project</Button>
        </DialogActions>
      </Dialog>

      {/* Main split view */}
      <Box sx={{ display: 'flex', gap: 2.5, minHeight: '65vh' }}>
        {/* Sidebar */}
        <Paper sx={{ width: 260, flexShrink: 0, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Active projects</Typography>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={48} />)}
            </Box>
          ) : (
            <List dense sx={{ p: 0 }}>
              {sidebarItems.map((project) => (
                <ListItemButton
                  key={project.id}
                  selected={selectedProjectId === project.id}
                  onClick={() => setSelectedProjectId(project.id ?? null)}
                  sx={{ borderRadius: 1.5, mb: 0.5, py: 1 }}
                >
                  <ListItemText
                    primary={project.title}
                    slotProps={{ primary: { sx: { fontSize: '0.8125rem', fontWeight: selectedProjectId === project.id ? 700 : 500 } } }}
                  />
                  <StatusChip status={project.status} type="rag" />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>

        {/* Detail panel */}
        <Paper sx={{ flex: 1, p: 3 }}>
          {detailLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="rounded" height={40} width="60%" />
              <Skeleton variant="rounded" height={200} />
              <Skeleton variant="rounded" height={150} />
            </Box>
          ) : selectedProject ? (
            <>
              {/* Project Detail Summary View */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: theme.palette.action.hover }}>
                <ProjectDetailView
                  projectName={selectedProject.pm_projectname}
                  projectCode={selectedProject.pm_projectcode}
                  manager={selectedProject.pm_projectmanager}
                  ragStatus={selectedProject.pm_ragstatus}
                  phase={selectedProject.pm_projectphase}
                  portfolioName={selectedProject.pm_portfolioname}
                  programmeName={selectedProject.pm_programmename}
                  tasks={tasks.map((t) => ({ id: t.pm_projecttaskid, name: t.pm_taskname, assignedTo: t.pm_assignedresource, percentComplete: t.pm_percentcomplete, plannedStart: t.pm_plannedstartdate, plannedEnd: t.pm_plannedenddate }))}
                  milestones={milestones.map((m) => ({ id: m.pm_projectmilestoneid, name: m.pm_milestonename, type: m.pm_milestonetype, plannedDate: m.pm_planneddate }))}
                />
              </Paper>

              {/* Update form */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField select label="Phase" size="small" value={projectForm.pm_projectphase ?? selectedProject.pm_projectphase?.toString() ?? '1'}
                  onChange={(e) => setProjectForm((p) => ({ ...p, pm_projectphase: e.target.value }))} sx={{ minWidth: 140 }}>
                  <MenuItem value="1">Planning</MenuItem><MenuItem value="0">Execution</MenuItem><MenuItem value="2">Closure</MenuItem>
                </TextField>
                <TextField select label="RAG status" size="small" value={projectForm.pm_ragstatus ?? selectedProject.pm_ragstatus?.toString() ?? '1'}
                  onChange={(e) => setProjectForm((p) => ({ ...p, pm_ragstatus: e.target.value }))} sx={{ minWidth: 140 }}>
                  <MenuItem value="1">Green</MenuItem><MenuItem value="0">Amber</MenuItem><MenuItem value="2">Red</MenuItem>
                </TextField>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleProjectUpdate}>Save</Button>
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleProjectDelete}>Delete</Button>
              </Box>

              {/* Tasks section */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TaskAltIcon color="primary" /> Task Board <Chip label={tasks.length} size="small" />
                </Typography>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Task name" value={taskForm.pm_taskname ?? ''} onChange={(e) => setTaskForm((f) => ({ ...f, pm_taskname: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField fullWidth size="small" label="Assigned to" value={taskForm.pm_assignedresource ?? ''} onChange={(e) => setTaskForm((f) => ({ ...f, pm_assignedresource: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField fullWidth size="small" type="number" label="Complete %" value={taskForm.pm_percentcomplete ?? 0} onChange={(e) => setTaskForm((f) => ({ ...f, pm_percentcomplete: Number(e.target.value) }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button fullWidth variant="contained" size="small" onClick={handleSaveTask} disabled={isSavingTask} sx={{ height: '100%' }}>Add</Button>
                  </Grid>
                </Grid>

                {tasks.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {tasks.map((task) => (
                      <Box key={task.pm_projecttaskid} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.pm_taskname}</Typography>
                          <Typography variant="caption" color="text.secondary">{task.pm_assignedresource ?? 'Unassigned'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 200 }}>
                          <Slider size="small" value={task.pm_percentcomplete ?? 0} onChange={(_, v) => handleTaskCompleteChange(task, v as number)} sx={{ width: 100 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 32 }}>{task.pm_percentcomplete ?? 0}%</Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={() => task.pm_projecttaskid && handleTaskDelete(task.pm_projecttaskid)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No tasks assigned yet.</Typography>
                )}
              </Paper>

              {/* Milestones section */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FlagIcon color="warning" /> Milestones <Chip label={milestones.length} size="small" />
                </Typography>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Milestone name" value={milestoneForm.pm_milestonename ?? ''} onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_milestonename: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField fullWidth size="small" label="Type" value={milestoneForm.pm_milestonetype ?? ''} onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_milestonetype: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField fullWidth size="small" type="date" slotProps={{ inputLabel: { shrink: true } }} label="Date" value={milestoneForm.pm_planneddate ?? ''} onChange={(e) => setMilestoneForm((f) => ({ ...f, pm_planneddate: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button fullWidth variant="contained" size="small" onClick={handleMilestoneCreate} sx={{ height: '100%' }}>Add</Button>
                  </Grid>
                </Grid>

                {milestones.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {milestones.map((ms) => (
                      <Box key={ms.pm_projectmilestoneid} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1.5 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{ms.pm_milestonename}</Typography>
                          <Typography variant="caption" color="text.secondary">{ms.pm_milestonetype ?? 'Type not set'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">{ms.pm_planneddate ?? 'No date'}</Typography>
                          <IconButton size="small" color="error" onClick={() => ms.pm_projectmilestoneid && handleMilestoneDelete(ms.pm_projectmilestoneid)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No milestones configured.</Typography>
                )}
              </Paper>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>Select a project to view details.</Typography>
          )}
        </Paper>
      </Box>
    </Box>
  )
}
