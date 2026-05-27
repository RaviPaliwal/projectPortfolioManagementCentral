export type RagStatusCode = number | '0' | '1' | '2' | string
export type ProgrammePhaseCode = number | '0' | '1' | '2' | string
export type ProjectPhaseCode = number | '0' | '1' | '2' | string

export interface PortfolioModel {
  pm_portfolioid?: string
  pm_portfolioname?: string
  pm_ownerid?: string
  pm_portfoliostatus?: number | string
  pm_ragstatus?: RagStatusCode
  pm_startdate?: string
  pm_enddate?: string
  pm_approvedbudgeteur?: number
}

export interface ProgrammeModel {
  pm_programmeid?: string
  pm_programmename?: string
  _pm_portfolio_value?: string
  pm_programmephase?: ProgrammePhaseCode
  pm_ragstatus?: RagStatusCode
  pm_startdate?: string
  pm_enddate?: string
  pm_portfolioname?: string
}

export interface ProjectModel {
  pm_projectid?: string
  pm_projectname?: string
  pm_projectcode?: string
  _pm_portfolio_value?: string
  _pm_programme_value?: string
  pm_projectmanager?: string
  pm_projectphase?: ProjectPhaseCode
  pm_ragstatus?: RagStatusCode
  pm_plannedstartdate?: string
  pm_plannedenddate?: string
  pm_actualstartdate?: string
  pm_actualenddate?: string
  pm_portfolioname?: string
  pm_programmename?: string
}

export interface InitiativeModel {
  pm_initiativeid?: string
  pm_name?: string
  pm_businesscase?: string
  pm_estimatedcost?: number
}

export interface ProjectTaskModel {
  pm_projecttaskid?: string
  pm_taskname?: string
  _pm_project_value?: string
  pm_plannedstartdate?: string
  pm_plannedenddate?: string
  pm_percentcomplete?: number
  pm_assignedresource?: string
}

export interface ProjectMilestoneModel {
  pm_projectmilestoneid?: string
  pm_milestonename?: string
  pm_milestonetype?: number | string
  pm_planneddate?: string
  _pm_project_value?: string
}
