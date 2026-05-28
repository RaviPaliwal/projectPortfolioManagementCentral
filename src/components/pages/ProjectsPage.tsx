import { useEffect, useMemo, useState } from 'react'
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
  projectPhaseLabel,
  ragLabel,
  updateProject,
  updateProjectTask,
} from '../../services/dataverseService'
import type { ProjectModel, ProjectMilestoneModel, ProjectTaskModel } from '../../models/dataverse'

const defaultProjectForm = {
  pm_projectname: '',
  pm_projectcode: '',
  pm_projectmanager: '',
  pm_projectphase: '1',
  pm_ragstatus: '1',
}

export default function ProjectsPage() {
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
    } catch (err) {
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
      const details = await fetchProjectDetails(projectId)
      const loadedTasks = await fetchProjectTasks(projectId)
      const loadedMilestones = await fetchProjectMilestones(projectId)
      setSelectedProject(details)
      setTasks(loadedTasks)
      setMilestones(loadedMilestones)
    } catch (err) {
      setError('Unable to load project details.')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [])

  useEffect(() => {
    void loadSelectedProject(selectedProjectId)
  }, [selectedProjectId])

  const selectedProjectName = selectedProject?.pm_projectname ?? 'Select a project'

  const sidebarItems = useMemo(
    () =>
      projects.map((project) => ({
        id: project.pm_projectid,
        title: project.pm_projectname ?? 'Untitled',
        status: project.pm_ragstatus,
      })),
    [projects],
  )

  const handleProjectCreate = async () => {
    setError(null)
    if (!projectForm.pm_projectname) {
      setError('Project name is required.')
      return
    }

    try {
      await createProject({
        pm_projectname: projectForm.pm_projectname,
        pm_projectcode: projectForm.pm_projectcode,
        pm_projectmanager: projectForm.pm_projectmanager,
        pm_projectphase: projectForm.pm_projectphase,
        pm_ragstatus: projectForm.pm_ragstatus,
      })
      setProjectForm(defaultProjectForm)
      setIsAddingProject(false)
      await loadProjects()
    } catch (err) {
      setError('Unable to create project.')
    }
  }

  const handleProjectUpdate = async () => {
    if (!selectedProjectId) return
    setError(null)
    try {
      await updateProject(selectedProjectId, {
        pm_projectmanager: projectForm.pm_projectmanager,
        pm_projectphase: projectForm.pm_projectphase,
        pm_ragstatus: projectForm.pm_ragstatus,
      })
      await loadSelectedProject(selectedProjectId)
      await loadProjects()
    } catch (err) {
      setError('Unable to update project.')
    }
  }

  const handleProjectDelete = async () => {
    if (!selectedProjectId) return
    setError(null)
    try {
      await deleteProject(selectedProjectId)
      setSelectedProjectId(null)
      await loadProjects()
    } catch (err) {
      setError('Unable to delete project.')
    }
  }

  const handleSaveTask = async () => {
    if (!selectedProjectId || !taskForm.pm_taskname) {
      setError('Task name is required.')
      return
    }
    setIsSavingTask(true)
    setError(null)
    try {
      await createProjectTask({
        pm_taskname: taskForm.pm_taskname,
        pm_percentcomplete: taskForm.pm_percentcomplete,
        _pm_project_value: selectedProjectId,
        pm_plannedstartdate: taskForm.pm_plannedstartdate,
        pm_plannedenddate: taskForm.pm_plannedenddate,
        pm_assignedresource: taskForm.pm_assignedresource,
      })
      setTaskForm({ pm_taskname: '', pm_percentcomplete: 0 })
      setTasks(await fetchProjectTasks(selectedProjectId))
    } catch (err) {
      setError('Unable to save task.')
    } finally {
      setIsSavingTask(false)
    }
  }

  const handleTaskCompleteChange = async (task: ProjectTaskModel, value: number) => {
    if (!task.pm_projecttaskid) return
    setError(null)
    try {
      await updateProjectTask(task.pm_projecttaskid, { pm_percentcomplete: value })
      setTasks((current) => current.map((item) => (item.pm_projecttaskid === task.pm_projecttaskid ? { ...item, pm_percentcomplete: value } : item)))
    } catch (err) {
      setError('Unable to update task progress.')
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    setError(null)
    try {
      await deleteProjectTask(taskId)
      setTasks((current) => current.filter((task) => task.pm_projecttaskid !== taskId))
    } catch (err) {
      setError('Unable to delete task.')
    }
  }

  const handleMilestoneCreate = async () => {
    if (!selectedProjectId || !milestoneForm.pm_milestonename) {
      setError('Milestone name is required.')
      return
    }
    setError(null)
    try {
      await createProjectMilestone({
        pm_milestonename: milestoneForm.pm_milestonename,
        pm_milestonetype: milestoneForm.pm_milestonetype,
        pm_planneddate: milestoneForm.pm_planneddate,
        _pm_project_value: selectedProjectId,
      })
      setMilestoneForm({ pm_milestonename: '', pm_milestonetype: '' })
      setMilestones(await fetchProjectMilestones(selectedProjectId))
    } catch (err) {
      setError('Unable to save milestone.')
    }
  }

  const handleMilestoneDelete = async (milestoneId: string) => {
    setError(null)
    try {
      await deleteProjectMilestone(milestoneId)
      setMilestones((current) => current.filter((item) => item.pm_projectmilestoneid !== milestoneId))
    } catch (err) {
      setError('Unable to delete milestone.')
    }
  }

  return (
    <div className="page-root pagePanel pageSplit">
      <div className="pageHeader">
        <div>
          <h3>Project portfolio operations</h3>
          <p>Manage project details, tasks, and milestones in a single operational view.</p>
        </div>
        <button className="actionButton" type="button" onClick={() => setIsAddingProject((current) => !current)}>
          {isAddingProject ? 'Hide project form' : 'Add new project'}
        </button>
      </div>

      {error ? <div className="alertBanner">{error}</div> : null}

      {isAddingProject ? (
        <div className="modal-backdrop" onClick={() => setIsAddingProject(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="modal-title">Create a new project</h3>
            <div className="formGrid">
              <label>
                Project name
                <input
                  value={projectForm.pm_projectname ?? ''}
                  onChange={(event) => setProjectForm((current) => ({ ...current, pm_projectname: event.target.value }))}
                />
              </label>
              <label>
                Project code
                <input
                  value={projectForm.pm_projectcode ?? ''}
                  onChange={(event) => setProjectForm((current) => ({ ...current, pm_projectcode: event.target.value }))}
                />
              </label>
              <label>
                Project manager
                <input
                  value={projectForm.pm_projectmanager ?? ''}
                  onChange={(event) => setProjectForm((current) => ({ ...current, pm_projectmanager: event.target.value }))}
                />
              </label>
              <label>
                RAG status
                <select
                  value={projectForm.pm_ragstatus ?? '1'}
                  onChange={(event) => setProjectForm((current) => ({ ...current, pm_ragstatus: event.target.value }))}
                >
                  <option value="1">Green</option>
                  <option value="0">Amber</option>
                  <option value="2">Red</option>
                </select>
              </label>
              <label>
                Phase
                <select
                  value={projectForm.pm_projectphase ?? '1'}
                  onChange={(event) => setProjectForm((current) => ({ ...current, pm_projectphase: event.target.value }))}
                >
                  <option value="1">Planning</option>
                  <option value="0">Execution</option>
                  <option value="2">Closure</option>
                </select>
              </label>
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" type="button" onClick={handleProjectCreate}>
                Save project
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setIsAddingProject(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="listPanel">
        <div className="listSidebar">
          <div className="listTitle">Active projects</div>
          {loading ? (
            <div className="listPlaceholder">Loading projects…</div>
          ) : (
            sidebarItems.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`listItem ${selectedProjectId === project.id ? 'selected' : ''}`}
                onClick={() => setSelectedProjectId(project.id ?? null)}
              >
                <span>{project.title}</span>
                <span className={`statusDot ${project.status === '2' ? 'statusRed' : project.status === '1' ? 'statusGreen' : 'statusAmber'}`} />
              </button>
            ))
          )}
        </div>

        <div className="detailPanel">
          <div className="detailHeader">
            <div>
              <h4>{selectedProjectName}</h4>
              <p>{selectedProject?.pm_projectcode ?? 'No project code assigned'}</p>
            </div>
            <div className="detailActions">
              <button className="actionButton secondary" type="button" onClick={handleProjectUpdate} disabled={!selectedProjectId}>
                Save project details
              </button>
              <button className="actionButton danger" type="button" onClick={handleProjectDelete} disabled={!selectedProjectId}>
                Delete project
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="listPlaceholder">Loading details…</div>
          ) : selectedProject ? (
            <>
              <div className="infoGrid">
                <article>
                  <span>Portfolio</span>
                  <strong>{selectedProject.pm_portfolioname ?? 'Unknown'}</strong>
                </article>
                <article>
                  <span>Programme</span>
                  <strong>{selectedProject.pm_programmename ?? 'Unknown'}</strong>
                </article>
                <article>
                  <span>Phase</span>
                  <strong>{projectPhaseLabel(selectedProject.pm_projectphase)}</strong>
                </article>
                <article>
                  <span>RAG</span>
                  <strong>{ragLabel(selectedProject.pm_ragstatus)}</strong>
                </article>
              </div>

              <section className="detailSection">
                <div className="sectionHeader">
                  <h4>Task board</h4>
                  <span>{tasks.length} tasks</span>
                </div>
                <div className="taskFormGrid">
                  <label>
                    Task name
                    <input value={taskForm.pm_taskname ?? ''} onChange={(event) => setTaskForm((current) => ({ ...current, pm_taskname: event.target.value }))} />
                  </label>
                  <label>
                    Assigned resource
                    <input value={taskForm.pm_assignedresource ?? ''} onChange={(event) => setTaskForm((current) => ({ ...current, pm_assignedresource: event.target.value }))} />
                  </label>
                  <label>
                    Completion %
                    <input type="number" min={0} max={100} value={taskForm.pm_percentcomplete ?? 0} onChange={(event) => setTaskForm((current) => ({ ...current, pm_percentcomplete: Number(event.target.value) }))} />
                  </label>
                  <button className="actionButton" type="button" onClick={handleSaveTask} disabled={isSavingTask}>
                    Add task
                  </button>
                </div>

                <div className="taskList">
                  {tasks.map((task) => (
                    <div key={task.pm_projecttaskid} className="taskRow">
                      <div>
                        <strong>{task.pm_taskname}</strong>
                        <p>{task.pm_assignedresource ?? 'Unassigned'}</p>
                      </div>
                      <div className="taskProgress">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={task.pm_percentcomplete ?? 0}
                          onChange={(event) => handleTaskCompleteChange(task, Number(event.target.value))}
                        />
                        <span>{task.pm_percentcomplete ?? 0}%</span>
                      </div>
                      {task.pm_projecttaskid ? (
                        <button className="textButton danger" type="button" onClick={() => handleTaskDelete(task.pm_projecttaskid!)}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {tasks.length === 0 ? <div className="listPlaceholder">No tasks assigned yet.</div> : null}
                </div>
              </section>

              <section className="detailSection">
                <div className="sectionHeader">
                  <h4>Milestones</h4>
                  <span>{milestones.length} milestones</span>
                </div>
                <div className="taskFormGrid">
                  <label>
                    Milestone name
                    <input value={milestoneForm.pm_milestonename ?? ''} onChange={(event) => setMilestoneForm((current) => ({ ...current, pm_milestonename: event.target.value }))} />
                  </label>
                  <label>
                    Type
                    <input value={milestoneForm.pm_milestonetype ?? ''} onChange={(event) => setMilestoneForm((current) => ({ ...current, pm_milestonetype: event.target.value }))} />
                  </label>
                  <label>
                    Date
                    <input type="date" value={milestoneForm.pm_planneddate ?? ''} onChange={(event) => setMilestoneForm((current) => ({ ...current, pm_planneddate: event.target.value }))} />
                  </label>
                  <button className="actionButton" type="button" onClick={handleMilestoneCreate}>
                    Add milestone
                  </button>
                </div>

                <div className="milestoneList">
                  {milestones.map((milestone) => (
                    <div key={milestone.pm_projectmilestoneid} className="milestoneRow">
                      <div>
                        <strong>{milestone.pm_milestonename}</strong>
                        <p>{milestone.pm_milestonetype ?? 'Type not set'}</p>
                      </div>
                      <div className="milestoneActions">
                        <span>{milestone.pm_planneddate ?? 'No date'}</span>
                        {milestone.pm_projectmilestoneid ? (
                          <button className="textButton danger" type="button" onClick={() => handleMilestoneDelete(milestone.pm_projectmilestoneid!)}>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {milestones.length === 0 ? <div className="listPlaceholder">No milestones configured.</div> : null}
                </div>
              </section>
            </>
          ) : (
            <div className="listPlaceholder">Select a project to view details.</div>
          )}
        </div>
      </div>
    </div>
  )
}
