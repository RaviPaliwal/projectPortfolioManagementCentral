import {
  Pm_programmesService,
  Pm_portfoliosService,
  Pm_projectsService,
  Pm_risksService,
  Pm_issuesService,
} from '@/generated'
import type { Pm_programmes } from '@/generated/models/Pm_programmesModel'
import type { Pm_portfolios } from '@/generated/models/Pm_portfoliosModel'
import type { Pm_projects } from '@/generated/models/Pm_projectsModel'
import type { Pm_risks } from '@/generated/models/Pm_risksModel'
import type { Pm_issues } from '@/generated/models/Pm_issuesModel'
import type {
  ProgrammeModel,
  ProjectModel,
  RiskModel,
  IssueModel,
} from '@/types/dataverse'
import { unwrapList, unwrapSingle, normalizeLookupId } from './common'
import { mapProject } from './project.service'

export const mapProgramme = (item: Pm_programmes): ProgrammeModel => ({
  pm_programmeid: item.pm_programmeid,
  pm_programmename: item.pm_programmename,
  _pm_portfolio_value: item._pm_portfolio_value,
  pm_programmephase: item.pm_programmephase,
  pm_ragstatus: item.pm_ragstatus,
  pm_startdate: item.pm_startdate,
  pm_enddate: item.pm_enddate,
  pm_portfolioname: item.pm_portfolioname,
  pm_programmemanager: item.pm_programmemanager,
  pm_sponsorname: item.pm_sponsorname,
  pm_programmedescription: item.pm_programmedescription,
  pm_budgeteur: item.pm_budgeteur,
  pm_actualspendeur: item.pm_actualspendeur,
  pm_businessunit: item.pm_businessunit,
})

export async function createProgramme(payload: Partial<ProgrammeModel>): Promise<ProgrammeModel | null> {
  const cleanPayload: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      cleanPayload[key] = value
    }
  }
  const defaults: Record<string, any> = {
    statecode: 0,
    statuscode: 1,
  }
  try {
    const result = await Pm_programmesService.create({ ...defaults, ...cleanPayload } as any)
    try { console.debug('[dataverseService] createProgramme payload/result:', cleanPayload, result) } catch (e) {}
    const item = unwrapSingle<Pm_programmes>(result)
    if (item) {
      return mapProgramme(item)
    }
    try {
      console.warn('[dataverseService] createProgramme: unwrapSingle returned null. Raw result:', JSON.stringify(result, null, 2))
    } catch (e) {
      console.warn('[dataverseService] createProgramme: unwrapSingle returned null. Raw result (non-serializable):', result)
    }
    return null
  } catch (err: any) {
    try {
      console.error('[dataverseService] createProgramme: API call failed:', err?.message || err, '| payload:', JSON.stringify(cleanPayload))
    } catch (e) {
      console.error('[dataverseService] createProgramme: API call failed (unable to serialize):', err)
    }
    throw err
  }
}

export interface ProgrammeDetail {
  programme: ProgrammeModel | null
  projects: ProjectModel[]
  risks: RiskModel[]
  issues: IssueModel[]
}

export async function fetchProgrammeDetails(programmeId: string): Promise<ProgrammeDetail> {
  const progResult = await Pm_programmesService.get(programmeId, {
    select: ['pm_programmeid', 'pm_programmename', '_pm_portfolio_value', 'pm_programmephase', 'pm_ragstatus', 'pm_startdate', 'pm_enddate', 'pm_programmemanager', 'pm_sponsorname', 'pm_programmedescription', 'pm_budgeteur', 'pm_actualspendeur', 'pm_businessunit'],
  })
  const programme = mapProgramme(unwrapSingle<Pm_programmes>(progResult) ?? ({} as Pm_programmes))

  if (!programme.pm_portfolioname && programme._pm_portfolio_value) {
    try {
      const portfolioId = normalizeLookupId(programme._pm_portfolio_value)
      if (portfolioId) {
        const portfolioResult = await Pm_portfoliosService.get(portfolioId, {
          select: ['pm_portfolioid', 'pm_portfolioname'],
        })
        const portfolio = unwrapSingle<Pm_portfolios>(portfolioResult)
        if (portfolio?.pm_portfolioname) {
          programme.pm_portfolioname = portfolio.pm_portfolioname
        }
      }
    } catch (e) {
      console.warn('[dataverseService] fetchProgrammeDetails: failed to resolve portfolio name', e)
    }
  }

  const [projectsResult, risksResult, issuesResult] = await Promise.all([
    Pm_projectsService.getAll({
      filter: `_pm_programme_value eq '${programmeId}'`,
      select: ['pm_projectid', 'pm_projectname', 'pm_projectcode', 'pm_projectmanager', 'pm_projectphase', 'pm_ragstatus', 'pm_percentcomplete', 'pm_plannedstartdate', 'pm_plannedenddate', 'pm_approvedbudgeteur', 'pm_actualcosteur'],
      top: 200,
    }),
    Pm_risksService.getAll({
      filter: `_pm_programmefk_value eq '${programmeId}'`,
      select: ['pm_riskid', 'pm_risktitle', 'pm_riskcategory', 'pm_riskdescription', 'pm_ragstatus', 'pm_riskowner', 'pm_riskstatus', 'pm_escalated', 'pm_identifieddate', 'pm_targetclosedate', 'pm_inherentscore', 'pm_residualscore'],
      top: 200,
    }),
    Pm_issuesService.getAll({
      filter: `_pm_programmefk_value eq '${programmeId}'`,
      select: ['pm_issueid', 'pm_issuetitle', 'pm_issuedescription', 'pm_issuecategory', 'pm_ragstatus', 'pm_issueowner', 'pm_issuestatus', 'pm_escalationstatus', 'pm_prioritylevel', 'pm_dateraised', 'pm_targetresolutiondate'],
      top: 200,
    }),
  ])

  const mapRisk = (item: Pm_risks): RiskModel => ({
    pm_riskid: item.pm_riskid,
    pm_risktitle: item.pm_risktitle,
    pm_riskcategory: item.pm_riskcategory,
    pm_riskdescription: item.pm_riskdescription,
    pm_ragstatus: item.pm_ragstatus,
    pm_riskowner: item.pm_riskowner,
    pm_riskstatus: item.pm_riskstatus,
    pm_escalated: item.pm_escalated,
    pm_identifieddate: item.pm_identifieddate,
    pm_targetclosedate: item.pm_targetclosedate,
    pm_inherentscore: item.pm_inherentscore,
    pm_residualscore: item.pm_residualscore,
    _pm_programmefk_value: item._pm_programmefk_value,
  })

  const mapIssue = (item: Pm_issues): IssueModel => ({
    pm_issueid: item.pm_issueid,
    pm_issuetitle: item.pm_issuetitle,
    pm_issuedescription: item.pm_issuedescription,
    pm_issuecategory: item.pm_issuecategory,
    pm_ragstatus: item.pm_ragstatus,
    pm_issueowner: item.pm_issueowner,
    pm_issuestatus: item.pm_issuestatus,
    pm_escalationstatus: item.pm_escalationstatus,
    pm_prioritylevel: item.pm_prioritylevel,
    pm_dateraised: item.pm_dateraised,
    pm_targetresolutiondate: item.pm_targetresolutiondate,
    _pm_programmefk_value: item._pm_programmefk_value,
  })

  return {
    programme,
    projects: unwrapList<Pm_projects>(projectsResult).map(mapProject),
    risks: unwrapList<Pm_risks>(risksResult).map(mapRisk),
    issues: unwrapList<Pm_issues>(issuesResult).map(mapIssue),
  }
}
