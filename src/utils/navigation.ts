import type { TabKey } from '@/components/layout/PrimaryShell'
import { resolveModule } from '@/constants/moduleNames'

/**
 * Navigate to a specific tab/page and optionally pre-select an entity.
 */
export function navigateToTab(tab: TabKey): void {
  window.dispatchEvent(new CustomEvent('navigate', { detail: { tab } }))
}

/**
 * Navigate to a specific module and optionally pre-select an entity.
 * Uses the MODULE_NAMES registry to resolve the correct tab.
 */
export function navigateToModule(moduleValue: string, entityId?: string): void {
  const mod = resolveModule(moduleValue)
  if (!mod) {
    console.warn(`[Navigation] Unknown module: ${moduleValue}`)
    return
  }

  if (entityId) {
    // Map module value to session storage key
    // Most modules follow the pattern 'preselect[ModuleName]Id'
    let entityName = mod.value
    // Normalise: remove trailing 's' for consistency with singular naming convention
    if (entityName.endsWith('s') && !['Benefits', 'GateReviews'].includes(entityName)) {
      entityName = entityName.slice(0, -1)
    }
    // Specific overrides if needed
    if (entityName === 'GateReview') entityName = 'GateReview'

    sessionStorage.setItem(`preselect${entityName}Id`, entityId)
  }

  navigateToTab(mod.tabKey as TabKey)
}

/**
 * Navigate to the Projects tab and pre-select a project by ID.
 */
export function navigateToProject(projectId: string): void {
  navigateToModule('Project', projectId)
}

/**
 * Navigate to the Risks tab and pre-select a risk by ID.
 */
export function navigateToRisk(riskId: string): void {
  navigateToModule('Risks', riskId)
}

/**
 * Navigate to the Issues tab and pre-select an issue by ID.
 */
export function navigateToIssue(issueId: string): void {
  navigateToModule('Issues', issueId)
}

/**
 * Navigate to the Programmes tab and pre-select a programme by ID.
 */
export function navigateToProgramme(programmeId: string): void {
  navigateToModule('Programme', programmeId)
}
