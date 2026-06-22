import { Pm_changelogentriesService } from '@/generated/services/Pm_changelogentriesService'
import type { Pm_changelogentriespm_actiontype } from '@/generated/models/Pm_changelogentriesModel'
import { normalizeLookupId } from './common'

export interface AuditLogOptions {
  actionType: 'Create' | 'Update' | 'StatusChange'
  entityName: string
  recordId: string
  recordName?: string
  fieldName?: string
  oldValue?: string
  newValue?: string
  moduleName?: string
  description?: string
}

const ENTITY_TO_MODULE: Record<string, string> = {
  pm_projects: 'Projects',
  pm_portfolios: 'Portfolios',
  pm_programmes: 'Programmes',
  pm_risks: 'Risks',
  pm_issues: 'Issues',
  pm_timesheets: 'Timesheets',
  pm_resourceallocations: 'Resource Allocations',
  pm_resources: 'Resources',
  pm_skills: 'Skills',
  pm_resourceskills: 'Resource Skills',
  pm_documents: 'Documents',
  pm_initiatives: 'Initiatives',
  pm_projectgatereviews: 'Gate Reviews',
  pm_benefits: 'Benefits',
  pm_performancemeasures: 'Performance Measures',
  pm_budgetlines: 'Budget Lines',
  pm_cashflowentries: 'Cash Flow Entries',
  pm_fundingsources: 'Funding Sources',
}

export async function writeAuditLog({
  actionType,
  entityName,
  recordId,
  recordName,
  fieldName = '',
  oldValue = '',
  newValue = '',
  moduleName,
  description,
}: AuditLogOptions): Promise<void> {
  try {
    const rawUserId = localStorage.getItem('ppm_selected_user_id')
    const normalizedUserId = rawUserId ? normalizeLookupId(rawUserId) : undefined

    let mappedAction: Pm_changelogentriespm_actiontype = 1 // Update
    if (actionType === 'StatusChange') {
      mappedAction = 0
    } else if (actionType === 'Create') {
      mappedAction = 2
    }

    const resolvedModuleName = moduleName || ENTITY_TO_MODULE[entityName] || entityName

    let resolvedDescription = description || ''
    if (!resolvedDescription) {
      if (actionType === 'Create') {
        resolvedDescription = `Created new record in module ${resolvedModuleName} with name '${recordName || recordId}'.`
      } else if (actionType === 'Update') {
        resolvedDescription = `Updated field '${fieldName}' on ${resolvedModuleName} record '${recordName || recordId}' from '${oldValue}' to '${newValue}'.`
      } else if (actionType === 'StatusChange') {
        resolvedDescription = `Changed status of ${resolvedModuleName} record '${recordName || recordId}' from '${oldValue}' to '${newValue}'.`
      }
    }

    let ipAddress = '127.0.0.1'
    try {
      if (typeof window !== 'undefined' && window.location) {
        ipAddress = window.location.hostname || '127.0.0.1'
      }
    } catch (e) { }

    let sessionId = ''

    // Helper to find session parameter case-insensitively
    const getSessionParam = (searchString: string): string | null => {
      try {
        const urlParams = new URLSearchParams(searchString)
        for (const [key, value] of urlParams.entries()) {
          const lowerKey = key.toLowerCase()
          if (lowerKey === 'sessionid' || lowerKey === 'session' || lowerKey === 'correlationid') {
            return value
          }
        }
      } catch (e) { }
      return null
    }

    // 1. Try url parameters on window.location
    try {
      if (typeof window !== 'undefined' && window.location) {
        sessionId = getSessionParam(window.location.search) ||
          getSessionParam(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '') ||
          ''
      }
    } catch (e) { }

    // 2. Try url parameters on parent window (safely caught in case of cross-origin)
    if (!sessionId) {
      try {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
          sessionId = getSessionParam(window.parent.location.search) ||
            getSessionParam(window.parent.location.hash.includes('?') ? window.parent.location.hash.split('?')[1] : '') ||
            ''
        }
      } catch (e) { }
    }

    // 3. Try to get it from Xrm context correlation ID or sessionInfo
    if (!sessionId) {
      try {
        let xrm: any = null
        if (typeof window !== 'undefined') {
          xrm = (window as any).Xrm
          if (!xrm) {
            try {
              xrm = (window.parent as any).Xrm
            } catch (e) { }
          }
        }
        if (xrm?.Utility?.getGlobalContext) {
          const context = xrm.Utility.getGlobalContext()
          sessionId = context.correlationId ||
            context.sessionInfo?.sessionId ||
            context.organizationSettings?.organizationId ||
            ''
        }
      } catch (e) {
        console.warn('[writeAuditLog] Error checking Xrm context:', e)
      }
    }

    // 4. Fallback to in-memory window global or sessionStorage or new UUID
    if (!sessionId) {
      const win = (typeof window !== 'undefined' ? window : {}) as any
      if (win.__ppm_audit_session_id) {
        sessionId = win.__ppm_audit_session_id
      } else {
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionId = sessionStorage.getItem('ppm_audit_session_id') || ''
          }
        } catch (e) { }

        if (!sessionId) {
          try {
            sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2, 15)
          } catch (e) {
            sessionId = Math.random().toString(36).substring(2, 15)
          }

          try {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('ppm_audit_session_id', sessionId)
            }
          } catch (e) { }
        }
        win.__ppm_audit_session_id = sessionId
      }
    }

    if (!sessionId) {
      sessionId = 'unknown-session'
    }


    const payload: any = {
      pm_actiontype: mappedAction,
      pm_entityname: entityName,
      pm_recordidentifier: recordId,
      pm_recordname: recordName || recordId,
      pm_fieldname: fieldName,
      pm_oldvalue: oldValue,
      pm_newvalue: newValue,
      pm_changetimestamp: new Date().toISOString(),
      pm_modulename: resolvedModuleName,
      pm_description: resolvedDescription,
      pm_ipaddress: ipAddress,
      pm_sessionid: sessionId,
      statecode: 0,
      statuscode: 1,
    }

    if (normalizedUserId && normalizedUserId !== '00000000-0000-0000-0000-000000000000') {
      payload['pm_ChangeBy@odata.bind'] = `/systemusers(${normalizedUserId})`
      payload['ownerid@odata.bind'] = `/systemusers(${normalizedUserId})`
    }
    await Pm_changelogentriesService.create(payload as any)

  } catch (error: any) {
    console.error('[writeAuditLog] ❌ Exception failed to create audit log entry:', error)
  }
}

