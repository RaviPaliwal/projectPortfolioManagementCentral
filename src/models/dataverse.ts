export type RagStatusCode = number | '0' | '1' | '2' | string
export type ProgrammePhaseCode = number | '0' | '1' | '2' | string
export type ProjectPhaseCode = number | '0' | '1' | '2' | string

export interface PortfolioModel {
  pm_portfolioid?: string
  pm_portfolioname?: string
  pm_ownerid?: string
  pm_portfolioowner?: string
  pm_portfoliostatus?: number | string
  pm_ragstatus?: RagStatusCode
  pm_startdate?: string
  pm_enddate?: string
  pm_approvedbudgeteur?: number
  pm_actualspendeur?: number
  pm_portfoliodescription?: string
  pm_strategicobjective?: string
  pm_prioritylevel?: number
  pm_businessunit?: string
  pm_createdon?: string
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
  pm_programmemanager?: string
  pm_sponsorname?: string
  pm_programmedescription?: string
  pm_budgeteur?: number
  pm_actualspendeur?: number
  pm_businessunit?: string
}

export interface RiskModel {
  pm_riskid?: string
  pm_risktitle?: string
  pm_riskcategory?: number | string
  pm_riskdescription?: string
  pm_ragstatus?: RagStatusCode
  pm_riskowner?: string
  pm_riskstatus?: number | string
  pm_escalated?: boolean
  pm_identifieddate?: string
  pm_targetclosedate?: string
  pm_inherentscore?: number
  pm_residualscore?: number
  _pm_programmefk_value?: string
}

export interface IssueModel {
  pm_issueid?: string
  pm_issuetitle?: string
  pm_issuedescription?: string
  pm_issuecategory?: number | string
  pm_ragstatus?: RagStatusCode
  pm_issueowner?: string
  pm_issuestatus?: number | string
  pm_escalationstatus?: boolean
  pm_prioritylevel?: number | string
  pm_dateraised?: string
  pm_targetresolutiondate?: string
  _pm_programmefk_value?: string
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
  pm_approvedbudgeteur?: number
  pm_actualcosteur?: number
  pm_percentcomplete?: number
  pm_businessunit?: string
  pm_projectsponsor?: string
  pm_portfolioname?: string
  pm_programmename?: string
}

export interface InitiativeModel {
  pm_initiativeid?: string
  pm_name?: string
  pm_businesscase?: string
  pm_estimatedcost?: number
  pm_estimatedbenefits?: number
  pm_priorityscore?: number
  pm_strategicalignmentscore?: number
  pm_pipelinestatus?: string | number
  pm_requestorname?: string
  pm_submissiondate?: string
  pm_portfolioname?: string
  _pm_portfolio_value?: string
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
  pm_ragstatus?: RagStatusCode
  _pm_project_value?: string
}
