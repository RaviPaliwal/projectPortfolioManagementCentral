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
  pm_inherentprobability?: number | string
  pm_inherentimpact?: number | string
  pm_inherentscore?: number
  pm_residualprobability?: number | string
  pm_residualimpact?: number | string
  pm_residualscore?: number
  pm_responsestrategy?: number | string
  pm_riskcause?: string
  pm_riskeffect?: string
  pm_riskreference?: string
  pm_programme?: string
  pm_projectcode?: string
  pm_programmename?: string
  _pm_project_value?: string
  _pm_programmefk_value?: string
  statecode?: number
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
  pm_impactlevel?: number | string
  pm_issuereference?: string
  pm_dateraised?: string
  pm_targetresolutiondate?: string
  pm_actualresolutiondate?: string
  pm_resolutiondetails?: string
  pm_linkedrisk?: string
  _pm_project_value?: string
  _pm_programmefk_value?: string
  statecode?: number
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
  pm_taskdescription?: string
  pm_tasklevel?: number
  pm_parenttaskid?: string
  pm_wbsnumber?: string
  pm_durationdays?: number
  pm_lagdays?: number
  pm_plannedstartdate?: string
  pm_plannedenddate?: string
  pm_actualstartdate?: string
  pm_actualenddate?: string
  pm_percentcomplete?: number
  pm_taskstatus?: number | string
  pm_assignedresource?: string
  pm_ismilestone?: boolean
  pm_oncriticalpath?: boolean
  pm_predecessortaskid?: string
  _pm_predecessortask_value?: string
  _pm_project_value?: string
}

export interface ProjectMilestoneModel {
  pm_projectmilestoneid?: string
  pm_milestonename?: string
  pm_milestonetype?: number | string
  pm_planneddate?: string
  pm_actualdate?: string
  pm_ragstatus?: RagStatusCode
  pm_status?: number | string
  pm_owner?: string
  pm_description?: string
  _pm_project_value?: string
}

export interface ResourceModel {
  pm_resourceid?: string
  pm_fullname?: string
  pm_departmentname?: string
  pm_primaryrole?: string
  pm_resourcecategory?: number | string
  pm_employmentstatus?: number | string
  pm_dailyworkcapacity?: number
  pm_dailycostrate?: number
  pm_positiontitle?: string
  pm_contactemail?: string
  pm_suppliercompany?: string
  pm_contractstartdate?: string
  pm_contractenddate?: string
  statecode?: number
}

export interface ResourceAllocationModel {
  pm_resourceallocationid?: string
  pm_allocatedhours?: number
  pm_allocationpercentage?: number
  pm_assignmentrole?: string
  pm_assignmentstatus?: number | string
  pm_startdate?: string
  pm_enddate?: string
  _pm_resource_value?: string
  _pm_project_value?: string
}

export interface TimesheetModel {
  pm_timesheetid?: string
  pm_timesheetname?: string
  pm_ownername?: string
  pm_periodstartdate?: string
  pm_periodenddate?: string
  pm_timesheetstatus?: number | string
  pm_totalhours?: number
  pm_totalchargeablehours?: number
  pm_totalnonchargeablehours?: number
  pm_submissiondate?: string
  pm_submittedby?: string
  pm_approvaldate?: string
  pm_approvedby?: string
  pm_rejectionreason?: string
  pm_reportingperiod?: string
  pm_resourcename?: string
  _pm_resource_value?: string
}

export interface TimesheetEntryModel {
  pm_timesheetentryid?: string
  pm_timesheetid?: string
  pm_hoursworked?: number
  pm_workdate?: string
  pm_worknotes?: string
  pm_ischargeable?: boolean
  pm_isapproved?: boolean
  pm_isovertime?: boolean
  pm_nonchargeablereason?: string
  pm_projectname?: string
  pm_projecttaskname?: string
  _pm_project_value?: string
  _pm_projecttask_value?: string
  pm_timesheetname?: string
}

export interface BudgetLineModel {
  pm_budgetlineid?: string
  pm_budgetlinename?: string
  pm_approvedbudgeteur?: number
  pm_revisedbudgeteur?: number
  pm_actualspendeur?: number
  pm_committedspendeur?: number
  pm_forecastspendeur?: number
  pm_varianceeur?: number
  pm_estimateatcompletioneur?: number
  pm_estimatetocompleteeur?: number
  pm_costcategory?: number | string
  pm_costcategoryname?: string
  pm_fundingperiod?: string
  pm_fundingsourcecode?: string
  pm_notes?: string
  pm_portfolio?: string
  pm_programme?: string
  pm_projectcode?: string
  pm_fiscalperiodname?: string
  pm_fundingsourcename?: string
  pm_portfoliolookupname?: string
  pm_programmelookupname?: string
  pm_projectname?: string
  _pm_fiscalperiod_value?: string
  _pm_fundingsource_value?: string
  _pm_portfoliolookup_value?: string
  _pm_programmelookup_value?: string
  _pm_project_value?: string
  statecode?: number
}

export interface FundingSourceModel {
  pm_fundingsourceid?: string
  pm_fundingsourcename?: string
  pm_fundingtype?: number | string
  pm_fundingstatus?: number | string
  pm_totalamounteur?: number
  pm_allocatedamounteur?: number
  pm_availableamounteur?: number
  pm_fundingbody?: string
  pm_referencecode?: string
  pm_effectivefromdate?: string
  pm_effectivetodate?: string
  pm_portfolioname?: string
  pm_programmename?: string
  _pm_portfolio_value?: string
  _pm_programmelookup_value?: string
  statecode?: number
}

export interface CashflowEntryModel {
  pm_cashflowentryid?: string
  pm_entryname?: string
  pm_amounteur?: number
  pm_transactiondate?: string
  pm_transactiondirection?: number | string
  pm_transactiontype?: number | string
  pm_category?: number | string
  pm_description?: string
  pm_invoicenumber?: string
  pm_financialperiod?: string
  pm_programme?: string
  pm_projectcode?: string
  pm_fiscalperiodname?: string
  pm_programmelookupname?: string
  pm_projectname?: string
  _pm_fiscalperiod_value?: string
  _pm_programmelookup_value?: string
  _pm_project_value?: string
  statecode?: number
}

export interface GateReviewModel {
  pm_projectgatereviewid?: string
  pm_gatename?: string
  pm_gatestage?: number | string
  pm_reviewoutcome?: number | string
  pm_reviewstatus?: number | string
  pm_plannedreviewdate?: string
  pm_actualreviewdate?: string
  pm_leadreviewer?: string
  pm_reviewnotes?: string
  pm_reviewconditions?: string
  pm_documentsurl?: string
  pm_projectcode?: string
  pm_programmename?: string
  _pm_project_value?: string
  _pm_programmelookup_value?: string
  statecode?: number
}

export interface BenefitModel {
  pm_benefitid?: string
  pm_benefitname?: string
  pm_benefitcategory?: number | string
  pm_benefitdescription?: string
  pm_benefitstatus?: number | string
  pm_benefittype?: number | string
  pm_benefitreference?: string
  pm_baselinevalue?: number
  pm_targetvalue?: number
  pm_unitofmeasure?: string
  pm_ragstatus?: RagStatusCode
  pm_realisationstartdate?: string
  pm_realisationenddate?: string
  pm_programmename?: string
  pm_projectcode?: string
  pm_benifitownername?: string
  pm_programmelookupname?: string
  pm_projectname?: string
  _pm_benifitowner_value?: string
  _pm_programmelookup_value?: string
  _pm_project_value?: string
  statecode?: number
}

export interface PerformanceMeasureModel {
  pm_performancemeasureid?: string
  pm_measurename?: string
  pm_benefitname?: string
  pm_plannedvalue?: number
  pm_actualvalue?: number
  pm_cumulativeplanned?: number
  pm_cumulativeactual?: number
  pm_variance?: number
  pm_reportingperiod?: string
  pm_evidenced?: number | string
  pm_notes?: string
  _pm_benefit_value?: string
  statecode?: number
}

export interface FinancialPeriodModel {
  pm_fiscalperiodid?: string
  pm_periodname?: string
  pm_startdate?: string
  pm_enddate?: string
  pm_fiscalyear?: number
  pm_periodnumber?: number
  pm_isclosed?: boolean
  pm_iscurrentperiod?: boolean
  statecode?: number
}

export interface ChangeRequestModel {
  pm_changerequestid?: string
  pm_changerequesttitle?: string
  pm_changerequestreference?: string
  pm_changetype?: number | string
  pm_changetypename?: string
  pm_prioritylevel?: number | string
  pm_prioritylevelname?: string
  pm_status?: number | string
  pm_statusname?: string
  pm_changedescription?: string
  pm_justification?: string
  pm_costimpacteur?: number
  pm_scheduleimpactdays?: number
  pm_baselineupdated?: boolean
  pm_benefitsimpact?: string
  pm_requestorname?: string
  pm_submissiondate?: string
  pm_decisiondate?: string
  pm_decisionmaker?: string
  pm_versionnumber?: number
  pm_projectcode?: string
  pm_programmename?: string
  pm_projectname?: string
  pm_programmelookupname?: string
  pm_changerequestname?: string
  _pm_project_value?: string
  _pm_programmelookup_value?: string
  _pm_changerequest_value?: string
  statecode?: number
}

export interface ApprovalRequestModel {
  pm_projectapprovalrequestid?: string
  pm_requesttitle?: string
  pm_approvalstage?: number | string
  pm_approvalstagename?: string
  pm_decisionstatus?: number | string
  pm_decisionstatusname?: string
  pm_entitytype?: number | string
  pm_entitytypename?: string
  pm_prioritylevel?: number | string
  pm_prioritylevelname?: string
  pm_approvername?: string
  pm_decisiondate?: string
  pm_decisionnotes?: string
  pm_duedate?: string
  pm_entityid?: string
  pm_requestorname?: string
  statecode?: number
}

export interface SkillModel {
  pm_skillid?: string
  pm_skillname?: string
  pm_skillcategory?: number | string
  pm_skillcategoryname?: string
  pm_skilldescription?: string
  pm_isactive?: boolean
  statecode?: number
}

export interface ResourceSkillModel {
  pm_resourceskillid?: string
  pm_skillid?: string
  pm_skillname?: string
  pm_resourceid?: string
  pm_resourcename?: string
  pm_proficiencylevel?: number | string
  pm_proficiencylevelname?: string
  pm_yearsofexperience?: number
  pm_certificationexpirydate?: string
  pm_certificationname?: string
  pm_certified?: boolean
  pm_primaryskill?: boolean
  _pm_resource_value?: string
  _pm_skill_value?: string
  statecode?: number
}

export interface RiskMitigationActionModel {
  pm_riskmitigationactionid?: string
  pm_actiontitle?: string
  pm_actiondescription?: string
  pm_actionowner?: string
  pm_status?: number | string
  pm_duedate?: string
  pm_completiondate?: string
  pm_effectiveness?: number | string
  pm_notes?: string
  _pm_risk_value?: string
  pm_riskidentifier?: string
  statecode?: number
}

export interface WorkflowModel {
  pm_workflowid?: string
  pm_workflowname?: string
  pm_workflowdescription?: string
  pm_workflowtype?: number | string
  pm_workflowtypename?: string
  pm_module?: string
  pm_triggerentity?: string
  pm_triggerevent?: string
  pm_triggercondition?: string
  pm_version?: number
  pm_isactive?: boolean
  pm_approvalsteps?: string
  pm_workflowstatus?: number | string
  pm_workflowstatusname?: string
  pm_entitytype?: string
  pm_entitytypename?: string
  statecode?: number
  statuscode?: number
}

export interface WorkflowInstanceModel {
  pm_workflowinstanceid?: string
  pm_instancename?: string
  pm_instanceidentifier?: string
  pm_workflowtemplate?: string
  pm_workflowlookupname?: string
  pm_entityid?: string
  pm_entityname?: string
  pm_entitytype?: string
  pm_initiatedby?: string
  _pm_initiatedbylookup_value?: string
  pm_initiationdate?: string
  pm_completiondate?: string
  pm_workflowname?: string
  pm_workflowstatus?: number | string
  pm_workflowstatusname?: string
  pm_status?: number | string
  pm_statusname?: string
  pm_startdate?: string
  pm_completeddate?: string
  pm_currentstep?: number
  pm_sladuedate?: string
  _pm_workflowlookup_value?: string
  _pm_workflow_value?: string
  statecode?: number
}

export interface ProjectStatusSnapshotModel {
  pm_projectstatussnapshotid?: string
  pm_snapshotname?: string
  pm_entitytype?: string
  pm_projectcode?: string
  pm_actionitems?: string
  pm_approvalstatus?: number | string
  pm_benefitsragstatus?: number | string
  pm_costragstatus?: number | string
  pm_overallragstatus?: number | string
  pm_resourceragstatus?: number | string
  pm_riskragstatus?: number | string
  pm_scheduleragstatus?: number | string
  pm_portfolio?: string
  pm_programme?: string
  pm_projecthighlights?: string
  pm_projectlowlights?: string
  pm_reportingperiod?: string
  pm_submissiondate?: string
  pm_submittedby?: string
  pm_reportingfiscalperiodname?: string
  pm_projectname?: string
  pm_portfoliolookupname?: string
  pm_programmenamename?: string
  _pm_project_value?: string
  _pm_portfoliolookup_value?: string
  _pm_programmename_value?: string
  _pm_reportingfiscalperiod_value?: string
  statecode?: number
}

export interface HolidayModel {
  pm_holidayid?: string
  pm_holidayname?: string
  pm_holidaydate?: string
  pm_country?: string
  pm_isfixeddate?: boolean
  pm_year?: number
  pm_notes?: string
  statecode?: number
}

export interface WorkflowStepTemplateModel {
  pm_workflowsteptemplateid?: string
  pm_workflowname?: string
  pm_steporder?: number
  pm_assignetype?: number | string
  pm_assignetypename?: string
  pm_assigneeid?: string
  pm_displayname?: string
  pm_description?: string
  pm_sladays?: number
  pm_allowdelegation?: boolean
  pm_approvalrequired?: boolean
  pm_isparallel?: boolean
  pm_conditionsjson?: string
  pm_status?: number | string
  pm_statusname?: string
  pm_statusreason?: string
  pm_module?: string
  statecode?: number
}

export interface WorkflowApprovalStepModel {
  pm_workflowapprovalstepid?: string
  pm_stepname?: string
  pm_steporder?: number
  pm_approvername?: string
  pm_assigneetype?: number | string
  pm_assigneetypename?: string
  pm_assigneedisplayname?: string
  pm_approvalstatus?: number | string
  pm_approvalstatusname?: string
  pm_decisionstatus?: number | string
  pm_decisionstatusname?: string
  pm_decisiondate?: string
  pm_decisionnotes?: string
  pm_notes?: string
  pm_duedate?: string
  pm_isparallelstep?: boolean
  pm_delegatename?: string
  _pm_workflowinstance_value?: string
  pm_notificationtimestamp?: string
  pm_workflowinstanceid?: string
  pm_workflowinstancelookupname?: string
  _pm_workflowinstancelookup_value?: string
  _pm_workflowtemplate_value?: string
  pm_workflowtemplatename?: string
  statecode?: number
}
