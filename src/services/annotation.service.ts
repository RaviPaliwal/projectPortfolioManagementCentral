/**
 * Annotation / Comment Service
 *
 * Uses the Dataverse annotation (note) entity via the Web API to persist
 * threaded comments on issue records (and other entities in the future).
 *
 * The `annotation` entity is a standard Dataverse system table. Key fields:
 *   - annotationid  : GUID primary key
 *   - notetext      : The comment body text
 *   - subject       : Short title (we set to 'Issue Comment')
 *   - objectid      : Polymorphic lookup to the parent record
 *   - createdon     : Auto-set creation timestamp
 *   - createdbyname : Display name of the comment author
 *   - isdocument    : False for text notes; true for file attachments
 */

import { normalizeLookupId } from './common'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface IssueComment {
  id: string
  author: string
  text: string
  timestamp: Date
}

interface AnnotationRaw {
  annotationid?: string
  notetext?: string
  subject?: string
  createdon?: string
  createdbyname?: string
  isdocument?: boolean
  filename?: string
  filesize?: number
}

// ─── Base URL ──────────────────────────────────────────────────────────────

const ANNOTATION_URL = '/api/data/v9.2/annotations'

// ─── Helpers ───────────────────────────────────────────────────────────────

function mapAnnotation(item: AnnotationRaw): IssueComment {
  return {
    id: item.annotationid || '',
    author: item.createdbyname || 'Unknown',
    text: item.notetext || '',
    timestamp: item.createdon ? new Date(item.createdon) : new Date(),
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch all text-based comments (non-file attachments) for a given issue.
 */
export async function fetchIssueComments(issueId: string): Promise<IssueComment[]> {
  const id = normalizeLookupId(issueId)
  if (!id) return []

  try {
    const url =
      `${ANNOTATION_URL}?$filter=` +
      encodeURIComponent(`_objectid_value eq '${id}' and isdocument eq false`) +
      '&$select=annotationid,notetext,subject,createdon,createdbyname,isdocument' +
      '&$orderby=createdon asc' +
      '&$top=500'

    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No body')
      console.error(`[AnnotationService] fetchIssueComments HTTP error ${response.status}:`, errorText)
      return []
    }

    const data = await response.json()
    const annotations: AnnotationRaw[] = data.value || []
    return annotations.map(mapAnnotation)
  } catch (err) {
    console.error('[AnnotationService] fetchIssueComments error:', err)
    return []
  }
}

/**
 * Create a new text comment on an issue.
 *
 * Uses the navigation-property binding pattern `objectid_pm_issue@odata.bind`
 * to set the polymorphic lookup to the parent issue record.
 */
export async function createIssueComment(
  issueId: string,
  text: string,
  authorName?: string,
): Promise<IssueComment | null> {
  const id = normalizeLookupId(issueId)
  if (!id || !text.trim()) return null

  try {
    const payload: Record<string, unknown> = {
      notetext: text.trim(),
      subject: 'Issue Comment',
      'objectid_pm_issue@odata.bind': `/pm_issues(${id})`,
    }

    const response = await fetch(ANNOTATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No body')
      console.error(`[AnnotationService] createIssueComment HTTP error ${response.status}:`, errorText)
      return null
    }

    const data: AnnotationRaw = await response.json()
    const comment = mapAnnotation(data)

    // If the server didn't return a name, use the provided fallback
    if (comment.author === 'Unknown' && authorName) {
      comment.author = authorName
    }

    return comment
  } catch (err) {
    console.error('[AnnotationService] createIssueComment error:', err)
    return null
  }
}

