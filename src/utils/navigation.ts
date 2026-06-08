import type { TabKey } from '@/components/layout/PrimaryShell'

/**
 * Navigate to a specific tab/page and optionally pre-select an entity.
 */
export function navigateToTab(tab: TabKey): void {
  window.dispatchEvent(new CustomEvent('navigate', { detail: { tab } }))
}

/**
 * Navigate to the Projects tab and pre-select a project by ID.
 */
export function navigateToProject(projectId: string): void {
  sessionStorage.setItem('preselectProjectId', projectId)
  window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'projects' } }))
}

/**
 * Navigate to the Risks tab and pre-select a risk by ID.
 */
export function navigateToRisk(riskId: string): void {
  sessionStorage.setItem('preselectRiskId', riskId)
  window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'risks' } }))
}

/**
 * Navigate to the Issues tab and pre-select an issue by ID.
 */
export function navigateToIssue(issueId: string): void {
  sessionStorage.setItem('preselectIssueId', issueId)
  window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'issues' } }))
}

/**
 * Navigate to the Programmes tab and pre-select a programme by ID.
 */
export function navigateToProgramme(programmeId: string): void {
  sessionStorage.setItem('preselectProgrammeId', programmeId)
  window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'programmes' } }))
}
